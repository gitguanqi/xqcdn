/**
 * author: fegq
 * name: xqloading
 * version: 0.0.2
 * create: 2022-10-02
 * update: 2026-10-20
 * @param {*} img 图标图片
 * @param {*} color 图标颜色
 *
 * A loading overlay that can be dropped in with a single script tag. Configuration comes from
 * the tag's data-* attributes, so the module has no build-time dependency:
 *
 *   <script src=".../loading.js" data-img="logo.png" data-color="#00f"></script>
 *
 * data-hide: "load" (default) hides on window load, "dom" hides on DOMContentLoaded,
 *            "none" keeps the overlay until you call xqLoading.hide().
 * data-auto: "false" skips the automatic mount, leaving only window.xqLoading.
 */
(function (root) {
  'use strict';

  if (typeof document === 'undefined') return;

  var OPTIONS = { hide: 'load', auto: true };
  var mounted = null;

  // The script used to be found through `id="xqloading"`. currentScript needs no markup,
  // and the id / src lookups stay as fallbacks for older engines and for cached HTML.
  function currentScript() {
    if (document.currentScript) return document.currentScript;
    var byId = document.getElementById('xqloading');
    if (byId) return byId;
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('loading') !== -1) return scripts[i];
    }
    return null;
  }

  function readOptions() {
    var script = currentScript();
    var data = (script && script.dataset) || {};
    return {
      img: data.img || '',
      color: data.color || '',
      hide: data.hide || OPTIONS.hide,
      auto: data.auto === 'false' ? false : OPTIONS.auto
    };
  }

  function hide() {
    if (mounted) {
      // `active` stays for backwards compatibility, `is-hidden` is the documented name
      mounted.classList.add('active');
      mounted.classList.add('is-hidden');
    }
    return mounted;
  }

  function whenReady(callback, eventName) {
    if (!document.addEventListener) {
      callback();
      return;
    }
    document.addEventListener(eventName, callback, false);
  }

  function mount(options) {
    if (!document.body) {
      // the tag can sit in <head>; appending there threw before
      whenReady(function () {
        mount(options);
      }, 'DOMContentLoaded');
      return null;
    }

    var existing = document.querySelector('[data-xq-loading]');
    if (existing) {
      mounted = existing;
      return existing;
    }

    options = options || readOptions();

    var loading = document.createElement('div');
    loading.className = 'loading';
    loading.setAttribute('data-xq-loading', '');

    var inner = document.createElement('div');
    inner.className = 'loading-inner';

    var circle = document.createElement('span');
    circle.className = 'loading-circle';
    // Only set an inline colour when one was actually supplied, so a missing data-color no
    // longer produces `border-left-color: undefined`.
    if (options.color) circle.style.borderLeftColor = options.color;
    inner.appendChild(circle);

    if (options.img) {
      var icon = document.createElement('img');
      icon.className = 'loading-img';
      icon.src = options.img;
      icon.alt = '';
      inner.appendChild(icon);
    }

    loading.appendChild(inner);
    document.body.appendChild(loading);
    mounted = loading;

    var hideMode = options.hide;
    if (hideMode === 'dom') {
      whenReady(hide, 'DOMContentLoaded');
    } else if (hideMode === 'load') {
      if (document.readyState === 'complete') {
        hide();
      } else if (root.addEventListener) {
        root.addEventListener('load', hide, false);
      }
    }

    return loading;
  }

  function xqLoading(img, color, extra) {
    var options = readOptions();
    options.img = img || options.img;
    options.color = color || options.color;
    if (extra && typeof extra === 'object') {
      if (extra.hide) options.hide = extra.hide;
      if (extra.auto === false) options.auto = false;
    }
    return mount(options);
  }

  xqLoading.hide = hide;
  xqLoading.show = function () {
    if (!mounted) mounted = mount();
    if (mounted) {
      mounted.classList.remove('active');
      mounted.classList.remove('is-hidden');
    }
    return mounted;
  };
  xqLoading.mount = mount;
  xqLoading.get = function () {
    return mounted;
  };

  root.xqLoading = xqLoading;

  var initial = readOptions();
  if (initial.auto) mount(initial);
})(typeof window !== 'undefined' ? window : this);
