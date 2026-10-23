/*!
 * xqlight v0.6.0
 * A dependency-free image lightbox for the browser, with a Vue 2/3 wrapper.
 * @author fegq
 * @license MIT
 * @see https://github.com/gitguanqi/xqlight
 */
(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.XqLightBox = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /** 包版本。以 package.json 为准，由 scripts/build.mjs 校验并回写。 */
    const VERSION = '0.6.0';

    /** 滚轮/按钮单次缩放步长 */
    const ZOOM_STEP = 0.2;
    /** 缩放下限 */
    const ZOOM_MIN = 0.4;
    /** 缩放上限 */
    const ZOOM_MAX = 3;
    /** 点击图片时放大到的档位 */
    const CLICK_ZOOM = 2;
    /** 滚轮累积到多少像素当量算一档 */
    const WHEEL_UNIT = 50;
    /** 滚轮空闲多久清空累积（毫秒） */
    const WHEEL_IDLE = 400;
    /** 滑动切图的最小位移（像素） */
    const SWIPE_MIN = 40;
    /** 滑动切图要求横向位移是纵向的多少倍 */
    const SWIPE_RATIO = 1.5;
    /** 灯箱根节点标记，用于作用域查询，替代全局 `.lightbox` 查找 */
    const ROOT_ATTR = 'data-xqlight-root';
    /** 内部节点钩子属性：current / total / name / img / link / scale / close / download / prev / next / retry */
    const HOOK_ATTR = 'data-xqlight';
    /** 绑定在图库图片上的索引属性 */
    const INDEX_ATTR = 'data-xqlight-index';
    /** 缩略图按钮上的索引属性 */
    const THUMB_ATTR = 'data-xqlight-thumb';
    /** 加载状态属性，取值 idle / loading / loaded / error */
    const STATUS_ATTR = 'data-xqlight-status';
    /** 缩略图自动显示的张数区间 */
    const THUMB_MIN = 2;
    const THUMB_MAX = 20;
    /** 点击这些钩子节点（或它们的子节点）不应被当成"点了遮罩" */
    const INTERACTIVE_HOOKS = [
        'close', 'download', 'scale', 'zoom', 'rotate',
        'prev', 'next', 'retry', 'link', 'img', 'thumbs'
    ];

    /**
     * 判断节点自身或祖先里是否有交互控件。用于遮罩点击判定：
     * 指针捕获等场景下 `event.target` 可能被改写成容器，单看 target 会误判。
     *
     * @param {Element} node
     * @param {Element} root
     * @returns {boolean}
     */
    function hasInteractiveAncestor(node, root) {
        let cur = node;
        while (cur && cur !== root) {
            if (cur.getAttribute) {
                const hook = cur.getAttribute(HOOK_ATTR);
                if (hook && INTERACTIVE_HOOKS.indexOf(hook) !== -1) return true;
                if (cur.getAttribute('role') === 'button') return true;
                const tabIndex = cur.getAttribute('tabindex');
                if (tabIndex !== null && Number(tabIndex) >= 0) return true;
            }
            const tag = cur.nodeName ? String(cur.nodeName).toUpperCase() : '';
            if (tag === 'A' || tag === 'IMG' || tag === 'BUTTON') return true;
            cur = cur.parentNode;
        }
        return false;
    }

    /**
     * 键盘事件到动作的映射，仅在灯箱打开时生效。
     * @type {Object<string, string>}
     */
    const KEY_ACTIONS = {
        Escape: 'close',
        ArrowLeft: 'prev',
        ArrowRight: 'next',
        Home: 'first',
        End: 'last',
        '+': 'zoomIn',
        '=': 'zoomIn',
        '-': 'zoomOut',
        r: 'rotate',
        R: 'rotate'
    };

    /**
     * 页面滚动锁。多个实例共用引用计数，避免一个实例关闭就解除了另一个实例的锁。
     * @type {{ count: number, previous: string, previousPadding: string }}
     */
    const scrollLock = { count: 0, previous: '', previousPadding: '' };

    /**
     * 输出统一前缀的警告。库本身不抛错，可恢复的问题只提示。
     * @param {string} message
     */
    function warn(message) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('[xqlight] ' + message);
        }
    }

    /**
     * 把数值夹在 [min, max] 区间内。
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    function clamp(value, min, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    /**
     * 归一化缩放值：夹紧到允许区间，并消除浮点累加误差（0.6000000000000001 -> 0.6）。
     * @param {number} value
     * @returns {number}
     */
    function clampScale(value) {
        const numeric = Number(value);
        if (!isFinite(numeric)) return 1;
        return clamp(Math.round(numeric * 100) / 100, ZOOM_MIN, ZOOM_MAX);
    }

    /**
     * 环绕取索引：越界时回到另一端，空列表时返回 0。
     * @param {number} index
     * @param {number} length
     * @returns {number}
     */
    function wrapIndex(index, length) {
        const total = Math.trunc(Number(length)) || 0;
        if (total <= 0) return 0;
        let next = Math.trunc(Number(index));
        if (!isFinite(next)) next = 0;
        return ((next % total) + total) % total;
    }

    /**
     * 从图片地址推导文件名，去掉查询串与哈希。
     * @param {string} url
     * @returns {string}
     */
    function parseFileName(url) {
        const clean = String(url || '').split('#')[0].split('?')[0];
        const name = clean.substring(clean.lastIndexOf('/') + 1);
        if (!name) return '';
        try {
            return decodeURIComponent(name);
        } catch (error) {
            return name;
        }
    }

    /**
     * 生成下载文件名，保留原来的 `xqlight-<原名>` 约定。
     * @param {string} url
     * @param {string} [fallback]
     * @returns {string}
     */
    function buildFileName(url, fallback) {
        const name = parseFileName(url);
        return 'xqlight-' + (name || fallback || 'image');
    }

    /**
     * 两位小数取整，避免 transform 里出现 1.2000000000000002 这样的浮点尾巴。
     * @param {number} value
     * @returns {number}
     */
    function round2(value) {
        const numeric = Number(value);
        if (!isFinite(numeric)) return 0;
        return Math.round(numeric * 100) / 100;
    }

    /**
     * 把角度归一化到 [0, 360)，只保留 90 的整数倍。
     * @param {number} deg
     * @returns {number}
     */
    function normalizeRotation(deg) {
        const value = Number(deg) || 0;
        const snapped = Math.round(value / 90) * 90;
        return ((snapped % 360) + 360) % 360;
    }

    /**
     * 生成图片的 transform。
     *
     * 平移、旋转、缩放写在同一个字符串里，比拆成多个元素少一层合成；
     * 固定写作 translate3d 可让浏览器提前走 GPU 合成路径。
     * z 轴必须写成 `0px`：Chrome 会把 `0` 规范化成 `0px`，保持一致才能断言。
     * 旋转为 0 时整段省略，保持 `translate3d(...) scale(...)` 的稳定格式。
     *
     * @param {number} x 横向位移（像素）
     * @param {number} y 纵向位移（像素）
     * @param {number} scale 缩放值
     * @param {number} [rotation] 旋转角度（度），省略按 0 处理
     * @returns {string}
     */
    function buildTransform(x, y, scale, rotation) {
        const deg = normalizeRotation(rotation);
        const spin = deg ? ' rotate(' + deg + 'deg)' : '';
        return 'translate3d(' + round2(x) + 'px, ' + round2(y) + 'px, 0px)' + spin +
            ' scale(' + round2(scale) + ')';
    }

    /**
     * 滚轮累积器：把高频小步长事件折算成"至多一档"的缩放方向。
     *
     * 鼠标滚轮单次通常是 ±100，直接跨过阈值；触控板一次轻扫会给出十几个 ±3，
     * 旧实现每个事件都 ±0.2，观感就是"一滑到底"。这里按像素当量累积，
     * 空闲超过 WHEEL_IDLE 后清零，避免上一次的余量影响下一次操作。
     *
     * @param {{accum: number, last: number}} state 累积状态（由实例持有）
     * @param {number} deltaY wheel 事件的纵向增量
     * @param {number} [deltaMode] 0 像素 / 1 行 / 2 页
     * @param {number} [now] 当前时间戳，默认取 Date.now()
     * @returns {number} 1 放大、-1 缩小、0 不动作
     */
    function accumulateWheel(state, deltaY, deltaMode, now) {
        if (!state) return 0;
        const stamp = typeof now === 'number' ? now : Date.now();
        if (state.last && stamp - state.last > WHEEL_IDLE) state.accum = 0;
        state.last = stamp;

        const mode = Number(deltaMode) || 0;
        const unit = mode === 1 ? 40 : mode === 2 ? 800 : 1;
        const delta = (Number(deltaY) || 0) * unit;
        if (!delta) return 0;

        state.accum += delta;
        if (Math.abs(state.accum) < WHEEL_UNIT) return 0;

        // deltaY 为正表示向下滚，对应缩小
        const direction = state.accum > 0 ? -1 : 1;
        state.accum = 0;
        return direction;
    }

    /**
     * 判断节点是否应纳入 Tab 循环。
     * @param {Element} node
     * @returns {boolean}
     */
    function isFocusableNode(node) {
        if (!node || !node.getAttribute) return false;
        const tag = node.nodeName ? String(node.nodeName).toUpperCase() : '';
        const tabindex = node.getAttribute('tabindex');
        const native = tag === 'BUTTON' || (tag === 'A' && node.hasAttribute('href'));
        if (!native && tabindex !== '0') return false;
        if (tabindex === '-1') return false;
        if (node.hasAttribute('disabled')) return false;
        if (node.getAttribute('aria-hidden') === 'true') return false;
        return true;
    }

    /**
     * 收集灯箱内可聚焦的节点，用于 Tab 循环。
     *
     * 手动按 DOM 顺序遍历子节点，而不是依赖 compareDocumentPosition：
     * 后者在小程序/测试桩环境里可能不存在，且多选择器查询的结果顺序不可靠。
     *
     * @param {Element} root
     * @returns {Array<Element>}
     */
    function collectFocusables(root) {
        if (!root) return [];
        const out = [];
        const walk = function (node) {
            if (!node) return;
            if (node !== root && isFocusableNode(node)) out.push(node);
            const children = node.children || [];
            for (let i = 0; i < children.length; i += 1) walk(children[i]);
        };
        walk(root);
        return out;
    }

    /**
     * 计算 Tab / Shift+Tab 的下一个焦点。
     * @param {Array<Element>} list
     * @param {Element|null} active 当前焦点
     * @param {boolean} backwards 是否反向
     * @returns {Element|null}
     */
    function focusTrapStep(list, active, backwards) {
        if (!list || !list.length) return null;
        const at = list.indexOf(active);
        if (backwards) return at <= 0 ? list[list.length - 1] : list[at - 1];
        if (at === -1 || at === list.length - 1) return list[0];
        return list[at + 1];
    }

    /**
     * 把平移量夹在图片边界内。maxX / maxY 为 Infinity 时表示拿不到尺寸，原值放行。
     * @param {number} x
     * @param {number} y
     * @param {number} maxX
     * @param {number} maxY
     * @returns {number[]} [x, y]
     */
    function clampPan(x, y, maxX, maxY) {
        const limitX = isFinite(maxX) ? Math.max(0, maxX) : Infinity;
        const limitY = isFinite(maxY) ? Math.max(0, maxY) : Infinity;
        return [clamp(Number(x) || 0, -limitX, limitX), clamp(Number(y) || 0, -limitY, limitY)];
    }

    /**
     * 作用域内的安全查询。选择器非法时只告警，不抛错。
     * @param {string} selector
     * @param {ParentNode} [scope]
     * @returns {ArrayLike<Element>}
     */
    function queryAll(selector, scope) {
        const host = scope || (typeof document !== 'undefined' ? document : null);
        if (!host) return [];
        try {
            return host.querySelectorAll(selector);
        } catch (error) {
            warn('invalid selector "' + selector + '"');
            return [];
        }
    }

    /**
     * 判断选择器是否可用。
     * @param {string} selector
     * @returns {boolean}
     */
    function isValidSelector(selector) {
        if (typeof document === 'undefined') return false;
        try {
            document.querySelector(selector);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 安全聚焦，宿主环境不支持时忽略。
     * @param {Element|null} node
     */
    function focusNode(node) {
        if (node && typeof node.focus === 'function') {
            try {
                node.focus();
            } catch (error) {
                /* 忽略：不可聚焦的节点 */
            }
        }
    }

    /**
     * 转义放进 HTML 属性的字符串。
     * @param {string} value
     * @returns {string}
     */
    function escapeAttr(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * 预加载图片。用 createElement 而不是 new Image()：
     * 无 DOM 的宿主与测试桩里可能没有 Image 构造器。
     * @param {string[]} urls
     * @param {Document} [doc]
     */
    function preloadImages(urls, doc) {
        const host = doc || (typeof document !== 'undefined' ? document : null);
        if (!host || typeof host.createElement !== 'function') return;
        const list = urls || [];
        for (let i = 0; i < list.length; i += 1) {
            if (!list[i]) continue;
            const probe = host.createElement('img');
            probe.src = list[i];
        }
    }

    /**
     * 计算滚动条占用的宽度。拿不到尺寸时返回 0。
     * @returns {number}
     */
    function scrollbarGap() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
        const inner = Number(window.innerWidth) || 0;
        const root = document.documentElement;
        const client = root ? Number(root.clientWidth) || 0 : 0;
        if (!inner || !client) return 0;
        return Math.max(0, inner - client);
    }

    /**
     * 锁定/解锁页面滚动，引用计数避免多实例互相解锁。
     *
     * 锁定前补上滚动条宽度，避免内容在锁定瞬间横向跳一下（Windows 常见）。
     *
     * @param {boolean} locked
     */
    function lockScroll(locked) {
        if (typeof document === 'undefined' || !document.body) return;
        const body = document.body;
        if (locked) {
            if (scrollLock.count === 0) {
                scrollLock.previous = body.style.overflow || '';
                scrollLock.previousPadding = body.style.paddingRight || '';
                const gap = scrollbarGap();
                if (gap > 0) body.style.paddingRight = gap + 'px';
                body.style.overflow = 'hidden';
            }
            scrollLock.count += 1;
            return;
        }
        if (scrollLock.count === 0) return;
        scrollLock.count -= 1;
        if (scrollLock.count === 0) {
            body.style.overflow = scrollLock.previous;
            body.style.paddingRight = scrollLock.previousPadding;
        }
    }

    /**
     * 解除滚动锁，语义等同于 `lockScroll(false)`。
     */
    function unlockScroll() {
        lockScroll(false);
    }

    /**
     * 请求全屏。返回 Promise 的浏览器会把用户拒绝交给调用方，这里吞掉避免未捕获拒绝。
     * @param {Element} [element] 要全屏的元素，缺省为整页
     * @returns {boolean} 是否发起了请求
     */
    function toggleFullscreen(element) {
        const doc = typeof document !== 'undefined' ? document : null;
        const el = element || (doc ? doc.documentElement : null);
        if (!el) return false;
        const request = el.requestFullscreen || el.webkitRequestFullScreen ||
            el.mozRequestFullScreen || el.msRequestFullscreen;
        if (!request) return false;
        try {
            const result = request.call(el);
            if (result && typeof result.catch === 'function') result.catch(function () {});
            return true;
        } catch (error) {
            warn('fullscreen request failed: ' + error.message);
            return false;
        }
    }

    /**
     * 退出全屏。
     * @returns {boolean} 是否发起了请求
     */
    function exitFullscreen() {
        if (typeof document === 'undefined') return false;
        const exit = document.exitFullscreen || document.webkitCancelFullScreen ||
            document.mozCancelFullScreen || document.msExitFullscreen;
        if (!exit) return false;
        try {
            const result = exit.call(document);
            if (result && typeof result.catch === 'function') result.catch(function () {});
            return true;
        } catch (error) {
            warn('fullscreen exit failed: ' + error.message);
            return false;
        }
    }

    /**
     * 触发一次真实下载。
     *
     * 走 fetch + Blob 可以自定义文件名；跨域图片读不到二进制时回退为直接打开源地址，
     * 避免把未捕获的 CORS 拒绝丢给调用方。
     *
     * @param {string} url 图片地址
     * @param {string} [filename] 下载文件名
     * @returns {Promise<boolean>} 是否已触发
     */
    function downloadImage(url, filename) {
        const source = String(url || '');
        const name = filename || buildFileName(source);

        const startDownload = function (href, target, revokeUrl) {
            if (typeof document === 'undefined' || !document.body) return false;
            const anchor = document.createElement('a');
            anchor.style.display = 'none';
            anchor.download = name;
            anchor.href = href;
            if (target) {
                anchor.target = target;
                anchor.rel = 'noopener';
            }
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            if (revokeUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
                // 必须传 URL 字符串而不是 Blob；延后一轮，避免下载尚未开始就被回收。
                setTimeout(function () {
                    URL.revokeObjectURL(revokeUrl);
                }, 0);
            }
            return true;
        };

        const fallback = function () {
            return startDownload(source, '_blank', '');
        };

        if (typeof fetch !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL) {
            return Promise.resolve(fallback());
        }

        return fetch(source, { credentials: 'same-origin' })
            .then(function (response) {
                if (!response || !response.ok) {
                    throw new Error('HTTP ' + (response ? response.status : 'error'));
                }
                return response.blob();
            })
            .then(function (blob) {
                const objectUrl = URL.createObjectURL(blob);
                return startDownload(objectUrl, '', objectUrl);
            })
            .catch(function () {
                return fallback();
            });
    }

    /**
     * 归一化缩略图配置。
     * @param {*} value
     * @returns {boolean|string} true / false / 'auto'
     */
    function normalizeThumbnails(value) {
        if (value === true || value === false) return value;
        return 'auto';
    }

    /**
     * 归一化构造参数。
     * @param {Object} [option]
     * @returns {{ imgCls: string, thumbnails: boolean|string }}
     */
    function normalizeOptions(option) {
        const opts = option && typeof option === 'object' ? option : {};
        let selector = typeof opts.imgCls === 'string' ? opts.imgCls.trim() : '';
        if (!selector) {
            warn('option "imgCls" is required, e.g. new XqLightBox({ imgCls: ".imgs" })');
        } else if (!isValidSelector(selector + ' img')) {
            warn('option "imgCls" is not a usable selector: "' + selector + '"');
            selector = '';
        }
        return { imgCls: selector, thumbnails: normalizeThumbnails(opts.thumbnails) };
    }

    /**
     * 图片灯箱。
     *
     * 每个实例拥有自己的一棵 DOM 子树，所有内部查询都以该子树为作用域，
     * 因此同一页面可以安全地创建多个实例。
     *
     * @param {Object} [option]
     * @param {string} option.imgCls 包裹图片列表的容器选择器，必填
     * @param {boolean|string} [option.thumbnails] 缩略图条：true 强制显示、false 关闭、'auto'（默认）2~20 张时显示
     * @returns {XqLightBox}
     */
    function XqLightBox(option) {
        if (!(this instanceof XqLightBox)) return new XqLightBox(option);

        const opts = normalizeOptions(option);

        /** @type {string} 图库容器选择器 */
        this.imgCls = opts.imgCls;
        /** @type {boolean|string} 缩略图策略 */
        this.thumbnails = opts.thumbnails;
        /** @type {Array<{index:number,url:string,name:string,thumb:string}>} 当前绑定的图片列表 */
        this.imgList = [];
        /** @type {number} 当前图片索引 */
        this.currentImgIndex = 0;
        /** @type {number} 当前缩放值 */
        this.currentScale = 1;
        /** @type {number} 当前横向位移 */
        this.currentX = 0;
        /** @type {number} 当前纵向位移 */
        this.currentY = 0;
        /** @type {number} 当前旋转角度，取值 0 / 90 / 180 / 270 */
        this.currentRotation = 0;
        /** @type {boolean} 是否处于全屏 */
        this.isScale = false;
        /** @type {boolean} 灯箱是否打开 */
        this.isOpen = false;
        /** @type {string} 当前加载状态：idle / loading / loaded / error */
        this.status = 'idle';
        /** @type {HTMLElement|null} 实例自己的根节点 */
        this.root = null;

        this._refs = {};
        this._imageBindings = [];
        this._controlBindings = [];
        this._readyHandler = null;
        this._keyHandler = null;
        this._rafId = 0;
        this._previousFocus = null;
        this._gesture = null;
        this._wheel = { accum: 0, last: 0 };
        this._destroyed = false;

        this.init();
    }

    /** 版本号，便于运行时排查 */
    XqLightBox.version = VERSION;

    /**
     * 初始化：挂载 DOM、绑定控件、扫描图片。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.init = function () {
        this.mount();
        this.bindKeyboard();
        this.whenReady();
        return this;
    };

    /**
     * 把灯箱挂到页面并绑定自身控件。`document.body` 还不存在时（脚本在 <head>）
     * 什么也不做，等 DOMContentLoaded 再挂。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.mount = function () {
        this.addLightBoxElem();
        if (this.root) {
            this.addIconEvent();
            this.addArrow();
            this.bindBackdrop();
            this.bindThumbs();
            this.bindMedia();
            this.bindGesture();
        }
        return this;
    };

    /**
     * 注入灯箱标记并缓存内部节点引用。
     *
     * 只保留 class 名作为对外样式钩子，内部定位一律用 `data-xqlight`，不再使用 id，
     * 因此多实例不会产生重复 id。
     *
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.addLightBoxElem = function () {
        if (typeof document === 'undefined' || !document.body) return this;

        const template = [
            '<div class="lightbox" ' + ROOT_ATTR + '="1" role="dialog" aria-modal="true"',
            ' aria-label="图片预览" aria-hidden="true" ' + STATUS_ATTR + '="idle">',
            '    <div class="lightbox-title">',
            '        <span class="lightbox-title-tip">图片预览</span>',
            '        <div class="lightbox-title-num" role="status" aria-live="polite">',
            '            (<strong ' + HOOK_ATTR + '="current">0</strong>/<strong ' + HOOK_ATTR + '="total">0</strong>)',
            '            <span class="lightbox-name">',
            '                【<span ' + HOOK_ATTR + '="name">图片名称</span>】',
            '            </span>',
            '        </div>',
            '        <p>',
            '            <i class="lightbox-zoom plugin plugin-search-plus" ' + HOOK_ATTR + '="zoom" role="button" tabindex="0" aria-label="放大图片"></i>',
            '            <i class="lightbox-rotate" ' + HOOK_ATTR + '="rotate" role="button" tabindex="0" aria-label="顺时针旋转 90 度"></i>',
            '            <i class="lightbox-download plugin plugin-download" ' + HOOK_ATTR + '="download" role="button" tabindex="0" aria-label="下载图片"></i>',
            '            <i class="lightbox-scale plugin plugin-fullscreen" ' + HOOK_ATTR + '="scale" role="button" tabindex="0" aria-label="全屏显示"></i>',
            '            <i class="lightbox-close plugin plugin-times" ' + HOOK_ATTR + '="close" role="button" tabindex="0" aria-label="关闭"></i>',
            '        </p>',
            '    </div>',
            '    <div class="lightbox-content" ' + HOOK_ATTR + '="content">',
            '        <div class="lightbox-ls" ' + HOOK_ATTR + '="ls">',
            '            <div class="lightbox-arrow lightbox-arrow-left" ' + HOOK_ATTR + '="prev" role="button" tabindex="0" aria-label="上一张">',
            '                <i class="plugin plugin-arrow-left"></i>',
            '            </div>',
            '            <ul class="lightbox-list" ' + HOOK_ATTR + '="list">',
            '                <li class="lightbox-stage" ' + HOOK_ATTR + '="stage">',
            '                    <a class="lightbox-link" ' + HOOK_ATTR + '="link" href="" target="_blank" rel="noopener">',
            '                        <img class="lightbox-img" ' + HOOK_ATTR + '="img" src="" alt="">',
            '                    </a>',
            '                    <span class="lightbox-loader" ' + HOOK_ATTR + '="loader" role="status" aria-label="加载中"></span>',
            '                    <span class="lightbox-error" ' + HOOK_ATTR + '="error">图片加载失败',
            '                        <i class="lightbox-retry" ' + HOOK_ATTR + '="retry" role="button" tabindex="0">重试</i>',
            '                    </span>',
            '                </li>',
            '            </ul>',
            '            <div class="lightbox-arrow lightbox-arrow-right" ' + HOOK_ATTR + '="next" role="button" tabindex="0" aria-label="下一张">',
            '                <i class="plugin plugin-arrow-right"></i>',
            '            </div>',
            '        </div>',
            '    </div>',
            '    <div class="lightbox-thumbs lightbox-thumbs-hidden" ' + HOOK_ATTR + '="thumbs" role="group" aria-label="图片缩略图"></div>',
            '</div>'
        ].join('\n');

        const holder = document.createElement('div');
        holder.innerHTML = template;
        const rootNode = holder.firstElementChild || holder.children[0];
        if (!rootNode) {
            warn('failed to build the lightbox markup');
            return this;
        }

        this.root = rootNode;
        document.body.appendChild(rootNode);

        this._refs = {};
        const hooks = queryAll('[' + HOOK_ATTR + ']', this.root);
        Array.prototype.forEach.call(hooks, function (node) {
            this._refs[node.getAttribute(HOOK_ATTR)] = node;
        }, this);

        return this;
    };

    /**
     * 绑定灯箱自身的按钮：关闭、缩放、下载、上一张、下一张、重试。
     *
     * `role="button"` 的 `<i>` 不会自己响应键盘，所以每个控件同时绑 click 与
     * Enter/Space 的 keydown；两者都记进 `_controlBindings`，销毁时统一解绑。
     *
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.addIconEvent = function () {
        const handlers = {
            close: function () { this.closeLightBox(); },
            scale: function () { this.scaleImg(); },
            zoom: function () { this.toggleZoom(); },
            rotate: function () { this.rotate(90); },
            download: function () { this.downloadImg(); },
            prev: function () { this.prevImg(); },
            next: function () { this.nextImg(); },
            retry: function () { this.reloadImg(); }
        };
        const refs = this._refs;
        const activateKeys = { Enter: 1, ' ': 1, Spacebar: 1 };

        Object.keys(handlers).forEach(function (hook) {
            const node = refs[hook];
            if (!node || !node.addEventListener) return;

            const handler = handlers[hook].bind(this);
            node.addEventListener('click', handler, false);
            this._controlBindings.push({ node: node, type: 'click', handler: handler });

            const onKey = function (event) {
                if (!activateKeys[event.key]) return;
                if (typeof event.preventDefault === 'function') event.preventDefault();
                handler(event);
            };
            node.addEventListener('keydown', onKey, false);
            this._controlBindings.push({ node: node, type: 'keydown', handler: onKey });
        }, this);

        return this;
    };

    /**
     * 点击空白处关闭；点击图片切换放大档位。
     *
     * 关闭判定用节点引用比较而不是选择器：只有根容器、内容区、横向容器、
     * 列表和舞台这几层空白才算"背景"，图片、箭头、标题栏都不在此列。
     *
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.bindBackdrop = function () {
        if (!this.root || !this.root.addEventListener) return this;

        const self = this;
        const closers = [this.root, this._refs.content, this._refs.ls, this._refs.list, this._refs.stage]
            .filter(function (node) { return Boolean(node); });

        const backdrop = function (event) {
            if (!self.isOpen) return;
            // 拖拽/滑动结束后的那次 click 不属于"点遮罩"
            if (self._suppressClick) return;
            const target = event.target;
            if (!target) return;
            if (closers.indexOf(target) === -1) return;
            if (hasInteractiveAncestor(target, self.root)) return;
            self.closeLightBox();
        };
        this.root.addEventListener('click', backdrop, false);
        this._controlBindings.push({ node: this.root, type: 'click', handler: backdrop });

        const link = this._refs.link;
        if (link && link.addEventListener) {
            const zoom = function (event) {
                if (!self.isOpen) return;
                // 只拦左键；中键/右键仍可"在新标签打开原图"
                if (typeof event.button === 'number' && event.button !== 0) return;
                if (typeof event.preventDefault === 'function') event.preventDefault();
                self.toggleZoom();
            };
            link.addEventListener('click', zoom, false);
            this._controlBindings.push({ node: link, type: 'click', handler: zoom });
        }
        return this;
    };

    /**
     * 缩略图事件委托：监听器绑在常驻容器上，重建子项不会叠加监听。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.bindThumbs = function () {
        const box = this._refs.thumbs;
        if (!box || !box.addEventListener) return this;

        const self = this;
        const handler = function (event) {
            const index = thumbIndexOf(event.target, box);
            if (index >= 0) self.goTo(index);
        };
        box.addEventListener('click', handler, false);
        this._controlBindings.push({ node: box, type: 'click', handler: handler });
        return this;
    };

    /**
     * 从事件目标向上找到缩略图按钮的索引。
     * @param {Element} node
     * @param {Element} stop 容器边界
     * @returns {number}
     */
    function thumbIndexOf(node, stop) {
        let current = node;
        while (current && current !== stop) {
            if (current.getAttribute) {
                const raw = current.getAttribute(THUMB_ATTR);
                if (raw !== null && raw !== '') return Number(raw);
            }
            current = current.parentNode;
        }
        return -1;
    }

    /**
     * 图片加载状态与全屏状态的外部变化。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.bindMedia = function () {
        const img = this._refs.img;
        const self = this;

        if (img && img.addEventListener) {
            const loaded = function () { self.setStatus('loaded'); };
            const failed = function () { self.setStatus('error'); };
            img.addEventListener('load', loaded, false);
            img.addEventListener('error', failed, false);
            this._controlBindings.push({ node: img, type: 'load', handler: loaded });
            this._controlBindings.push({ node: img, type: 'error', handler: failed });
        }

        if (typeof document !== 'undefined' && document.addEventListener) {
            const sync = function () {
                const active = typeof document.fullscreenElement !== 'undefined'
                    ? document.fullscreenElement
                    : document.webkitFullscreenElement;
                const isSelf = Boolean(active) && active === self.root;
                if (isSelf !== self.isScale) {
                    self.isScale = isSelf;
                    self.syncScaleButton();
                }
            };
            document.addEventListener('fullscreenchange', sync, false);
            document.addEventListener('webkitfullscreenchange', sync, false);
            this._controlBindings.push({ node: document, type: 'fullscreenchange', handler: sync });
            this._controlBindings.push({ node: document, type: 'webkitfullscreenchange', handler: sync });
        }
        return this;
    };

    /**
     * 绑定滚轮缩放。
     *
     * 监听器挂在实例根节点上而不是 window：不再污染全局，也不会在灯箱关闭时
     * 干扰宿主页面滚动。滚轮需要 preventDefault 阻止页面滚动，因此显式声明
     * `passive: false`；老引擎不认识 options 对象时退回布尔第三参。
     *
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.addArrow = function () {
        if (!this.root || !this.root.addEventListener) return this;

        const wheelHandler = this.handleScroll.bind(this);
        const wheelOptions = this.supportsPassive() ? { passive: false } : false;
        this.root.addEventListener('wheel', wheelHandler, wheelOptions);
        this._controlBindings.push({ node: this.root, type: 'wheel', handler: wheelHandler });
        return this;
    };

    /**
     * 绑定拖拽平移与滑动切图。
     *
     * 只在支持 PointerEvent 的环境启用；测试桩没有 PointerEvent，会自动跳过。
     * 放大状态下拖拽平移，原始比例下横向滑动切图，`pointercancel` 一律复位。
     *
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.bindGesture = function () {
        const surface = this._refs.ls;
        if (!surface || !surface.addEventListener) return this;
        if (typeof window === 'undefined' || typeof window.PointerEvent !== 'function') return this;

        const self = this;
        const img = this._refs.img;

        const down = function (event) {
            if (!self.isOpen) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            // 新的一次按下意味着上一次拖拽产生的 click 不会再来了
            self._suppressClick = false;
            self._gesture = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                startX: self.currentX,
                startY: self.currentY,
                dragging: self.currentScale > 1,
                moved: false,
                captured: false
            };
            if (self._gesture.dragging && img && img.classList) img.classList.add('lightbox-img-dragging');
        };

        // 只在确认是拖拽/滑动之后才捕获指针。
        // 按下即捕获会让浏览器把随后的 click 事件目标改写成捕获元素（.lightbox-ls），
        // 箭头与图片的点击处理全部失效，遮罩判定还会误判为点了空白处。
        const capture = function (gesture) {
            if (gesture.captured) return;
            gesture.captured = true;
            if (!surface.setPointerCapture || typeof gesture.id !== 'number') return;
            try {
                surface.setPointerCapture(gesture.id);
            } catch (error) {
                /* 忽略：指针已释放 */
            }
        };

        const move = function (event) {
            const gesture = self._gesture;
            if (!gesture || event.pointerId !== gesture.id) return;

            const dx = event.clientX - gesture.x;
            const dy = event.clientY - gesture.y;
            if (!gesture.dragging) {
                if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                    gesture.moved = true;
                    capture(gesture);
                }
                return;
            }

            if (!gesture.moved) {
                gesture.moved = true;
                capture(gesture);
            }
            const bounds = self.panBounds();
            const next = clampPan(gesture.startX + dx, gesture.startY + dy, bounds.maxX, bounds.maxY);
            self.currentX = next[0];
            self.currentY = next[1];
            if (typeof event.preventDefault === 'function') event.preventDefault();
            self.scheduleFrame();
        };

        const up = function (event) {
            const gesture = self._gesture;
            if (!gesture) return;
            if (typeof event.pointerId === 'number' && event.pointerId !== gesture.id) return;
            self._gesture = null;
            if (img && img.classList) img.classList.remove('lightbox-img-dragging');

            if (gesture.captured && surface.releasePointerCapture && typeof gesture.id === 'number') {
                try {
                    surface.releasePointerCapture(gesture.id);
                } catch (error) {
                    /* 忽略：指针已释放 */
                }
            }

            if (gesture.moved) self._suppressClick = true;

            if (gesture.dragging) {
                const bounds = self.panBounds();
                const settled = clampPan(self.currentX, self.currentY, bounds.maxX, bounds.maxY);
                self.currentX = settled[0];
                self.currentY = settled[1];
                self.scheduleFrame();
                return;
            }

            const dx = (Number(event.clientX) || gesture.x) - gesture.x;
            const dy = (Number(event.clientY) || gesture.y) - gesture.y;
            if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
                if (dx < 0) self.nextImg();
                else self.prevImg();
            }
        };

        const cancel = function () {
            self._gesture = null;
            if (img && img.classList) img.classList.remove('lightbox-img-dragging');
        };

        const bindings = [
            ['pointerdown', down],
            ['pointermove', move],
            ['pointerup', up],
            ['pointercancel', cancel]
        ];
        bindings.forEach(function (entry) {
            surface.addEventListener(entry[0], entry[1], false);
            self._controlBindings.push({ node: surface, type: entry[0], handler: entry[1] });
        });
        return this;
    };

    /**
     * 计算当前图片可平移的边界。拿不到尺寸时返回 Infinity，调用方原值放行。
     * @returns {{maxX: number, maxY: number}}
     */
    XqLightBox.prototype.panBounds = function () {
        const img = this._refs.img;
        const box = this._refs.list || this._refs.ls;
        if (!img || !box || typeof img.getBoundingClientRect !== 'function' ||
            typeof box.getBoundingClientRect !== 'function') {
            return { maxX: Infinity, maxY: Infinity };
        }
        try {
            const rect = img.getBoundingClientRect();
            const view = box.getBoundingClientRect();
            return {
                maxX: Math.max(0, (rect.width - view.width) / 2),
                maxY: Math.max(0, (rect.height - view.height) / 2)
            };
        } catch (error) {
            return { maxX: Infinity, maxY: Infinity };
        }
    };

    /**
     * 探测浏览器是否支持 passive 选项。
     * @returns {boolean}
     */
    XqLightBox.prototype.supportsPassive = function () {
        let supported = false;
        if (typeof window === 'undefined' || !window.addEventListener) return false;
        try {
            const probe = function () {};
            const options = Object.defineProperty({}, 'passive', {
                get: function () {
                    supported = true;
                    return false;
                }
            });
            window.addEventListener('xqlight-probe', probe, options);
            window.removeEventListener('xqlight-probe', probe, options);
        } catch (error) {
            supported = false;
        }
        return supported;
    };

    /**
     * 绑定 Esc / 方向键 / Home / End / 加减号，并承担 Tab 焦点循环。
     *
     * 全局只注册这一个 keydown：Tab 拦截必须写在这里，否则会多出一个
     * document 级监听（销毁语义与测试都会变复杂）。
     *
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.bindKeyboard = function () {
        if (typeof document === 'undefined') return this;
        const self = this;
        this._keyHandler = function (event) {
            if (!self.isOpen) return;

            if (event.key === 'Tab') {
                const list = collectFocusables(self.root);
                if (!list.length) return;
                if (typeof event.preventDefault === 'function') event.preventDefault();
                focusNode(focusTrapStep(list, document.activeElement, event.shiftKey));
                return;
            }

            const action = KEY_ACTIONS[event.key];
            if (!action) return;
            if (typeof event.preventDefault === 'function') event.preventDefault();

            if (action === 'close') self.closeLightBox();
            else if (action === 'prev') self.prevImg();
            else if (action === 'next') self.nextImg();
            else if (action === 'first') self.goTo(0);
            else if (action === 'last') self.goTo(self.imgList.length - 1);
            else if (action === 'zoomIn') self.zoom(1);
            else if (action === 'zoomOut') self.zoom(-1);
            else if (action === 'rotate') self.rotate(90);
        };
        document.addEventListener('keydown', this._keyHandler, false);
        return this;
    };

    /**
     * 按文档就绪状态决定扫描时机。
     *
     * 先立刻扫一次：图库已经解析完成时（脚本在 body 末尾、SPA 里动态创建）
     * 构造完就能用。还没解析完则等 DOMContentLoaded 再扫一次，重复扫描是幂等的。
     * 这里不覆盖 `window.onload`。
     *
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.whenReady = function () {
        if (typeof document === 'undefined') return this;

        this.getImgs();
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            return this;
        }

        const self = this;
        this._readyHandler = function () {
            self._readyHandler = null;
            if (!self.root) self.mount();
            self.getImgs();
        };
        document.addEventListener('DOMContentLoaded', this._readyHandler, false);
        return this;
    };

    /**
     * 扫描图库图片并绑定点击。
     *
     * 可重复调用：每次先解绑上一轮处理器并清空列表，避免条目翻倍。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.getImgs = function () {
        if (this._destroyed) return this;

        this.unbindImages();
        this.imgList = [];

        if (!this.imgCls) {
            this.syncTotal();
            this.renderThumbs();
            return this;
        }

        const nodes = queryAll(this.imgCls + ' img');
        const self = this;
        Array.prototype.forEach.call(nodes, function (node, index) {
            const url = node.getAttribute('src') || node.currentSrc || '';
            const name = node.getAttribute('alt') || node.getAttribute('data-name') || 'img' + (index + 1);
            const thumb = node.getAttribute('data-thumb') || '';
            node.setAttribute(INDEX_ATTR, String(index));
            self.imgList.push({ index: index, url: url, name: name, thumb: thumb });
            self.bindImageClick(node);
        });

        this.syncTotal();
        this.renderThumbs();
        return this;
    };

    /**
     * 绑定单张图片的点击。
     * @param {Element} node
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.bindImageClick = function (node) {
        if (!node || !node.addEventListener) return this;
        const self = this;
        const handler = function (event) {
            const target = event.currentTarget || event.target;
            const index = Number(target.getAttribute(INDEX_ATTR));
            self.showLightBox(isFinite(index) ? index : 0);
        };
        node.addEventListener('click', handler, false);
        this._imageBindings.push({ node: node, type: 'click', handler: handler });
        return this;
    };

    /**
     * 解绑所有图库图片上的处理器。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.unbindImages = function () {
        this._imageBindings.forEach(function (binding) {
            if (binding.node && binding.node.removeEventListener) {
                binding.node.removeEventListener(binding.type, binding.handler, false);
            }
        });
        this._imageBindings = [];
        return this;
    };

    /**
     * 重新扫描图库。动态插入图片后由宿主页调用。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.refresh = function () {
        return this.getImgs();
    };

    /**
     * 更新总数显示。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.syncTotal = function () {
        const total = String(this.imgList.length);
        if (this._refs.total) this._refs.total.textContent = total;
        // 供 CSS 判断"只有一张图"（隐藏无意义的左右箭头）
        if (this.root && this.root.setAttribute) this.root.setAttribute('data-xqlight-count', total);
        return this;
    };

    /**
     * 重建缩略图条。子项数量或地址变化时调用，切换图片只需 syncThumbs。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.renderThumbs = function () {
        const box = this._refs.thumbs;
        if (!box) return this;

        const total = this.imgList.length;
        const mode = this.thumbnails;
        const visible = mode === true || (mode !== false && total >= THUMB_MIN && total <= THUMB_MAX);

        if (box.classList) box.classList.toggle('lightbox-thumbs-hidden', !visible);
        if (!visible) {
            box.innerHTML = '';
            return this;
        }

        let html = '';
        for (let i = 0; i < total; i += 1) {
            const item = this.imgList[i];
            const active = i === this.currentImgIndex;
            html += '<button type="button" class="lightbox-thumb' + (active ? ' active' : '') + '"' +
                ' ' + THUMB_ATTR + '="' + i + '"' +
                ' aria-current="' + (active ? 'true' : 'false') + '"' +
                ' aria-label="第' + (i + 1) + '张">' +
                '<img class="lightbox-thumb-img" src="' + escapeAttr(item.thumb || item.url) + '" alt="">' +
                '</button>';
        }
        box.innerHTML = html;
        return this;
    };

    /**
     * 同步缩略图的当前项高亮。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.syncThumbs = function () {
        const box = this._refs.thumbs;
        if (!box) return this;
        const nodes = queryAll('[' + THUMB_ATTR + ']', box);
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            const active = Number(node.getAttribute(THUMB_ATTR)) === this.currentImgIndex;
            if (node.classList) node.classList.toggle('active', active);
            node.setAttribute('aria-current', active ? 'true' : 'false');
        }
        return this;
    };

    /**
     * 打开灯箱。
     * @param {number} index 图片索引，越界时环绕
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.showLightBox = function (index) {
        if (!this.imgList.length) {
            warn('no images bound; call refresh() after the gallery is rendered');
            return this;
        }

        const wasOpen = this.isOpen;
        this.currentImgIndex = wrapIndex(index, this.imgList.length);
        this.currentScale = 1;
        this.currentX = 0;
        this.currentY = 0;
        this.currentRotation = 0;
        this.isOpen = true;
        this.syncZoomButton();
        this.syncRotateButton();

        if (this.root) {
            this.root.classList.add('active');
            this.root.setAttribute('aria-hidden', 'false');
        }
        // 打开状态下再跳转不能重复加锁，否则引用计数会泄漏
        if (!wasOpen) {
            lockScroll(true);
            this._previousFocus = typeof document !== 'undefined' ? document.activeElement : null;
        }

        this.showImg();
        this.focusClose();
        return this;
    };

    /**
     * 渲染当前图片。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.showImg = function () {
        const item = this.imgList[this.currentImgIndex];
        if (!item) return this;

        this.setStatus('loading');

        const img = this._refs.img;
        if (img) {
            img.src = item.url;
            img.alt = item.name;
            if (img.setAttribute) img.setAttribute('alt', item.name);
        }
        if (this._refs.link) {
            this._refs.link.href = item.url;
            this._refs.link.title = item.name;
        }
        if (this._refs.current) this._refs.current.textContent = String(this.currentImgIndex + 1);
        if (this._refs.total) this._refs.total.textContent = String(this.imgList.length);
        if (this.root && this.root.setAttribute) {
            this.root.setAttribute('data-xqlight-count', String(this.imgList.length));
        }
        if (this._refs.name) {
            this._refs.name.textContent = item.name;
            this._refs.name.setAttribute('title', item.name);
        }

        this.applyScale();
        this.syncThumbs();
        this.preloadNeighbors();

        // 缓存命中时不会再触发 load 事件，这里补一次判定
        if (img && img.complete && Number(img.naturalWidth) > 0) this.setStatus('loaded');
        return this;
    };

    /**
     * 切换加载状态。CSS 依据根节点上的状态属性显隐 loader / 错误提示。
     * @param {string} status idle / loading / loaded / error
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.setStatus = function (status) {
        this.status = status;
        if (this.root && this.root.setAttribute) this.root.setAttribute(STATUS_ATTR, status);
        return this;
    };

    /**
     * 重新加载当前图片（错误态里的"重试"）。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.reloadImg = function () {
        return this.showImg();
    };

    /**
     * 预加载前后各一张，切图时不再白屏。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.preloadNeighbors = function () {
        const total = this.imgList.length;
        if (total < 2) return this;

        const urls = [];
        const offsets = [-1, 1];
        for (let i = 0; i < offsets.length; i += 1) {
            const item = this.imgList[wrapIndex(this.currentImgIndex + offsets[i], total)];
            if (item && item.url) urls.push(item.url);
        }
        preloadImages(urls);
        return this;
    };

    /**
     * 把缩放与平移写进样式，供 rAF 回调调用。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.applyScale = function () {
        const img = this._refs.img;
        if (img) {
            img.style.transform = buildTransform(this.currentX, this.currentY, this.currentScale, this.currentRotation);
            if (img.classList) {
                img.classList.toggle('lightbox-img-zoomed', this.currentScale > 1);
                img.classList.toggle('lightbox-img-rotated', this.currentRotation !== 0);
            }
        }
        return this;
    };

    /**
     * 把样式写入合并到下一帧，滚轮高频触发时避免逐次写样式。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.scheduleFrame = function () {
        const self = this;
        const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : null;
        if (!raf) {
            this.applyScale();
            return this;
        }
        if (this._rafId) return this;
        this._rafId = raf(function () {
            self._rafId = 0;
            self.applyScale();
        });
        return this;
    };

    /**
     * 设置缩放值，并按新比例校正平移边界。
     * @param {number} value
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.setScale = function (value) {
        this.currentScale = clampScale(value);
        if (this.currentScale <= 1) {
            this.currentX = 0;
            this.currentY = 0;
        } else {
            const bounds = this.panBounds();
            const pan = clampPan(this.currentX, this.currentY, bounds.maxX, bounds.maxY);
            this.currentX = pan[0];
            this.currentY = pan[1];
        }
        this.syncZoomButton();
        return this.scheduleFrame();
    };

    /**
     * 按方向缩放一档。
     * @param {number} direction 1 放大，-1 缩小
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.zoom = function (direction) {
        if (!this.isOpen) return this;
        return this.setScale(this.currentScale + (direction > 0 ? ZOOM_STEP : -ZOOM_STEP));
    };

    /**
     * 在原始比例与放大档位之间切换（点击图片）。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.toggleZoom = function () {
        if (!this.isOpen) return this;
        return this.setScale(this.currentScale > 1 ? 1 : CLICK_ZOOM);
    };

    /**
     * 顺时针旋转 90 度（0 → 90 → 180 → 270 → 0）。
     *
     * 旋转会改变可视宽高，原有位移不再有意义，因此一并清零；
     * 旋转后的图片若超出可视区，可用滚轮或缩放按钮缩小。
     *
     * @param {number} [step] 旋转步长，默认 90；传负数则逆时针
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.rotate = function (step) {
        if (!this.isOpen) return this;
        const delta = typeof step === 'number' && step !== 0 ? step : 90;
        this.currentRotation = normalizeRotation(this.currentRotation + delta);
        this.currentX = 0;
        this.currentY = 0;
        this.syncRotateButton();
        return this.scheduleFrame();
    };

    /**
     * 同步缩放按钮的图标与文案：放大态显示「还原」。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.syncZoomButton = function () {
        const btn = this._refs.zoom;
        if (btn && btn.classList) {
            const zoomed = this.currentScale > 1;
            btn.classList.toggle('plugin-search-minus', zoomed);
            btn.classList.toggle('plugin-search-plus', !zoomed);
            btn.classList.toggle('lightbox-zoom-active', zoomed);
            btn.setAttribute('aria-label', zoomed ? '还原为原始大小' : '放大图片');
        }
        return this;
    };

    /**
     * 同步旋转按钮的无障碍文案，播报当前角度。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.syncRotateButton = function () {
        const btn = this._refs.rotate;
        if (btn && btn.setAttribute) {
            btn.setAttribute('aria-label', '顺时针旋转 90 度（当前 ' + this.currentRotation + '°）');
        }
        return this;
    };

    /**
     * 滚轮处理器。灯箱打开时才拦截页面滚动。
     * @param {WheelEvent} event
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.handleScroll = function (event) {
        if (!this.isOpen) return this;
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        const direction = accumulateWheel(this._wheel, event && event.deltaY, event && event.deltaMode);
        if (direction) this.zoom(direction);
        return this;
    };

    /**
     * 切换全屏。全屏对象是灯箱根节点，而不是整页。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.scaleImg = function () {
        this.isScale = !this.isScale;
        this.syncScaleButton();
        if (this.isScale) this.fullScreenOpen();
        else this.fullScreenCancel();
        return this;
    };

    /**
     * 同步全屏按钮的图标与无障碍文案。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.syncScaleButton = function () {
        const scaleBtn = this._refs.scale;
        if (scaleBtn && scaleBtn.classList) {
            scaleBtn.classList.toggle('plugin-fullscreen-exit', this.isScale);
            scaleBtn.classList.toggle('plugin-fullscreen', !this.isScale);
            scaleBtn.setAttribute('aria-label', this.isScale ? '退出全屏' : '全屏显示');
        }
        return this;
    };

    /**
     * 进入全屏。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.fullScreenOpen = function () {
        toggleFullscreen(this.root);
        return this;
    };

    /**
     * 退出全屏。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.fullScreenCancel = function () {
        exitFullscreen();
        return this;
    };

    /**
     * 把焦点放到关闭按钮上。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.focusClose = function () {
        focusNode(this._refs.close);
        return this;
    };

    /**
     * 下载当前图片（或指定地址）。
     * @param {string} [url]
     * @param {string} [name]
     * @returns {Promise<boolean>}
     */
    XqLightBox.prototype.downloadImg = function (url, name) {
        const item = this.imgList[this.currentImgIndex];
        const source = url || (item ? item.url : '');
        if (!source) {
            warn('nothing to download: no image is selected');
            return Promise.resolve(false);
        }

        const button = this._refs.download;
        if (button && button.classList) button.classList.add('lightbox-download-busy');
        const done = function () {
            if (button && button.classList) button.classList.remove('lightbox-download-busy');
        };

        return downloadImage(source, name || buildFileName(source)).then(function (result) {
            done();
            return result;
        }, function () {
            done();
            return false;
        });
    };

    /**
     * 关闭灯箱。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.closeLightBox = function () {
        if (!this.isOpen) return this;
        this.isOpen = false;

        if (this.root) {
            this.root.classList.remove('active');
            this.root.setAttribute('aria-hidden', 'true');
        }
        if (this.isScale) {
            this.isScale = false;
            this.syncScaleButton();
            exitFullscreen();
        }

        this._gesture = null;
        this.currentScale = 1;
        this.currentX = 0;
        this.currentY = 0;
        this.currentRotation = 0;
        this.syncZoomButton();
        this.syncRotateButton();
        if (this._refs.img) {
            this._refs.img.style.transform = buildTransform(0, 0, 1);
            if (this._refs.img.classList) {
                this._refs.img.classList.remove('lightbox-img-zoomed', 'lightbox-img-dragging', 'lightbox-img-rotated');
            }
        }

        lockScroll(false);
        focusNode(this._previousFocus);
        this._previousFocus = null;
        return this;
    };

    /**
     * 上一张（首张时回到末张）。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.prevImg = function () {
        return this.goTo(this.currentImgIndex - 1);
    };

    /**
     * 下一张（末张时回到首张）。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.nextImg = function () {
        return this.goTo(this.currentImgIndex + 1);
    };

    /**
     * 跳到指定索引。
     * @param {number} index
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.goTo = function (index) {
        if (!this.imgList.length) return this;
        this.currentImgIndex = wrapIndex(index, this.imgList.length);
        this.currentScale = 1;
        this.currentX = 0;
        this.currentY = 0;
        this.currentRotation = 0;
        this.syncZoomButton();
        this.syncRotateButton();
        return this.showImg();
    };

    /**
     * 销毁实例：解绑全部监听、移除节点、恢复页面滚动。
     * @returns {XqLightBox}
     */
    XqLightBox.prototype.destroy = function () {
        if (this._destroyed) return this;

        this.unbindImages();
        this._controlBindings.forEach(function (binding) {
            if (binding.node && binding.node.removeEventListener) {
                binding.node.removeEventListener(binding.type, binding.handler, false);
            }
        });
        this._controlBindings = [];

        if (this._keyHandler && typeof document !== 'undefined') {
            document.removeEventListener('keydown', this._keyHandler, false);
            this._keyHandler = null;
        }
        if (this._readyHandler && typeof document !== 'undefined') {
            document.removeEventListener('DOMContentLoaded', this._readyHandler, false);
            this._readyHandler = null;
        }
        if (this._rafId && typeof window !== 'undefined' && window.cancelAnimationFrame) {
            window.cancelAnimationFrame(this._rafId);
            this._rafId = 0;
        }

        if (this.isScale) {
            this.isScale = false;
            exitFullscreen();
        }
        if (this.isOpen) {
            this.isOpen = false;
            lockScroll(false);
        }
        this._gesture = null;

        if (this.root && this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }

        this.root = null;
        this._refs = {};
        this.imgList = [];
        this._destroyed = true;
        return this;
    };

    /**
     * 可复用的纯函数，供 Vue 包装层与使用者调用。
     * 与 ESM 构建的具名导出指向同一份实现。
     */
    XqLightBox.utils = {
        ZOOM_STEP: ZOOM_STEP,
        ZOOM_MIN: ZOOM_MIN,
        ZOOM_MAX: ZOOM_MAX,
        WHEEL_UNIT: WHEEL_UNIT,
        WHEEL_IDLE: WHEEL_IDLE,
        KEY_ACTIONS: KEY_ACTIONS,
        clampScale: clampScale,
        wrapIndex: wrapIndex,
        parseFileName: parseFileName,
        buildFileName: buildFileName,
        buildTransform: buildTransform,
        normalizeRotation: normalizeRotation,
        accumulateWheel: accumulateWheel,
        collectFocusables: collectFocusables,
        focusTrapStep: focusTrapStep,
        clampPan: clampPan,
        preloadImages: preloadImages,
        lockScroll: lockScroll,
        unlockScroll: unlockScroll,
        downloadImage: downloadImage,
        toggleFullscreen: toggleFullscreen,
        exitFullscreen: exitFullscreen
    };

    return XqLightBox;
});
