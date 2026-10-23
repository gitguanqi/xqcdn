#!/usr/bin/env node
/**
 * libs/ synchronizer.
 *
 * The manifest (libs.manifest.json) is the single source of truth; the tree
 * under libs/ is generated from it. Nothing here executes package scripts:
 * we only read files out of the tarball.
 *
 *   node scripts/sync.mjs --adopt            # build the manifest from what is on disk
 *   node scripts/sync.mjs --check            # verify disk against recorded fingerprints (CI)
 *   node scripts/sync.mjs --apply            # download / materialize npm packages
 *   node scripts/sync.mjs --apply --only jquery,vue
 *   node scripts/sync.mjs --apply --only jquery@3.7.1
 *   node scripts/sync.mjs --add axios@1.7.9  # register a new version
 *   node scripts/sync.mjs --upgrade          # show available upgrades (never applies)
 *   node scripts/sync.mjs --upgrade axios    # plan one library, rule-checked
 *   node scripts/sync.mjs --upgrade axios --apply
 *   node scripts/sync.mjs --bump             # alias of --upgrade
 *
 * Sources: "npm" (registry tarball), "url" (one direct link per file, pinned by
 * sha512 on first fetch), "manual" (no upstream; never downloaded).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
    ensureDir, readJson, writeJson, writeIfChanged, sha256, sha256Normalized, sha256Loose,
    walkFiles, detectEol, applyEol, trimTrailingNewlines, compareVersions, humanSize
} from './lib/fsutil.mjs';
import { getVersionMeta, getLatestVersion, downloadTarball } from './lib/registry.mjs';
import { readTarGz, normalizeEntryPath } from './lib/tar.mjs';
import { selectEntries, selectByBasename, pickBest } from './lib/glob.mjs';
import { npmPackageFor, PIN_NOTES } from './lib/sources.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const LIBS = path.join(ROOT, 'libs');
const MANIFEST_FILE = path.join(ROOT, 'libs.manifest.json');
const CACHE_DIR = path.join(ROOT, '.cache', 'tarballs');

const VERSION_RE = /^\d+\.\d+(\.\d+)?([-+][0-9A-Za-z.-]+)?$/;
/** Sources that can be downloaded; everything else is registered but skipped. */
const SYNC_SOURCES = new Set(['npm', 'url']);
const LAYOUT_DIRS = new Set(['css', 'js', 'img', 'images', 'fonts', 'font', 'lang', 'languages', 'lib', 'bin', 'vue', 'loading', 'mourn', 'src', 'dist']);

const DEFAULTS = {
    registry: 'https://registry.npmjs.org',
    withLicense: true,
    compare: 'eol-insensitive'
};

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
    const opts = { _: [] };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg.startsWith('--')) {
            opts._.push(arg);
            continue;
        }
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            opts[key] = next;
            i += 1;
        } else {
            opts[key] = true;
        }
    }
    return opts;
}

/* ------------------------------------------------------------------ */
/* Manifest + metadata                                                 */
/* ------------------------------------------------------------------ */

function loadManifest() {
    const manifest = fs.existsSync(MANIFEST_FILE)
        ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
        : null;

    if (!manifest) {
        return { defaults: { ...DEFAULTS }, packages: [] };
    }
    manifest.defaults = { ...DEFAULTS, ...(manifest.defaults || {}) };
    manifest.packages = manifest.packages || [];
    return manifest;
}

function saveManifest(manifest) {
    manifest.packages.sort((a, b) => a.name.localeCompare(b.name) || compareVersions(a.version, b.version));
    writeJson(MANIFEST_FILE, manifest);
}

function metaFile(lib) {
    return path.join(LIBS, lib, '.meta.json');
}

function loadMeta(lib) {
    return readJson(metaFile(lib), { library: lib, source: 'manual', versions: {} });
}

function saveMeta(lib, meta) {
    meta.library = lib;
    writeJson(metaFile(lib), meta);
}

function findEntry(manifest, name, version) {
    return manifest.packages.find((pkg) => pkg.name === name && pkg.version === version);
}

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

