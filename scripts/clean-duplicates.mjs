#!/usr/bin/env node
/**
 * Removes the duplicated "latest copy" that used to live directly under
 * libs/{lib}/. A path is only removed when every byte also exists in the
 * newest version directory, and the generated nginx snippet already keeps the
 * old URL working (see deploy/latest/*.conf).
 *
 *   node scripts/clean-duplicates.mjs            # dry run, prints the plan
 *   node scripts/clean-duplicates.mjs --apply    # actually delete
 *   node scripts/clean-duplicates.mjs --only bootstrap,font-awesome --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { walkFiles, humanSize, compareVersions } from './lib/fsutil.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const LIBS = path.join(ROOT, 'libs');
const VERSION_RE = /^\d+\.\d+(\.\d+)?([-+][0-9A-Za-z.-]+)?$/;
const KEEP = new Set(['.meta.json', 'latest.json', 'README.md']);

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const onlyIndex = argv.indexOf('--only');
const only = onlyIndex !== -1 && argv[onlyIndex + 1] ? argv[onlyIndex + 1].split(',') : null;

function sha(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/**
 * Comparison digest that ignores the normalizations scripts/sync.mjs applies
 * (dropped sourceMappingURL comment, webfonts/ -> fonts/ rewrite, line
 * endings). Without it every regenerated version directory would look
 * "different" from its own legacy copy and the copy would survive forever.
 */
function comparableSha(file) {
    const raw = fs.readFileSync(file);
    if (!/\.(js|css)$/i.test(file)) {
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
    const text = raw.toString('utf8')
        .replace(/\s*(?:\/\/[#@]\s*sourceMappingURL=\S+|\/\*[#@]\s*sourceMappingURL=[^*]+\*\/)\s*$/, '')
        .split('../webfonts/').join('../fonts/')
        .replace(/,\s*url\([^)]*\.svg[^)]*\)\s*format\((["'])svg\1\)/gi, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n+$/, '');
    return crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function listDirs(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
}

const plan = [];
let recoverable = 0;

for (const lib of listDirs(LIBS)) {
    if (only && !only.includes(lib)) {
        continue;
    }

    const versions = listDirs(path.join(LIBS, lib)).filter((name) => VERSION_RE.test(name));
    if (!versions.length) {
        continue;
    }
    const latestDir = path.join(LIBS, lib, versions.slice().sort(compareVersions).pop());

    const rootEntries = fs.readdirSync(path.join(LIBS, lib), { withFileTypes: true })
        .filter((entry) => !KEEP.has(entry.name))
        .filter((entry) => !(entry.isDirectory() && VERSION_RE.test(entry.name)));

    for (const entry of rootEntries) {
        const target = path.join(LIBS, lib, entry.name);
        const files = entry.isDirectory() ? walkFiles(target) : [''];
        const relative = entry.isDirectory()
            ? files.map((relPath) => `${entry.name}/${relPath}`)
            : [entry.name];

        const identical = relative.every((relPath) => {
            const source = path.join(target, entry.isDirectory() ? relPath.slice(entry.name.length + 1) : '');
            const mirror = path.join(latestDir, relPath);
            return fs.existsSync(mirror) && comparableSha(source) === comparableSha(mirror);
        });

        if (!identical) {
            console.log(`  keep  libs/${lib}/${entry.name}  (differs from ${path.basename(latestDir)})`);
            continue;
        }

        const bytes = relative.reduce((sum, relPath) => {
            const file = path.join(LIBS, lib, relPath);
            return sum + (fs.existsSync(file) ? fs.statSync(file).size : 0);
        }, 0);

        plan.push({ lib, entry: entry.name, target, files: relative.length, bytes });
        recoverable += bytes;
    }
}

if (!plan.length) {
    console.log('nothing to remove');
    process.exit(0);
}

for (const item of plan) {
    console.log(`  drop  libs/${item.lib}/${item.entry}${item.files > 1 ? `/ (${item.files} files)` : ''}  ${humanSize(item.bytes)}`);
}

console.log(`\n${plan.length} entr(ies), ${humanSize(recoverable)} recoverable`);
console.log(`nginx keeps the old URLs alive: ${new Set(plan.map((item) => item.lib)).size} snippet(s) in deploy/latest/`);

if (!apply) {
    console.log('\ndry run -- pass --apply to delete');
    process.exit(0);
}

for (const item of plan) {
    fs.rmSync(item.target, { recursive: true, force: true });
}

console.log(`\nremoved ${plan.length} entr(ies), freed ${humanSize(recoverable)}`);
console.log('next: node scripts/index.mjs && node scripts/validate.mjs');
