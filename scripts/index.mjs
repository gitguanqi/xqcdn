#!/usr/bin/env node
/**
 * Generates everything that is derived from the tree under libs/:
 *
 *   libs/index.json                 machine readable inventory (with sha256)
 *   libs/{lib}/latest.json          pointer to the newest version
 *   libs/{lib}/README.md            human readable entry point per library
 *   libs/SHA256SUMS                 checksums for the whole tree
 *   deploy/latest/{lib}.conf        nginx rules keeping the old flat URLs alive
 *
 * Everything here is idempotent: running it twice produces no diff.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureDir, readJson, writeJson, writeIfChanged, sha256, walkFiles, compareVersions, humanSize } from './lib/fsutil.mjs';
import { isSelfOwned } from './lib/sources.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const LIBS = path.join(ROOT, 'libs');
const DEPLOY = path.join(ROOT, 'deploy', 'latest');
const VERSION_RE = /^\d+\.\d+(\.\d+)?([-+][0-9A-Za-z.-]+)?$/;
const SKIP_ROOT_FILES = new Set(['.meta.json', 'latest.json', 'README.md']);

function listDirs(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

function listFiles(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();
}

function metaFile(lib) {
    return path.join(LIBS, lib, '.meta.json');
}

function loadMeta(lib) {
    return readJson(metaFile(lib), { library: lib, versions: {} });
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildIndex() {
    const libraries = {};
    const sums = [];
    const legacy = {};

    for (const lib of listDirs(LIBS)) {
        const versions = listDirs(path.join(LIBS, lib)).filter((name) => VERSION_RE.test(name));
        if (!versions.length) {
            continue;
        }

        const sorted = versions.slice().sort(compareVersions);
        const latest = sorted[sorted.length - 1];
        const meta = loadMeta(lib);
        const entry = { latest, versions: {} };

        for (const version of sorted) {
            const dir = path.join(LIBS, lib, version);
            const files = {};
            for (const rel of walkFiles(dir)) {
                const full = path.join(dir, rel);
                const stat = fs.statSync(full);
                files[rel] = {
                    size: stat.size,
                    sha256: sha256(fs.readFileSync(full))
                };
                sums.push(`${files[rel].sha256}  libs/${lib}/${version}/${rel}`);
            }
            entry.versions[version] = {
                source: (meta.versions && meta.versions[version] && meta.versions[version].origin) || 'adopted',
                files
            };
        }

        libraries[lib] = entry;

        /* Remember which files used to sit directly under libs/{lib}/ so the
           nginx snippet keeps answering those legacy URLs even after the
           physical duplicates are removed. Paths are stored relative to the
           library directory (e.g. "jquery.min.js", "css/bootstrap.min.css"). */
        const rootFiles = walkFiles(path.join(LIBS, lib))
            .filter((relPath) => !VERSION_RE.test(relPath.split('/')[0]))
            .filter((relPath) => !SKIP_ROOT_FILES.has(relPath));
        if (rootFiles.length) {
            meta.legacyRootPaths = Array.from(new Set([...(meta.legacyRootPaths || []), ...rootFiles])).sort();
            writeJson(metaFile(lib), meta);
        }
        if (meta.legacyRootPaths && meta.legacyRootPaths.length) {
            legacy[lib] = { latest, paths: meta.legacyRootPaths };
        }
    }

    return { libraries, sums, legacy };
}

function buildSourceMap(manifest) {
    const map = new Map();
    for (const pkg of manifest.packages) {
        map.set(`${pkg.name}@${pkg.version}`, pkg);
    }
    return map;
}

function describeSource(entry) {
    if (!entry) {
        return '未登记（manual）';
    }
    if (entry.source === 'npm') {
        return `npm \`${entry.pkg || entry.name}\``;
    }
    if (entry.source === 'url') {
        const first = (entry.files || []).find((rule) => rule.url);
        let host = '官方 CDN';
        try {
            host = new URL(first.url).host;
        } catch {
            /* keep the generic label */
        }
        return `官方 CDN 直取（${host}）`;
    }
    return entry.upstream === 'none' ? '第三方副本（无上游）' : '本仓库维护（manual）';
}

