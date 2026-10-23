// src/clipboard.ts
async function writeText(text, doc) {
  if (!text) return "failed";
  const clipboard = typeof navigator === "undefined" ? void 0 : navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(text);
      return "clipboard";
    } catch (e) {
    }
  }
  return legacyCopy(text, doc) ? "execCommand" : "failed";
}
function legacyCopy(text, doc) {
  const body = doc.body;
  if (!body) return false;
  const area = doc.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "readonly");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "-9999px";
  area.style.opacity = "0";
  const active = doc.activeElement;
  body.appendChild(area);
  try {
    area.select();
    if (typeof area.setSelectionRange === "function") {
      area.setSelectionRange(0, text.length);
    }
    return typeof doc.execCommand === "function" ? Boolean(doc.execCommand("copy")) : false;
  } catch (e) {
    return false;
  } finally {
    area.remove();
    if (active && typeof active.focus === "function") active.focus();
  }
}

// src/errors.ts
var XqShareError = class extends Error {
  constructor(code, message) {
    super(`XqShare Error: ${message}`);
    this.name = "XqShareError";
    this.code = code;
  }
};

// src/dom.ts
function resolveHost(el, doc) {
  if (typeof el === "string") {
    const selector = el.trim();
    if (!selector) {
      throw new XqShareError("bad-el", "el must be a non-empty selector or an element");
    }
    const found = doc.querySelector(selector);
    if (!found) {
      throw new XqShareError("host-missing", `no element matches "${selector}"`);
    }
    return found;
  }
  if (el && el.nodeType === 1) {
    return el;
  }
  throw new XqShareError("bad-el", "el must be a selector string or an element");
}
var ListenerBag = class {
  constructor() {
    this.entries = [];
  }
  add(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.entries.push({ target, type, handler, options });
  }
  clear() {
    for (const entry of this.entries) {
      entry.target.removeEventListener(entry.type, entry.handler, entry.options);
    }
    this.entries.length = 0;
  }
  get size() {
    return this.entries.length;
  }
};
var scrollLocks = /* @__PURE__ */ new WeakMap();
function lockBodyScroll(doc) {
  const body = doc.body;
  if (!body) return;
  const existing = scrollLocks.get(doc);
  if (existing) {
    existing.count += 1;
    return;
  }
  scrollLocks.set(doc, { count: 1, overflow: body.style.overflow });
  body.style.overflow = "hidden";
}
function unlockBodyScroll(doc) {
  const state = scrollLocks.get(doc);
  if (!state) return;
  state.count -= 1;
  if (state.count > 0) return;
  scrollLocks.delete(doc);
  const body = doc.body;
  if (body) body.style.overflow = state.overflow;
}

// src/icons.ts
var ICON_CDN_BASE = "https://xqgj.cc/xqcdn/libs/xqshare/img/";
var detectedBase = "";
function normalize(base) {
  return base.endsWith("/") ? base : `${base}/`;
}
function setDetectedIconBase(base) {
  if (base) detectedBase = normalize(base);
}
function resolveIconBase(explicit) {
  const value = (explicit != null ? explicit : "").trim();
  if (value) return normalize(value);
  return detectedBase || ICON_CDN_BASE;
}
function isCdnIconBase(base) {
  return normalize(base) === ICON_CDN_BASE;
}

// src/share-url.ts
function query(entries) {
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value !== "") search.set(key, value);
  }
  return search.toString();
}
var SHARE_TARGETS = [
  {
    name: "qq",
    label: "QQ",
    icon: "share_qq.png",
    build: ({ url, title, desc }) => `https://connect.qq.com/widget/shareqq/iframe_index.html?${query([
      ["url", url],
      ["title", title],
      ["desc", desc]
    ])}`
  },
  {
    name: "qzone",
    label: "空间",
    icon: "share_qzone.png",
    build: ({ url, title, desc }) => `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?${query([
      ["url", url],
      ["title", title],
      ["desc", desc],
      ["summary", desc],
      ["site", url]
    ])}`
  },
  {
    name: "weibo",
    label: "微博",
    icon: "share_weibo.png",
    build: ({ url, title }) => `https://service.weibo.com/share/share.php?${query([
      ["url", url],
      ["title", title],
      ["language", "zh_cn"]
    ])}`
  },
  {
    name: "douban",
    label: "豆瓣",
    icon: "share_douban.png",
    build: ({ url, title }) => `https://shuo.douban.com/!service/share?${query([
      ["href", url],
      ["name", title]
    ])}`
  },
  {
    name: "tieba",
    label: "贴吧",
    icon: "share_tieba.png",
    build: ({ url, title }) => `https://tieba.baidu.com/f/commit/share/openShareApi?${query([
      ["title", title],
      ["url", url]
    ])}`
  },
  {
    name: "wechat",
    label: "微信",
    icon: "share_wechat.png",
    build: null
  }
];
var DEFAULT_TARGETS = [
  "qq",
  "qzone",
  "weibo",
  "douban",
  "tieba"
];
var TARGET_INDEX = new Map(
  SHARE_TARGETS.map((target) => [target.name, target])
);
function getShareTarget(name) {
  var _a;
  return (_a = TARGET_INDEX.get(name)) != null ? _a : null;
}
function isShareTargetName(name) {
  return typeof name === "string" && TARGET_INDEX.has(name);
}
function buildShareUrl(type, payload) {
  const target = getShareTarget(type);
  if (!target || !target.build) return null;
  return target.build(payload);
}

