#!/usr/bin/env node
/**
 * Repository health check. Read-only.
 *
 *   node scripts/validate.mjs           # errors fail the run (CI)
 *   node scripts/validate.mjs --strict  # duplicates also fail
 *
 * Covers the failures that manual copying produced in the past: broken
 * relative references, files that are not what their directory claims,
 * missing licences, dead source maps and duplicated payloads.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { walkFiles, humanSize, compareVersions } from './lib/fsutil.mjs';
import { npmPackageFor, isSelfOwned } from './lib/sources.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const LIBS = path.join(ROOT, 'libs');
const manifest = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'libs.manifest.json'), 'utf8'));
const VERSION_RE = /^\d+\.\d+(\.\d+)?([-+][0-9A-Za-z.-]+)?$/;

const errors = [];
const warnings = [];
const stats = { refs: 0, cssUrls: 0, files: 0, bytes: 0 };

/* Legacy versions that are kept for URL compatibility but are known to be
   incomplete upstream get their findings downgraded to warnings. */
const DEPRECATED = new Set(
    (manifest.packages || [])
        .filter((pkg) => pkg.deprecated)
        .map((pkg) => `${pkg.name}/${pkg.version}`)
);

function isDeprecated(libRelativePath) {
    const parts = String(libRelativePath).split('/');
    return parts.length >= 2 && DEPRECATED.has(`${parts[0]}/${parts[1]}`);
}

function report(message, libRelativePath) {
    if (libRelativePath && isDeprecated(libRelativePath)) {
        warnings.push(`(deprecated) ${message}`);
        return;
    }
    errors.push(message);
}

function rel(file) {
    return path.relative(ROOT, file).split(path.sep).join('/');
}

function listDirs(dir) {
    return fs.existsSync(dir)
        ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
        : [];
}

/* ------------------------------------------------------------------ */
/* 1. references inside the theme and the 404 page                     */
/* ------------------------------------------------------------------ */

