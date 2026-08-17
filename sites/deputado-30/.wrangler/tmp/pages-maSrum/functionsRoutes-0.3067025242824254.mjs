import { onRequestGet as __api_subscribe_js_onRequestGet } from "/mnt/data/Projects_SSD/Sites_deputados/sites/deputado-30/functions/api/subscribe.js"
import { onRequestPost as __api_subscribe_js_onRequestPost } from "/mnt/data/Projects_SSD/Sites_deputados/sites/deputado-30/functions/api/subscribe.js"

export const routes = [
    {
      routePath: "/api/subscribe",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_subscribe_js_onRequestGet],
    },
  {
      routePath: "/api/subscribe",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_subscribe_js_onRequestPost],
    },
  ]