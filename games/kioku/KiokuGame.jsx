import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C as THEME, clamp } from "../../src/shared/theme.js";

/* きおくバトル。
   ばらばらの ばしょに ちらばった たまを おぼえて、
   かくれた あとに じゅんばんに おす。

   こどもと おとなが おなじ ばんで あそべるように、ハンデは ひとりずつ わける。
   かえられるのは「おぼえる かず」「みる じかん」「ことばの ながさ」の 3つ。
   てんすうは どの ハンデでも 100てんまん（すすめた かず ÷ てじゅんの かず）に
   そろえてあるので、むずかしさが ちがっても しょうぶに なる。 */

/* ================= データ ================= */

/* あいうえお じゅん。ならびが そのまま こたえの じゅんばんになる */
const GOJUON = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん";
const DAKUON = "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ";

/* ことばモードの おだい。e = え、k = よみ。
   おなじ もじが 2かい でる ことば（ばなな・とまと など）は いれない。
   おなじ もじの たまが 2つ ならぶと、どちらを おせば いいか きまらなくなる。
   ちいさい「ゃゅょっ」と のばす「ー」も、ちいさい子には むずかしいので いれない */
const WORDS = [
  /* 2もじ */
  { e: "🐶", k: "いぬ" }, { e: "🐱", k: "ねこ" }, { e: "🐴", k: "うま" },
  { e: "🐮", k: "うし" }, { e: "🌙", k: "つき" }, { e: "⭐", k: "ほし" },
  { e: "🌸", k: "はな" }, { e: "🐛", k: "むし" }, { e: "🦀", k: "かに" },
  { e: "🐙", k: "たこ" }, { e: "🦑", k: "いか" }, { e: "🏠", k: "いえ" },
  { e: "🐻", k: "くま" }, { e: "🐯", k: "とら" }, { e: "🐵", k: "さる" },
  { e: "❄️", k: "ゆき" }, { e: "⛰️", k: "やま" }, { e: "🐢", k: "かめ" },
  { e: "☂️", k: "かさ" }, { e: "🌊", k: "うみ" }, { e: "🚢", k: "ふね" },
  { e: "👞", k: "くつ" }, { e: "🐘", k: "ぞう" }, { e: "🐍", k: "へび" },
  { e: "🐷", k: "ぶた" }, { e: "🚌", k: "ばす" }, { e: "🔑", k: "かぎ" },
  { e: "💧", k: "みず" }, { e: "🌈", k: "にじ" }, { e: "🐜", k: "あり" },
  { e: "🐦", k: "とり" }, { e: "🍐", k: "なし" }, { e: "🐿️", k: "りす" },
  { e: "🦌", k: "しか" }, { e: "🦶", k: "あし" }, { e: "🍆", k: "なす" },
  { e: "🦐", k: "えび" }, { e: "🐡", k: "ふぐ" }, { e: "🧵", k: "いと" },
  /* 3もじ */
  { e: "🐟", k: "さかな" }, { e: "🐸", k: "かえる" }, { e: "🍄", k: "きのこ" },
  { e: "🍉", k: "すいか" }, { e: "🐤", k: "ひよこ" }, { e: "🐭", k: "ねずみ" },
  { e: "🐑", k: "ひつじ" }, { e: "🛁", k: "おふろ" }, { e: "🐬", k: "いるか" },
  { e: "🦒", k: "きりん" }, { e: "🐨", k: "こあら" }, { e: "🦊", k: "きつね" },
  { e: "🎀", k: "りぼん" }, { e: "📷", k: "かめら" }, { e: "🧹", k: "ほうき" },
  { e: "✂️", k: "はさみ" }, { e: "🥁", k: "たいこ" }, { e: "🍊", k: "みかん" },
  { e: "🕐", k: "とけい" }, { e: "🏰", k: "おしろ" }, { e: "🚗", k: "くるま" },
  { e: "🍎", k: "りんご" }, { e: "🍇", k: "ぶどう" }, { e: "🍓", k: "いちご" },
  { e: "🐼", k: "ぱんだ" }, { e: "🍚", k: "ごはん" }, { e: "🥚", k: "たまご" },
  { e: "🐰", k: "うさぎ" }, { e: "🐳", k: "くじら" }, { e: "🍁", k: "もみじ" },
  { e: "🎩", k: "ぼうし" }, { e: "🐪", k: "らくだ" }, { e: "📺", k: "てれび" },
  { e: "☎️", k: "でんわ" }, { e: "👓", k: "めがね" }, { e: "🎒", k: "かばん" },
  { e: "🍡", k: "だんご" }, { e: "🍢", k: "おでん" }, { e: "🥛", k: "みるく" },
  { e: "🥗", k: "さらだ" }, { e: "🌋", k: "かざん" },
  /* 4もじ */
  { e: "🧦", k: "くつした" }, { e: "✈️", k: "ひこうき" }, { e: "🦁", k: "らいおん" },
  { e: "🐔", k: "にわとり" }, { e: "🍙", k: "おにぎり" }, { e: "🍯", k: "はちみつ" },
  { e: "🌻", k: "ひまわり" }, { e: "🦉", k: "ふくろう" }, { e: "🎈", k: "ふうせん" },
  { e: "☀️", k: "たいよう" }, { e: "🎐", k: "ふうりん" }, { e: "🕯️", k: "ろうそく" },
  { e: "📏", k: "ものさし" }, { e: "⚡", k: "かみなり" }, { e: "🦇", k: "こうもり" },
  { e: "🧤", k: "てぶくろ" }, { e: "✏️", k: "えんぴつ" }, { e: "🔨", k: "かなづち" },
  { e: "🦗", k: "こおろぎ" }, { e: "🐝", k: "みつばち" }, { e: "🌵", k: "さぼてん" },
  /* 5もじ */
  { e: "🐌", k: "かたつむり" }, { e: "🍒", k: "さくらんぼ" }, { e: "🦔", k: "はりねずみ" },
  { e: "⛄", k: "ゆきだるま" }, { e: "🍠", k: "さつまいも" }, { e: "🎏", k: "こいのぼり" },
  { e: "🍳", k: "めだまやき" }, { e: "🍤", k: "えびふらい" },
];

