<template>
    <div class="xqshare-host" ref="host"></div>
</template>

<script>
import XqShare from '../js/xqshare-esm.js';

/**
 * A thin host for the core widget.
 *
 * The markup, the events and the state all live in `XqShare`; this component
 * only owns Vue's side of the contract (props in, events out, teardown). That is
 * why there is exactly one core instance and no template duplication.
 */
export default {
    name: 'xqShare',
    // Vue 2 reads this; Vue 3 ignores it and uses the `modelValue` prop directly.
    model: { prop: 'modelValue', event: 'update:modelValue' },
    props: {
        type: {
            type: String,
            default: 'default',
        },
        url: {
            type: String,
            default: '',
        },
        title: {
            type: String,
            default: '',
        },
        desc: {
            type: String,
            default: '',
        },
        targets: {
            type: Array,
            default: null,
        },
        iconBase: {
            type: String,
            default: '',
        },
        closeOnMask: {
            type: Boolean,
            default: true,
        },
        /*
         * `default: undefined` keeps "not supplied" distinct from `false`; with a
         * plain Boolean prop Vue would coerce the absent value to `false` and the
         * mode-based fallback below could never apply.
         */
        show: {
            type: Boolean,
            default: undefined,
        },
        modelValue: {
            type: Boolean,
            default: undefined,
        },
    },
    emits: ['update:modelValue', 'update:show', 'share', 'copy', 'toggle'],
    computed: {
        isVisible() {
            if (typeof this.modelValue === 'boolean') return this.modelValue;
            if (typeof this.show === 'boolean') return this.show;
            return this.type !== 'pop';
        },
    },
    watch: {
        isVisible(value) {
            if (this.instance) this.instance.update({ visible: value });
        },
        type() {
            this.syncOptions();
        },
        url() {
            this.syncOptions();
        },
        title() {
            this.syncOptions();
        },
        desc() {
            this.syncOptions();
        },
        targets() {
            this.syncOptions();
        },
        iconBase() {
            this.syncOptions();
        },
        closeOnMask() {
            this.syncOptions();
        },
    },
    mounted() {
        this.instance = new XqShare(this.buildOptions());
    },
    // Vue 3 fires only `beforeUnmount`, Vue 2 only `beforeDestroy`.
    beforeUnmount() {
        this.teardown();
    },
    beforeDestroy() {
        this.teardown();
    },
    methods: {
        buildOptions() {
            const options = {
                el: this.$refs.host,
                type: this.type,
                visible: this.isVisible,
                closeOnMask: this.closeOnMask,
                onShare: (result) => this.$emit('share', result),
                onCopy: (result) => this.$emit('copy', result),
                onToggle: (visible) => this.handleToggle(visible),
            };
            if (this.url) options.url = this.url;
            if (this.title) options.title = this.title;
            if (this.desc) options.desc = this.desc;
            if (Array.isArray(this.targets) && this.targets.length > 0) {
                options.targets = this.targets;
            }
            if (this.iconBase) options.iconBase = this.iconBase;
            return options;
        },
        syncOptions() {
            if (this.instance) this.instance.update(this.buildOptions());
        },
        handleToggle(visible) {
            this.$emit('update:modelValue', visible);
            this.$emit('update:show', visible);
            this.$emit('toggle', visible);
        },
        teardown() {
            if (!this.instance) return;
            this.instance.destroy();
            this.instance = null;
        },
    },
};
</script>

<style>
/* Unscoped on purpose: the core renders the markup, so it never receives the
   `data-v-*` attribute a scoped block would need. One stylesheet, one source. */
@import '../style/xqshare.css';
</style>
