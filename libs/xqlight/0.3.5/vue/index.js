import lightboxComponent from './index.vue'

const xqlightbox = {
    install: function (Vue) {  
        Vue.component('xqLightbox', lightboxComponent)
    }
}

export default xqlightbox;