const MODES = [
  { id: "num",  icon: "🔢", name: "すうじ",     tip: "1 から じゅんばんに",           age: "3さい〜" },
  { id: "word", icon: "💭", name: "ことば",     tip: "えの なまえの もじの じゅんに", age: "5さい〜" },
  { id: "kana", icon: "🔤", name: "あいうえお", tip: "あいうえお の じゅんに",        age: "6さい〜" },
];

/* ハンデの はば。ここを こえて むずかしく／やさしく することは できない */
const TILES = { min: 3, max: 16 };
const PEEK = { min: 1, max: 9, step: 0.5 };  // びょう
const WLEN = { min: 2, max: 5 };             // ことばの もじすう

/* レベルは はやわざ。おすと したの 3つが まとめて かわる。
   そのあと ➖➕ で 1つずつ こまかく かえられる */
const LEVELS = [
  { tiles: 4,  peek: 5.0, wlen: 2 },
  { tiles: 6,  peek: 4.5, wlen: 3 },
  { tiles: 8,  peek: 4.0, wlen: 3 },
  { tiles: 10, peek: 3.5, wlen: 4 },
  { tiles: 12, peek: 3.0, wlen: 4 },
  { tiles: 14, peek: 2.5, wlen: 5 },
];

/* ばんの たかさ。よこはばを 1 としたときの ひりつ */
const BOARD_H = 1.2;

/* たまの おおきさ（よこはばに たいする ひりつ）。
   かずが ふえたら ちいさくするが、ちいさい ゆびでも おせる 大きさで とめる。
   よこはば 320px の ばんでも いちばん ちいさい 0.175 で 56px ある */
const SIZES = [
  { max: 4,  d: 0.30 },
  { max: 6,  d: 0.26 },
  { max: 9,  d: 0.23 },
  { max: 12, d: 0.20 },
  { max: 16, d: 0.175 },
];
const sizeFor = (n) => (SIZES.find((s) => n <= s.max) || SIZES[SIZES.length - 1]).d;

/* たすけの つよさは たまの かずで きまる。すくないほど やさしくする */
const helpFor = (n) => ({ lives: n <= 4 ? 2 : n <= 8 ? 1 : 0, showNext: n <= 6 });

/* すきな かおを えらべる。なまえは きかない（にゅうりょく欄を つくらない） */
const AVATARS = ["🧒", "🧑", "👦", "👧", "👨", "👩", "🐱", "🐶", "🦊", "🐼", "🐸", "🐧"];

const ROUND_CHOICES = [1, 3, 5];

/* ================= ちいさい どうぐ ================= */

let idc = 1;
const nextId = () => idc++;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const range = (n) => Array.from({ length: n }, (_, i) => i);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
/* 0.5 きざみを たしこむと 4.300000000001 のように なる。1けたに まるめる */
const r1 = (v) => Math.round(v * 10) / 10;

/* ランダムな ばしょに ちらす。マスめには のせない。
   ただし かさなると おせなくなるので、すでに おいた たまから
   はなれた ところを さがす。600かい さがして だめなら、
   その中で いちばん はなれていた ところに おく（かならず おわる）。

   x は 0〜1、y は 0〜BOARD_H。どちらも よこはばを 1 とした ものさし。 */
function scatter(n, d) {
  const pad = d / 2 + 0.01;      // はしで きれない ように
  const rx = 1 - pad * 2;
  const ry = BOARD_H - pad * 2;
  const want = d * 1.12;         // これだけ はなれていれば ゆったり ならぶ
  const pts = [];

  for (let i = 0; i < n; i++) {
    let best = null;
    let bestGap = -1;
    for (let k = 0; k < 600; k++) {
      const x = pad + Math.random() * rx;
      const y = pad + Math.random() * ry;
      let gap = Infinity;
      for (const q of pts) gap = Math.min(gap, Math.hypot(x - q.x, y - q.y));
      if (gap >= want) { best = { x, y }; break; }
      if (gap > bestGap) { bestGap = gap; best = { x, y }; }
    }
    pts.push(best);
  }
  return pts;
}

/* セーブキーは "<id>:save:v1" の かたち。ほかの ゲームと まざらない */
const save = createSave("kioku:save:v1");

const C = { ...THEME, teal: "#0f9b8e", deep: "#0b7a70", board: "#effaf9" };

/* ことばモードでは、たまの かずは ことばの ながさ いじょう ひつよう */
const tilesOf = (p, mode) => (mode === "word" ? Math.max(p.tiles, p.wlen) : p.tiles);

/* ================= もんだいを つくる ================= */

/* かえすもの:
     d       たまの おおきさ（よこはばに たいする ひりつ）
     tiles   [{ id, x, y, label, order }]  order = なんばんめに おすか / -1 = にせもの
     seq     こたえの じゅんばん（label の ならび）
     word    ことばモードの おだい（それ以外は null） */
