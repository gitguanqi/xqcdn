/**
 * Where each directory under libs/ comes from.
 *
 * NPM_PACKAGES maps the local directory name to the official npm package it
 * mirrors. It is a *hint* for --adopt / --add: the authoritative source of
 * every version lives in libs.manifest.json, because a single library can mix
 * npm-synced and hand-maintained versions.
 *
 * SELF_LIBRARIES lists the libraries this repository owns (xq*). They are used
 * to separate "our own code" from "third-party copies without an upstream" in
 * THIRD-PARTY-NOTICES.md.
 */

export const NPM_PACKAGES = {
    'axios': 'axios',
    'bootstrap': 'bootstrap',
    'codemirror': 'codemirror',
    'dashjs': 'dashjs',
    'dplayer': 'dplayer',
    'echarts': 'echarts',
    'fingerprintjs': '@fingerprintjs/fingerprintjs',
    'fireworks': 'fireworks-js',
    'flv.js': 'flv.js',
    'font-awesome': '@fortawesome/fontawesome-free',
    'highlight': '@highlightjs/cdn-assets',
    'hls.js': 'hls.js',
    'html5shiv': 'html5shiv',
    'jquery': 'jquery',
    'jquery-qrcode': 'jquery-qrcode',
    'jsrsasign': 'jsrsasign',
    'lodash.js': 'lodash',
    'markdown-it': 'markdown-it',
    'moment.js': 'moment',
    'mux.js': 'mux.js',
    'redux': 'redux',
    'respond': 'respond.js',
    'shaka-player': 'shaka-player',
    'socket.io': 'socket.io-client',
    'vue': 'vue',
    'vue-router': 'vue-router',
    'vuex': 'vuex',
    'webtorrent': 'webtorrent',
    'xlsxjs': 'xlsx',
    'require.js': 'requirejs',

    /* First-party libraries, published to npm by the same author. */
    'xqclip': 'xqclip',
    'xqeditor': 'xqeditor',
    'xqgjs': 'xqgjs',
    'xqi18n': 'xqi18n',
    'xqisIe': 'xqisie',
    'xqlib-cli': 'xqlib-cli',
    'xqlight': 'xqlight',
    'xqmsg': 'xqmsg',
    'xqmusic-player': 'xqmusic-player',
    'xqshare': 'xqshare',
    'xqsql': 'xqsql',
    'xqtime': 'xqtime',
    'xquuid': 'xquuid'
};

/** Packages that must stay on a major version different from npm "latest". */
export const PIN_NOTES = {
    'codemirror': 'v6 changed the packaging model; this CDN serves the v5 single-file build',
    'echarts': 'stays on v5',
    'jquery': 'v4 dropped IE support; consumers rely on v3',
    'vue': 'v2/v3 are not interchangeable',
    'vue-router': 'must match the vue major version',
    'vuex': 'must match the vue major version',
    'font-awesome': 'this CDN serves the v5 webfont package layout',
    'xlsxjs': 'npm stopped at 0.18.5, newer builds ship from cdn.sheetjs.com',
    'fireworks': 'verify the browser API matches before switching to fireworks-js',
    'highlight': 'uses @highlightjs/cdn-assets so lang/ and styles/ are available'
};

/**
 * Libraries maintained in this repository. Everything else under libs/ mirrors
 * a third party.
 */
export const SELF_LIBRARIES = [
    'xqclip', 'xqeditor', 'xqgjs', 'xqi18n', 'xqisIe', 'xqlib-cli', 'xqlight',
    'xqmsg', 'xqmusic-player', 'xqonline', 'xqshare', 'xqsql', 'xqtime',
    'xquuid', 'xqvideo'
];

export function npmPackageFor(name) {
    return NPM_PACKAGES[name] || null;
}

export function isSelfOwned(name) {
    return SELF_LIBRARIES.includes(name);
}
