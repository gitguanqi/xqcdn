// src/vue/index.ts
import component from "./index.vue";
var plugin = {
  install(app) {
    app.component("XqEditor", component);
  }
};
var index_default = plugin;
export {
  component,
  index_default as default
};
