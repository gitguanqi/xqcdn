<template>
    <div
        class="lightbox"
        :class="{ active: isOpen }"
        role="dialog"
        aria-modal="true"
        :aria-hidden="isOpen ? 'false' : 'true'"
        :aria-label="title || lightTitle || '图片预览'"
        :data-xqlight-status="status"
        :data-xqlight-count="total"
        data-xqlight-root="1"
        @wheel="handleWheel"
        @click="handleBackdropClick"
    >
        <div class="lightbox-title" ref="title">
            <span class="lightbox-title-tip">{{ lightTitle || '图片预览' }}</span>
            <div class="lightbox-title-num" role="status" aria-live="polite">
                (<strong data-xqlight="current">{{ isOpen ? index + 1 : 0 }}</strong>/<strong data-xqlight="total">{{ total }}</strong>)
                <span class="lightbox-name">【<span data-xqlight="name" :title="currentName">{{ currentName }}</span>】</span>
            </div>
            <p>
                <i
                    :class="['lightbox-zoom', 'plugin', isZoomed ? 'plugin-search-minus' : 'plugin-search-plus', { 'lightbox-zoom-active': isZoomed }]"
                    role="button"
                    tabindex="0"
                    :aria-label="isZoomed ? '还原为原始大小' : '放大图片'"
                    @click="toggleZoom"
                    @keydown="activate(toggleZoom, $event)"
                ></i>
                <i
                    class="lightbox-rotate"
                    role="button"
                    tabindex="0"
                    :aria-label="'顺时针旋转 90 度（当前 ' + rotation + '°）'"
                    @click="rotate"
                    @keydown="activate(rotate, $event)"
                ></i>
                <i
                    :class="['lightbox-download', 'plugin', 'plugin-download', { 'lightbox-download-busy': downloading }]"
                    role="button"
                    tabindex="0"
                    aria-label="下载图片"
                    @click="downloadImg"
                    @keydown="activate(downloadImg, $event)"
                ></i>
                <i
                    :class="['lightbox-scale', 'plugin', isScale ? 'plugin-fullscreen-exit' : 'plugin-fullscreen']"
                    role="button"
                    tabindex="0"
                    :aria-label="isScale ? '退出全屏' : '全屏显示'"
                    @click="scaleImg"
                    @keydown="activate(scaleImg, $event)"
                ></i>
                <i
                    ref="close"
                    class="lightbox-close plugin plugin-times"
                    role="button"
                    tabindex="0"
                    aria-label="关闭"
                    @click="closeLightBox"
                    @keydown="activate(closeLightBox, $event)"
                ></i>
            </p>
        </div>
        <div class="lightbox-content" ref="content">
            <div
                class="lightbox-ls"
                ref="ls"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerCancel"
            >
                <div
                    class="lightbox-arrow lightbox-arrow-left"
                    role="button"
                    tabindex="0"
                    aria-label="上一张"
                    @click="prevImg"
                    @keydown="activate(prevImg, $event)"
                >
                    <i class="plugin plugin-arrow-left"></i>
                </div>
                <ul class="lightbox-list" ref="list">
                    <li class="lightbox-stage" ref="stage">
                        <a class="lightbox-link" :href="src || ''" target="_blank" rel="noopener" @click.prevent="toggleZoom">
                            <img
                                ref="img"
                                class="lightbox-img"
                                :class="{ 'lightbox-img-zoomed': currentScale > 1, 'lightbox-img-dragging': dragging, 'lightbox-img-rotated': rotation !== 0 }"
                                :src="src || ''"
                                :alt="currentName"
                                :style="{ transform: transformStyle }"
                                @load="status = 'loaded'"
                                @error="status = 'error'"
                            />
                        </a>
                        <span class="lightbox-loader" role="status" aria-label="加载中"></span>
                        <span class="lightbox-error">图片加载失败
                            <i class="lightbox-retry" role="button" tabindex="0" @click.stop="reload" @keydown="activate(reload, $event)">重试</i>
                        </span>
                    </li>
                </ul>
                <div
                    class="lightbox-arrow lightbox-arrow-right"
                    role="button"
                    tabindex="0"
                    aria-label="下一张"
                    @click="nextImg"
                    @keydown="activate(nextImg, $event)"
                >
                    <i class="plugin plugin-arrow-right"></i>
                </div>
            </div>
        </div>
        <div v-if="showThumbs" class="lightbox-thumbs" ref="thumbs" role="group" aria-label="图片缩略图">
            <button
                v-for="(item, i) in list"
                :key="i"
                type="button"
                class="lightbox-thumb"
                :class="{ active: i === index }"
                :aria-current="i === index ? 'true' : 'false'"
                :aria-label="'第' + (i + 1) + '张'"
                @click.stop="goTo(i, true)"
            >
                <img class="lightbox-thumb-img" :src="item.thumb || item.src || item.url" alt="">
            </button>
        </div>
    </div>
