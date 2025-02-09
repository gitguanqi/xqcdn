/*
 * @Author: fegq
 * @Date: 2021-09-29 14:52:08
 * @LastEditors: fegq
 * @LastEditTime: 2021-09-29 14:52:09
 * @Description: This is a file comment!
 * @Version: v0.0.1
 */
import xqClipComponent from './xqclip.vue'

const xqClip = {
    install: function (Vue) {  
        Vue.component('xqClip', xqClipComponent)
    }
}

export default xqClip;