// src/options.ts
var MODES = ["default", "pop", "slide"];
function noop() {
}
function currentUrl(doc) {
  var _a, _b;
  const href = doc ? (_b = (_a = doc.defaultView) == null ? void 0 : _a.location) == null ? void 0 : _b.href : void 0;
  if (typeof href === "string" && href) return href;
  return typeof location !== "undefined" ? location.href : "";
}
function currentTitle(doc) {
  if (doc && typeof doc.title === "string") return doc.title;
  return typeof document !== "undefined" ? document.title : "";
}
function metaDescription(doc) {
  var _a;
  const meta = doc == null ? void 0 : doc.querySelector('meta[name="description"]');
  return ((_a = meta == null ? void 0 : meta.getAttribute("content")) != null ? _a : "").trim();
}
function normalizeTargets(input) {
  if (input === void 0) return DEFAULT_TARGETS;
  if (!Array.isArray(input)) {
    throw new XqShareError("bad-target", "targets must be an array of share target names");
  }
  const seen = /* @__PURE__ */ new Set();
  for (const name of input) {
    if (!isShareTargetName(name)) {
      throw new XqShareError("bad-target", `unknown share target "${String(name)}"`);
    }
    seen.add(name);
  }
  return [...seen];
}
function resolveOptions(input, doc) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  if (!input || typeof input !== "object") {
    throw new XqShareError("bad-el", "an options object is required");
  }
  if (input.el === void 0 || input.el === null) {
    throw new XqShareError("bad-el", "el is required");
  }
  const type = (_a = input.type) != null ? _a : "default";
  if (MODES.indexOf(type) === -1) {
    throw new XqShareError(
      "bad-mode",
      `type must be "default", "pop" or "slide" (got "${String(type)}")`
    );
  }
  return {
    el: input.el,
    type,
    url: ((_b = input.url) != null ? _b : "").trim() || currentUrl(doc),
    title: ((_c = input.title) != null ? _c : "").trim() || currentTitle(doc),
    desc: ((_d = input.desc) != null ? _d : "").trim() || metaDescription(doc),
    targets: normalizeTargets(input.targets),
    iconBase: resolveIconBase(input.iconBase),
    visible: (_e = input.visible) != null ? _e : type !== "pop",
    closeOnMask: (_f = input.closeOnMask) != null ? _f : true,
    onShare: (_g = input.onShare) != null ? _g : noop,
    onCopy: (_h = input.onCopy) != null ? _h : noop,
    onToggle: (_i = input.onToggle) != null ? _i : noop,
    onError: (_j = input.onError) != null ? _j : noop
  };
}

