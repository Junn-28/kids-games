/* ゲーム登録簿。
   ゲームを足すときは games/<id>/ をつくって、ここに1行たすだけ。
   ビルド対象は vite.config.js が games/ を見て自動で拾う。 */

export const GAMES = [
  {
    id: "sakana",
    title: "さかなやさん",
    emoji: "🐟",
    tagline: "つかまえて、そだてて、うる",
    // ひらがな中心 / 対象年齢のめやす
    age: "3さい〜",
    color: "#1b8ed0",
  },
  {
    id: "crane",
    title: "クレーンキッチン",
    emoji: "🎣",
    tagline: "つって、つくって、たべてもらう",
    age: "4さい〜",
    color: "#e8452f",
  },
  {
    id: "kotoba",
    title: "ことばシャボン",
    emoji: "💭",
    tagline: "えの なまえを もじで つくる",
    age: "5さい〜",
    color: "#8e5bc4",
  },
  {
    id: "robot",
    title: "ロボットおつかい",
    emoji: "🤖",
    tagline: "めいれいを ならべて おうちへ かえる",
    age: "5さい〜",
    color: "#4e8b3f",
  },
];

/* 相対リンク。どの階層に置かれても壊れない */
export const urlOf = (game) => `./games/${game.id}/`;
