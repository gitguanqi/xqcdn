#!/usr/bin/env node
/**
 * Builds a self-contained static tree for hosts that cannot run nginx
 * (GitHub Pages being the main one).
 *
 * What it adds on top of a plain copy:
 *   - an index.html for every directory (nginx fancyindex has no equivalent there)
 *   - the flat "latest" URLs materialised as real files (/libs/jquery/jquery.min.js),
 *     because Pages cannot do the rewrite used by deploy/latest/*.conf
 *   - .nojekyll so Jekyll does not touch the tree
 *
 * The generated pages reuse fancyindex/header.html and footer.html, so the
 * chrome (nav, search box, breadcrumbs, footer) stays identical to the nginx
 * deployment. The custom theme is fragment-based: header/footer are bare
 * chrome around nginx's native table, and fancy-index.js enhances it on the
 * client. #nginx-fancyindex-directory is still filled in at build time for
 * environments where the progressive enhancement does not run.
 *
 * Usage:
 *   node scripts/build.mjs                       # -> dist/, base "/"
 *   node scripts/build.mjs --base /xqcdn/        # project site (test.github.io/xqcdn/)
 *   node scripts/build.mjs --no-materialize-latest
 *   node scripts/build.mjs --include-soft        # also ship the soft/ archives
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureDir, readJson, writeIfChanged, walkFiles, humanSize } from './lib/fsutil.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const LIBS = path.join(ROOT, 'libs');

/* Files that are part of the build but must never be published as-is. */
const SKIP = new Set([
    'libs.manifest.json',
    'scripts',
    'deploy',
    '.git',
    '.cache',
    'dist',
    'node_modules'
]);

/* Root level entries that get copied. soft/ is opt-in: it is 13 MB of
   installers, not part of a library CDN. */
const ROOT_ENTRIES = ['libs', 'fancyindex', 'img', 'fonts', 'favicon.ico', '404.html', 'LICENSE', 'THIRD-PARTY-NOTICES.md'];

const MIME_LABEL = {
    '.js': 'JS',
    '.mjs': 'JS',
    '.css': 'CSS',
    '.json': 'JSON',
    '.map': '地图',
    '.html': 'HTML',
    '.md': '文档',
    '.txt': '文本',
    '.png': '图片',
    '.jpg': '图片',
    '.jpeg': '图片',
    '.gif': '图片',
    '.svg': '图片',
    '.ico': '图标',
    '.woff': '字体',
    '.woff2': '字体',
    '.ttf': '字体',
    '.eot': '字体',
    '.otf': '字体'
};

/* ------------------------------------------------------------------ *
 * args
 * ------------------------------------------------------------------ */