// src/template.ts
var ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    var _a;
    return (_a = ESCAPES[character]) != null ? _a : character;
  });
}
function buildIframeSnippet(url) {
  const safe = url.replace(/"/g, "%22");
  return `<iframe src="${safe}" frameborder="0" width="100%" height="500"></iframe>`;
}
function renderTitleRow(mode) {
  if (mode !== "pop") return "";
  return '<div class="xqshare-title"><span>分享预览页面</span><button type="button" class="xqshare-close" data-action="close" aria-label="关闭">×</button></div>';
}
function renderTip(mode) {
  if (mode === "pop") return "";
  if (mode === "slide") {
    return '<button type="button" class="xqshare-tip" data-action="toggle" aria-expanded="false">分享至</button>';
  }
  return '<span class="xqshare-tip">分享至</span>';
}
function renderItems(options) {
  const items = [];
  for (const name of options.targets) {
    const target = getShareTarget(name);
    if (!target) continue;
    const icon = `${options.iconBase}${target.icon}`;
    items.push(
      `<li><button type="button" class="xqshare-item" data-share="${escapeHtml(target.name)}"><img src="${escapeHtml(icon)}" alt="" width="25" height="25" decoding="async" data-icon="${escapeHtml(target.icon)}"><span>${escapeHtml(target.label)}</span></button></li>`
    );
  }
  return `<ul class="xqshare-ls">${items.join("")}</ul>`;
}
function renderUrls(options) {
  if (options.type !== "pop") return "";
  const url = escapeHtml(options.url);
  const iframe = escapeHtml(buildIframeSnippet(options.url));
  return `<div class="xqshare-urls"><p class="xqshare-url-row"><span class="xqshare-url-label">预览地址</span><input class="xqshare-input" type="text" readonly data-field="url" value="${url}"><button type="button" class="xqshare-copy" data-copy="url">复制</button></p><p class="xqshare-url-row"><span class="xqshare-url-label">嵌入代码</span><input class="xqshare-input" type="text" readonly data-field="iframe" value="${iframe}"><button type="button" class="xqshare-copy" data-copy="iframe">复制</button></p></div>`;
}
function renderMarkup(options) {
  const mode = options.type;
  const dialog = mode === "pop" ? ' role="dialog" aria-modal="true" aria-label="分享"' : "";
  return `<div class="xqshare-box ${mode}" data-mode="${mode}"${dialog}><div class="xqshare-inner">` + renderTitleRow(mode) + renderTip(mode) + renderItems(options) + renderUrls(options) + '<p class="xqshare-status" role="status" aria-live="polite"></p></div></div>';
}

// src/version.ts
var VERSION = "0.1.3";

// src/core.ts
function normalizeCopyTarget(target) {
  if (target === "iframe" || target === "code" || target === "#iframeUrl" || target === "#copyIframe" || target === "#iframe-url") {
    return "iframe";
  }
  return "url";
}
var XqShare = class {
  constructor(options) {
    this.root = null;
    this.box = null;
    this.tip = null;
    this.statusEl = null;
    this.fields = {};
    this.bag = new ListenerBag();
    this.statusTimer = null;
    this.popHiddenTimer = null;
    this.scrollLocked = false;
    this.lastTrigger = null;
    this.disposed = false;
    this.onClick = (event) => {
      var _a, _b;
      const node = event.target;
      if (!node || typeof node.closest !== "function") return;
      const shareTrigger = node.closest("[data-share]");
      if (shareTrigger) {
        this.share((_a = shareTrigger.getAttribute("data-share")) != null ? _a : "");
        return;
      }
      const action = node.closest("[data-action]");
      if (action) {
        const name = action.getAttribute("data-action");
        if (name === "close") {
          this.hide();
          return;
        }
        if (name === "toggle") {
          this.toggleDrawer();
          return;
        }
      }
      const copyTrigger = node.closest("[data-copy]");
      if (copyTrigger) {
        void this.copy((_b = copyTrigger.getAttribute("data-copy")) != null ? _b : "url");
        return;
      }
      if (this.settings.closeOnMask && this.settings.type === "pop" && node === this.box) {
        this.hide();
      }
    };
    this.onKeydown = (event) => {
      const keyboard = event;
      if (keyboard.key !== "Escape") return;
      if (this.settings.type === "pop" && this.visible) this.hide();
    };
    /**
     * Icons are local by default. If one still fails (for example a consumer
     * overrides `iconBase` with a wrong path), fall back to the CDN once and mark
     * the image so the error does not loop.
     */
    this.onIconError = (event) => {
      var _a;
      const node = event.target;
      if (!node || node.tagName !== "IMG" || !node.hasAttribute("data-icon")) return;
      if (node.getAttribute("data-icon-retry") === "cdn") {
        node.setAttribute("data-icon-failed", "");
        return;
      }
      if (isCdnIconBase(this.settings.iconBase)) {
        node.setAttribute("data-icon-failed", "");
        return;
      }
      node.setAttribute("data-icon-retry", "cdn");
      node.src = `${ICON_CDN_BASE}${(_a = node.getAttribute("data-icon")) != null ? _a : ""}`;
    };
    if (typeof document === "undefined") {
      throw new XqShareError("bad-el", "XqShare needs a DOM (document is undefined)");
    }
    this.raw = options;
    this.doc = document;
    this.settings = resolveOptions(options, this.doc);
    this.attach(this.settings);
    this.applyVisibility(this.settings.visible, true);
  }
  /* ---------------------------------------------------------------- public */
  get element() {
    return this.root;
  }
  get mode() {
    return this.settings.type;
  }
  get options() {
    return this.settings;
  }
  get visible() {
    if (!this.root || !this.box) return false;
    if (this.settings.type === "pop") return this.box.classList.contains("active");
    return !this.root.hidden;
  }
  show() {
    if (!this.visible) this.applyVisibility(true);
    return this;
  }
  hide() {
    if (this.visible) this.applyVisibility(false);
    return this;
  }
  toggle() {
    return this.visible ? this.hide() : this.show();
  }
  /**
   * Opens a destination. `wechat` has no web endpoint, so it copies the link and
   * reports through `onCopy` instead of opening a blank tab.
   */
  share(type, url, title, desc) {
    const payload = {
      type,
      url: url != null ? url : this.settings.url,
      title: title != null ? title : this.settings.title,
      desc: desc != null ? desc : this.settings.desc
    };
    const target = getShareTarget(type);
    if (!target) {
      this.report(new XqShareError("bad-target", `unknown share target "${String(type)}"`));
      return { ...payload, opened: false, copy: null };
    }
    if (!target.build) {
      void this.copy("url");
      const copied = { ...payload, opened: false, copy: null };
      this.settings.onShare(copied);
      this.emit("xqshare:share", copied);
      return copied;
    }
    const shareUrl = buildShareUrl(type, payload);
    let opened = false;
    if (shareUrl) {
      try {
        const win = typeof window === "undefined" ? null : window.open(shareUrl, "_blank");
        if (win) {
          try {
            win.opener = null;
          } catch (e) {
          }
          opened = true;
        } else {
          this.report(new XqShareError("popup-blocked", "the share window was blocked"));
        }
      } catch (error) {
        this.report(
          new XqShareError(
            "popup-blocked",
            error instanceof Error ? error.message : "the share window could not be opened"
          )
        );
      }
    }
    const result = { ...payload, opened, copy: null };
    this.settings.onShare(result);
    this.emit("xqshare:share", result);
    return result;
  }
  copy(target = "url") {
    const resolved = normalizeCopyTarget(target);
    const text = this.fieldText(resolved);
    return writeText(text, this.doc).then((method) => {
      const result = { ok: method !== "failed", method, target: resolved, text };
      this.setStatus(result.ok ? "已复制" : "复制失败，请手动选择");
      this.settings.onCopy(result);
      this.emit("xqshare:copy", result);
      return result;
    });
  }
  setUrl(url, title) {
    const nextTitle = title != null ? title : this.settings.title;
    this.settings = { ...this.settings, url, title: nextTitle };
    this.raw = { ...this.raw, url, title: nextTitle };
    this.syncFields();
    return this;
  }
  /** Re-resolves the options and rebuilds the markup on the same instance. */
  update(patch) {
    var _a;
    if (this.disposed) {
      throw new XqShareError("bad-el", "this instance has been destroyed");
    }
    const wasVisible = this.visible;
    this.teardown();
    this.raw = { ...this.raw, ...patch };
    this.settings = resolveOptions(this.raw, this.doc);
    this.attach(this.settings);
    this.applyVisibility((_a = patch.visible) != null ? _a : wasVisible, true);
    return this;
  }
  destroy() {
    if (this.disposed) return;
    this.teardown();
    this.disposed = true;
  }
  /* --------------------------------------------------------------- private */
  attach(settings) {
    const host = resolveHost(settings.el, this.doc);
    const root = this.doc.createElement("div");
    root.className = "xqshare";
    root.innerHTML = renderMarkup(settings);
    host.appendChild(root);
    this.root = root;
    this.box = root.querySelector(".xqshare-box");
    this.tip = root.querySelector(".xqshare-tip");
    this.statusEl = root.querySelector(".xqshare-status");
    const urlField = root.querySelector('[data-field="url"]');
    const iframeField = root.querySelector('[data-field="iframe"]');
    this.fields = {};
    if (urlField) this.fields.url = urlField;
    if (iframeField) this.fields.iframe = iframeField;
    this.bag.add(root, "click", this.onClick);
    this.bag.add(root, "error", this.onIconError, true);
    this.bag.add(this.doc, "keydown", this.onKeydown);
    this.syncFields();
  }
  teardown() {
    this.bag.clear();
    this.releaseScroll();
    if (this.statusTimer !== null) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    if (this.popHiddenTimer !== null) {
      clearTimeout(this.popHiddenTimer);
      this.popHiddenTimer = null;
    }
    if (this.root) this.root.remove();
    this.root = null;
    this.box = null;
    this.tip = null;
    this.statusEl = null;
    this.fields = {};
    this.lastTrigger = null;
  }
  applyVisibility(visible, silent = false) {
    const { root, box } = this;
    if (!root || !box) return;
    if (this.settings.type === "pop") {
      root.hidden = false;
      if (visible) {
        this.openPop();
      } else {
        this.closePop(silent);
      }
    } else {
      root.hidden = !visible;
    }
    if (!silent) this.settings.onToggle(visible);
  }
  /**
   * Reveals the pop modal.
   *
   * The closed state is guarded by *inline* styles (see `closePop`) so the panel
   * can never flash visible before `xqshare.css` is applied. Those inline guards
   * are dropped here so the stylesheet's `.pop` / `.pop.active` rules take over;
   * because `display` stays `flex`, the browser has already painted the hidden
   * frame, so the fade + lift transitions animate from a real "from" state.
   */
  openPop() {
    const box = this.box;
    if (!box) return;
    if (this.popHiddenTimer !== null) {
      clearTimeout(this.popHiddenTimer);
      this.popHiddenTimer = null;
    }
    box.style.opacity = "";
    box.style.visibility = "";
    box.style.pointerEvents = "";
    box.classList.add("active");
    this.acquireScroll();
    this.focusDialog();
  }
  /**
   * Hides the pop modal.
   *
   * The hard hidden state is enforced with inline styles rather than the
   * stylesheet so an unstyled modal (CSS not yet parsed) can never paint for a
   * frame on initial load — that "flash then hide" was the reported regression.
   * On the very first paint (`immediate`) the guards go on right away; on a
   * user-driven close they are re-applied only after the transition finishes so
   * the fade-out still plays.
   */
  closePop(immediate = false) {
    const box = this.box;
    if (!box) return;
    box.classList.remove("active");
    this.releaseScroll();
    this.restoreFocus();
    if (this.popHiddenTimer !== null) {
      clearTimeout(this.popHiddenTimer);
      this.popHiddenTimer = null;
    }
    if (immediate) {
      box.style.opacity = "0";
      box.style.visibility = "hidden";
      box.style.pointerEvents = "none";
      return;
    }
    this.popHiddenTimer = setTimeout(() => {
      this.popHiddenTimer = null;
      const current = this.box;
      if (current && !current.classList.contains("active")) {
        current.style.opacity = "0";
        current.style.visibility = "hidden";
        current.style.pointerEvents = "none";
      }
    }, 260);
  }
  toggleDrawer() {
    var _a;
    if (!this.box || this.settings.type !== "slide") return;
    const open = this.box.classList.toggle("active");
    (_a = this.tip) == null ? void 0 : _a.setAttribute("aria-expanded", open ? "true" : "false");
  }
  fieldText(target) {
    const field = this.fields[target];
    if (field && field.value) return field.value;
    return target === "url" ? this.settings.url : buildIframeSnippet(this.settings.url);
  }
  syncFields() {
    const urlField = this.fields.url;
    if (urlField) urlField.value = this.settings.url;
    const iframeField = this.fields.iframe;
    if (iframeField) iframeField.value = buildIframeSnippet(this.settings.url);
  }
  setStatus(text) {
    const element = this.statusEl;
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("is-visible", Boolean(text));
    if (this.statusTimer !== null) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => {
      this.statusTimer = null;
      const target = this.statusEl;
      if (!target) return;
      target.textContent = "";
      target.classList.remove("is-visible");
    }, 2e3);
  }
  acquireScroll() {
    if (this.scrollLocked) return;
    lockBodyScroll(this.doc);
    this.scrollLocked = true;
  }
  releaseScroll() {
    if (!this.scrollLocked) return;
    unlockBodyScroll(this.doc);
    this.scrollLocked = false;
  }
  focusDialog() {
    var _a;
    const active = this.doc.activeElement;
    if (active && active !== this.doc.body) this.lastTrigger = active;
    const close = (_a = this.box) == null ? void 0 : _a.querySelector(".xqshare-close");
    if (close && typeof close.focus === "function") close.focus();
  }
  restoreFocus() {
    const trigger = this.lastTrigger;
    this.lastTrigger = null;
    if (trigger && typeof trigger.focus === "function") trigger.focus();
  }
  report(error) {
    this.settings.onError(error);
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(error.message);
    }
  }
  emit(name, detail) {
    const root = this.root;
    if (!root || typeof CustomEvent !== "function") return;
    root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }
};
XqShare.version = VERSION;

// src/index.esm.ts
try {
  setDetectedIconBase(new URL("../img/", import.meta.url).href);
} catch (e) {
}
var index_esm_default = XqShare;
export {
  DEFAULT_TARGETS,
  ICON_CDN_BASE,
  SHARE_TARGETS,
  VERSION,
  XqShare,
  XqShareError,
  buildShareUrl,
  index_esm_default as default,
  getShareTarget,
  isShareTargetName
};
