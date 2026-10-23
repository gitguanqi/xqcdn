<template>
    <div ref="host" class="xqclip-host"></div>
</template>

<script>
import { XqClip } from '../js/xqclip-esm.js';

export default {
    name: 'XqClip',
    props: {
        // Widget configuration; `box` is ignored because the component owns its
        // host element, and `onChange` is reserved for the `change` event.
        options: {
            type: Object,
            default: () => ({}),
        },
        // Legacy prop for the image source; `modelValue` wins when both are set.
        url: {
            type: String,
            default: '',
        },
        modelValue: {
            type: String,
            default: undefined,
        },
    },
    emits: ['update:modelValue', 'change', 'ready'],
    // Vue 2 ignores `emits` and maps v-model to value/input unless told
    // otherwise; Vue 3 ignores this option and reads `modelValue` on its own.
    model: {
        prop: 'modelValue',
        event: 'update:modelValue',
    },
    data() {
        return {
            instance: null,
            source: '',
        };
    },
    watch: {
        modelValue(value) {
            if (value !== undefined) {
                this.applyUrl(value);
            }
        },
        url(value) {
            if (this.modelValue === undefined) {
                this.applyUrl(value);
            }
        },
    },
    mounted() {
        this.createInstance();
    },
    // beforeUnmount is Vue 3, beforeDestroy is Vue 2; only one ever fires.
    beforeUnmount() {
        this.destroyInstance();
    },
    beforeDestroy() {
        this.destroyInstance();
    },
    methods: {
        resolveUrl() {
            if (this.modelValue !== undefined && this.modelValue !== null) {
                return this.modelValue;
            }
            if (this.url) {
                return this.url;
            }
            return (this.options && this.options.url) || '';
        },
        // The core needs a url to draw anything, so mounting waits for one; a
        // component created with an empty url picks itself up on the first
        // `replaceImg` or bound change.
        createInstance(nextUrl) {
            if (this.instance) {
                return this.instance;
            }
            const url = nextUrl || this.resolveUrl();
            if (!url) {
                return null;
            }
            const options = Object.assign({}, this.options);
            options.box = this.$refs.host;
            options.url = url;
            options.onChange = (data) => {
                this.$emit('change', data);
            };
            this.source = url;
            const instance = new XqClip(options);
            this.instance = instance;
            if (instance.box) {
                this.$emit('ready', instance);
            }
            return instance;
        },
        // Mounts the next url; also keeps a bound `v-model` in sync.
        replaceImg(url) {
            if (!url) {
                return false;
            }
            if (!this.instance) {
                if (!this.createInstance(url)) {
                    return false;
                }
                this.$emit('update:modelValue', url);
                return true;
            }
            const changed = this.instance.replaceImg(url);
            if (changed) {
                this.source = url;
                this.$emit('update:modelValue', url);
            }
            return changed;
        },
        applyUrl(value) {
            const next = value === undefined || value === null ? '' : value;
            if (!next || next === this.source) {
                return;
            }
            if (!this.instance) {
                this.createInstance(next);
                return;
            }
            this.instance.replaceImg(next);
            this.source = next;
        },
        reset() {
            if (this.instance) {
                this.instance.reset();
            }
        },
        getCanvasImgData() {
            return this.instance ? this.instance.getCanvasImgData() : null;
        },
        getInstance() {
            return this.instance;
        },
        destroyInstance() {
            if (this.instance) {
                this.instance.destroy();
                this.instance = null;
            }
        },
    },
};
</script>

<style>
/* Unscoped on purpose: the widget markup is created by the core, so it never
   carries the `data-v-*` attribute that scoped styles match on. */
@import '../style/xqclip.css';
</style>