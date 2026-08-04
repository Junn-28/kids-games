# 新しいゲームの足しかた

`<id>` は英小文字とハイフンだけの短い名前（例: `meiro`、`kazu-atsume`）。
URL とフォルダ名とセーブキーの接頭辞に使います。あとから変えると
遊んでいる子のセーブデータが消えるので、最初に決めきってください。

## 1. フォルダをつくる

```
games/<id>/
├─ index.html
├─ main.jsx
└─ <Name>Game.jsx
```

### `games/<id>/index.html`

`games/sakana/index.html` をコピーして、`<title>`、`<meta name="description">`、
`theme-color`、favicon の絵文字だけ差し替えます。
**CSP の `<meta http-equiv="Content-Security-Policy">` 行は必ずそのまま残してください。**
ここが外部通信を止めている本体です。

### `games/<id>/main.jsx`

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/shared/base.css";
import MyGame from "./MyGame.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MyGame />
  </React.StrictMode>
);
```

### `games/<id>/<Name>Game.jsx`

ゲーム本体。共通部品はこう使います。

```jsx
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C, clamp } from "../../src/shared/theme.js";

// セーブキーは必ず "<id>:save:v1" の形にする。ゲーム間でデータが混ざらない
const save = createSave("meiro:save:v1");
```

ポータルに戻れるよう、画面のどこかに 🏠 リンクを置いてください。

```jsx
<a href="../../" aria-label="ゲームをえらぶ">🏠</a>
```

## 2. 登録簿に1行たす

`src/games.js` の `GAMES` に追記します。

```js
{
  id: "meiro",
  title: "めいろ",
  emoji: "🌀",
  tagline: "ゴールまで いこう",
  age: "4さい〜",
  color: "#7a5bc4",
},
```

## 3. README の表に1行たす

これで完了です。`vite.config.js` は `games/` を自動で走査するので、
ビルド設定は触りません。`main` に push すれば自動でデプロイされます。

---

## こども向けゲームを書くときの決めごと

**セーブデータは信用しない。** `localStorage` は本人が書き換えられます。
読み込んだ値は必ず `safeNum(値, 最小, 最大, 既定値)` に通してください。
検証を飛ばすと、壊れた値が `Infinity` や `NaN` になって画面が固まります。

**保存できなくても遊べるようにする。** プライベートモードや容量オーバーで
保存は普通に失敗します。`createSave` は例外を投げず `false` を返すので、
失敗しても遊べる状態を保ってください。

**外から何も読み込まない。** 画像・フォント・音源・解析タグ・CDN、すべて禁止です。
絵は絵文字、音は Web Audio で合成します。CSP がブロックするので、
うっかり足しても本番で動きません（＝気づけます）。

**入力欄をつくらない。** 名前もメールアドレスも聞かない。個人情報を持たなければ、
漏らすこともありません。

**外部サイトへのリンクを置かない。** 大人が見ていない場面で、
こどもが知らないページに飛べる経路をつくらないためです。

**絵文字は Unicode 11.0（2018年）までのものだけ使う。** 絵は端末のフォントに
入っているぶんしか出ません。新しい絵文字は古いタブレットで □ や × になります。
実際に、じぶんで作った料理のアイコンが × になる不具合がありました
（🫕 U+1FAD5 = Unicode 13.0）。`npm run check:emoji` で検出できます。
並び順が意味を持つ配列は、位置を変えずに中身だけ差しかえてください
（順番がずれると、決定的に決めていたものが変わってしまいます）。

**文字はひらがな中心に。** 漢字を使うならふりがなを添えるか、避けてください。

**押しやすく。** ボタンは 44px 以上、タップ範囲は見た目より広めに取ります。

**取り返しのつかない操作は二段階に。** 「はじめから」のようなリセットは、
必ず確認をはさみます。

**動きを減らせるようにする。** `@media (prefers-reduced-motion: reduce)` に対応してください。
