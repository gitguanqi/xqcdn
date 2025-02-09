import xqShareComponent from './index.vue'

const xqShare = {
    install: function (Vue) {  
        Vue.component('xqShare', xqShareComponent)
    }
}

export default xqShare;