</template>

<script>
// 纯逻辑（索引环绕、缩放夹紧、平移边界、滚轮折算、焦点循环、滚动锁、下载、全屏）
// 全部由浏览器版核心提供，组件只做 Vue 侧的状态与事件适配，
// 避免同一份算法在第二份实现里再次漂移。
import {
    ZOOM_STEP,
    clampScale,
    wrapIndex,
    buildFileName,
    buildTransform,
    normalizeRotation,
    accumulateWheel,
    collectFocusables,
    focusTrapStep,
    clampPan,
    preloadImages,
    lockScroll,
    unlockScroll,
    downloadImage,
    toggleFullscreen,
    exitFullscreen
} from '../js/xqlight.esm.mjs';

const THUMB_MIN = 2;
const THUMB_MAX = 20;
const SWIPE_MIN = 40;
const SWIPE_RATIO = 1.5;
const ACTIVATE_KEYS = { Enter: 1, ' ': 1, Spacebar: 1 };

export default {
    name: 'XqLightbox',
    props: {
        /** 标题栏文字 */
        lightTitle: {
            type: String,
            default: ''
        },
        /** 是否显示灯箱，由父组件控制 */
        showLightBox: {
            type: Boolean,
            default: false
        },
        /** 图片列表，元素支持 { src | url, name | title, thumb } */
        lightImgs: {
            type: Array,
            default: function () {
                return [];
            }
        },
        /** 当前图片地址；不传时取 lightImgs[currentIndex] */
        currentUrl: {
            type: String,
            default: ''
        },
        /** 当前图片索引 */
        currentIndex: {
            type: Number,
            default: 0
        },
        /** 当前图片标题；不传时取 lightImgs[currentIndex] 的 name/title */
        currentText: {
            type: String,
            default: ''
        },
        /** 缩略图：true 强制显示、false 关闭、'auto' 2~20 张时显示 */
        thumbnails: {
            default: 'auto'
        }
    },
    // Vue 2 忽略该选项，Vue 3 用它声明事件
    emits: ['hideLightBox', 'update:currentIndex', 'update:currentUrl', 'change'],
    data: function () {
        return {
            index: 0,
            currentScale: 1,
            currentX: 0,
            currentY: 0,
            rotation: 0,
            suppressClick: false,
            isScale: false,
            src: '',
            title: '',
            status: 'idle',
            downloading: false,
            dragging: false,
            // 内部状态放在 data 里，Vue 2/3 都能安全读写
            scrollLocked: false,
            focusBeforeOpen: null,
            wheelState: { accum: 0, last: 0 },
            gesture: null,
            torn: false
        };
    },
    computed: {
        total: function () {
            return this.list.length;
        },
        list: function () {
            return Array.isArray(this.lightImgs) ? this.lightImgs : [];
        },
        isOpen: function () {
            return Boolean(this.showLightBox);
        },
        currentName: function () {
            return this.title || this.currentText || ('IMG' + (this.index + 1));
        },
        transformStyle: function () {
            return buildTransform(this.currentX, this.currentY, this.currentScale, this.rotation);
        },
        isZoomed: function () {
            return this.currentScale > 1;
        },
        showThumbs: function () {
            if (this.thumbnails === true) return true;
            if (this.thumbnails === false) return false;
            return this.total >= THUMB_MIN && this.total <= THUMB_MAX;
        }
    },
    watch: {
        currentUrl: function (value) {
            if (value) this.src = value;
        },
        currentIndex: function (value) {
            this.goTo(value, false);
        },
        currentText: function (value) {
            if (value) this.title = value;
        },
        showLightBox: function (value) {
            this.toggleScroll(value);
            if (!value) this.restoreFocus();
        },
        src: function (value) {
            if (!value) return;
            this.status = 'loading';
            this.preloadNeighbors();
        }
    },
    mounted: function () {
        this.goTo(this.currentIndex, false);
        this.toggleScroll(this.isOpen);
        document.addEventListener('keydown', this.handleKeydown);
    },
    // Vue 3 用 beforeUnmount，Vue 2 用 beforeDestroy，只有对应那个会触发
    beforeUnmount: function () {
        this.teardown();
    },
    beforeDestroy: function () {
        this.teardown();
    },
    methods: {
        /**
         * 把键盘事件映射到 role="button" 的控件上。
         * @param {Function} handler
         * @param {KeyboardEvent} event
         */
        activate: function (handler, event) {
            if (!ACTIVATE_KEYS[event.key]) return;
            event.preventDefault();
            handler();
        },
        /**
         * 跳到指定索引并同步当前地址/标题。
         * @param {number} index
         * @param {boolean} emit 是否向父组件回传索引变化
         */
        goTo: function (index, emit) {
            const item = this.total ? this.list[wrapIndex(index, this.total)] : null;
            this.index = this.total ? wrapIndex(index, this.total) : 0;
            if (item) {
                this.src = item.src || item.url || '';
                this.title = item.title || item.name || '';
            } else if (this.currentUrl) {
                this.src = this.currentUrl;
            }
            this.resetView();
            if (emit) {
                this.$emit('update:currentIndex', this.index);
                this.$emit('update:currentUrl', this.src);
                this.$emit('change', { index: this.index, item: item });
            }
        },
        prevImg: function () {
            this.goTo(this.index - 1, true);
        },
        nextImg: function () {
            this.goTo(this.index + 1, true);
        },
        resetView: function () {
            this.currentScale = 1;
            this.currentX = 0;
            this.currentY = 0;
            this.rotation = 0;
            this.dragging = false;
        },
        /**
         * 顺时针旋转 90 度。旋转改变可视宽高，位移一并清零。
         * @param {number} [step]
         */
        rotate: function (step) {
            if (!this.isOpen) return;
            const delta = typeof step === 'number' && step !== 0 ? step : 90;
            this.rotation = normalizeRotation(this.rotation + delta);
            this.currentX = 0;
            this.currentY = 0;
        },
        /**
         * 设置缩放值，并在放大过界时把平移拉回图片边界内。
         * @param {number} value
         */
        setScale: function (value) {
            this.currentScale = clampScale(value);
            if (this.currentScale <= 1) {
                this.currentX = 0;
                this.currentY = 0;
                return;
            }
            const bounds = this.panBounds();
            const pan = clampPan(this.currentX, this.currentY, bounds.maxX, bounds.maxY);
            this.currentX = pan[0];
            this.currentY = pan[1];
        },
        /**
         * 图片点击：在两档之间切换。
         */
        toggleZoom: function () {
            this.setScale(this.currentScale > 1 ? 1 : 2);
        },
        /**
         * 滚轮缩放，只在灯箱打开时拦截页面滚动。
         * @param {WheelEvent} event
         */
        handleWheel: function (event) {
            if (!this.isOpen) return;
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            const direction = accumulateWheel(this.wheelState, event && event.deltaY, event && event.deltaMode);
            if (direction) this.setScale(this.currentScale + (direction > 0 ? ZOOM_STEP : -ZOOM_STEP));
        },
        /**
         * 计算可平移边界；拿不到尺寸时返回 Infinity。
         * @returns {{maxX: number, maxY: number}}
         */
        panBounds: function () {
            const img = this.$refs.img;
            const box = this.$refs.list;
            if (!img || !box || typeof img.getBoundingClientRect !== 'function') {
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
        },
        onPointerDown: function (event) {
            if (!this.isOpen) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            this.suppressClick = false;
            this.gesture = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                startX: this.currentX,
                startY: this.currentY,
                dragging: this.currentScale > 1,
                moved: false,
                captured: false
            };
            this.dragging = this.gesture.dragging;
            // 按下即捕获会让 click 的目标被改写成 .lightbox-ls，
            // 箭头/图片的点击与遮罩判定都会失真，因此等确认拖拽后再捕获。
        },
        capturePointer: function (gesture) {
            if (!gesture || gesture.captured) return;
            gesture.captured = true;
            const surface = this.$refs.ls;
            if (!surface || !surface.setPointerCapture || typeof gesture.id !== 'number') return;
            try {
                surface.setPointerCapture(gesture.id);
            } catch (error) {
                /* 忽略：指针已释放 */
            }
        },
        onPointerMove: function (event) {
            const gesture = this.gesture;
            if (!gesture || event.pointerId !== gesture.id) return;
            const dx = event.clientX - gesture.x;
            const dy = event.clientY - gesture.y;
            if (!gesture.dragging) {
                if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                    gesture.moved = true;
                    this.capturePointer(gesture);
                }
                return;
            }
            if (!gesture.moved) {
                gesture.moved = true;
                this.capturePointer(gesture);
            }
            const bounds = this.panBounds();
            const pan = clampPan(
                gesture.startX + dx,
                gesture.startY + dy,
                bounds.maxX,
                bounds.maxY
            );
            this.currentX = pan[0];
            this.currentY = pan[1];
            if (typeof event.preventDefault === 'function') event.preventDefault();
        },
        onPointerUp: function (event) {
            const gesture = this.gesture;
            if (!gesture) return;
            this.gesture = null;
            this.dragging = false;

            if (gesture.captured) {
                const surface = this.$refs.ls;
                if (surface && surface.releasePointerCapture && typeof gesture.id === 'number') {
                    try {
                        surface.releasePointerCapture(gesture.id);
                    } catch (error) {
                        /* 忽略：指针已释放 */
                    }
                }
            }

            if (gesture.moved) this.suppressClick = true;

            if (gesture.dragging) {
                const bounds = this.panBounds();
                const pan = clampPan(this.currentX, this.currentY, bounds.maxX, bounds.maxY);
                this.currentX = pan[0];
                this.currentY = pan[1];
                return;
            }

            const dx = (Number(event.clientX) || gesture.x) - gesture.x;
            const dy = (Number(event.clientY) || gesture.y) - gesture.y;
            if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
                if (dx < 0) this.nextImg();
                else this.prevImg();
            }
        },
        onPointerCancel: function () {
            this.gesture = null;
            this.dragging = false;
        },
        scaleImg: function () {
            this.isScale = !this.isScale;
            if (this.isScale) toggleFullscreen(this.$el);
            else exitFullscreen();
        },
        async downloadImg () {
            if (!this.src) return;
            this.downloading = true;
            try {
                await downloadImage(this.src, buildFileName(this.src));
            } finally {
                this.downloading = false;
            }
        },
        reload: function () {
            this.status = 'loading';
            const img = this.$refs.img;
            if (img) img.src = this.src;
        },
        preloadNeighbors: function () {
            if (this.total < 2) return;
            const urls = [];
            [-1, 1].forEach((offset) => {
                const item = this.list[wrapIndex(this.index + offset, this.total)];
                if (item) urls.push(item.src || item.url || '');
            });
            preloadImages(urls);
        },
        /**
         * 点击空白处关闭；点标题栏、图片、缩略图不触发。
         * @param {MouseEvent} event
         */
        handleBackdropClick: function (event) {
            if (!this.isOpen) return;
            if (this.suppressClick) return;
            const target = event.target;
            if (!target || !target.classList) return;
            // 交互控件内部的点击即使冒泡到容器也不算点空白
            if (target.closest &&
                target.closest('[role="button"], a, img, [data-xqlight-thumb], button')) return;
            if (target.classList.contains('lightbox') ||
                target.classList.contains('lightbox-content') ||
                target.classList.contains('lightbox-ls') ||
                target.classList.contains('lightbox-list') ||
                target.classList.contains('lightbox-stage')) {
                this.closeLightBox();
            }
        },
        closeLightBox: function () {
            this.resetView();
            this.$emit('hideLightBox');
        },
        restoreFocus: function () {
            const node = this.focusBeforeOpen;
            this.focusBeforeOpen = null;
            if (node && typeof node.focus === 'function') {
                try {
                    node.focus();
                } catch (error) {
                    /* 忽略：节点已移除 */
                }
            }
        },
        /**
         * 键盘操作：Esc 关闭、左右切换、Home/End 首末、Tab 焦点循环。
         * @param {KeyboardEvent} event
         */
        handleKeydown: function (event) {
            if (!this.isOpen) return;

            if (event.key === 'Tab') {
                const list = collectFocusables(this.$el);
                if (!list.length) return;
                event.preventDefault();
                const next = focusTrapStep(list, document.activeElement, event.shiftKey);
                if (next && typeof next.focus === 'function') next.focus();
                return;
            }

            if (!this.focusBeforeOpen) this.focusBeforeOpen = document.activeElement;

            if (event.key === 'Escape') this.closeLightBox();
            else if (event.key === 'ArrowLeft') this.prevImg();
            else if (event.key === 'ArrowRight') this.nextImg();
            else if (event.key === 'Home') this.goTo(0, true);
            else if (event.key === 'End') this.goTo(this.total - 1, true);
            else if (event.key === '+' || event.key === '=') this.setScale(this.currentScale + ZOOM_STEP);
            else if (event.key === '-') this.setScale(this.currentScale - ZOOM_STEP);
            else if (event.key === 'r' || event.key === 'R') this.rotate(90);
        },
        /**
         * 锁定/恢复页面滚动。与浏览器版共用同一份引用计数实现。
         * @param {boolean} locked
         */
        toggleScroll: function (locked) {
            if (locked) {
                if (!this.scrollLocked) {
                    this.focusBeforeOpen = document.activeElement;
                    lockScroll(true);
                    this.scrollLocked = true;
                }
                this.focusClose();
                return;
            }
            if (this.scrollLocked) {
                unlockScroll();
                this.scrollLocked = false;
            }
        },
        focusClose: function () {
            const node = this.$refs.close;
            if (node && typeof node.focus === 'function') node.focus();
        },
        teardown: function () {
            if (this.torn) return;
            this.torn = true;
            document.removeEventListener('keydown', this.handleKeydown);
            if (this.scrollLocked) {
                unlockScroll();
                this.scrollLocked = false;
            }
            if (this.isScale) {
                this.isScale = false;
                exitFullscreen();
            }
        }
    }
};
</script>