function writeLibraryDocs(libraries, manifest) {
    const sources = buildSourceMap(manifest);
    let written = 0;

    for (const [lib, info] of Object.entries(libraries)) {
        const versions = Object.keys(info.versions);

        const rows = versions.slice().reverse().map((version) => {
            const files = info.versions[version].files;
            const total = Object.values(files).reduce((sum, file) => sum + file.size, 0);
            return `| ${version}${version === info.latest ? ' (latest)' : ''} | ${Object.keys(files).length} | ${humanSize(total)} |`;
        });

        const latestFiles = Object.keys(info.versions[info.latest].files);
        const sample = latestFiles.filter((name) => /\.min\.(js|css)$/.test(name))[0] || latestFiles[0] || '';

        const lines = [
            `# ${lib}`,
            '',
            `> 由 \`scripts/index.mjs\` 自动生成，请勿手工编辑。`,
            '',
            `- 当前版本：\`${info.latest}\``,
            `- 同步来源：${describeSource(sources.get(`${lib}@${info.latest}`))}`,
            `- CDN 路径：\`/libs/${lib}/${info.latest}/${sample}\``,
            '',
            '| 版本 | 文件数 | 体积 |',
            '| --- | --- | --- |',
            ...rows,
            '',
            `## ${info.latest}`,
            '',
            '```',
            ...latestFiles.slice(0, 40).map((name) => `libs/${lib}/${info.latest}/${name}`),
            ...(latestFiles.length > 40 ? [`... 共 ${latestFiles.length} 个文件，完整列表见 libs/index.json`] : []),
            '```',
            ''
        ];

        if (writeIfChanged(path.join(LIBS, lib, 'README.md'), lines.join('\n'))) {
            written += 1;
        }
    }

    return written;
}

function writeLatestPointers(libraries) {
    let written = 0;
    for (const [lib, info] of Object.entries(libraries)) {
        const payload = {
            library: lib,
            latest: info.latest,
            path: `/libs/${lib}/${info.latest}/`
        };
        if (writeJsonIfChanged(path.join(LIBS, lib, 'latest.json'), payload)) {
            written += 1;
        }
    }
    return written;
}

