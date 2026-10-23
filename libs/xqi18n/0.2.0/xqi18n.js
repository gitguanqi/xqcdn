/*! xqi18n v0.2.0 | MIT | https://github.com/gitguanqi/xqi18n */
(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else if (typeof define === 'function' && define.cmd) define(function (require, exports, module) { module.exports = factory(); });
    else root.xqi18n = factory();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
"use strict";
var __xqi18nUmd__ = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    Xqi18n: () => Xqi18n,
    default: () => index_default,
    xqi18n: () => Xqi18n
  });

  // src/resolver.ts
  function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
  }
  function isPlainRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function resolveKey(tree, key) {
    if (!isPlainRecord(tree)) {
      return { found: false };
    }
    let node = tree;
    for (const segment of key.split(".")) {
      if (!isPlainRecord(node) || !hasOwn(node, segment)) {
        return { found: false };
      }
      node = node[segment];
    }
    if (node === void 0) {
      return { found: false };
    }
    return { found: true, value: node };
  }

  // src/core.ts
  var OPTIONS_TYPE = "Translate Warn: options must be a object!";
  var LANG_TYPE = "Translate Warn: lang must be a string!";
  var LANG_EMPTY = "Translate Warn: lang cannot be empty!";
  var MESSAGES_TYPE = "Translate Warn: messages must be a object!";
  var KEY_EMPTY = "Translate Warn: key cannot be empty!";
  var KEY_TYPE = "Translate Warn: key must be a string!";
  var KEY_MISSING = "Translate Warn: key does not exist!";
  var LISTENER_TYPE = "Translate Warn: listener must be a function!";
  var Xqi18n = class {
    constructor(options) {
      if (!isPlainRecord(options)) {
        throw new TypeError(OPTIONS_TYPE);
      }
      const { lang, messages } = options;
      if (typeof lang !== "string") {
        throw new TypeError(LANG_TYPE);
      }
      if (lang.length === 0) {
        throw new Error(LANG_EMPTY);
      }
      if (!isPlainRecord(messages)) {
        throw new TypeError(MESSAGES_TYPE);
      }
      this.messages = messages;
      this.strict = options.strict === true;
      this.warn = options.warn !== false;
      this.currentLang = lang;
      this.listeners = /* @__PURE__ */ new Set();
      this.warned = /* @__PURE__ */ new Set();
      this.tns = (key) => this.translateFn(key);
    }
    get lang() {
      return this.currentLang;
    }
    /**
     * Switch language at runtime. Same-value assignment is a no-op, so a watcher
     * that fires twice does not re-render the whole app twice.
     */
    set lang(next) {
      if (typeof next !== "string") {
        throw new TypeError(LANG_TYPE);
      }
      if (next.length === 0) {
        throw new Error(LANG_EMPTY);
      }
      if (next === this.currentLang) {
        return;
      }
      this.currentLang = next;
      this.warned.clear();
      for (const listener of [...this.listeners]) {
        try {
          listener(next);
        } catch (error) {
          if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn("Translate Warn: a lang listener threw.", error);
          }
        }
      }
    }
    /** Subscribe to language changes. Returns an idempotent unsubscribe function. */
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError(LISTENER_TYPE);
      }
      this.listeners.add(listener);
      let active = true;
      return () => {
        if (!active) {
          return;
        }
        active = false;
        this.listeners.delete(listener);
      };
    }
    /**
     * Resolve `key` in the current language.
     *
     * A missing key returns the key itself unless `strict` is set, which throws
     * the 0.0.x error. Falsy leaves (`0`, `false`, `''`) are returned as found.
     */
    translateFn(key) {
      if (!key) {
        throw new Error(KEY_EMPTY);
      }
      if (typeof key !== "string") {
        throw new TypeError(KEY_TYPE);
      }
      const tree = hasOwn(this.messages, this.currentLang) ? this.messages[this.currentLang] : void 0;
      if (tree === void 0) {
        return this.missing(key);
      }
      const resolved = resolveKey(tree, key);
      if (!resolved.found) {
        return this.missing(key);
      }
      return resolved.value;
    }
    /** JSON shape kept identical to 0.0.x, where `lang` was a plain field. */
    toJSON() {
      return { lang: this.currentLang, messages: this.messages };
    }
    missing(key) {
      if (this.strict) {
        throw new TypeError(KEY_MISSING);
      }
      const id = this.currentLang + "\0" + key;
      if (this.warn && !this.warned.has(id)) {
        this.warned.add(id);
        if (typeof console !== "undefined" && typeof console.warn === "function") {
          console.warn(
            'Translate Warn: key does not exist: "' + key + '" (lang: ' + this.currentLang + ")"
          );
        }
      }
      return key;
    }
  };

  // src/index.ts
  var index_default = Xqi18n;
  return __toCommonJS(index_exports);
})();

return __xqi18nUmd__.default || __xqi18nUmd__;
});