function parseArgs(argv) {
    const opts = {
        out: 'dist',
        base: '/',
        clean: true,
        materializeLatest: true,
        includeSoft: false
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--out':
                opts.out = argv[++i];
                break;
            case '--base':
                opts.base = argv[++i];
                break;
            case '--no-clean':
                opts.clean = false;
                break;
            case '--materialize-latest':
                opts.materializeLatest = true;
                break;
            case '--no-materialize-latest':
                opts.materializeLatest = false;
                break;
            case '--include-soft':
                opts.includeSoft = true;
                break;
            case '--help':
            case '-h':
                console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
                process.exit(0);
                break;
            default:
                throw new Error(`unknown argument: ${arg}`);
        }
    }

    if (opts.base !== '/') {
        opts.base = `/${opts.base.replace(/^\/+|\/+$/g, '')}/`;
    }
    if (opts.base === '//') {
        opts.base = '/';
    }
    /* Guard against shell path mangling (Git Bash turns "/xqcdn/" into a
       Windows path) and against ".." sneaking into generated links. */
    if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(opts.base) || opts.base.includes('..')) {
        throw new Error(`--base must be a URL path such as "/" or "/xqcdn/", got: ${opts.base}`);
    }

    opts.outDir = path.isAbsolute(opts.out) ? opts.out : path.join(ROOT, opts.out);
    return opts;
}

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function encodeHref(value) {
    return value.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function formatSize(bytes) {
    return humanSize(bytes);
}

function formatTime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function kindLabel(name) {
    const ext = path.extname(name).toLowerCase();
    return MIME_LABEL[ext] || (ext ? ext.slice(1).toUpperCase() : '文件');
}

/* ------------------------------------------------------------------ *
 * theme chrome
 * ------------------------------------------------------------------ */
function readThemeChrome(base) {
    const headerFile = path.join(ROOT, 'fancyindex', 'header.html');
    const footerFile = path.join(ROOT, 'fancyindex', 'footer.html');

    const headerRaw = fs.readFileSync(headerFile, 'utf8');
    const footerRaw = fs.readFileSync(footerFile, 'utf8');

    /* The custom theme ships header/footer as bare chrome fragments (no
       <!DOCTYPE> and no SSI markers), progressively enhancing nginx's native
       table. The legacy theme used a full HTML document with SSI block markers.
       Detect which one we have and normalise both to a reusable { head, foot }. */
    const isFragment =
        !headerRaw.includes('<!--# endblock -->') ||
        !footerRaw.includes('<!--# block name="default_footer" -->');

    let head;
    let foot;

    if (isFragment) {
        head = headerRaw;
        foot = footerRaw;
    } else {
        const headerEnd = headerRaw.indexOf('<!--# endblock -->');
        const footerStart = footerRaw.indexOf('<!--# block name="default_footer" -->');
        const footerEnd = footerRaw.indexOf('<!--# endblock -->');

        if (headerEnd === -1 || footerStart === -1 || footerEnd === -1) {
            throw new Error('fancyindex/header.html or footer.html lost its SSI markers; cannot build pages');
        }

        head = headerRaw.slice(0, headerEnd);
        head = head.replace('<!--# block name="default_index" -->', '').replace(/^\s*\n/, '');
        foot = footerRaw.slice(footerStart + '<!--# block name="default_footer" -->'.length, footerEnd);
    }

    /* Root-absolute asset URLs ("/fancyindex/...") must be re-rooted when the
       site is published under a sub path such as /xqcdn/. Anything new that is
       root-absolute has to be taught to this function, or the published pages
       would silently lose their styles/scripts. */
    const KNOWN = [/^\/$/, /^\/favicon\.ico$/, /^\/fancyindex\//];
    const leftovers = [];
    for (const [label, text] of [['header.html', head], ['footer.html', foot]]) {
        for (const match of text.matchAll(/(?:href|src)="(\/(?!\/)[^"]*)"/g)) {
            if (!KNOWN.some((re) => re.test(match[1]))) {
                leftovers.push(`${label}: ${match[1]}`);
            }
        }
    }
    if (leftovers.length) {
        throw new Error(`unhandled root-absolute path(s), add a rewrite rule in readThemeChrome():\n  ${leftovers.join('\n  ')}`);
    }

    head = head
        .replace(/href="\/favicon\.ico"/g, `href="${base}favicon.ico"`)
        .replace(/href="\/fancyindex\//g, `href="${base}fancyindex/`)
        .replace(/href="\/"/g, `href="${base}"`);

    foot = foot.replace(/src="\/fancyindex\//g, `src="${base}fancyindex/`);

    return { head: head.replace(/\s+$/, ''), foot: foot.replace(/^\s*\n/, ''), fragment: isFragment };
}

/* Pulls head-level <link>/<script> tags out of the fragment header so they can
   be placed inside <head> of the generated document; everything else is body
   chrome. */
function extractHeadAssets(html) {
    const re = /(<link\b[^>]*>\s*|<script\b[^>]*>\s*<\/script>\s*)/g;
    const tags = [];
    let match;
    while ((match = re.exec(html)) !== null) {
        tags.push(match[0]);
    }
    return { html: tags.join(''), re };
}

function renderBreadcrumb(segments, base) {
    const parts = [`<li class="breadcrumb-item"><a href="${base}">根目录</a></li>`];
    const encoded = segments.map((seg) => encodeHref(seg));

    for (let i = 0; i < segments.length; i++) {
        const label = escapeHtml(segments[i]);
        if (i === segments.length - 1) {
            parts.push(`<li class="breadcrumb-item active" aria-current="page">${label}</li>`);
        } else {
            const href = `${base}${encoded.slice(0, i + 1).join('/')}/`;
            parts.push(`<li class="breadcrumb-item"><a href="${href}">${label}</a></li>`);
        }
    }

    return parts.join('');
}

/* ------------------------------------------------------------------ *
 * copying
 * ------------------------------------------------------------------ */
function shouldSkip(rel) {
    const first = rel.split('/')[0];
    if (SKIP.has(first)) {
        return true;
    }
    if (rel.split('/').includes('.meta.json')) {
        return true;
    }
    /* SSI fragments only make sense behind nginx */
    if (rel === 'fancyindex/header.html' || rel === 'fancyindex/footer.html') {
        return true;
    }
    return false;
}

function copyTree(opts) {
    const entries = opts.includeSoft ? [...ROOT_ENTRIES, 'soft'] : ROOT_ENTRIES;
    const copied = [];

    for (const entry of entries) {
        const src = path.join(ROOT, entry);
        if (!fs.existsSync(src)) {
            continue;
        }

        const stat = fs.statSync(src);
        if (stat.isFile()) {
            const dest = path.join(opts.outDir, entry);
            ensureDir(path.dirname(dest));
            fs.copyFileSync(src, dest);
            copied.push(entry);
            continue;
        }

        for (const rel of walkFiles(src)) {
            const relPath = `${entry}/${rel}`;
            if (shouldSkip(relPath)) {
                continue;
            }
            const from = path.join(ROOT, relPath);
            const to = path.join(opts.outDir, relPath);
            ensureDir(path.dirname(to));
            fs.copyFileSync(from, to);
            /* keep the original timestamp: the directory pages show it */
            const mtime = fs.statSync(from).mtime;
            fs.utimesSync(to, mtime, mtime);
            copied.push(relPath);
        }
    }

    return copied;
}

/* ------------------------------------------------------------------ *
 * flat "latest" URLs, materialised into the output tree
 *
 * On nginx these are served by the rewrites in deploy/latest/*.conf. Pages has
 * no rewrite, so the bytes have to exist at /libs/{lib}/{file} as well. Only
 * the output tree is touched -- the source tree stays duplicate free.
 * ------------------------------------------------------------------ */
function materializeLatest(index, opts) {
    const written = [];

    for (const [name, lib] of Object.entries(index.libraries)) {
        const latest = lib.latest;
        const version = lib.versions[latest];
        if (!version || !version.files) {
            continue;
        }

        for (const rel of Object.keys(version.files)) {
            const base = path.posix.basename(rel);
            if (base === '.meta.json' || base === 'README.md') {
                continue;
            }

            const from = path.join(LIBS, name, latest, rel);
            const to = path.join(opts.outDir, 'libs', name, rel);
            if (!fs.existsSync(from)) {
                continue;
            }
            /* never shadow a real directory (libs/highlight/css/ and friends) */
            if (fs.existsSync(to) && fs.statSync(to).isDirectory()) {
                continue;
            }
            ensureDir(path.dirname(to));
            fs.copyFileSync(from, to);
            const mtime = fs.statSync(from).mtime;
            fs.utimesSync(to, mtime, mtime);
            written.push(`libs/${name}/${rel}`);
        }
    }

    return written;
}

/* ------------------------------------------------------------------ *
 * directory pages
 * ------------------------------------------------------------------ */
/* A directory's own mtime is just "when the copy happened", which would make
   the build non-reproducible. Use the newest timestamp inside it instead: that
   value comes from the source tree and is stable across runs. */
const dirMtimeCache = new Map();

function newestInside(dir) {
    if (dirMtimeCache.has(dir)) {
        return dirMtimeCache.get(dir);
    }
    let newest = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const stamp = entry.isDirectory()
            ? newestInside(full)
            : fs.statSync(full).mtimeMs;
        if (stamp > newest) {
            newest = stamp;
        }
    }
    const value = newest ? new Date(newest) : fs.statSync(dir).mtime;
    dirMtimeCache.set(dir, value);
    return value;
}

function listDir(dir) {
    const rows = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.meta.json' || entry.name === 'index.html') {
            /* index.html is generated chrome, not content worth listing */
            continue;
        }
        const full = path.join(dir, entry.name);
        rows.push({
            name: entry.name,
            isDir: entry.isDirectory(),
            size: entry.isDirectory() ? 0 : fs.statSync(full).size,
            mtime: entry.isDirectory() ? newestInside(full) : fs.statSync(full).mtime
        });
    }

    rows.sort((a, b) => {
        if (a.isDir !== b.isDir) {
            return a.isDir ? -1 : 1;
        }
        return a.name.localeCompare(b.name, 'en');
    });

    return rows;
}