function writeJsonIfChanged(file, value) {
    return writeIfChanged(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Emits one nginx location per library so the flat URL
 * /libs/{lib}/{file} keeps working after the duplicated copies are deleted.
 * The regex captures any mount prefix, so both "/libs/" and "/xqcdn/libs/"
 * are served by the same snippet.
 */
function writeNginxSnippets(legacy) {
    ensureDir(DEPLOY);
    let written = 0;

    for (const [lib, info] of Object.entries(legacy)) {
        /* Collapse "css/bootstrap.min.css", "css/bootstrap.css" ... into a
           single "css/.+" alternative so the snippet stays short. */
        const alternatives = new Set();
        for (const relPath of info.paths) {
            const parts = relPath.split('/');
            alternatives.add(parts.length === 1 ? escapeRegExp(parts[0]) : `${escapeRegExp(parts[0])}/.+`);
        }

        const body = [
            '# Generated by scripts/index.mjs -- do not edit by hand.',
            `# Legacy flat URLs: /libs/${lib}/{path} -> /libs/${lib}/${info.latest}/{path}`,
            `location ~ ^(?<xq_prefix>/(?:[^/]+/)*libs)/${escapeRegExp(lib)}/(?<xq_file>${[...alternatives].sort().join('|')})$ {`,
            `    rewrite ^ $xq_prefix/${lib}/${info.latest}/$xq_file last;`,
            '}',
            ''
        ].join('\n');

        if (writeIfChanged(path.join(DEPLOY, `${lib}.conf`), body)) {
            written += 1;
        }
    }

    return written;
}

/**
 * THIRD-PARTY-NOTICES.md: who owns what, so redistribution stays compliant.
 * Data comes straight from libs.manifest.json and the recorded .meta.json.
 */
function writeNotices(libraries) {
    void libraries;
    const manifest = readJson(path.join(ROOT, 'libs.manifest.json'), { packages: [] });

    const entries = manifest.packages.map((pkg) => {
        const meta = loadMeta(pkg.name);
        const version = meta.versions && meta.versions[pkg.version];
        return {
            ...pkg,
            license: pkg.license || (version && version.license) || ''
        };
    });

    /* npm: one row per library, versions collapsed */
    const npmGroups = new Map();
    for (const entry of entries.filter((item) => item.source === 'npm')) {
        const record = npmGroups.get(entry.name) || { pkg: entry.pkg || entry.name, versions: [], licenses: new Set() };
        record.versions.push(entry.version);
        if (entry.license) {
            record.licenses.add(entry.license);
        }
        npmGroups.set(entry.name, record);
    }
    const npmRows = [...npmGroups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, record]) => `| \`${name}\` | \`${record.pkg}\` | ${record.versions.join(', ')} | ${[...record.licenses].join(' / ') || 'see LICENSE'} |`);

    /* url: one row per version, listing where the bytes come from */
    const urlRows = entries
        .filter((item) => item.source === 'url')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => {
            const files = (entry.files || []).filter((rule) => rule.url);
            let host = '';
            try {
                host = new URL(files[0].url).host;
            } catch {
                host = 'CDN';
            }
            const names = files.map((rule) => `\`${rule.to}\``).join(', ');
            return `| \`${entry.name}\` | ${entry.version} | ${host} · ${names} | ${entry.license || '见上游'} |`;
        });

    /* third party, no upstream: keep the copyright on record */
    const thirdRows = entries
        .filter((item) => item.source === 'manual' && !isSelfOwned(item.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => {
            const rights = entry.copyright || '未标注（存档副本，版权归原作者）';
            const note = entry.note ? `；${entry.note}` : '';
            return `| \`${entry.name}\` | ${entry.version} | ${entry.license || '未标注'} | ${rights}${note} |`;
        });

    /* our own code that is not published to npm yet */
    const selfLines = entries
        .filter((item) => item.source === 'manual' && isSelfOwned(item.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => `- \`${entry.name}\` ${entry.version}${entry.note ? `：${entry.note}` : ''}`);

    const content = [
        '# 第三方组件声明',
        '',
        '本仓库再分发的第三方前端资源，版权归各自作者所有，按其原始许可证分发。',
        '每个版本目录下的 `LICENSE` / `NOTICE` 是从上游取得、或按上游要求补充的许可文本。',
        '',
        '## npm 自动同步',
        '',
        '由 `node scripts/sync.mjs --apply` 从 registry.npmjs.org 拉取；许可证取自包元数据。',
        '',
        '| 本地目录 | npm 包 | 版本 | 许可证 |',
        '| --- | --- | --- | --- |',
        ...npmRows,
        '',
        '## 官方 CDN 直取',
        '',
        'npm 上没有对应版本，改从项目官方 CDN 按文件直取。首次拉取即把 sha512 写进清单，之后每次校验。',
        '',
        '| 本地目录 | 版本 | 来源 | 许可证 |',
        '| --- | --- | --- | --- |',
        ...(urlRows.length ? urlRows : ['| - | - | - | - |']),
        '',
        '## 第三方副本 · 无上游',
        '',
        '这些目录是历史副本，上游没有可校验的同版本产物，因此不做自动同步。',
        '版权归原作者；本仓库仅按原样镜像，权利人如有异议可随时移除。',
        '',
        '| 本地目录 | 版本 | 许可证 | 版权 / 说明 |',
        '| --- | --- | --- | --- |',
        ...thirdRows,
        '',
        '### Open Sans 说明',
        '',
        '`opensans/0.0.1` 里的字体是 **Open Sans 1.10**（2011 年版），字体内嵌 name 表声明：',
        '`Digitized data copyright (c) 2010-2011, Google Corporation.`、',
        '`Licensed under the Apache License, Version 2.0`，设计方 Ascender Corp.（Steve Matteson），',
        '`Open Sans` 是 Google 的商标。因此按 **Apache-2.0** 分发，许可全文见 `libs/opensans/0.0.1/LICENSE`，',
        '署名见同目录 `NOTICE`。目录里的 `css/opensans*.css` 是二次改写的 `@font-face` 包装（字体族名改为',
        '`opensans*` / `opensansBold`），不是上游文件，按本仓库 MIT 授权。',
        '',
        '## 本仓库自有',
        '',
        '`xq*` 系列由本仓库作者维护，随根目录 `LICENSE`（MIT）分发。已发布到 npm 的版本见上表自动同步，',
        '以下版本 npm 上尚未发布，仍为手工维护：',
        '',
        ...(selfLines.length ? selfLines : ['- （无）']),
        '',
        '## 主题',
        '',
        '`fancyindex/` 基于 [llorephie/ngx-fancyindex-theme-bootstrap](https://github.com/llorephie/ngx-fancyindex-theme-bootstrap)，',
        'MIT License, Copyright (c) 2017 Maxim Martyanov。原始许可全文见 `fancyindex/LICENSE`。',
        '',
        '## 其它',
        '',
        '- `soft/nginx/ngx-fancyindex.zip`：ngx-fancyindex 模块，BSD-2-Clause（Aperez 等作者）。',
        '- `soft/nginx/Nginx-Fancyindex-Theme*.zip`：主题包，MIT（Lilian Besson / 上游作者）。',
        ''
    ].join('\n');

    return writeIfChanged(path.join(ROOT, 'THIRD-PARTY-NOTICES.md'), content);
}

/**
 * soft/SHA256SUMS: the binaries under soft/ are not covered by libs/SHA256SUMS,
 * but they are the ones people download by hand — checksum them too so a
 * corrupted or tampered archive is obvious before it is executed.
 */
function writeSoftSums() {
    const dir = path.join(ROOT, 'soft');
    const files = walkFiles(dir).sort();
    const lines = [];

    for (const rel of files) {
        if (rel === 'SHA256SUMS') {
            continue;
        }
        lines.push(`${sha256(fs.readFileSync(path.join(dir, rel)))}  soft/${rel}`);
    }

    return writeIfChanged(path.join(dir, 'SHA256SUMS'), `${lines.join('\n')}\n`);
}

export function generateAll() {
    const { libraries, sums, legacy } = buildIndex();
    const manifest = readJson(path.join(ROOT, 'libs.manifest.json'), { packages: [] });

    writeJson(path.join(LIBS, 'index.json'), {
        generatedAt: new Date().toISOString().slice(0, 10),
        libraries
    });

    const docs = writeLibraryDocs(libraries, manifest);
    const pointers = writeLatestPointers(libraries);
    const snippets = writeNginxSnippets(legacy);
    const notices = writeNotices(libraries);

    sums.sort();
    const sumsChanged = writeIfChanged(path.join(LIBS, 'SHA256SUMS'), `${sums.join('\n')}\n`);
    const softChanged = writeSoftSums();

    console.log(`libraries      ${Object.keys(libraries).length}`);
    console.log(`versions       ${sums.length ? Object.values(libraries).reduce((n, lib) => n + Object.keys(lib.versions).length, 0) : 0}`);
    console.log(`README.md      ${docs} written`);
    console.log(`latest.json    ${pointers} written`);
    console.log(`nginx conf     ${snippets} written`);
    console.log(`notices        ${notices ? 'updated' : 'unchanged'}`);
    console.log(`SHA256SUMS     ${sumsChanged ? 'updated' : 'unchanged'}`);
    console.log(`soft sums      ${softChanged ? 'updated' : 'unchanged'}`);
}

/* Keep `node scripts/index.mjs` working while letting sync.mjs --upgrade reuse
   the same generator through `import(...)`. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    generateAll();
}
