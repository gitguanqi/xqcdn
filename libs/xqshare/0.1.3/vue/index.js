// src/vue/index.ts
import component from "./xqshare.vue";
var plugin = {
  install(app) {
    app.component("xqShare", component);
  }
};
var index_default = plugin;
export {
  component,
  index_default as default
};
