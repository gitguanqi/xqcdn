// src/vue/index.ts
import component from "./xqclip.vue";
var plugin = {
  install(app) {
    app.component("xqClip", component);
  }
};
var index_default = plugin;
export {
  component,
  index_default as default
};
