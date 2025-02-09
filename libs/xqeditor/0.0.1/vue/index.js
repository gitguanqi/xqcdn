import xqEditorComponent from './index.vue'

const xqEditor = {
    install: function (Vue) {  
        Vue.component('xqEditor', xqEditorComponent)
    }
}

export default xqEditor;