function listLibraries() {
    if (!fs.existsSync(LIBS)) {
        return [];
    }
    return fs.readdirSync(LIBS, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

function listVersions(lib) {
    const dir = path.join(LIBS, lib);
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && VERSION_RE.test(entry.name))
        .map((entry) => entry.name)
        .sort(compareVersions);
}

function rootLevelFiles(lib) {
    const dir = path.join(LIBS, lib);
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name !== '.meta.json' && entry.name !== 'latest.json')
        .map((entry) => entry.name)
        .sort();
}

function fingerprint(dir) {
    const files = {};
    for (const rel of walkFiles(dir)) {
        const buffer = fs.readFileSync(path.join(dir, rel));
        files[rel] = { sha256: sha256Normalized(buffer), size: buffer.length };
    }
    return files;
}

/* ------------------------------------------------------------------ */
/* --adopt                                                             */
/* ------------------------------------------------------------------ */

function adopt() {
    const manifest = loadManifest();
    const known = new Map(manifest.packages.map((pkg) => [`${pkg.name}@${pkg.version}`, pkg]));
    const added = [];
    let touched = 0;

    for (const lib of listLibraries()) {
        const versions = listVersions(lib);
        if (versions.length === 0) {
            console.log(`  skip  ${lib} (no version directory)`);
            continue;
        }

        const meta = loadMeta(lib);
        const pkgName = npmPackageFor(lib);

        for (const version of versions) {
            const dir = path.join(LIBS, lib, version);
            const key = `${lib}@${version}`;
            const files = fingerprint(dir);

            if (!known.has(key)) {
                const entry = {
                    name: lib,
                    version,
                    source: pkgName ? 'npm' : 'manual',
                    ...(pkgName ? { pkg: pkgName } : {}),
                    files: Object.keys(files).sort().map((to) => ({ to }))
                };
                manifest.packages.push(entry);
                known.set(key, entry);
                added.push(key);
            }

            /* Known entries keep the source declared in the manifest: one
               library can mix npm-synced and hand-maintained versions, and
               re-running --adopt must never promote or demote them. */
            meta.versions[version] = {
                ...(meta.versions[version] || {}),
                origin: (meta.versions[version] || {}).origin || 'adopted',
                files
            };
            touched += 1;
        }

        const libEntries = manifest.packages.filter((pkg) => pkg.name === lib);
        meta.source = libEntries.some((pkg) => SYNC_SOURCES.has(pkg.source)) ? 'npm' : 'manual';
        const withPkg = libEntries.find((pkg) => pkg.pkg);
        if (withPkg) {
            meta.pkg = withPkg.pkg;
        } else {
            delete meta.pkg;
        }
        saveMeta(lib, meta);
    }

    saveManifest(manifest);
    console.log(`\nadopted ${touched} version(s), ${added.length} new manifest entry/entries`);
    if (added.length) {
        console.log('new entries were registered with their current files; run --apply to switch them to the npm source');
    }
}

/* ------------------------------------------------------------------ */
/* Apply helpers                                                       */
/* ------------------------------------------------------------------ */

function cacheKeyFor(pkg, version) {
    return `${pkg.replace(/[@/]/g, '_')}-${version}.tgz`;
}

function resolveRules(entry, entries) {
    const plan = [];
    const rules = entry.files && entry.files.length
        ? entry.files
        : [{ to: '.' }];

    for (const rule of rules) {
        const from = rule.from || path.posix.basename(rule.to);
        const isDirTarget = rule.to.endsWith('/');
        let matches = rule.from ? selectEntries(entries, rule.from) : selectByBasename(entries, from);

        if (matches.length === 0) {
            if (rule.optional) {
                continue;
            }
            throw new Error(`no file matched "${from}" (rule -> ${rule.to})`);
        }

        if (!isDirTarget && matches.length > 1) {
            /* prefer the shipped build (dist/) over sources; only fail on a tie */
            const best = pickBest(matches);
            if (!best) {
                throw new Error(`"${from}" is ambiguous (${matches.length} matches: ${matches.slice(0, 4).map((m) => m.path).join(', ')}); add an explicit "from"`);
            }
            matches = [best];
        }

        for (const match of matches) {
            plan.push({
                source: match.path,
                data: match.data,
                target: isDirTarget ? `${rule.to}${path.posix.basename(match.path)}` : rule.to
            });
        }
    }

    return plan;
}

