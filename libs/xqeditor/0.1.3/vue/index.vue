<template>
    <div ref="host" class="xqeditor-host"></div>
</template>

<script>
import { XqEditor } from '../js/xqeditor-esm.js';

export default {
    name: 'XqEditor',
    props: {
        // Legacy prop, kept so `:content="..."` keeps working.
        content: {
            type: String,
            default: '',
        },
        modelValue: {
            type: String,
            default: undefined,
        },
        // Uploaded image url; appending it to the document when it changes.
        url: {
            type: String,
            default: '',
        },
        markdown: {
            type: Function,
            default: undefined,
        },
        hljs: {
            type: Object,
            default: undefined,
        },
    },
    emits: ['update:modelValue', 'change', 'uploadImg'],
    // Vue 2 ignores `emits` and maps v-model to value/input unless told
    // otherwise; Vue 3 ignores this option and uses modelValue on its own.
    model: {
        prop: 'modelValue',
        event: 'update:modelValue',
    },
    data() {
        return {
            instance: null,
        };
    },
    watch: {
        modelValue(value) {
            this.applyValue(value);
        },
        content(value) {
            if (this.modelValue === undefined) {
                this.applyValue(value);
            }
        },
        url(value) {
            if (!this.instance || !value) {
                return;
            }
            this.instance.upload.url = value;
            this.instance.addEditor('image', value);
        },
    },
    mounted() {
        this.instance = new XqEditor({
            el: this.$refs.host,
            value: this.modelValue === undefined ? this.content : this.modelValue,
            markdown: this.markdown,
            hljs: this.hljs,
            onChange: (value) => {
                this.$emit('update:modelValue', value.text);
                this.$emit('change', value);
            },
            onUploadImage: (files) => {
                this.$emit('uploadImg', files);
            },
        });
    },
    // beforeUnmount is Vue 3, beforeDestroy is Vue 2; only one ever fires.
    beforeUnmount() {
        this.destroyInstance();
    },
    beforeDestroy() {
        this.destroyInstance();
    },
    methods: {
        setVal(value) {
            if (this.instance) {
                this.instance.setVal(value);
            }
        },
        getVal() {
            return this.instance ? this.instance.getVal() : { text: '', html: '' };
        },
        addEditor(type, url = '') {
            if (this.instance) {
                this.instance.addEditor(type, url);
            }
        },
        getInstance() {
            return this.instance;
        },
        applyValue(value) {
            const next = value === undefined || value === null ? '' : value;
            if (!this.instance || this.instance.getVal().text === next) {
                return;
            }
            this.instance.setVal(next);
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
// Unscoped on purpose: the editor markup is created by the core, so it never
// carries the `data-v-*` attribute that scoped styles rely on.
@import '../style/editor.css';
</style>
