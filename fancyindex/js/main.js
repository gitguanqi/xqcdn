/*!
 * xqcdn directory listing UI
 * Based on llorephie/ngx-fancyindex-theme-bootstrap (MIT, (c) 2017 Maxim Martyanov)
 * Modified by gitguanqi, 2026.
 *
 * Works in two rendering modes with the same code:
 *   1. nginx fancyindex   -> directory path is injected into #nginx-fancyindex-directory
 *   2. pre-rendered pages -> same element is filled at build time (scripts/build.mjs)
 */
(function (window, document) {
    'use strict';

    var SEARCH_DELAY = 150;

    function byId(id) {
        return document.getElementById(id);
    }

    function decodeSafe(value) {
        try {
            return decodeURIComponent(value);
        } catch (e) {
            return value;
        }
    }

    /* Normalizes a path segment so it is safe inside an href, whether the
       server gave us a raw name ("a b") or an already encoded one ("a%20b"). */
    function encodeSegment(segment) {
        return encodeURIComponent(decodeSafe(segment));
    }

    function normalizeText(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').toLowerCase();
    }

    /* ------------------------------------------------------------------ *
     * Mount prefix
     *
     * The listing may be served from the site root ("/libs/") or from a
     * sub directory ("/xqcdn/libs/"). #nginx-fancyindex-directory always
     * holds the path relative to the mount point, so the prefix can be
     * derived by subtracting it from location.pathname.
     * ------------------------------------------------------------------ */
    function getMountInfo() {
        var el = byId('nginx-fancyindex-directory');
        var dir = el ? String(el.textContent || '').replace(/^\s+|\s+$/g, '') : '';
        var path = window.location.pathname || '/';

        if (!dir || dir.charAt(0) !== '/') {
            dir = path;
        }
        if (dir.charAt(dir.length - 1) !== '/') {
            dir += '/';
        }

        var segs = dir.split('/').filter(function (part) {
            return part.length > 0;
        });

        var prefix = '';
        var offset = path.length - dir.length;

        if (offset >= 0 && path.slice(offset) === dir) {
            prefix = path.slice(0, offset);
        } else if (segs.length > 0) {
            /* Encoded/decoded mismatch: fall back to stripping the same
               number of trailing segments from the real path. */
            var parts = path.split('/').filter(function (part) {
                return part.length > 0;
            });
            var keep = Math.max(0, parts.length - segs.length);
            prefix = keep > 0 ? '/' + parts.slice(0, keep).join('/') : '';
        }

        if (prefix === '/') {
            prefix = '';
        }

        return {
            prefix: prefix,
            segs: segs,
            rootHref: prefix + '/',
            hrefOf: function (index) {
                var tail = '';
                for (var i = 0; i <= index; i++) {
                    tail += encodeSegment(segs[i]) + '/';
                }
                return prefix + '/' + tail;
            }
        };
    }

    /* ------------------------------------------------------------------ *
     * Search: literal, case-insensitive, AND over whitespace separated words.
     * Never builds a RegExp from user input, so "(" or "*" cannot throw.
     * ------------------------------------------------------------------ */
    function initSearch() {
        var input = byId('search');
        var table = byId('list');
        if (!input || !table) {
            return;
        }

        var tbody = table.tBodies && table.tBodies.length ? table.tBodies[0] : null;
        if (!tbody) {
            return;
        }

        var rows = [];
        for (var i = 0; i < tbody.rows.length; i++) {
            var tr = tbody.rows[i];
            if (tr.className && tr.className.indexOf('no-result') !== -1) {
                continue;
            }
            rows.push({ el: tr, text: normalizeText(tr.textContent) });
        }

        var columns = rows.length && rows[0].el.cells.length ? rows[0].el.cells.length : 3;

        var emptyRow = document.createElement('tr');
        emptyRow.className = 'no-result';
        var emptyCell = document.createElement('td');
        emptyCell.colSpan = columns;
        emptyCell.className = 'text-center text-muted';
        emptyCell.textContent = '没有匹配的条目';
        emptyRow.appendChild(emptyCell);
        emptyRow.hidden = true;
        tbody.appendChild(emptyRow);

        var status = byId('search-status');

        function apply(raw) {
            var tokens = normalizeText(raw).split(' ').filter(function (part) {
                return part.length > 0;
            });
            var shown = 0;

            for (var r = 0; r < rows.length; r++) {
                var hit = true;
                for (var t = 0; t < tokens.length; t++) {
                    if (rows[r].text.indexOf(tokens[t]) === -1) {
                        hit = false;
                        break;
                    }
                }
                rows[r].el.hidden = !hit;
                if (hit) {
                    shown++;
                }
            }

            emptyRow.hidden = !(rows.length > 0 && shown === 0);

            if (status) {
                status.textContent = tokens.length === 0
                    ? ''
                    : (shown > 0 ? '匹配 ' + shown + ' 项' : '没有匹配的条目');
            }
        }

        var timer = null;
        var composing = false;

        function schedule() {
            if (timer) {
                window.clearTimeout(timer);
            }
            timer = window.setTimeout(function () {
                timer = null;
                apply(input.value);
            }, SEARCH_DELAY);
        }

        input.addEventListener('compositionstart', function () {
            composing = true;
        });

        input.addEventListener('compositionend', function () {
            composing = false;
            schedule();
        });

        input.addEventListener('input', function () {
            if (!composing) {
                schedule();
            }
        });

        /* keep Enter from submitting the wrapping form and reloading the page */
        var form = input.form;
        if (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                apply(input.value);
            });
        }

        input.addEventListener('keydown', function (event) {
            var key = event.key || event.keyCode;
            if (key === 'Escape' || key === 27) {
                input.value = '';
                apply('');
            }
        });

        /* browser "clear" button inside <input type="search"> */
        input.addEventListener('search', function () {
            apply(input.value);
        });
    }

    /* ------------------------------------------------------------------ *
     * Breadcrumbs
     * ------------------------------------------------------------------ */
    function initBreadcrumb() {
        var list = byId('breadcrumbs');
        var info = getMountInfo();

        var home = byId('nav-home');
        if (home) {
            home.setAttribute('href', info.rootHref);
        }

        if (!list) {
            return;
        }

        function appendLink(href, text) {
            var li = document.createElement('li');
            li.className = 'breadcrumb-item';
            var a = document.createElement('a');
            a.setAttribute('href', href);
            a.textContent = text;
            li.appendChild(a);
            list.appendChild(li);
        }

        function appendCurrent(text) {
            var li = document.createElement('li');
            li.className = 'breadcrumb-item active';
            li.setAttribute('aria-current', 'page');
            li.textContent = text;
            list.appendChild(li);
        }

        list.innerHTML = '';

        appendLink(info.rootHref, '根目录');

        for (var i = 0; i < info.segs.length; i++) {
            var label = decodeSafe(info.segs[i]);
            if (i === info.segs.length - 1) {
                appendCurrent(label);
            } else {
                appendLink(info.hrefOf(i), label);
            }
        }
    }

    /* ------------------------------------------------------------------ *
     * Footer
     * ------------------------------------------------------------------ */
    function initFooter() {
        var year = byId('year');
        if (year) {
            year.textContent = String(new Date().getFullYear());
        }
    }

    function safeRun(name, fn) {
        try {
            fn();
        } catch (e) {
            if (window.console && window.console.warn) {
                window.console.warn('[xqcdn] ' + name + ' failed:', e);
            }
        }
    }

    function boot() {
        safeRun('search', initSearch);
        safeRun('breadcrumb', initBreadcrumb);
        safeRun('footer', initFooter);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}(window, document));