function buildRound(mode, p) {
  const n = tilesOf(p, mode);
  const d = sizeFor(n);

  let seq = [];
  let decoys = [];
  let word = null;

  if (mode === "num") {
    seq = range(n).map((i) => String(i + 1));
  } else if (mode === "kana") {
    /* かずが すくないうちは「あ」に ちかい もじだけ。ならびを おもいだしやすい */
    const pool = [...GOJUON.slice(0, clamp(n * 4, 16, GOJUON.length))];
    seq = shuffle(pool).slice(0, n).sort((a, b) => GOJUON.indexOf(a) - GOJUON.indexOf(b));
  } else {
    word = pick(WORDS.filter((w) => w.k.length === p.wlen));
    seq = [...word.k];
    /* にせものの もじ。ことばに つかわれている もじは いれない（どちらを おすか きまらなくなる）。
       てんてんの もじも まぜる。まぜないと「てんてん＝あたり」が バレてしまう */
    const used = new Set(seq);
    const pool = [...(GOJUON + DAKUON)].filter((c) => !used.has(c));
    decoys = shuffle(pool).slice(0, Math.max(0, n - seq.length));
  }

  /* おす じゅんばん。ぎゃくから は うしろの ものから */
  const ordered = p.rev ? [...seq].reverse() : seq;

  const marked = shuffle([
    ...ordered.map((label, i) => ({ label, order: i })),
    ...decoys.map((label) => ({ label, order: -1 })),
  ]);

  return {
    d,
    peekMs: Math.round(p.peek * 1000),
    seq: ordered,
    word,
    tiles: scatter(n, d).map((pt, i) => ({ id: nextId(), ...pt, ...marked[i] })),
  };
}

/* ================= ほんたい ================= */

