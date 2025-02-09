(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory());
    } else if (typeof define === 'function' && define.cmd) {
        define(function (require, exports, module) {  
            module.exports = factory();
        });
    } else {
        root.xqmsg = factory();
    }
})(this, function factory () {

    const msgStatus = ["tipTop", "tipMid", "tipBot"];

    const popStatus = ["success", "error", "warning", "info"];

    const popIcons = [
        "xqmsg-check-circle",
        "xqmsg-times-circle",
        "xqmsg-exclamation-circle",
        "xqmsg-info-circle",
    ];

    // 显示文本气泡
    function showMsgTip(msg, code = 2, delay = 1000) {
        let elem = document.createElement("div");
        let msgElem = document.querySelectorAll(".xq-model");
        let status = msgStatus[code];
        let zIndex =
        msgElem.length <= 1
            ? 30 + 1
            : parseInt(msgElem[msgElem.length - 1].style.zIndex) + 1;
        elem.innerHTML = `
        <div class="xq-model">
        <div class="xq-model-tip ${status}">
            ${msg}
        </div>
        </div>
        `;
        elem.style.display = "block";
        elem.style.zIndex = zIndex;
        setTimeout(() => {
        elem.style.display = "none";
        document.body.removeChild(elem);
        }, delay);
        document.body.appendChild(elem);
    }

    // 弹出确认框
    function showConfirm(title = "系统提示", type = 1, des = "") {
        let elem = document.createElement("div");
        elem.className = "msg-box";
        elem.style.display = "block";
        elem.style.zIndex = 999;
        elem.innerHTML = `<div class="xq-msg">
        <div class="xq-msg-inner">
            <div class="xq-msg-title">
                ${title}
            </div>
            <div class="xq-msg-content" :style="display: ${
                type ? "block" : "none"
            };">
                <div class="xq-msg-des" :style="display: ${
                    type == 1 ? "block" : "none"
                };">
                ${des}
                </div>
            </div>
            <div class="xq-msg-set">
                <button class="xq-msg-btn cancel">取消</button>
                <button class="xq-msg-btn confirm">确认</button>
            </div>
        </div>
    </div>`;
        document.body.appendChild(elem);
        return new Promise(function (resolve) {
        let confirmBtn = document.querySelector(".xq-msg-btn.confirm");
        let cancelBtn = document.querySelector(".xq-msg-btn.cancel");
        let clickObj = {
            type: 3,
            msg: "暂无消息",
        };
        confirmBtn.addEventListener(
            "click",
            function () {
            clickObj.type = 1;
            clickObj.msg = "confirm";
            document.body.removeChild(elem);
            resolve(clickObj);
            },
            false
        );
        cancelBtn.addEventListener(
            "click",
            function () {
            clickObj.type = 2;
            clickObj.msg = "cancel";
            document.body.removeChild(elem);
            resolve(clickObj);
            },
            false
        );
        });
    }

    function msgPop(msg, code = 1, delay = 3000) {
        let elem = document.createElement("div");
        let msgElem = document.querySelectorAll(".xq-pop");
        let status = popStatus[code - 1];
        let iconName = popIcons[code - 1];
        let zIndex =
        msgElem.length <= 1
            ? 999 + 1
            : parseInt(msgElem[msgElem.length - 1].style.zIndex) + 1;
        elem.innerHTML = `<i class="xqmsg ${iconName} xq-pop-icon"/></i>${msg}`;
        elem.style.display = "block";
        elem.style.zIndex = zIndex;
        elem.className = "xq-pop " + status;
        setTimeout(() => {
        elem.style.display = "none";
        document.body.removeChild(elem);
        }, delay);
        document.body.appendChild(elem);
    }

    const xqMsg = {
        msg: showMsgTip,
        pop: msgPop,
        confirm: showConfirm,
    };

    return xqMsg;
});
