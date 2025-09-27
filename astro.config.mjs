// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: "https://git-diff-viewer.trueberryless.org",
  output: "server",
  adapter: netlify({
    cacheOnDemandPages: true,
  })
});