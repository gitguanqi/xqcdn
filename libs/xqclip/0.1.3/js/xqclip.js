(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else if (typeof define === 'function' && define.cmd) define(function (require, exports, module) { module.exports = factory(); });
    else root.xqclip = factory();
})(typeof self !== 'undefined' ? self : this, function () {
"use strict";

"use strict";
var __xqclipUmd__ = (() => {
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
    XqClip: () => XqClip,
    default: () => index_default
  });

  // src/template.ts
  var CLIP_TEMPLATE = `<div class="clip-box clip-bg">
    <canvas class="clip-bg clip-canvas"></canvas>
    <div class="clip-img-shadow clip-img-shadow-top"></div>
    <div class="clip-img-shadow clip-img-shadow-right"></div>
    <div class="clip-img-shadow clip-img-shadow-bottom"></div>
    <div class="clip-img-shadow clip-img-shadow-left"></div>
    <div class="clip-img-area no-pos" data-pos="pos(0,0)" data-size="wh(0,0)">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <small class="clip-img-scale"></small>
    </div>
    <canvas class="clip-canvas-temp"></canvas>
</div>`;

  // src/core.ts
  var WHEEL_MIN = 0.4;
  var WHEEL_MAX = 3;
  var WHEEL_STEP = 0.2;
  var MIN_CROP = 64;
  var supportsPassive = false;
  try {
    const probe = {};
    Object.defineProperty(probe, "passive", {
      get() {
        supportsPassive = true;
        return false;
      }
    });
    const probeListener = () => {
    };
    window.addEventListener("xqclip-passive-probe", probeListener, probe);
    window.removeEventListener("xqclip-passive-probe", probeListener, probe);
  } catch (e) {
  }
  function preventScroll(event) {
    if (event.cancelable) {
      event.preventDefault();
    }
  }
  function readPoint(event) {
    var _a, _b, _c;
    const touchEvent = event;
    const touch = (_c = (_a = touchEvent.touches) == null ? void 0 : _a[0]) != null ? _c : (_b = touchEvent.changedTouches) == null ? void 0 : _b[0];
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
    const mouse = event;
    if (typeof mouse.clientX === "number" && typeof mouse.clientY === "number") {
      return { x: mouse.clientX, y: mouse.clientY };
    }
    return null;
  }
  function resolveElement(target) {
    if (!target) {
      return null;
    }
    if (typeof target === "string") {
      return document.querySelector(target);
    }
    return target;
  }
  var XqClip = class {
    constructor(options = {}) {
      /** Host element that receives the widget markup. */
      this.box = null;
      /** Preview image that lives outside the widget, resolved from `options.pre`. */
      this.pre = null;
      this.boxWin = 400;
      this.boxHei = 400;
      this.areaWin = 100;
      this.areaHei = 100;
      this.scale = 1;
      this.showPos = true;
      this.scaleImg = true;
      this.imgSrc = "";
      this.scaleMin = MIN_CROP;
      this.scaleMinWin = MIN_CROP;
      this.scaleMinHei = MIN_CROP;
      this.clipBoxInfo = { win: 0, hei: 0, left: 0, top: 0 };
      this.clipAreaInfo = { win: 0, hei: 0, left: 0, top: 0 };
      this.imgInfo = { elem: null, x: 0, y: 0, win: 0, hei: 0 };
      this.tempData = null;
      this.clipScale = 0;
      this.isMobile = null;
      this.eventName = { start: "mousedown", move: "mousemove", end: "mouseup" };
      this.drag = null;
      this.tempInfo = null;
      this.wheelScale = 1;
      this.eventsBound = false;
      this.objectUrl = null;
      this.resizeHandler = null;
      this.listeners = [];
      var _a, _b, _c;
      this.options = options;
      const box = (_a = options.box) != null ? _a : ".clip-box";
      if (box === "") {
        console.error("box class name is not null!");
        return;
      }
      if (box === ".clip-box") {
        console.error("box class name is not allow!");
        return;
      }
      const url = options.url;
      if (!url) {
        console.error("url is not null!");
        return;
      }
      const pre = resolveElement(options.pre);
      if (!pre || pre.nodeName !== "IMG") {
        console.error("pre must is image element!");
      } else {
        this.pre = pre;
      }
      const container = resolveElement(box);
      if (!container) {
        console.error(`box element ${String(box)} is not found!`);
        return;
      }
      this.box = container;
      this.boxWin = options.boxWin || 400;
      this.boxHei = options.boxHei || 400;
      this.scale = options.scale || 1;
      this.areaWin = (options.areaWin || 100) * this.scale;
      this.areaHei = options.areaHei || 100;
      this.showPos = (_b = options.showPos) != null ? _b : true;
      this.scaleImg = (_c = options.scaleImg) != null ? _c : true;
      this.imgSrc = url;
      this.scaleMin = MIN_CROP;
      this.scaleMinWin = this.scaleMin * this.scale;
      this.scaleMinHei = this.scaleMin;
      this.checkMobile();
      this.applyBoxSize();
      this.initElem();
    }
    /** Touch devices pick touch events; everything else drags with the mouse. */
    checkMobile() {
      this.isMobile = "touchstart" in document || document.documentElement.clientWidth <= 768 || document.body.clientWidth <= 768;
      this.eventName = this.isMobile ? { start: "touchstart", move: "touchmove", end: "touchend" } : { start: "mousedown", move: "mousemove", end: "mouseup" };
      if (!this.resizeHandler) {
        this.resizeHandler = () => {
          this.checkMobile();
        };
      }
      window.onresize = this.resizeHandler;
    }
    /** The host element is sized from the options; the widget fills it. */
    applyBoxSize() {
      const box = this.box;
      if (!box) {
        return;
      }
      box.style.width = `${this.boxWin}px`;
      box.style.height = `${this.boxHei}px`;
    }
    initElem() {
      const box = this.box;
      if (!box) {
        return;
      }
      box.innerHTML = CLIP_TEMPLATE;
      this.getElem();
    }
    getElem() {
      const box = this.box;
      if (!box) {
        return;
      }
      this.clipBox = this.pick(box, ".clip-box");
      this.clipScaleBtn = this.pick(box, ".clip-img-scale");
      this.clipArea = this.pick(box, ".clip-img-area");
      this.clipShadowTop = this.pick(box, ".clip-img-shadow-top");
      this.clipShadowRight = this.pick(box, ".clip-img-shadow-right");
      this.clipShadowBottom = this.pick(box, ".clip-img-shadow-bottom");
      this.clipShadowLeft = this.pick(box, ".clip-img-shadow-left");
      this.clipImg = this.pick(this.clipBox, ".clip-bg");
      this.tempCanvas = this.pick(this.clipBox, ".clip-canvas-temp");
      this.clipCxt = this.context(this.clipImg);
      this.tempCxt = this.context(this.tempCanvas);
      this.clipImg.width = this.boxWin;
      this.clipImg.height = this.boxHei;
      this.loadImg();
      this.calcAreaElem();
      this.bindEvents();
    }
    /**
     * Widget nodes are always resolved inside the instance's own host, never
     * through `document`, so a second instance cannot grab the first one's nodes.
     */
    pick(root, selector) {
      const node = root.querySelector(selector);
      if (!node) {
        throw new Error(`XqClip: widget markup is missing "${selector}".`);
      }
      return node;
    }
    context(canvas) {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("XqClip: a 2d canvas context is required.");
      }
      return ctx;
    }
    /** Loads `imgSrc`, centred and fit to the box. */
    loadImg() {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = this.imgSrc;
      img.onload = () => {
        const imgScale = img.width / img.height;
        let imgWin = 0;
        let imgHei = 0;
        let imgX = 0;
        if (imgScale === 1) {
          imgWin = this.boxWin / 2;
          imgHei = this.boxHei / 2;
          imgX = (this.boxWin - imgWin) / 2;
        } else {
          imgWin = this.boxWin;
          imgHei = this.boxHei / imgScale;
          imgX = 0;
        }
        const imgY = (this.boxHei - imgHei) / 2;
        this.imgInfo = { elem: img, x: imgX, y: imgY, win: imgWin, hei: imgHei };
        this.drawImg(this.imgInfo);
      };
    }
    drawImg(info) {
      const elem = info.elem;
      if (!elem) {
        return;
      }
      this.clipImg.width = this.boxWin;
      this.clipImg.height = this.boxHei;
      this.clipCxt.drawImage(elem, info.x, info.y, info.win, info.hei);
    }
    /** Swaps the source image without re-binding listeners or touching geometry. */
    replaceImg(url) {
      if (!url) {
        console.error("url is must!");
        return false;
      }
      if (!this.clipImg) {
        return false;
      }
      this.clipImg.width = this.boxWin;
      this.clipImg.height = this.boxHei;
      this.imgSrc = url;
      this.loadImg();
      return true;
    }
    /** Re-applies the box size and re-reads the geometry after a layout change. */
    reset() {
      if (!this.box) {
        return;
      }
      this.checkMobile();
      this.applyBoxSize();
      this.calcAreaElem();
    }
    /** Sizes and centres the crop box, then re-draws the shadows. */
    calcAreaElem() {
      this.clipArea.style.width = `${this.areaWin}px`;
      this.clipArea.style.height = `${this.areaHei}px`;
      this.clipArea.style.left = `${(this.boxWin - this.areaWin) / 2}px`;
      this.clipArea.style.top = `${(this.boxHei - this.areaHei) / 2}px`;
      if (this.showPos) {
        this.clipArea.classList.remove("no-pos");
      }
      this.calcAreaPos();
      this.initShadowElem();
    }
    calcAreaPos() {
      this.clipBoxInfo = {
        win: this.clipBox.offsetWidth,
        hei: this.clipBox.offsetHeight,
        left: this.clipBox.offsetLeft,
        top: this.clipBox.offsetTop
      };
      this.clipAreaInfo = {
        win: this.clipArea.offsetWidth,
        hei: this.clipArea.offsetHeight,
        left: this.clipArea.offsetLeft,
        top: this.clipArea.offsetTop
      };
    }
    /** Shadow panels cover everything outside the crop box. */
    initShadowElem() {
      this.clipShadowTop.style.left = `${this.clipAreaInfo.left}px`;
      this.clipShadowTop.style.top = "0px";
      this.clipShadowRight.style.right = "0px";
      this.clipShadowRight.style.top = "0px";
      this.clipShadowBottom.style.left = `${this.clipAreaInfo.left}px`;
      this.clipShadowBottom.style.bottom = "0px";
      this.clipShadowLeft.style.height = `${this.clipBoxInfo.hei}px`;
      this.clipShadowLeft.style.left = "0px";
      this.clipShadowLeft.style.top = "0px";
      this.changeShadowElem(this.clipAreaInfo.win, this.clipAreaInfo.hei);
    }
    /** Listeners are registered once, even when `replaceImg` runs again. */
    bindEvents() {
      if (this.eventsBound) {
        return;
      }
      this.eventsBound = true;
      const active = supportsPassive ? { passive: false } : false;
      this.on(this.clipBox, "wheel", (event) => {
        this.handleWheel(event);
      }, active);
      this.on(this.clipBox, this.eventName.start, (event) => {
        var _a;
        preventScroll(event);
        if (((_a = event.target) == null ? void 0 : _a.className) === "clip-img-scale") {
          return;
        }
        this.calcAreaPos();
        this.drag = { mode: "drag" };
      }, active);
      this.on(this.clipScaleBtn, this.eventName.start, (event) => {
        preventScroll(event);
        const point = readPoint(event);
        if (!point) {
          return;
        }
        this.calcAreaPos();
        this.drag = {
          mode: "scale",
          startX: point.x,
          startY: point.y,
          startWidth: this.clipAreaInfo.win,
          startHeight: this.clipAreaInfo.hei,
          startLeft: this.clipAreaInfo.left,
          startTop: this.clipAreaInfo.top
        };
      }, active);
      this.on(this.clipBox, this.eventName.move, (event) => {
        this.moveArea(event);
      }, active);
      this.on(this.clipBox, this.eventName.end, () => {
        this.drag = null;
      });
    }
    on(target, type, handler, options = false) {
      target.addEventListener(type, handler, options);
      this.listeners.push({ target, type, handler });
    }
    /** `scaleImg: false` disables zooming without unregistering the listener. */
    handleWheel(event) {
      const info = this.imgInfo;
      const elem = info.elem;
      if (!this.scaleImg || !elem) {
        return;
      }
      if (event.deltaY > 0) {
        if (this.wheelScale > WHEEL_MIN) {
          this.wheelScale -= WHEEL_STEP;
        }
      } else if (this.wheelScale < WHEEL_MAX) {
        this.wheelScale += WHEEL_STEP;
      }
      const imgScale = elem.width / elem.height;
      let imgWin = 0;
      let imgHei = 0;
      let imgX = 0;
      if (imgScale === 1) {
        imgWin = this.boxWin / 2 * this.wheelScale;
        imgHei = this.boxHei / 2 * this.wheelScale;
        imgX = (this.boxWin - imgWin) / 2 * this.wheelScale;
      } else {
        imgWin = this.boxWin * this.wheelScale;
        imgHei = this.boxHei / imgScale * this.wheelScale;
        imgX = 0;
      }
      const imgY = (this.boxHei - imgHei) / 2;
      this.imgInfo = { elem, x: imgX, y: imgY, win: imgWin, hei: imgHei };
      this.drawImg(this.imgInfo);
    }
    /** Moves the crop box, or resizes it when the drag started on the handle. */
    moveArea(event) {
      const drag = this.drag;
      if (!drag) {
        return;
      }
      preventScroll(event);
      const point = readPoint(event);
      if (!point) {
        return;
      }
      if (drag.mode === "drag") {
        let cLeft = point.x - this.clipBoxInfo.left - this.clipAreaInfo.win / 2;
        let cTop = point.y - this.clipBoxInfo.top - this.clipAreaInfo.hei / 2;
        if (cLeft < 0) {
          cLeft = 0;
        }
        if (cLeft > this.clipBoxInfo.win - this.clipAreaInfo.win) {
          cLeft = this.clipBoxInfo.win - this.clipAreaInfo.win;
        }
        if (cTop < 0) {
          cTop = 0;
        }
        if (cTop > this.clipBoxInfo.hei - this.clipAreaInfo.hei) {
          cTop = this.clipBoxInfo.hei - this.clipAreaInfo.hei;
        }
        this.updateAreaRect(cLeft, cTop, this.clipAreaInfo.win, this.clipAreaInfo.hei);
      } else {
        const ratio = drag.startHeight > 0 ? drag.startWidth / drag.startHeight : Math.max(this.scale, 1);
        const deltaX = point.x - drag.startX;
        const deltaY = point.y - drag.startY;
        const widthFromX = drag.startWidth + deltaX;
        const widthFromY = (drag.startHeight + deltaY) * ratio;
        const proposedWidth = Math.abs(deltaX) >= Math.abs(deltaY * ratio) ? widthFromX : widthFromY;
        const maxWidth = Math.min(
          this.clipBoxInfo.win - drag.startLeft,
          (this.clipBoxInfo.hei - drag.startTop) * ratio
        );
        const minWidth = Math.min(
          maxWidth,
          Math.max(this.scaleMinWin, this.scaleMinHei * ratio)
        );
        const areaWin = Math.min(maxWidth, Math.max(minWidth, proposedWidth));
        const areaHei = areaWin / ratio;
        this.updateAreaRect(drag.startLeft, drag.startTop, areaWin, areaHei);
      }
    }
    /** Writes one geometry result to every visual and data-facing surface. */
    updateAreaRect(left, top, win, hei) {
      this.clipArea.style.left = `${left}px`;
      this.clipArea.style.top = `${top}px`;
      this.clipArea.style.width = `${win}px`;
      this.clipArea.style.height = `${hei}px`;
      this.clipAreaInfo = { win, hei, left, top };
      this.calcShadowElem();
      this.getAreaData();
    }
    /** Shadow sizes after a drag, before the next geometry read. */
    calcShadowElem() {
      this.changeShadowElem(this.clipAreaInfo.win, this.clipAreaInfo.hei);
    }
    /** Shadow sizes while the crop box is being resized. */
    changeShadowElem(areaMoveWin, areaMoveHei = this.clipAreaInfo.hei) {
      this.clipShadowTop.style.width = `${areaMoveWin}px`;
      this.clipShadowTop.style.height = `${this.clipAreaInfo.top}px`;
      this.clipShadowTop.style.left = `${this.clipAreaInfo.left}px`;
      this.clipShadowRight.style.width = `${this.clipBoxInfo.win - this.clipAreaInfo.left - areaMoveWin}px`;
      this.clipShadowRight.style.height = `${this.clipBoxInfo.hei}px`;
      this.clipShadowBottom.style.width = `${areaMoveWin}px`;
      this.clipShadowBottom.style.height = `${this.clipBoxInfo.hei - this.clipAreaInfo.top - areaMoveHei}px`;
      this.clipShadowBottom.style.left = `${this.clipAreaInfo.left}px`;
      this.clipShadowLeft.style.width = `${this.clipAreaInfo.left}px`;
    }
    /** Copies the selected region into the preview canvas and preview image. */
    getAreaData() {
      this.tempCanvas.width = this.clipAreaInfo.win;
      this.tempCanvas.height = this.clipAreaInfo.hei;
      this.tempCanvas.style.overflow = "hidden";
      this.clipArea.setAttribute(
        "data-pos",
        `pos(${this.clipAreaInfo.left},${this.clipAreaInfo.top})`
      );
      this.clipArea.setAttribute(
        "data-size",
        `wh(${this.clipAreaInfo.win},${this.clipAreaInfo.hei})`
      );
      this.tempData = this.clipCxt.getImageData(
        this.clipAreaInfo.left,
        this.clipAreaInfo.top,
        this.clipAreaInfo.win,
        this.clipAreaInfo.hei
      );
      this.tempCxt.putImageData(this.tempData, 0, 0);
      this.saveImgData();
    }
    /** Publishes the crop as a data url, an object url, and a file. */
    saveImgData() {
      var _a, _b;
      const base64 = this.tempCanvas.toDataURL("image/jpg");
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
      this.objectUrl = URL.createObjectURL(this.dataToBlob(base64));
      this.tempInfo = {
        base64,
        blob: this.objectUrl,
        file: this.dataToFile(base64)
      };
      if (this.pre) {
        this.pre.style.width = `${this.clipAreaInfo.win}px`;
        this.pre.style.height = `${this.clipAreaInfo.hei}px`;
        this.pre.style.overflow = "hidden";
        this.pre.src = base64;
      }
      (_b = (_a = this.options).onChange) == null ? void 0 : _b.call(_a, this.tempInfo);
    }
    /** The crop from the most recent selection change, if any. */
    getCanvasImgData() {
      return this.tempInfo;
    }
    dataToBlob(base64Data) {
      var _a, _b, _c;
      const parts = base64Data.split(",");
      const header = (_a = parts[0]) != null ? _a : "";
      const payload = (_b = parts[1]) != null ? _b : "";
      const byteString = header.indexOf("base64") >= 0 ? atob(payload) : unescape(payload);
      const mimeMatch = /data:(.*?);/.exec(header);
      const mime = (_c = mimeMatch == null ? void 0 : mimeMatch[1]) != null ? _c : "image/jpeg";
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i += 1) {
        bytes[i] = byteString.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    }
    dataToFile(dataurl, filename) {
      var _a, _b, _c;
      const parts = dataurl.split(",");
      const header = (_a = parts[0]) != null ? _a : "";
      const payload = (_b = parts[1]) != null ? _b : "";
      const mimeMatch = /data:(.*?);/.exec(header);
      const mime = (_c = mimeMatch == null ? void 0 : mimeMatch[1]) != null ? _c : "image/jpeg";
      const name = filename != null ? filename : `${Date.now()}.jpg`;
      const bstr = atob(payload);
      let n = bstr.length;
      const bytes = new Uint8Array(n);
      while (n > 0) {
        n -= 1;
        bytes[n] = bstr.charCodeAt(n);
      }
      return new File([bytes], name, { type: mime });
    }
    /** Detaches every listener, empties the host, and revokes the object url. */
    destroy() {
      for (const { target, type, handler } of this.listeners) {
        target.removeEventListener(type, handler);
      }
      this.listeners.length = 0;
      this.eventsBound = false;
      this.drag = null;
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
      if (this.resizeHandler && window.onresize === this.resizeHandler) {
        window.onresize = null;
      }
      if (this.box) {
        this.box.innerHTML = "";
      }
    }
  };

  // src/index.ts
  var index_default = XqClip;
  return __toCommonJS(index_exports);
})();

return __xqclipUmd__.default || __xqclipUmd__;
});

