/**
 * name: xqmourn
 * version: 0.0.2
 * create: 2022-10-02
 * update: 2026-10-20
 *
 * Turns the page greyscale on a memorial date. Drop it in with a script tag:
 *
 *   <script src=".../mourn.js" data-date="1.1,5.12" data-src="/mourn.json"></script>
 *
 * data-date  extra dates, comma separated, in "M.D" form
 * data-src   overrides the remote date list
 *
 * It used to require `id="xqmourn"` on its own script tag and crashed without it.
 */
(function (root, name) {
    'use strict';

    if (typeof document === 'undefined') return;

    var REMOTE = 'https://xqgj.cc/data/store/mourn.json';
    var TIMEOUT = 8000;

    function currentScript() {
        if (document.currentScript) return document.currentScript;
        var byId = document.getElementById('xqmourn');
        if (byId) return byId;
        if (!document.getElementsByTagName) return null;
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var src = scripts[i].src || '';
            if (src.indexOf('mourn') !== -1) return scripts[i];
        }
        return null;
    }

    function scriptData() {
        var script = currentScript();
        if (!script) return {};
        if (script.dataset) return script.dataset;
        return {
            date: script.getAttribute && script.getAttribute('data-date'),
            src: script.getAttribute && script.getAttribute('data-src')
        };
    }

    function normalise(input) {
        var out = [];
        function push(value) {
            if (value === null || value === undefined) return;
            if (Object.prototype.toString.call(value) === '[object Array]') {
                for (var i = 0; i < value.length; i++) push(value[i]);
                return;
            }
            // anything that is not a date-ish scalar (a JSON object, for instance) is ignored
            if (typeof value !== 'string' && typeof value !== 'number') return;
            var text = String(value).trim();
            if (text && out.indexOf(text) === -1) out.push(text);
        }
        push(input);
        return out;
    }

    var data = scriptData();
    var remote = data.src || REMOTE;
    var dates = normalise(['7.7'].concat(data.date ? String(data.date).split(',') : []));

    function check(input) {
        var list = input === undefined ? dates : normalise(input);
        var now = new Date();
        var today = (now.getMonth() + 1) + '.' + now.getDate();
        var active = list.indexOf(today) > -1;
        var html = document.documentElement;
        if (!html) return active;
        if (active) {
            // setting the whole style attribute wiped every other inline style on <html>
            if (html.style) html.style.filter = 'grayscale(100%)';
            if (html.classList) html.classList.add('xq-mourn');
        } else {
            if (html.style) html.style.filter = '';
            if (html.classList) html.classList.remove('xq-mourn');
        }
        return active;
    }

    function load() {
        if (typeof fetch !== 'function') {
            check();
            return Promise.resolve(check());
        }
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timer = root.setTimeout(function () {
            if (controller) controller.abort();
        }, TIMEOUT);

        return fetch(remote, controller ? { signal: controller.signal } : undefined)
            .then(function (res) {
                if (res && res.ok === false) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (doc) {
                dates = normalise(dates.concat(doc));
                return check();
            })
            .catch(function () {
                // offline, blocked or malformed: the built-in list still works
                return check();
            })
            .then(function (active) {
                root.clearTimeout(timer);
                return active;
            });
    }

    root[name] = {
        check: check,
        load: load,
        list: function () {
            return dates.slice();
        }
    };

    load();
})(typeof window !== 'undefined' ? window : this, 'xqMourn');
