/**
 * xqmsg —— 轻量消息提示库（气泡 / 消息条 / 确认框）
 *
 * 本文件是唯一手写源。
 * lib/js/xqmsg.js、lib/js/xqmsg.min.js、lib/js/xqmsg-esm.min.js、lib/js/xqmsg-esm.mjs
 * 与 lib/css/xqmsg.min.css 全部由 `npm run build` 生成，请勿手工修改。
 */

// 三个提示通道的定位类，下标即 msg() 的 code 参数。
const TIP_STATUS = ["tipTop", "tipMid", "tipBot"];

// 四种气泡状态，下标即 pop() 的 code - 1。
const POP_STATUS = ["success", "error", "warning", "info"];

// 与上面一一对应的图标类。
const POP_ICONS = [
    "xqmsg-check-circle",
    "xqmsg-times-circle",
    "xqmsg-exclamation-circle",
    "xqmsg-info-circle",
];

// 层级只由样式表决定，集中记录在这里方便对照 lib/css/xqmsg.css 的 z-index 表。
const Z_INDEX_POP = 999 + 1;
const Z_INDEX_CONFIRM = 999;

// 模块内状态：仍在页面上的节点与它们的自动关闭定时器。
const liveRecords = new Set();

// 是否允许把调用方文本当作 HTML 解析。默认关闭，避免注入。
let allowHtml = false;

/**
 * 修改全局行为，目前只有 html 一个开关。
 * @param {{ html?: boolean }} [options]
 * @returns {{ html: boolean }} 生效后的配置
 */
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

// 叶子节点的文本写入：默认走 textContent，只有显式开启 html 才解析标签。
function fillText(node, value) {
    const text = value === undefined || value === null ? "" : String(value);
    if (allowHtml) node.innerHTML = text;
    else node.textContent = text;
}

// 往已有子节点的容器追加调用方内容，不能用 textContent，否则会清掉图标。
function appendContent(node, value) {
    const text = value === undefined || value === null ? "" : String(value);
    if (!allowHtml) {
        node.appendChild(document.createTextNode(text));
        return;
    }
    node.insertAdjacentHTML("beforeend", text);
}

function attach(node, timer) {
    const record = { node: node, timer: timer === undefined ? null : timer };
    liveRecords.add(record);
    return record;
}

// 摘除节点并释放定时器，重复调用是安全的。
function detach(record) {
    if (!record) return;
    if (record.timer !== null) {
        clearTimeout(record.timer);
        record.timer = null;
    }
    const node = record.node;
    // 用 parentNode 而不是 document.body：路由切换或框架重渲染后 body 已经不是它的父节点。
    if (node && node.parentNode) node.parentNode.removeChild(node);
    liveRecords.delete(record);
}

function scheduleRemoval(record, delay) {
    const wait = typeof delay === "number" && delay > 0 ? delay : 0;
    record.timer = setTimeout(function () {
        record.timer = null;
        detach(record);
    }, wait);
}

/**
 * 显示文本气泡。
 * @param {string} msg 文本内容
 * @param {number} [code] 0 顶部 / 1 居中 / 2 底部，默认 2
 * @param {number} [delay] 毫秒后自动消失，默认 1000
 */
function showMsgTip(msg, code = 2, delay = 1000) {
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

/**
 * 弹出确认框。
 * @param {string} [title] 标题，默认「系统提示」
 * @param {number} [type] 1 显示描述 / 0 不显示内容区 / 其它值不显示描述，默认 1
 * @param {string} [des] 描述内容
 * @returns {Promise<{ type: number, msg: string }>} 确认 {type:1}、取消 {type:2}
 */
function showConfirm(title = "系统提示", type = 1, des = "") {
    const wrapper = createElement("div", "msg-box");
    wrapper.style.display = "block";
    wrapper.style.zIndex = String(Z_INDEX_CONFIRM);

    const dialog = createElement("div", "xq-msg");
    const inner = createElement("div", "xq-msg-inner");

    const titleNode = createElement("div", "xq-msg-title");
    fillText(titleNode, title);

    const content = createElement("div", "xq-msg-content");
    // 与旧实现保持一致：按类型真值决定内容区，按宽松等于 1 决定描述区。
    content.style.display = type ? "block" : "none";

    const desNode = createElement("div", "xq-msg-des");
    desNode.style.display = type == 1 ? "block" : "none"; // eslint-disable-line eqeqeq
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

    return new Promise(function (resolve) {
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

        // 只在本容器内查询按钮：页面上同时存在多个对话框时，全局查询会抢到别人的按钮。
        const ok = wrapper.querySelector(".xq-msg-btn.confirm");
        const no = wrapper.querySelector(".xq-msg-btn.cancel");
        if (!ok || !no) {
            // 按钮是本函数自己创建的，正常不会走到这里；保底避免节点泄漏。
            detach(record);
            resolve(clickObj);
            return;
        }

        ok.addEventListener("click", function () {
            finish(1, "confirm");
        }, false);
        no.addEventListener("click", function () {
            finish(2, "cancel");
        }, false);
    });
}

/**
 * 顶部状态条。
 * @param {string} msg 文本内容
 * @param {number} [code] 1 成功 / 2 失败 / 3 警告 / 4 信息，默认 1
 * @param {number} [delay] 毫秒后自动消失，默认 3000
 */
function msgPop(msg, code = 1, delay = 3000) {
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

/**
 * 立即移除所有由本库创建的节点，并清掉自动关闭定时器。
 * 注意：未决的 confirm 会被移出页面，其 Promise 不会 resolve。
 */
function clearAll() {
    const records = [];
    liveRecords.forEach(function (record) {
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
    config: config,
    clearAll: clearAll,
};

export default xqMsg;
export { xqMsg };