function renderRows(pages, rows, opts) {
    const out = [];

    if (pages.length > 0) {
        const parentHref = pages.length === 1 ? opts.base : `${opts.base}${pages.slice(0, -1).map(encodeHref).join('/')}/`;
        out.push([
            '        <tr>',
            `          <td><a href="${parentHref}">../</a></td>`,
            '          <td class="text-muted">&mdash;</td>',
            '          <td class="text-right text-muted">目录</td>',
            '        </tr>'
        ].join('\n'));
    }

    for (const row of rows) {
        const href = encodeHref(row.name) + (row.isDir ? '/' : '');
        const label = escapeHtml(row.name) + (row.isDir ? '/' : '');
        const size = row.isDir
            ? '<span class="text-muted">目录</span>'
            : `${escapeHtml(formatSize(row.size))}<span class="text-muted small"> ${kindLabel(row.name)}</span>`;
        out.push([
            '        <tr>',
            `          <td><a href="${href}">${label}</a></td>`,
            `          <td class="text-muted">${escapeHtml(formatTime(row.mtime))}</td>`,
            `          <td class="text-right text-nowrap">${size}</td>`,
            '        </tr>'
        ].join('\n'));
    }

    return out.join('\n');
}

function renderListingBody(relPath, pages, rows, opts) {
    return [
        `    <h1 id="nginx-fancyindex-directory" class="d-none">${escapeHtml(relPath)}</h1>`,
        '    <table id="list" class="table table-sm table-hover">',
        '      <thead>',
        '        <tr>',
        '          <th scope="col">名称</th>',
        '          <th scope="col">修改时间</th>',
        '          <th scope="col" class="text-right">大小</th>',
        '        </tr>',
        '      </thead>',
        '      <tbody>',
        renderRows(pages, rows, opts),
        '      </tbody>',
        '    </table>'
    ].join('\n');
}