function pickLicense(entries) {
    const candidates = [...entries.keys()].filter((key) => /^(LICEN[CS]E|COPYING)(\.[a-z]+)?$/i.test(key));
    candidates.sort((a, b) => a.length - b.length);
    return candidates.length ? entries.get(candidates[0]) : null;
}

/**
 * `source: "url"` entries point at one direct link per file (an upstream CDN
 * that has no npm package for that exact build). The first fetch pins the
 * sha512 into the manifest, every later fetch has to match it. The bytes live
 * in the same `.cache/tarballs` directory, so --offline keeps working.
 */
async function fetchUrlFiles(manifest, entry, opts) {
    const plan = [];
    let pinned = 0;

    for (const rule of entry.files || []) {
        if (!rule.url) {
            throw new Error(`rule "${rule.to}" has no "url"; every rule of a source:"url" entry needs a direct link`);
        }

        const base = path.posix.basename(rule.to);
        const { buffer } = await downloadTarball({
            url: rule.url,
            integrity: rule.integrity,
            cacheDir: CACHE_DIR,
            cacheKey: `url-${base}-${entry.version}`,
            offline: Boolean(opts.offline)
        });

        if (!rule.integrity) {
            rule.integrity = `sha512-${crypto.createHash('sha512').update(buffer).digest('base64')}`;
            pinned += 1;
            console.log(`\n      pin ${entry.name}/${entry.version}/${base}  ${rule.integrity.slice(0, 28)}...`);
        }

        plan.push({ source: rule.url, data: buffer, target: rule.to });
    }

    if (pinned) {
        saveManifest(manifest);
    }

    return plan;
}

