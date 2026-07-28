import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/* games/<id>/index.html を自動でビルド対象にする。
   ゲームを足すときに、この設定ファイルを触る必要はない */
const gameEntries = Object.fromEntries(
  readdirSync(resolve(root, "games"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(root, "games", d.name, "index.html")))
    .map((d) => [d.name, resolve(root, "games", d.name, "index.html")])
);

export default defineConfig({
  /* 相対パス。ユーザーページでも プロジェクトページでも そのまま動く */
  base: "./",
  plugins: [react()],
  build: {
    /* インライン<script>を出さない。CSPを script-src 'self' のまま保てる */
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        portal: resolve(root, "index.html"),
        ...gameEntries,
      },
    },
  },
});