function renderFragmentPage(chrome, relPath, pages, rows, opts, pageTitle) {
    const { html: headAssets, re } = extractHeadAssets(chrome.head);
    const bodyOpen = chrome.head.replace(re, '');
    const bodyClose = chrome.foot;
    const listing = renderListingBody(relPath, pages, rows, opts);

    const assets = headAssets
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `  ${line}`)
        .join('\n');

    return [
        '<!DOCTYPE html>',
        '<html lang="zh-CN">',
        '<head>',
        '  <meta charset="utf-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        `  <title>${escapeHtml(pageTitle)}</title>`,
        assets,
        '</head>',
        '<body>',
        bodyOpen.replace(/^\s+|\s+$/g, ''),
        listing,
        bodyClose.replace(/^\s+|\s+$/g, ''),
        '</body>',
        '</html>'
    ].join('\n');
}

function writePages(opts, chrome) {
    const dirs = [];

    (function walk(dir, pages) {
        dirs.push({ dir, pages });
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name === '.git') {
                continue;
            }
            walk(path.join(dir, entry.name), [...pages, entry.name]);
        }
    }(opts.outDir, []));

    let written = 0;
    const title = 'XQCDN - 静态资源库';

    for (const { dir, pages } of dirs) {
        const relPath = pages.length === 0 ? '/' : `/${pages.join('/')}/`;
        const rows = listDir(dir);
        const pageTitle = pages.length === 0 ? title : `${relPath} - ${title}`;
        const crumb = renderBreadcrumb(pages, opts.base);

        let html;
        if (chrome.fragment) {
            html = renderFragmentPage(chrome, relPath, pages, rows, opts, pageTitle);
        } else {
            const head = chrome.head
                .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`)
                .replace(
                    /(<ol id="breadcrumbs" class="breadcrumb">)[\s\S]*?(<\/ol>)/,
                    `$1${crumb}$2`
                );
            html = `${head}\n${renderListingBody(relPath, pages, rows, opts)}\n${chrome.foot}\n`;
        }

        if (writeIfChanged(path.join(dir, 'index.html'), html)) {
            written += 1;
        }
    }

    return { written, total: dirs.length };
}

/* Removes the previous output. Entry by entry on purpose: wiping the root as a
   whole fails when something (a preview server, an open shell) still holds it,
   and a partial clean is better than a hard stop. */
function cleanOutput(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const stuck = [];
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        try {
            fs.rmSync(full, { recursive: true, force: true, maxRetries: 3 });
        } catch (error) {
            stuck.push(`${entry} (${error.code || error.message})`);
        }
    }

    if (stuck.length) {
        console.warn(`warning: could not remove ${stuck.length} entr(y/ies) from the previous build, they will be overwritten:`);
        for (const name of stuck.slice(0, 5)) {
            console.warn(`  ${name}`);
        }
    }

    return stuck;
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */
function main() {
    const opts = parseArgs(process.argv.slice(2));
    const indexPath = path.join(LIBS, 'index.json');

    if (!fs.existsSync(indexPath)) {
        throw new Error('libs/index.json is missing; run `node scripts/index.mjs` first');
    }

    const index = readJson(indexPath);
    const chrome = readThemeChrome(opts.base);

    if (opts.clean) {
        cleanOutput(opts.outDir);
    }
    ensureDir(opts.outDir);

    const copied = copyTree(opts);
    /* materialise before rendering pages so the flat copies show up in listings */
    const materialized = opts.materializeLatest ? materializeLatest(index, opts) : [];
    const pages = writePages(opts, chrome);

    writeIfChanged(path.join(opts.outDir, '.nojekyll'), '');

    console.log(`base           ${opts.base}`);
    console.log(`output         ${path.relative(ROOT, opts.outDir) || '.'}`);
    console.log(`files          ${copied.length} copied`);
    console.log(`latest copies  ${materialized.length} materialized${opts.materializeLatest ? '' : ' (disabled)'}`);
    console.log(`pages          ${pages.written} written / ${pages.total} directories`);
}

main();