export default function KiokuGame() {
  /* せってい */
  const [sound, setSound] = useState(true);
  const [solo, setSolo] = useState(false);
  const [mode, setMode] = useState("num");
  const [rounds, setRounds] = useState(3);
  const [players, setPlayers] = useState([
    { av: "🧒", tiles: 4,  peek: 5.0, wlen: 2, rev: false },
    { av: "🧑", tiles: 10, peek: 3.5, wlen: 4, rev: false },
  ]);
  const [best, setBest] = useState({ num: 0, word: 0, kana: 0 });

  /* しんこう */
  const [phase, setPhase] = useState("home"); // home / ready / peek / play / round / final
  const [turn, setTurn] = useState(0);
  const [board, setBoard] = useState(null);
  const [step, setStep] = useState(0);
  const [lives, setLives] = useState(0);
  const [wrongId, setWrongId] = useState(0);
  const [left, setLeft] = useState(0);
  const [scores, setScores] = useState([[], []]);
  const [ask, setAsk] = useState(null); // "quit" | "clear"

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const blip = useBlip(sound);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const np = solo ? 1 : 2;
  const pIdx = turn % np;
  const me = players[pIdx];
  const myTiles = tilesOf(me, mode);
  const help = helpFor(myTiles);
  const roundNo = Math.floor(turn / np);
  const modeInfo = MODES.find((m) => m.id === mode);

  /* ---------- セーブの よみこみ ----------
     localStorage は ほんにんが かきかえられる。ぜんぶ うたがって けんさする */
  useEffect(() => {
    const d = save.load();
    if (d) {
      if (typeof d.sound === "boolean") setSound(d.sound);
      if (typeof d.solo === "boolean") setSolo(d.solo);
      if (MODES.some((m) => m.id === d.mode)) setMode(d.mode);
      if (ROUND_CHOICES.includes(d.rounds)) setRounds(d.rounds);
      if (Array.isArray(d.p) && d.p.length === 2) {
        setPlayers((ps) =>
          ps.map((p, i) => {
            const s = d.p[i];
            if (!s || typeof s !== "object") return p;
            return {
              av: AVATARS.includes(s.av) ? s.av : p.av,
              tiles: Math.floor(safeNum(s.tiles, TILES.min, TILES.max, p.tiles)),
              /* 0.5 きざみに そろえてから はんいに いれる */
              peek: clamp(r1(Math.round(safeNum(s.peek, PEEK.min, PEEK.max, p.peek) * 2) / 2),
                          PEEK.min, PEEK.max),
              wlen: Math.floor(safeNum(s.wlen, WLEN.min, WLEN.max, p.wlen)),
              rev: typeof s.rev === "boolean" ? s.rev : p.rev,
            };
          })
        );
      }
      if (d.best && typeof d.best === "object") {
        setBest({
          num: Math.floor(safeNum(d.best.num, 0, 100, 0)),
          word: Math.floor(safeNum(d.best.word, 0, 100, 0)),
          kana: Math.floor(safeNum(d.best.kana, 0, 100, 0)),
        });
      }
    }
    setLoaded(true);
  }, []);

  /* ---------- じどうセーブ ---------- */
  const pSig = JSON.stringify(players);
  const bSig = JSON.stringify(best);
  useEffect(() => {
    if (!loaded || !save.available) return;
    save.save({ sound, solo, mode, rounds, p: players, best });
    setSaving(true);
    const t = setTimeout(() => { if (aliveRef.current) setSaving(false); }, 500);
    return () => clearTimeout(t);
  }, [loaded, sound, solo, mode, rounds, pSig, bSig]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- みる じかん ---------- */
  useEffect(() => {
    if (phase !== "peek" || !board) return;
    const end = Date.now() + board.peekMs;
    setLeft(board.peekMs);
    const t = setInterval(() => {
      const rest = end - Date.now();
      if (rest <= 0) {
        clearInterval(t);
        setLeft(0);
        setPhase("play");
      } else {
        setLeft(rest);
      }
    }, 80);
    return () => clearInterval(t);
  }, [phase, board]);

  /* ---------- ばんを はじめる ---------- */
  const startTurn = useCallback(
    (t) => {
      const p = players[t % np];
      setBoard(buildRound(mode, p));
      setStep(0);
      setLives(helpFor(tilesOf(p, mode)).lives);
      setWrongId(0);
      setPhase("peek");
    },
    [players, np, mode]
  );

  const startMatch = () => {
    blip(760, 0.14);
    setScores([[], []]);
    setTurn(0);
    setPhase("ready");
  };

  /* ---------- ラウンドを おえる ---------- */
  const finish = (cleared) => {
    const pts = Math.round((cleared / board.seq.length) * 100);
    setScores((s) => {
      const n = s.map((a) => [...a]);
      n[pIdx] = [...n[pIdx], pts];
      return n;
    });
    setTimeout(() => {
      if (!aliveRef.current) return;
      blip(pts === 100 ? 1040 : 330, pts === 100 ? 0.3 : 0.18);
    }, 220);
    setPhase("round");
  };

  /* ---------- たまを おす ---------- */
  const tapTile = (t) => {
    if (phase !== "play") return;
    if (t.order >= 0 && t.order < step) return; // もう あけた たま

    if (t.order === step) {
      blip(600 + step * 45, 0.12);
      const ns = step + 1;
      setStep(ns);
      if (ns >= board.seq.length) finish(ns);
      return;
    }

    /* まちがい。なにが かくれていたか だけは みせる */
    blip(190, 0.14);
    setWrongId(t.id);
    if (lives > 0) {
      setLives((n) => n - 1);
      setTimeout(() => { if (aliveRef.current) setWrongId(0); }, 800);
    } else {
      finish(step);
    }
  };

  /* ---------- つぎへ ---------- */
  const nextTurn = () => {
    const t = turn + 1;
    if (t >= rounds * np) {
      if (solo) {
        const avg = Math.round(scores[0].reduce((s, x) => s + x, 0) / rounds);
        if (avg > best[mode]) setBest((b) => ({ ...b, [mode]: avg }));
      }
      setPhase("final");
      return;
    }
    setTurn(t);
    setPhase("ready");
  };

  const backHome = () => {
    setPhase("home");
    setBoard(null);
    setAsk(null);
  };

  const setP = (i, patch) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  /* ================= みため ================= */

  const totals = scores.map((a) => a.reduce((s, x) => s + x, 0));
  const hint = { margin: "0 0 8px", textAlign: "center", fontSize: 14, color: C.ink, opacity: 0.75 };
  const card = {
    background: "#fff", borderRadius: 20, border: `4px solid ${C.gold}`,
    boxShadow: "0 4px 0 #e5c79a", padding: 12, marginBottom: 10,
  };
  const label = { fontSize: 14, fontWeight: 900, margin: "0 0 8px", opacity: 0.8 };

  return (
    <div style={{ fontFamily: FONT, color: C.ink, minHeight: "100%", background: C.sky,
                  userSelect: "none", WebkitUserSelect: "none", paddingBottom: 28 }}>
      <style>{`
        @keyframes pop { 0%{ transform:scale(.4) } 70%{ transform:scale(1.14) } 100%{ transform:scale(1) } }
        @keyframes bob { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-5px) } }
        /* たまは まんなかを ばしょに あわせている（translate -50%）。
           アニメでも その ずらしを けさない ように、まいかい 書いておく */
        @keyframes tamapop {
          0%{ transform:translate(-50%,-50%) scale(.45) }
          70%{ transform:translate(-50%,-50%) scale(1.13) }
          100%{ transform:translate(-50%,-50%) scale(1) }
        }
        @keyframes tamawob {
          0%,100%{ transform:translate(-50%,-50%) rotate(-8deg) }
          50%{ transform:translate(-50%,-50%) rotate(8deg) }
        }
        .homelink { text-decoration:none; }
        .bigbtn { border:none; cursor:pointer; font-family:inherit; font-weight:800;
                  -webkit-tap-highlight-color:transparent; }
        .bigbtn:active { transform: translateY(3px); }
        .bigbtn:disabled { cursor:default; transform:none; }
        /* たまは ばしょが ずれると こまるので :active で うごかさない */
        .tama { border:none; padding:0; cursor:pointer; font-family:inherit; font-weight:900;
                -webkit-tap-highlight-color:transparent; }
        .tama:active { filter: brightness(1.12); }
        .tama:disabled { cursor:default; }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important } }
      `}</style>

      {/* ===== ヘッダー ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                    background: C.cream, borderBottom: `4px solid ${C.gold}`, flexWrap: "wrap" }}>
        <a className="homelink" href="../../" aria-label="ゲームをえらぶ"
           style={{ fontSize: 20, padding: "2px 4px" }}>🏠</a>
        <b style={{ fontSize: 16 }}>🧠 きおくバトル</b>
        {phase !== "home" && (
          <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
            {range(np).map((i) => (
              <span key={i} style={{
                display: "flex", alignItems: "center", gap: 4, background: "#fff",
                borderRadius: 999, padding: "3px 10px",
                border: `2px solid ${i === pIdx && phase !== "final" ? C.coral : C.gold}`,
              }}>
                <span style={{ fontSize: 16 }}>{players[i].av}</span>
                <b style={{ fontSize: 15 }}>{totals[i]}</b>
              </span>
            ))}
          </div>
        )}
        <span style={{ marginLeft: "auto", fontSize: 16, opacity: saving ? 1 : 0.15,
                       transition: "opacity .3s" }} title="セーブちゅう">💾</span>
        <button className="bigbtn" onClick={() => setSound((s) => !s)} aria-label="おと"
          style={{ background: "transparent", fontSize: 22, padding: 4 }}>
          {sound ? "🔊" : "🔇"}
        </button>
        {phase !== "home" && (
          <button className="bigbtn" onClick={() => setAsk("quit")} aria-label="やめる"
            style={{ background: "transparent", fontSize: 20, padding: 4 }}>
            🚪
          </button>
        )}
      </div>

      {/* ===== したく ===== */}
      {phase === "home" && (
        <div style={{ padding: 10, maxWidth: 460, margin: "0 auto" }}>
          <p style={hint}>ばしょを おぼえて、かくれた あとに じゅんばんに おそう！</p>

          <div style={card}>
            <p style={label}>なんにんで あそぶ？</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[[true, "🧒 ひとり"], [false, "🧒🧑 ふたりで しょうぶ"]].map(([v, t]) => (
                <button key={String(v)} className="bigbtn"
                  onClick={() => { blip(680, 0.1); setSolo(v); }}
                  style={{ flex: 1, padding: "13px 4px", fontSize: 15, borderRadius: 14,
                           background: solo === v ? C.teal : "#eef6f5",
                           color: solo === v ? "#fff" : C.ink,
                           boxShadow: `0 4px 0 ${solo === v ? C.deep : "#d5e5e3"}` }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <p style={label}>もんだいの しゅるい</p>
            <div style={{ display: "flex", gap: 8 }}>
              {MODES.map((m) => (
                <button key={m.id} className="bigbtn"
                  onClick={() => { blip(700, 0.1); setMode(m.id); }}
                  style={{ flex: 1, padding: "10px 2px", fontSize: 14, borderRadius: 14,
                           background: mode === m.id ? C.teal : "#eef6f5",
                           color: mode === m.id ? "#fff" : C.ink,
                           boxShadow: `0 4px 0 ${mode === m.id ? C.deep : "#d5e5e3"}` }}>
                  <div style={{ fontSize: 24, lineHeight: 1.2 }}>{m.icon}</div>
                  {m.name}
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{m.age}</div>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 13, margin: "8px 0 0", opacity: 0.75, textAlign: "center" }}>
              {modeInfo.tip}
              {best[mode] > 0 && <>　／　ひとりの さいこう <b>{best[mode]}</b>てん</>}
            </p>
          </div>

          <div style={card}>
            <p style={label}>なんかい しょうぶ？</p>
            <div style={{ display: "flex", gap: 8 }}>
              {ROUND_CHOICES.map((r) => (
                <button key={r} className="bigbtn"
                  onClick={() => { blip(660, 0.1); setRounds(r); }}
                  style={{ flex: 1, padding: "12px 4px", fontSize: 16, borderRadius: 14,
                           background: rounds === r ? C.teal : "#eef6f5",
                           color: rounds === r ? "#fff" : C.ink,
                           boxShadow: `0 4px 0 ${rounds === r ? C.deep : "#d5e5e3"}` }}>
                  {r}かい
                </button>
              ))}
            </div>
          </div>

          {range(np).map((i) => (
            <PlayerSetup key={i} p={players[i]} mode={mode} blip={blip}
              onAvatar={() => {
                blip(820, 0.1);
                const other = players[1 - i]?.av;
                let n = AVATARS.indexOf(players[i].av);
                do { n = (n + 1) % AVATARS.length; } while (!solo && AVATARS[n] === other);
                setP(i, { av: AVATARS[n] });
              }}
              onSet={(patch) => setP(i, patch)} />
          ))}

          <button className="bigbtn" onClick={startMatch}
            style={{ width: "100%", padding: "18px 8px", fontSize: 21, borderRadius: 18,
                     background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
            ▶ はじめる
          </button>

          <div style={{ ...card, marginTop: 14, background: "#fffdf6" }}>
            <p style={{ ...label, margin: "0 0 6px" }}>おとなと こどもで しょうぶする コツ</p>
            <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0, opacity: 0.85 }}>
              てんすうは どの ハンデでも <b>100てんまん</b>です。
              すすめた ところまでが そのまま てんに なるので、
              <b>おぼえる かず</b>を ふやす／<b>みる じかん</b>を みじかくする だけで、
              おとなの ほうを むずかしく できます。
              まずは レベルの ボタンで だいたい あわせて、
              かたよったら ➖➕ で 1つずつ ちょうせつして ください。
              それでも おとなが つよすぎるときは <b>🔁 ぎゃく</b> も つけてみて ください。
            </p>
          </div>

          {save.available && (
            <button className="bigbtn" onClick={() => setAsk("clear")}
              style={{ width: "100%", marginTop: 6, padding: "10px 8px", fontSize: 13,
                       borderRadius: 12, background: "transparent", color: "#8aa6b8" }}>
              きろくを けす
            </button>
          )}
        </div>
      )}

      {/* ===== つぎの ばん ===== */}
      {phase === "ready" && (
        <div style={{ padding: "34px 14px", textAlign: "center", maxWidth: 460, margin: "0 auto" }}>
          <p style={{ fontSize: 15, opacity: 0.75, margin: "0 0 6px" }}>
            {roundNo + 1} かいめ / {rounds}
          </p>
          <div style={{ fontSize: 86, lineHeight: 1.2, animation: "bob 2.4s ease-in-out infinite" }}>
            {me.av}
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, margin: "8px 0 2px" }}>
            {solo ? "じゅんび はいい？" : `${me.av} の ばん！`}
          </p>
          <p style={{ fontSize: 14, opacity: 0.8, margin: "0 0 4px" }}>
            {modeInfo.icon} {modeInfo.name}　／　{myTiles}こ　／　{r1(me.peek)}びょう
            {mode === "word" && `　／　${me.wlen}もじ`}
            {me.rev && "　／　🔁 ぎゃくから"}
          </p>
          <p style={{ fontSize: 13, opacity: 0.65, margin: "0 0 22px" }}>
            {help.lives > 0 ? `${help.lives}かいまで まちがえて いい` : "1かい まちがえたら おわり"}
          </p>
          <button className="bigbtn" onClick={() => { blip(720, 0.14); startTurn(turn); }}
            style={{ width: "100%", padding: "20px 8px", fontSize: 21, borderRadius: 18,
                     background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
            👀 みる
          </button>
        </div>
      )}

      {/* ===== ばん（みる / おす / けっか） ===== */}
      {(phase === "peek" || phase === "play" || phase === "round") && board && (
        <div style={{ padding: 10, maxWidth: 460, margin: "0 auto" }}>
          <Prompt phase={phase} mode={mode} board={board} step={step}
                  showNext={help.showNext} rev={me.rev} />

          {phase === "peek" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
              <span style={{ fontSize: 18 }}>⏱️</span>
              <div style={{ flex: 1, height: 14, borderRadius: 999, background: "#d7ecea",
                            overflow: "hidden" }}>
                <div style={{ width: `${(left / board.peekMs) * 100}%`, height: "100%",
                              background: C.teal, transition: "width .08s linear" }} />
              </div>
              <b style={{ fontSize: 18, minWidth: 22, textAlign: "right" }}>
                {Math.ceil(left / 1000)}
              </b>
            </div>
          )}

          {phase === "play" && help.lives > 0 && (
            <p style={{ ...hint, margin: "0 0 8px" }}>
              まちがえて いい かず {lives > 0 ? "❤️".repeat(lives) : "（あと なし）"}
            </p>
          )}

          <Board board={board} phase={phase} step={step} wrongId={wrongId} onTap={tapTile} />

          {phase === "peek" && (
            <button className="bigbtn" onClick={() => { blip(880, 0.1); setPhase("play"); }}
              style={{ width: "100%", marginTop: 10, padding: "15px 8px", fontSize: 17,
                       borderRadius: 16, background: C.gold, color: C.ink,
                       boxShadow: "0 5px 0 #d9a520" }}>
              おぼえた！ かくして
            </button>
          )}

          {phase === "round" && (
            <div style={{ ...card, marginTop: 10, textAlign: "center" }}>
              <div style={{ fontSize: 46, lineHeight: 1.2, animation: "pop .45s ease-out" }}>
                {step >= board.seq.length ? "🎉" : "💭"}
              </div>
              <p style={{ fontSize: 19, fontWeight: 900, margin: "4px 0 2px" }}>
                {step >= board.seq.length
                  ? "パーフェクト！"
                  : `${step} / ${board.seq.length} まで せいかい`}
              </p>
              <p style={{ fontSize: 30, fontWeight: 900, margin: "0 0 4px", color: C.coral }}>
                {scores[pIdx][roundNo]} てん
              </p>
              <p style={{ fontSize: 13, opacity: 0.7, margin: "0 0 14px" }}>
                こたえの じゅんばんは、うえの たまに かいてあるよ
              </p>
              <button className="bigbtn" onClick={() => { blip(700, 0.12); nextTurn(); }}
                style={{ width: "100%", padding: "16px 8px", fontSize: 19, borderRadius: 16,
                         background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
                {turn + 1 >= rounds * np
                  ? "けっかを みる ▶"
                  : solo ? "つぎの もんだい ▶" : `つぎは ${players[(turn + 1) % np].av} ▶`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== けっか ===== */}
      {phase === "final" && (
        <Final solo={solo} players={players} scores={scores} totals={totals}
          rounds={rounds} best={best[mode]}
          onAgain={() => { blip(780, 0.14); setScores([[], []]); setTurn(0); setPhase("ready"); }}
          onHome={backHome} />
      )}

      {/* ===== かくにん ===== */}
      {ask && (
        <Overlay>
          <p style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px" }}>
            {ask === "quit" ? "やめて いいですか？" : "きろくを けしますか？"}
          </p>
          <p style={{ fontSize: 14, opacity: 0.8, margin: "0 0 18px" }}>
            {ask === "quit"
              ? "いまの しょうぶは きえます"
              : "さいこうてんと せっていが もとに もどります"}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="bigbtn" onClick={() => { blip(520, 0.1); setAsk(null); }}
              style={{ flex: 1, padding: "15px 8px", fontSize: 17, borderRadius: 16,
                       background: "#fff", color: C.ink, boxShadow: "0 5px 0 #d8e3ea" }}>
              やめない
            </button>
            <button className="bigbtn"
              onClick={() => {
                blip(300, 0.14);
                if (ask === "quit") { backHome(); return; }
                save.clear();
                setBest({ num: 0, word: 0, kana: 0 });
                setAsk(null);
              }}
              style={{ flex: 1, padding: "15px 8px", fontSize: 17, borderRadius: 16,
                       background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
              {ask === "quit" ? "やめる" : "けす"}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

/* ================= ぶひん ================= */

/* ひとりぶんの ハンデ。レベルで だいたい あわせて、➖➕ で こまかく なおす */
function PlayerSetup({ p, mode, blip, onAvatar, onSet }) {
  const tiles = tilesOf(p, mode);
  const help = helpFor(tiles);
  /* いまの せっていが どの レベルと おなじか。ちがえば「じぶんで せってい」 */
  const lv = LEVELS.findIndex(
    (L) => L.tiles === p.tiles && L.peek === p.peek && (mode !== "word" || L.wlen === p.wlen)
  );

  const setTiles = (v) => {
    blip(560 + v * 20, 0.1);
    onSet({ tiles: clamp(v, TILES.min, TILES.max) });
  };
  const setPeek = (v) => {
    blip(640, 0.1);
    onSet({ peek: clamp(r1(v), PEEK.min, PEEK.max) });
  };
  /* ことばを ながくすると、たまが たりなくなることが ある。いっしょに ふやす */
  const setWlen = (v) => {
    const w = clamp(v, WLEN.min, WLEN.max);
    blip(600 + w * 30, 0.1);
    onSet({ wlen: w, tiles: Math.max(p.tiles, w) });
  };

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: `4px solid ${C.teal}`,
                  boxShadow: "0 4px 0 #cfe8e5", padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <button className="bigbtn" onClick={onAvatar} aria-label="かおを かえる"
          style={{ background: "#eef6f5", borderRadius: 16, fontSize: 34, lineHeight: 1,
                   padding: "6px 10px" }}>
          {p.av}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>
            {lv >= 0 ? `レベル ${lv + 1}` : "じぶんで せってい"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {help.lives > 0 ? `ミス ${help.lives}かい OK` : "ミスしたら おわり"}
            {help.showNext && "／つぎを おしえる"}
          </div>
        </div>
        <button className="bigbtn" onClick={() => { blip(500, 0.1); onSet({ rev: !p.rev }); }}
          style={{ padding: "11px 10px", fontSize: 13, borderRadius: 14,
                   background: p.rev ? C.coral : "#eef6f5",
                   color: p.rev ? "#fff" : C.ink,
                   boxShadow: `0 4px 0 ${p.rev ? "#c9522a" : "#d5e5e3"}` }}>
          🔁 ぎゃく
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${LEVELS.length},1fr)`, gap: 5 }}>
        {LEVELS.map((L, i) => (
          <button key={i} className="bigbtn"
            onClick={() => { blip(560 + i * 40, 0.1); onSet({ ...L }); }}
            aria-label={`レベル ${i + 1}`}
            style={{ padding: "12px 0", fontSize: 16, borderRadius: 12,
                     background: lv === i ? C.teal : "#eef6f5",
                     color: lv === i ? "#fff" : C.ink,
                     boxShadow: `0 4px 0 ${lv === i ? C.deep : "#d5e5e3"}` }}>
            {i + 1}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 4, borderTop: "2px dashed #dbeceb", paddingTop: 4 }}>
        <Stepper name="おぼえる かず" text={`${tiles} こ`}
          dec={() => setTiles(p.tiles - 1)} inc={() => setTiles(p.tiles + 1)}
          canDec={tiles > TILES.min && (mode !== "word" || p.tiles > p.wlen)}
          canInc={p.tiles < TILES.max} />
        <Stepper name="みる じかん" text={`${r1(p.peek)} びょう`}
          dec={() => setPeek(p.peek - PEEK.step)} inc={() => setPeek(p.peek + PEEK.step)}
          canDec={p.peek > PEEK.min} canInc={p.peek < PEEK.max} />
        {mode === "word" && (
          <Stepper name="ことばの ながさ" text={`${p.wlen} もじ`}
            dec={() => setWlen(p.wlen - 1)} inc={() => setWlen(p.wlen + 1)}
            canDec={p.wlen > WLEN.min} canInc={p.wlen < WLEN.max} />
        )}
      </div>
    </div>
  );
}

/* ➖ かず ➕ の 1ぎょう */
function Stepper({ name, text, dec, inc, canDec, canInc }) {
  const btn = (on) => ({
    width: 44, height: 44, borderRadius: 12, fontSize: 20, padding: 0,
    background: on ? "#eef6f5" : "#f6f8f9",
    color: on ? C.ink : "#c9d6da",
    boxShadow: on ? "0 3px 0 #d5e5e3" : "none",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.8, flex: 1, minWidth: 0 }}>
        {name}
      </span>
      <button className="bigbtn" disabled={!canDec} onClick={dec}
        aria-label={`${name}を へらす`} style={btn(canDec)}>－</button>
      <b style={{ fontSize: 15, minWidth: 68, textAlign: "center" }}>{text}</b>
      <button className="bigbtn" disabled={!canInc} onClick={inc}
        aria-label={`${name}を ふやす`} style={btn(canInc)}>＋</button>
    </div>
  );
}

/* おだいの カード。なにを どの じゅんで おすのかを だす */
function Prompt({ phase, mode, board, step, showNext, rev }) {
  const done = phase === "round";
  /* すうじは つぎが なにか みなくても わかるので、いつも だす。
     あいうえおと ことばは かずが すくないときだけ */
  const open = phase === "peek" || done || showNext || mode === "num";
  const next = step < board.seq.length ? board.seq[step] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  background: "#fff", borderRadius: 20, border: `4px solid ${C.gold}`,
                  boxShadow: "0 4px 0 #e5c79a", marginBottom: 10, minHeight: 52 }}>
      {mode === "word" ? (
        <>
          <span style={{ fontSize: 42, lineHeight: 1 }}>{board.word.e}</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
            {[...board.word.k].map((ch, i) => {
              /* ぎゃくから の ときは うしろの もじから きえていく */
              const order = rev ? board.word.k.length - 1 - i : i;
              const got = order < step;
              return (
                <span key={i} style={{
                  width: 34, height: 34, borderRadius: 10, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 19, fontWeight: 900,
                  background: got ? C.coral : "#f1f5f8",
                  color: got ? "#fff" : C.ink,
                  border: `3px solid ${got ? "#c9522a" : "#dfe7ee"}`,
                }}>
                  {got || open ? ch : "　"}
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <span style={{ fontSize: 30, lineHeight: 1 }}>{mode === "num" ? "🔢" : "🔤"}</span>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>
            {done ? (
              <>こたえの じゅんばん</>
            ) : next === null ? (
              <>ぜんぶ できた！</>
            ) : open ? (
              <>つぎは <b style={{ fontSize: 26, color: C.coral }}>{next}</b></>
            ) : (
              <>{step} / {board.seq.length} こめ</>
            )}
          </div>
        </>
      )}
      {rev && <span style={{ fontSize: 20 }} title="ぎゃくから">🔁</span>}
    </div>
  );
}

/* ばん。ランダムな ばしょに ちらばった たまを だす。
   ばしょは よこはばを 1 とした ものさしで もっているので、
   がめんの おおきさが かわっても そのまま つかえる */
function Board({ board, phase, step, wrongId, onTap }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);

  /* もじの おおきさだけは ピクセルで きめたい。ばんの よこはばを はかる */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setW(el.clientWidth);
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const seen = phase === "peek";
  const done = phase === "round";
  const dp = board.d * 100;                       // たまの さしわたし（％）
  const fs = Math.max(15, Math.round(board.d * (w || 320) * 0.44));

  return (
    <div ref={ref}
      style={{ position: "relative", width: "100%", height: 0,
               paddingBottom: `${BOARD_H * 100}%`, boxSizing: "border-box",
               borderRadius: 22, border: `4px solid ${C.teal}`, overflow: "hidden",
               background: `radial-gradient(circle at 30% 20%, #ffffff 0%, ${C.board} 55%, #dff2f0 100%)` }}>
      {board.tiles.map((t) => {
        const cleared = t.order >= 0 && t.order < step;
        const wrong = t.id === wrongId;
        const show = seen || done || cleared || wrong;
        /* こたえあわせでは、にせものの たまを うすくする */
        const dim = done && t.order < 0;

        let bg = `radial-gradient(circle at 34% 28%, #5fc9bf 0%, ${C.teal} 45%, ${C.deep} 100%)`;
        let bd = C.deep;
        let fg = "rgba(255,255,255,.5)";
        if (cleared) { bg = C.coral; bd = "#c9522a"; fg = "#fff"; }
        else if (wrong) { bg = "#ffd6c9"; bd = "#e06a3c"; fg = C.ink; }
        else if (dim) { bg = "#eef3f7"; bd = "#dde6ec"; fg = "#b9c7d1"; }
        else if (seen || done) { bg = "#fff"; bd = C.gold; fg = C.ink; }

        return (
          <button key={t.id} className="tama"
            disabled={phase !== "play" || cleared}
            onPointerDown={() => onTap(t)}
            aria-label={show ? t.label : "まだ みえない たま"}
            style={{
              position: "absolute",
              left: `${t.x * 100}%`,
              top: `${(t.y / BOARD_H) * 100}%`,
              width: `${dp}%`, height: 0, paddingBottom: `${dp}%`,
              transform: "translate(-50%,-50%)",
              borderRadius: "50%", background: bg, border: `3px solid ${bd}`,
              boxShadow: cleared ? "0 2px 6px rgba(0,0,0,.15)" : "0 4px 8px rgba(0,0,0,.14)",
              animation: wrong ? "tamawob .3s ease-in-out 2"
                : cleared ? "tamapop .3s ease-out" : "none",
            }}>
            <span style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                           display: "flex", flexDirection: "column", alignItems: "center",
                           justifyContent: "center", lineHeight: 1.05, color: fg }}>
              {/* こたえあわせ。なんばんめだったか */}
              {done && t.order >= 0 && (
                <span style={{ fontSize: Math.max(10, Math.round(fs * 0.42)), color: C.coral }}>
                  {t.order + 1}
                </span>
              )}
              <span style={{ fontSize: fs }}>{show ? t.label : "?"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* しょうぶの けっか */
function Final({ solo, players, scores, totals, rounds, best, onAgain, onHome }) {
  const np = solo ? 1 : 2;
  const perfect = scores.map((a) => a.filter((x) => x === 100).length);
  /* おなじ てんなら、パーフェクトの おおいほうが かち。それも おなじなら ひきわけ */
  let win = -1;
  if (!solo) {
    if (totals[0] !== totals[1]) win = totals[0] > totals[1] ? 0 : 1;
    else if (perfect[0] !== perfect[1]) win = perfect[0] > perfect[1] ? 0 : 1;
  }
  const avg = Math.round(totals[0] / rounds);

  return (
    <div style={{ padding: 14, maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 70, lineHeight: 1.2, animation: "pop .5s ease-out" }}>
        {solo ? "✨" : win < 0 ? "🤝" : "🏆"}
      </div>
      <p style={{ fontSize: 23, fontWeight: 900, margin: "6px 0 14px" }}>
        {solo
          ? `へいきん ${avg} てん`
          : win < 0
            ? "ひきわけ！"
            : `${players[win].av} の かち！`}
      </p>
      {solo && best > 0 && avg >= best && (
        <p style={{ fontSize: 15, fontWeight: 800, color: C.coral, margin: "-8px 0 14px" }}>
          さいこうきろく こうしん！ 🎉
        </p>
      )}

      <div style={{ background: "#fff", borderRadius: 20, border: `4px solid ${C.gold}`,
                    boxShadow: "0 4px 0 #e5c79a", padding: 12, marginBottom: 14 }}>
        <div style={{ display: "grid", gap: 6,
                      gridTemplateColumns: `56px repeat(${rounds},1fr) 60px` }}>
          <span />
          {range(rounds).map((r) => (
            <span key={r} style={{ fontSize: 12, opacity: 0.7 }}>{r + 1}かいめ</span>
          ))}
          <span style={{ fontSize: 12, opacity: 0.7 }}>ごうけい</span>

          {range(np).map((i) => (
            <React.Fragment key={i}>
              <span style={{ fontSize: 24, textAlign: "left" }}>{players[i].av}</span>
              {range(rounds).map((r) => (
                <span key={r} style={{ fontSize: 16, fontWeight: 900,
                                       color: scores[i][r] === 100 ? C.coral : C.ink }}>
                  {scores[i][r] ?? "-"}
                </span>
              ))}
              <b style={{ fontSize: 19 }}>{totals[i]}</b>
            </React.Fragment>
          ))}
        </div>
        {(perfect[0] > 0 || perfect[1] > 0) && (
          <p style={{ fontSize: 12, opacity: 0.7, margin: "10px 0 0" }}>
            100てん（パーフェクト）は あかい すうじ
          </p>
        )}
      </div>

      <button className="bigbtn" onClick={onAgain}
        style={{ width: "100%", padding: "17px 8px", fontSize: 20, borderRadius: 18,
                 background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
        🔄 もういちど
      </button>
      <button className="bigbtn" onClick={onHome}
        style={{ width: "100%", marginTop: 10, padding: "15px 8px", fontSize: 17,
                 borderRadius: 16, background: "#fff", color: C.ink,
                 boxShadow: "0 5px 0 #d8e3ea" }}>
        ハンデを かえる
      </button>
    </div>
  );
}

/* まんなかに だす まく */
function Overlay({ children }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0,0,0,.6)", zIndex: 20, padding: 14,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.cream, borderRadius: 24, padding: 20, width: "100%",
                    maxWidth: 340, textAlign: "center", border: `5px solid ${C.gold}` }}>
        {children}
      </div>
    </div>
  );
}