function checkHtmlReferences() {
    const htmlFiles = [
        path.join(ROOT, '404.html'),
        ...walkFiles(path.join(ROOT, 'fancyindex')).filter((f) => /\.html$/.test(f)).map((f) => path.join(ROOT, 'fancyindex', f))
    ];

    const attrRe = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;

    for (const file of htmlFiles) {
        if (!fs.existsSync(file)) {
            continue;
        }
        const html = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = attrRe.exec(html)) !== null) {
            const target = match[1];
            if (!target.startsWith('/') || target.startsWith('//')) {
                continue;
            }
            stats.refs += 1;
            const local = path.join(ROOT, target.split('#')[0].split('?')[0]);
            if (!fs.existsSync(local)) {
                errors.push(`${rel(file)}: "${target}" does not exist`);
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* 2. url() targets inside stylesheets                                  */
/* ------------------------------------------------------------------ */

function checkCssUrls() {
    const cssFiles = walkFiles(LIBS).filter((f) => f.endsWith('.css'));

    for (const relPath of cssFiles) {
        const file = path.join(LIBS, relPath);
        const text = fs.readFileSync(file, 'utf8');
        const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
        let match;

        while ((match = urlRe.exec(text)) !== null) {
            const target = match[2].trim();
            if (!target || /^(data:|https?:|\/\/|#)/i.test(target)) {
                continue;
            }
            stats.cssUrls += 1;
            const clean = target.split('#')[0].split('?')[0];
            const resolved = path.resolve(path.dirname(file), clean);
            if (!fs.existsSync(resolved)) {
                report(`libs/${relPath}: missing asset "${target}"`, relPath);
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* 3. payload checks: dups, empty files, source maps, licences          */
/* ------------------------------------------------------------------ */

function checkPayloads() {
    const hashes = new Map();

    for (const relPath of walkFiles(LIBS)) {
        const file = path.join(LIBS, relPath);
        const buffer = fs.readFileSync(file);
        stats.files += 1;
        stats.bytes += buffer.length;

        if (buffer.length === 0) {
            report(`libs/${relPath}: empty file`, relPath);
        }

        if (/\.(js|css)$/.test(relPath) && buffer.length < 1024 * 1024) {
            const tail = buffer.subarray(Math.max(0, buffer.length - 400)).toString('utf8');
            const mapMatch = tail.match(/sourceMappingURL=([^\s*]+)/);
            if (mapMatch && !/^data:/.test(mapMatch[1])) {
                const mapFile = path.resolve(path.dirname(file), mapMatch[1]);
                if (!fs.existsSync(mapFile)) {
                    report(`libs/${relPath}: sourceMappingURL points to missing ${mapMatch[1]}`, relPath);
                }
            }
        }

        if (buffer.length > 0) {
            const digest = crypto.createHash('md5').update(buffer).digest('hex');
            if (!hashes.has(digest)) {
                hashes.set(digest, []);
            }
            hashes.get(digest).push(`libs/${relPath}`);
        }
    }

    let duplicateGroups = 0;
    let wasted = 0;
    const samples = [];

    for (const group of hashes.values()) {
        if (group.length < 2) {
            continue;
        }
        duplicateGroups += 1;
        const size = fs.statSync(path.join(ROOT, group[0])).size;
        wasted += size * (group.length - 1);
        if (samples.length < 4) {
            samples.push(group.slice(0, 3));
        }
    }

    if (duplicateGroups) {
        warnings.push(`${duplicateGroups} duplicate group(s), ${humanSize(wasted)} recoverable`);
        for (const sample of samples) {
            warnings.push(`  e.g. ${sample.join(' | ')}`);
        }
        if (process.argv.includes('--strict')) {
            errors.push('duplicate payloads present (strict mode)');
        }
    }
}

function checkLicences() {
    let missing = 0;
    const samples = [];

    for (const lib of listDirs(LIBS)) {
        const versions = listDirs(path.join(LIBS, lib)).filter((v) => VERSION_RE.test(v));
        for (const version of versions) {
            const dir = path.join(LIBS, lib, version);
            const entry = manifest.packages.find((pkg) => pkg.name === lib && pkg.version === version);
            if (!entry || entry.source !== 'npm') { continue; }
            const hasLicense = fs.readdirSync(dir).some((name) => /^(LICEN[CS]E|COPYING)/i.test(name));
            if (!hasLicense) {
                missing += 1;
                if (samples.length < 5) {
                    samples.push(`${lib}@${version}`);
                }
            }
        }
    }

    if (missing) {
        warnings.push(`${missing} version director(ies) without a LICENSE file: ${samples.join(', ')}${missing > samples.length ? ', ...' : ''}`);
    }
}

/* ------------------------------------------------------------------ */
/* 4. does the content match the version in the directory name?         */
/* ------------------------------------------------------------------ */

function checkVersionBanners() {
    const mismatches = [];

    for (const lib of listDirs(LIBS)) {
        const pkg = npmPackageFor(lib);
        if (!pkg) {
            continue;
        }
        for (const version of listDirs(path.join(LIBS, lib)).filter((v) => VERSION_RE.test(v))) {
            const dir = path.join(LIBS, lib, version);
            for (const relPath of walkFiles(dir)) {
                if (!/\.js$/.test(relPath) || /(all-min|bundle|standalone|vendor)/i.test(relPath)) {
                    continue;
                }
                const file = path.join(dir, relPath);
                const size = fs.statSync(file).size;
                if (size > 2 * 1024 * 1024) {
                    continue;
                }
                const head = fs.readFileSync(file).subarray(0, 320).toString('utf8');
                const banner = head.match(/[vV](\d+\.\d+(?:\.\d+)?)/);
                if (!banner) {
                    continue;
                }
                const found = banner[1];
                if (found !== version && found !== version.replace(/\.0$/, '')) {
                    mismatches.push(`${lib}/${version}/${relPath} looks like ${found}`);
                }
            }
        }
    }

    if (mismatches.length) {
        warnings.push(`${mismatches.length} file(s) whose banner version differs from the directory:`);
        for (const line of mismatches.slice(0, 8)) {
            warnings.push(`  ${line}`);
        }
    }
}

/* ------------------------------------------------------------------ */
/* 5. generated artefacts are in sync                                   */
/* ------------------------------------------------------------------ */

function checkIndexFreshness() {
    const indexFile = path.join(LIBS, 'index.json');
    if (!fs.existsSync(indexFile)) {
        warnings.push('libs/index.json is missing (run scripts/index.mjs)');
        return;
    }
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const known = new Set(Object.keys(index.libraries));

    for (const lib of listDirs(LIBS)) {
        const versions = listDirs(path.join(LIBS, lib)).filter((v) => VERSION_RE.test(v));
        if (versions.length && !known.has(lib)) {
            warnings.push(`libs/${lib} is not in libs/index.json (run scripts/index.mjs)`);
            continue;
        }
        if (!versions.length) {
            continue;
        }
        const latest = versions.slice().sort(compareVersions).pop();
        if (index.libraries[lib] && index.libraries[lib].latest !== latest) {
            warnings.push(`libs/${lib}: index.json says latest=${index.libraries[lib].latest}, disk has ${latest}`);
        }
    }
}

/* ------------------------------------------------------------------ */
/* 6. does every manifest entry declare a usable source?               */
/* ------------------------------------------------------------------ */

const KNOWN_SOURCES = new Set(['npm', 'url', 'manual']);

function checkSourceDeclarations() {
    for (const pkg of manifest.packages) {
        const label = `${pkg.name}@${pkg.version}`;

        if (!KNOWN_SOURCES.has(pkg.source)) {
            errors.push(`${label}: unknown source "${pkg.source}"`);
            continue;
        }

        if (pkg.upstream && pkg.source !== 'manual') {
            errors.push(`${label}: "upstream" is only meaningful on manual entries`);
        }
        if (pkg.upstream && pkg.upstream !== 'none') {
            errors.push(`${label}: upstream must be "none" when present`);
        }

        if (pkg.source === 'url') {
            const rules = pkg.files || [];
            if (!rules.length) {
                errors.push(`${label}: source "url" without any file rule`);
            }
            for (const rule of rules) {
                if (!rule.url) {
                    errors.push(`${label}: rule "${rule.to}" has no url`);
                }
                if (!rule.integrity) {
                    errors.push(`${label}: rule "${rule.to}" has no integrity (run --apply to pin it)`);
                }
            }
            if (!pkg.license) {
                warnings.push(`${label}: source "url" without a license field`);
            }
        }

        /* our own libraries need no explanation; a third-party copy without an
           upstream does, otherwise nobody remembers why it is manual */
        if (pkg.source === 'manual' && !pkg.note && !isSelfOwned(pkg.name)) {
            warnings.push(`${label}: third-party manual entry without a note explaining why it cannot be synced`);
        }
    }
}

/* ------------------------------------------------------------------ */
/* 7. .meta.json should not remember versions that no longer exist      */
/* ------------------------------------------------------------------ */

function checkMetaVersions() {
    for (const lib of listDirs(LIBS)) {
        const metaFile = path.join(LIBS, lib, '.meta.json');
        if (!fs.existsSync(metaFile)) {
            continue;
        }
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
        const onDisk = new Set(listDirs(path.join(LIBS, lib)).filter((v) => VERSION_RE.test(v)));
        for (const version of Object.keys(meta.versions || {})) {
            if (!onDisk.has(version)) {
                warnings.push(`libs/${lib}/.meta.json still lists ${version}, which is not on disk`);
            }
        }
    }
}

/* ------------------------------------------------------------------ */

function main() {
    checkHtmlReferences();
    checkCssUrls();
    checkPayloads();
    checkLicences();
    checkVersionBanners();
    checkIndexFreshness();
    checkSourceDeclarations();
    checkMetaVersions();

    for (const warning of warnings) {
        console.log(`  warn  ${warning}`);
    }
    for (const error of errors) {
        console.log(`  ERR   ${error}`);
    }

    console.log(`\n${stats.refs} html reference(s), ${stats.cssUrls} css url() target(s), ${stats.files} file(s), ${humanSize(stats.bytes)}`);
    console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);

    if (errors.length) {
        process.exitCode = 1;
    }
}

main();
