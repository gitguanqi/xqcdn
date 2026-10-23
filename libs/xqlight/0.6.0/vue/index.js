import lightboxComponent from './index.vue';

// 样式与浏览器版共用同一份文件：Vue 用户只要引入插件，就不必再手动加 <link>。
// 直接挂载 lib/vue/index.vue 的场景需要自行引入 xqlight/lib/css/xqlight.css。
import '../css/xqlight.css';

/**
 * Vue 插件。
 *
 * Vue 2 走 `Vue.use(xqlight)`，Vue 3 走 `app.use(xqlight)`，两者都会调用 install(app)，
 * 而 component() 在两种 app 上都存在，因此一个入口可以同时服务两个大版本。
 */
const xqlightbox = {
    install: function (app) {
        if (app && typeof app.component === 'function') {
            app.component('xqLightbox', lightboxComponent);
        }
    }
};

export default xqlightbox;
export { lightboxComponent, xqlightbox };
