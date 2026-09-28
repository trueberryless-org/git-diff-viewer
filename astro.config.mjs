// @ts-check
import netlify from "@astrojs/netlify";
import { cacheNetlify } from "@astrojs/netlify/cache";
import vue from "@astrojs/vue";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  site: "https://git-diff-viewer.netlify.app",
  output: "server",
  adapter: netlify(),
  cache: {
    provider: cacheNetlify(),
  },
  routeRules: {
    "/diff": { maxAge: 3600, swr: 86400 },
    "/api/diff": { maxAge: 3600, swr: 86400 },
  },
  env: {
    schema: {
      GITHUB_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  integrations: [vue()],
});