async function applyPackage(manifest, entry, opts) {
    if (!SYNC_SOURCES.has(entry.source)) {
        return { status: 'skipped', reason: 'no upstream source' };
    }

    const registry = entry.registry || manifest.defaults.registry;
    const dir = path.join(LIBS, entry.name, entry.version);
    const meta = loadMeta(entry.name);
    const previous = meta.versions[entry.version];

    /* Once a version was materialized from a remote source, a mismatch means
       somebody edited the file by hand -- refuse instead of silently reverting. */
    if (previous && SYNC_SOURCES.has(previous.origin) && !opts.force) {
        const dirty = [];
        for (const [rel, info] of Object.entries(previous.files || {})) {
            const file = path.join(dir, rel);
            if (!fs.existsSync(file) || sha256Normalized(fs.readFileSync(file)) !== info.sha256) {
                dirty.push(rel);
            }
        }
        if (dirty.length) {
            throw new Error(`local modifications detected (${dirty.slice(0, 3).join(', ')}); re-run with --force to overwrite`);
        }
    }

    let metaUrl = null;
    let entries = null;
    let plan;

    if (entry.source === 'npm') {
        metaUrl = await getVersionMeta(entry.pkg, entry.version, registry);
        const { buffer } = await downloadTarball({
            url: metaUrl.tarball,
            integrity: metaUrl.integrity,
            cacheDir: CACHE_DIR,
            cacheKey: cacheKeyFor(entry.pkg, entry.version),
            offline: Boolean(opts.offline)
        });

        entries = new Map();
        for (const [key, data] of readTarGz(buffer)) {
            const normalized = normalizeEntryPath(key);
            if (normalized.includes('..') || normalized.startsWith('/')) {
                continue;
            }
            entries.set(normalized, data);
        }

        plan = resolveRules(entry, entries);
    } else {
        plan = await fetchUrlFiles(manifest, entry, opts);
    }

    /* --upgrade uses dryRun to prove that the file rules still resolve against
       the new artifact before anything touches the disk. */
    if (opts.dryRun) {
        return { status: 'planned', planned: plan.length, files: plan.map((item) => item.target) };
    }

    /* Published builds usually end with "//# sourceMappingURL=xxx.map".
       We do not ship .map files (they are huge), so the comment is dropped
       to avoid a guaranteed 404 on every consumer's console. */
    const produced = new Set(plan.map((item) => path.posix.basename(item.target)));
    for (const item of plan) {
        /* rewritePaths must also reach single-file components and html demos,
           where the CDN base url is usually hard-coded */
        if (!/\.(js|css|vue|html?|json|s[ac]ss|less)$/i.test(item.target)) {
            continue;
        }
        let text = item.data.toString('utf8');
        let touched = false;

        if (entry.rewritePaths) {
            for (const [from, to] of Object.entries(entry.rewritePaths)) {
                if (text.includes(from)) {
                    text = text.split(from).join(to);
                    touched = true;
                }
            }
        }

        if (entry.stripSvgFont) {
            /* the SVG font source is not shipped by upstream any more and is
               ignored by every current browser: drop the dead reference */
            const withoutSvg = text.replace(/,\s*url\([^)]*\.svg[^)]*\)\s*format\((["'])svg\1\)/gi, '');
            if (withoutSvg !== text) {
                text = withoutSvg;
                touched = true;
            }
        }

        /* Published builds often end with a sourceMappingURL comment
           ("//# ..." in JS, "/*# ... *\/" in CSS). We do not ship .map files
           (they are huge), so the comment is dropped to avoid a guaranteed
           404 on every consumer's console. */
        const tail = text.slice(-300);
        const mapRef = tail.match(/sourceMappingURL=([^\s*]+)/);
        if (mapRef && !produced.has(path.posix.basename(mapRef[1]))) {
            text = text.replace(/\s*(?:\/\/[#@]\s*sourceMappingURL=\S+|\/\*[#@]\s*sourceMappingURL=[^*]+\*\/)\s*$/, '');
            touched = true;
            entry.postProcess = Array.from(new Set([...(entry.postProcess || []), 'strip-sourcemap']));
        }

        if (touched) {
            item.data = Buffer.from(text, 'utf8');
        }
    }

    /* nothing on disk yet -> write everything */
    if (!fs.existsSync(dir)) {
        ensureDir(dir);
    }

    let written = 0;
    let unchanged = 0;
    const files = {};

    for (const item of plan) {
        const target = path.join(dir, item.target);
        const current = fs.existsSync(target) ? fs.readFileSync(target) : null;

        if (process.env.XQ_DEBUG) {
            console.log(`      dbg ${item.target} cur=${current ? current.length : 'none'} src=${item.data.length} looseCur=${current ? sha256Loose(current).slice(0, 8) : '-'} looseSrc=${sha256Loose(item.data).slice(0, 8)}`);
        }

        /* Byte content is authoritative; line endings are not. If the file
           already carries the same bytes up to EOL, leave it completely
           untouched so migration does not rewrite the whole tree. */
        if (current && sha256Loose(current) === sha256Loose(item.data)) {
            unchanged += 1;
            files[item.target] = { sha256: sha256Normalized(current), size: current.length };
            continue;
        }

        const eol = current ? detectEol(current) : '\n';
        let content = applyEol(item.data, eol);

        /* keep the file's existing "ends with newline or not" habit, so a
           pure formatting difference never shows up as a content change */
        if (current && !/[\r\n]$/.test(current.toString('binary'))) {
            content = trimTrailingNewlines(content);
        }
        if (writeIfChanged(target, content)) {
            written += 1;
            console.log(`      + ${entry.name}/${entry.version}/${item.target}  (${humanSize(content.length)})`);
        } else {
            unchanged += 1;
        }
        files[item.target] = { sha256: sha256Normalized(content), size: content.length };
    }

    if (entry.source === 'npm' && manifest.defaults.withLicense && !files.LICENSE) {
        const license = pickLicense(entries);
        if (license) {
            const target = path.join(dir, 'LICENSE');
            if (writeIfChanged(target, license)) {
                written += 1;
                console.log(`      + ${entry.name}/${entry.version}/LICENSE`);
            }
            files.LICENSE = { sha256: sha256Normalized(license), size: license.length };
        }
    }

    meta.source = manifest.packages.some((pkg) => pkg.name === entry.name && pkg.source === 'npm')
        ? 'npm'
        : entry.source;
    if (entry.source === 'npm') {
        meta.pkg = entry.pkg;
    }
    meta.versions[entry.version] = {
        origin: entry.source,
        ...(entry.source === 'npm'
            ? { registry, tarball: metaUrl.tarball, integrity: metaUrl.integrity || null }
            : { urls: (entry.files || []).map((rule) => ({ to: rule.to, url: rule.url, integrity: rule.integrity || null })) }),
        license: (metaUrl && metaUrl.license) || entry.license || null,
        fetchedAt: new Date().toISOString(),
        files
    };
    saveMeta(entry.name, meta);

    return {
        status: written > 0 ? 'applied' : 'unchanged',
        written,
        unchanged,
        previous: previous ? previous.origin : null
    };
}

/* ------------------------------------------------------------------ */
/* --apply                                                             */
/* ------------------------------------------------------------------ */

async function apply(opts) {
    const manifest = loadManifest();
    const only = opts.only ? String(opts.only).split(',').map((item) => item.trim()).filter(Boolean) : null;

    let applied = 0;
    let unchanged = 0;
    const failures = [];

    for (const entry of manifest.packages) {
        if (only && !only.includes(entry.name) && !only.includes(`${entry.name}@${entry.version}`)) {
            continue;
        }
        if (!SYNC_SOURCES.has(entry.source)) {
            continue;
        }

        process.stdout.write(`  sync  ${entry.name}@${entry.version}  `);
        try {
            const result = await applyPackage(manifest, entry, opts);
            if (result.status === 'applied') {
                applied += 1;
                console.log(`\r  sync  ${entry.name}@${entry.version}  written ${result.written}, unchanged ${result.unchanged}`);
            } else {
                unchanged += 1;
                console.log(`\r  sync  ${entry.name}@${entry.version}  already up to date`);
            }
        } catch (error) {
            failures.push({ entry, error });
            console.log(`\r  fail  ${entry.name}@${entry.version}  ${error.message}`);
        }
    }

    console.log(`\napplied ${applied}, unchanged ${unchanged}, failed ${failures.length}`);
    if (failures.length) {
        process.exitCode = 1;
    }
}

/* ------------------------------------------------------------------ */
/* --check                                                             */
/* ------------------------------------------------------------------ */

function check() {
    const manifest = loadManifest();
    const problems = [];
    const warnings = [];
    let checked = 0;

    for (const entry of manifest.packages) {
        const dir = path.join(LIBS, entry.name, entry.version);
        const label = `${entry.name}@${entry.version}`;

        if (!fs.existsSync(dir)) {
            problems.push(`${label}: directory libs/${entry.name}/${entry.version} is missing`);
            continue;
        }

        const meta = loadMeta(entry.name);
        const recorded = meta.versions && meta.versions[entry.version];
        if (!recorded || !recorded.files) {
            warnings.push(`${label}: no fingerprint recorded yet (run --adopt)`);
            continue;
        }

        for (const [rel, info] of Object.entries(recorded.files)) {
            const file = path.join(dir, rel);
            if (!fs.existsSync(file)) {
                problems.push(`${label}: missing file ${rel}`);
                continue;
            }
            const buffer = fs.readFileSync(file);
            if (sha256Normalized(buffer) !== info.sha256) {
                problems.push(`${label}: modified file ${rel}`);
            }
            checked += 1;
        }

        const declared = new Set(Object.keys(recorded.files));
        for (const rel of walkFiles(dir)) {
            if (!declared.has(rel)) {
                warnings.push(`${label}: untracked file ${rel}`);
            }
        }

        if (entry.source === 'npm' && recorded.origin !== 'npm') {
            warnings.push(`${label}: declared as npm source but never synchronized (run --apply --only ${entry.name})`);
        }
    }

    for (const warning of warnings) {
        console.log(`  warn  ${warning}`);
    }
    for (const problem of problems) {
        console.log(`  ERR   ${problem}`);
    }

    console.log(`\nchecked ${checked} file(s): ${problems.length} problem(s), ${warnings.length} warning(s)`);
    if (problems.length) {
        process.exitCode = 1;
    }
}

/* ------------------------------------------------------------------ */
/* --add / --bump                                                      */
/* ------------------------------------------------------------------ */

async function addPackage(spec, opts) {
    const manifest = loadManifest();
    const at = spec.lastIndexOf('@');
    const name = at > 0 ? spec.slice(0, at) : spec;
    const version = at > 0 ? spec.slice(at + 1) : null;
    const pkg = opts.pkg || npmPackageFor(name) || name;
    const registry = manifest.defaults.registry;

    const resolvedVersion = version || (await getLatestVersion(pkg, registry)).latest;
    if (!resolvedVersion) {
        throw new Error(`cannot resolve a version for ${pkg}`);
    }

    if (findEntry(manifest, name, resolvedVersion)) {
        console.log(`${name}@${resolvedVersion} is already registered`);
        return;
    }

    manifest.packages.push({
        name,
        version: resolvedVersion,
        source: opts.source === 'manual' ? 'manual' : 'npm',
        ...(opts.source === 'manual' ? {} : { pkg }),
        files: []
    });
    saveManifest(manifest);

    console.log(`registered ${name}@${resolvedVersion} (npm: ${pkg})`);
    console.log(`next: add the files to libs.manifest.json, then run --apply --only ${name}`);
}

/* ------------------------------------------------------------------ */
/* --upgrade : move a library to the newest version of its package     */
/* ------------------------------------------------------------------ */

function cloneRules(entry, version) {
    const draft = {
        name: entry.name,
        version,
        source: 'npm',
        pkg: entry.pkg || entry.name,
        files: JSON.parse(JSON.stringify(entry.files || []))
    };
    for (const key of ['registry', 'rewritePaths', 'stripSvgFont', 'license']) {
        if (entry[key]) {
            draft[key] = JSON.parse(JSON.stringify(entry[key]));
        }
    }
    return draft;
}

function isMajorJump(from, to) {
    return String(from).split('.')[0] !== String(to).split('.')[0];
}

async function upgrade(opts) {
    const manifest = loadManifest();
    const named = opts.upgrade && opts.upgrade !== true
        ? String(opts.upgrade).split(',').map((item) => item.trim()).filter(Boolean)
        : null;
    const applyChanges = Boolean(opts.apply);
    const failures = [];
    const groups = new Map();
    let candidate = 0;
    let applied = 0;
    let pinned = 0;
    let majors = 0;

    for (const entry of manifest.packages) {
        if (!groups.has(entry.name)) {
            groups.set(entry.name, []);
        }
        groups.get(entry.name).push(entry);
    }

    for (const [name, entries] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (named && !named.includes(name)) {
            continue;
        }

        const syncable = entries.filter((entry) => entry.source === 'npm');
        if (!syncable.length) {
            if (named) {
                console.log(`  skip    ${name.padEnd(16)} no npm source (manual or url only)`);
            }
            continue;
        }

        const template = syncable.slice().sort((a, b) => compareVersions(a.version, b.version)).at(-1);
        const pkg = template.pkg || name;
        const registry = template.registry || manifest.defaults.registry;

        if (PIN_NOTES[name] && !opts.force) {
            pinned += 1;
            console.log(`  pinned  ${name.padEnd(16)} ${template.version}  (${PIN_NOTES[name]})`);
            continue;
        }

        let latest;
        try {
            latest = (await getLatestVersion(pkg, registry)).latest;
        } catch (error) {
            failures.push(`${name}: ${error.message}`);
            console.log(`  warn    ${name.padEnd(16)} ${error.message}`);
            continue;
        }

        if (!latest || compareVersions(latest, template.version) <= 0) {
            console.log(`  ok      ${name.padEnd(16)} ${template.version} is the newest release`);
            continue;
        }

        if (findEntry(manifest, name, latest)) {
            console.log(`  ok      ${name.padEnd(16)} ${latest} is already registered`);
            continue;
        }

        if (isMajorJump(template.version, latest) && !named && !opts.force) {
            majors += 1;
            console.log(`  major   ${name.padEnd(16)} ${template.version} -> ${latest}  (major jump: name it explicitly or use --force)`);
            continue;
        }

        candidate += 1;

        if (!named && !applyChanges) {
            console.log(`  upgrade ${name.padEnd(16)} ${template.version} -> ${latest}`);
            continue;
        }

        const draft = cloneRules(template, latest);
        manifest.packages.push(draft);
        try {
            const result = await applyPackage(manifest, draft, { ...opts, force: true, dryRun: !applyChanges });
            if (result.status === 'planned') {
                manifest.packages = manifest.packages.filter((item) => item !== draft);
                console.log(`  plan    ${name.padEnd(16)} ${template.version} -> ${latest}  (${result.planned} file rule(s) resolve)`);
            } else {
                applied += 1;
                console.log(`  upgrade ${name.padEnd(16)} ${template.version} -> ${latest}  written ${result.written}, unchanged ${result.unchanged}`);
            }
        } catch (error) {
            manifest.packages = manifest.packages.filter((item) => item !== draft);
            fs.rmSync(path.join(LIBS, name, latest), { recursive: true, force: true });
            failures.push(`${name}@${latest}: ${error.message}`);
            console.log(`  fail    ${name.padEnd(16)} ${template.version} -> ${latest}  ${error.message}`);
        }
    }

    if (applied) {
        saveManifest(manifest);
        if (applyChanges) {
            const { generateAll } = await import('./index.mjs');
            generateAll();
        }
    }

    console.log(`\n${candidate} candidate(s), ${applied} applied, ${pinned} pinned, ${majors} major skipped`);
    if (!applyChanges) {
        console.log('dry run: nothing was written; add --apply to materialize');
    }
    if (failures.length) {
        console.log(`\n${failures.length} failure(s):`);
        for (const failure of failures) {
            console.log(`  - ${failure}`);
        }
        process.exitCode = 1;
    }
}

/** `--bump` kept as an alias: the old name only printed the plan. */
async function bump() {
    await upgrade({ upgrade: true, apply: false });
}

/* ------------------------------------------------------------------ */
/* --audit : which local files are not available in the upstream package */
/* ------------------------------------------------------------------ */

async function audit(opts) {
    const manifest = loadManifest();
    const only = opts.audit && opts.audit !== true ? String(opts.audit).split(',') : null;
    const report = [];

    for (const entry of manifest.packages) {
        if (entry.source !== 'npm' || (only && !only.includes(entry.name))) {
            continue;
        }

        try {
            const registry = entry.registry || manifest.defaults.registry;
            const metaUrl = await getVersionMeta(entry.pkg, entry.version, registry);
            const { buffer } = await downloadTarball({
                url: metaUrl.tarball,
                integrity: metaUrl.integrity,
                cacheDir: CACHE_DIR,
                cacheKey: cacheKeyFor(entry.pkg, entry.version),
                offline: Boolean(opts.offline)
            });
            const entries = new Map();
            for (const [key, data] of readTarGz(buffer)) {
                entries.set(normalizeEntryPath(key), data);
            }

            const missing = [];
            for (const rule of entry.files || []) {
                if (rule.optional) { continue; }
                const from = rule.from || path.posix.basename(rule.to);
                const matches = rule.from ? selectEntries(entries, rule.from) : selectByBasename(entries, from);
                if (matches.length === 0) {
                    missing.push(rule.to);
                }
            }
            if (missing.length) {
                report.push({ label: `${entry.name}@${entry.version}`, pkg: entry.pkg, missing });
            }
        } catch (error) {
            report.push({ label: `${entry.name}@${entry.version}`, pkg: entry.pkg, error: error.message });
        }
    }

    if (!report.length) {
        console.log('no drift: every declared file exists upstream');
        return;
    }

    for (const row of report) {
        console.log(`  ${row.label}  (npm: ${row.pkg})`);
        if (row.error) {
            console.log(`    ! ${row.error}`);
            continue;
        }
        for (const file of row.missing) {
            console.log(`    - not upstream: ${file}`);
        }
    }
    console.log('\nMark legacy files with "optional": true, or move the version to source "manual".');
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

async function main() {
    const opts = parseArgs(process.argv.slice(2));

    if (opts.help || Object.keys(opts).length === 1) {
        console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
        return;
    }

    if (opts.adopt) {
        adopt();
        return;
    }
    if (opts.check) {
        check();
        return;
    }
    /* `--upgrade --apply` must run the upgrader, not the plain apply loop. */
    if (opts.upgrade) {
        await upgrade(opts);
        return;
    }
    if (opts.apply) {
        await apply(opts);
        return;
    }
    if (opts.add) {
        await addPackage(String(opts.add), opts);
        return;
    }
    if (opts.bump) {
        await bump();
        return;
    }
    if (opts.audit) {
        await audit(opts);
        return;
    }

    console.log('nothing to do; try --adopt, --check, --apply, --add, --upgrade or --bump');
}

main().catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
});
