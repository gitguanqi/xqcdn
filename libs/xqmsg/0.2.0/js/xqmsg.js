/*! xqmsg v0.2.0 | generated from lib/js/xqmsg-esm.js by scripts/build.mjs — do not edit */
(function (root, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        define(factory());
    } else if (typeof define === "function" && define.cmd) {
        define(function (require, exports, module) {
            module.exports = factory();
        });
    } else {
        root.xqmsg = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

const TIP_STATUS = ["tipTop", "tipMid", "tipBot"];
const POP_STATUS = ["success", "error", "warning", "info"];
const POP_ICONS = [
  "xqmsg-check-circle",
  "xqmsg-times-circle",
  "xqmsg-exclamation-circle",
  "xqmsg-info-circle"
];
const Z_INDEX_POP = 999 + 1;
const Z_INDEX_CONFIRM = 999;
const liveRecords = /* @__PURE__ */ new Set();
let allowHtml = false;
function config(options) {
  if (options && typeof options === "object" && "html" in options) {
    allowHtml = Boolean(options.html);
  }
  return { html: allowHtml };
}
function createElement(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
function fillText(node, value) {
  const text = value === void 0 || value === null ? "" : String(value);
  if (allowHtml) node.innerHTML = text;
  else node.textContent = text;
}
function appendContent(node, value) {
  const text = value === void 0 || value === null ? "" : String(value);
  if (!allowHtml) {
    node.appendChild(document.createTextNode(text));
    return;
  }
  node.insertAdjacentHTML("beforeend", text);
}
function attach(node, timer) {
  const record = { node, timer: timer === void 0 ? null : timer };
  liveRecords.add(record);
  return record;
}
function detach(record) {
  if (!record) return;
  if (record.timer !== null) {
    clearTimeout(record.timer);
    record.timer = null;
  }
  const node = record.node;
  if (node && node.parentNode) node.parentNode.removeChild(node);
  liveRecords.delete(record);
}
function scheduleRemoval(record, delay) {
  const wait = typeof delay === "number" && delay > 0 ? delay : 0;
  record.timer = setTimeout(function() {
    record.timer = null;
    detach(record);
  }, wait);
}
function showMsgTip(msg, code = 2, delay = 1e3) {
  const wrapper = createElement("div");
  wrapper.style.display = "block";
  const layer = createElement("div", "xq-model");
  const tip = createElement("div", "xq-model-tip " + TIP_STATUS[code]);
  fillText(tip, msg);
  layer.appendChild(tip);
  wrapper.appendChild(layer);
  document.body.appendChild(wrapper);
  scheduleRemoval(attach(wrapper), delay);
}
function showConfirm(title = "系统提示", type = 1, des = "") {
  const wrapper = createElement("div", "msg-box");
  wrapper.style.display = "block";
  wrapper.style.zIndex = String(Z_INDEX_CONFIRM);
  const dialog = createElement("div", "xq-msg");
  const inner = createElement("div", "xq-msg-inner");
  const titleNode = createElement("div", "xq-msg-title");
  fillText(titleNode, title);
  const content = createElement("div", "xq-msg-content");
  content.style.display = type ? "block" : "none";
  const desNode = createElement("div", "xq-msg-des");
  desNode.style.display = type == 1 ? "block" : "none";
  fillText(desNode, des);
  content.appendChild(desNode);
  const toolbar = createElement("div", "xq-msg-set");
  const cancelBtn = createElement("button", "xq-msg-btn cancel");
  cancelBtn.textContent = "取消";
  const confirmBtn = createElement("button", "xq-msg-btn confirm");
  confirmBtn.textContent = "确认";
  toolbar.appendChild(cancelBtn);
  toolbar.appendChild(confirmBtn);
  inner.appendChild(titleNode);
  inner.appendChild(content);
  inner.appendChild(toolbar);
  dialog.appendChild(inner);
  wrapper.appendChild(dialog);
  document.body.appendChild(wrapper);
  const record = attach(wrapper);
  return new Promise(function(resolve) {
    const clickObj = { type: 3, msg: "暂无消息" };
    let settled = false;
    function finish(kind, message) {
      if (settled) return;
      settled = true;
      clickObj.type = kind;
      clickObj.msg = message;
      detach(record);
      resolve(clickObj);
    }
    const ok = wrapper.querySelector(".xq-msg-btn.confirm");
    const no = wrapper.querySelector(".xq-msg-btn.cancel");
    if (!ok || !no) {
      detach(record);
      resolve(clickObj);
      return;
    }
    ok.addEventListener("click", function() {
      finish(1, "confirm");
    }, false);
    no.addEventListener("click", function() {
      finish(2, "cancel");
    }, false);
  });
}
function msgPop(msg, code = 1, delay = 3e3) {
  const index = code - 1;
  const elem = createElement("div", "xq-pop " + POP_STATUS[index]);
  elem.style.display = "block";
  elem.style.zIndex = String(Z_INDEX_POP);
  const icon = createElement("i", "xqmsg " + POP_ICONS[index] + " xq-pop-icon");
  elem.appendChild(icon);
  appendContent(elem, msg);
  document.body.appendChild(elem);
  scheduleRemoval(attach(elem), delay);
}
function clearAll() {
  const records = [];
  liveRecords.forEach(function(record) {
    records.push(record);
  });
  for (let i = 0; i < records.length; i += 1) {
    detach(records[i]);
  }
}
const xqMsg = {
  msg: showMsgTip,
  pop: msgPop,
  confirm: showConfirm,
  config,
  clearAll
};
var xqmsg_esm_default = xqMsg;

    return xqmsg_esm_default;
});
