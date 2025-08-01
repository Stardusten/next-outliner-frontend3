import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createI18n } from "vue-i18n";
import { zhCN_messages } from "./i18n/zh-CN";
import { vaporInteropPlugin } from "vue";

const app = createApp(App);

export const i18n = createI18n({
  locale: "zh-CN",
  messages: {
    "zh-CN": zhCN_messages,
  },
});

app.use(vaporInteropPlugin);
app.use(router);
app.use(i18n);
app.mount("#app");
