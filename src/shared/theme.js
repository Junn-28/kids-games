/* ゲーム共通の見た目。新しいゲームもここを使うと、ポータルと地続きに見える */

export const FONT =
  '"Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif';

export const C = {
  cream: "#fff6e3",
  coral: "#ff7a45",
  gold: "#ffc93c",
  ink: "#123a5c",
  sky: "#e8f7ff",
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
