import React, { useState, useEffect, useRef, useCallback } from "react";
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C as THEME } from "../../src/shared/theme.js";

/* ことばを こえで よむ。まだ もじが よめない子は、えの なまえが
   わからないと はじめられないので、ここが たより。

   つかうのは 端末の なかに入っている こえ（localService）だけに かぎる。
   ブラウザによっては よみあげに ネットワーク上の こえを使うことがあり、
   それだと「外部へ通信しない」という このリポジトリの約束を破ってしまう。
   端末内に 日本語の こえが なければ、だまって なにもしない。
   （音は出なくても、えと もじだけで あそべる） */
function useSpeak(on) {
  /* undefined = まだ さがしていない / null = さがしたが なかった */
  const voiceRef = useRef(undefined);

  const findVoice = useCallback(() => {
    if (voiceRef.current !== undefined) return voiceRef.current;
    try {
      const list = window.speechSynthesis.getVoices();
      /* こえの ならびは あとから とどくことがある。からのうちは まだ 決めない */
      if (!list || list.length === 0) return undefined;
      voiceRef.current = list.find((v) => v.localService && /^ja/i.test(v.lang)) || null;
      return voiceRef.current;
    } catch {
      voiceRef.current = null;
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      const s = window.speechSynthesis;
      if (!s || !s.addEventListener) return;
      findVoice();
      const reload = () => { voiceRef.current = undefined; findVoice(); };
      s.addEventListener("voiceschanged", reload);
      return () => s.removeEventListener("voiceschanged", reload);
    } catch {
      /* よみあげが なくても あそべる */
    }
  }, [findVoice]);

  return useCallback(
    (text) => {
      if (!on) return;
      try {
        const s = window.speechSynthesis;
        if (!s) return;
        const voice = findVoice();
        if (!voice) return; // 端末内の 日本語の こえが ない ＝ なにもしない
        s.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = 0.75;
        s.speak(u);
      } catch {
        /* よみあげが なくても あそべる */
      }
    },
    [on, findVoice]
  );
}

/* ================= データ ================= */

/* ことば。e = え、k = よみ。よみは ぜんぶ ひらがな。
   ちいさい「ゃゅょっ」と のばす「ー」は 5さいには むずかしいので いれない */
const WORDS = [
  /* 2もじ */
  { e: "🐶", k: "いぬ" }, { e: "🐱", k: "ねこ" }, { e: "🐴", k: "うま" },
  { e: "🐮", k: "うし" }, { e: "🦆", k: "かも" }, { e: "👂", k: "みみ" },
  { e: "🌙", k: "つき" }, { e: "⭐", k: "ほし" }, { e: "🌸", k: "はな" },
  { e: "🐛", k: "むし" }, { e: "🐝", k: "はち" }, { e: "🦀", k: "かに" },
  { e: "🐙", k: "たこ" }, { e: "🦑", k: "いか" }, { e: "🍠", k: "いも" },
  { e: "🏠", k: "いえ" }, { e: "📕", k: "ほん" },
  { e: "🐻", k: "くま" }, { e: "🐯", k: "とら" }, { e: "🐵", k: "さる" },
  { e: "🐊", k: "わに" }, { e: "🕷️", k: "くも" },
  { e: "❄️", k: "ゆき" }, { e: "⛰️", k: "やま" }, { e: "🏝️", k: "しま" },
  { e: "🥜", k: "まめ" }, { e: "🧂", k: "しお" }, { e: "🎣", k: "つり" },
  { e: "🕊️", k: "はと" }, { e: "🐦", k: "とり" }, { e: "🌰", k: "くり" },
  { e: "🍐", k: "なし" }, { e: "🍑", k: "もも" }, { e: "🐿️", k: "りす" },
  { e: "🦌", k: "しか" }, { e: "🦅", k: "わし" }, { e: "🦶", k: "あし" },
  { e: "🐜", k: "あり" }, { e: "🐢", k: "かめ" }, { e: "☂️", k: "かさ" },
  { e: "🍆", k: "なす" }, { e: "🌊", k: "うみ" }, { e: "🚢", k: "ふね" },
  { e: "👞", k: "くつ" },
  /* 2もじ・てんてん */
  { e: "🐘", k: "ぞう" }, { e: "🐍", k: "へび" }, { e: "🐷", k: "ぶた" },
  { e: "🍞", k: "ぱん" }, { e: "🚌", k: "ばす" }, { e: "🔑", k: "かぎ" },
  { e: "💧", k: "みず" }, { e: "🌈", k: "にじ" },
  /* 3もじ */
  { e: "🐟", k: "さかな" }, { e: "🐸", k: "かえる" }, { e: "🍄", k: "きのこ" },
  { e: "🍉", k: "すいか" }, { e: "🍅", k: "とまと" }, { e: "🐤", k: "ひよこ" },
  { e: "🐭", k: "ねずみ" }, { e: "🐑", k: "ひつじ" }, { e: "🥛", k: "みるく" },
  { e: "🛁", k: "おふろ" }, { e: "🐬", k: "いるか" }, { e: "🦒", k: "きりん" },
  { e: "🐨", k: "こあら" }, { e: "🦊", k: "きつね" }, { e: "🚪", k: "とびら" },
  { e: "🎀", k: "りぼん" }, { e: "📷", k: "かめら" }, { e: "🧹", k: "ほうき" },
  { e: "✂️", k: "はさみ" }, { e: "🥁", k: "たいこ" }, { e: "🥬", k: "やさい" },
  { e: "🍊", k: "みかん" }, { e: "🍈", k: "めろん" }, { e: "🥝", k: "きうい" },
  { e: "🕐", k: "とけい" }, { e: "🏰", k: "おしろ" }, { e: "🚗", k: "くるま" },
  /* 3もじ・てんてん */
  { e: "🍎", k: "りんご" }, { e: "🍌", k: "ばなな" }, { e: "🍇", k: "ぶどう" },
  { e: "🍓", k: "いちご" }, { e: "🐼", k: "ぱんだ" }, { e: "🍚", k: "ごはん" },
  { e: "🥚", k: "たまご" }, { e: "🐰", k: "うさぎ" }, { e: "🐳", k: "くじら" },
  { e: "🍁", k: "もみじ" }, { e: "🎩", k: "ぼうし" }, { e: "🐪", k: "らくだ" },
  { e: "📺", k: "てれび" }, { e: "☎️", k: "でんわ" },
  { e: "🎹", k: "ぴあの" }, { e: "👓", k: "めがね" }, { e: "🎒", k: "かばん" },
  { e: "🍡", k: "だんご" }, { e: "🍢", k: "おでん" },
  /* 4もじ */
  { e: "🥕", k: "にんじん" }, { e: "🧦", k: "くつした" }, { e: "✈️", k: "ひこうき" },
  { e: "🦁", k: "らいおん" }, { e: "🐔", k: "にわとり" }, { e: "🍙", k: "おにぎり" },
  { e: "🍯", k: "はちみつ" }, { e: "🌻", k: "ひまわり" },
  { e: "🦉", k: "ふくろう" }, { e: "🦓", k: "しまうま" }, { e: "🎈", k: "ふうせん" },
  { e: "🐺", k: "おおかみ" }, { e: "☀️", k: "たいよう" }, { e: "🎐", k: "ふうりん" },
  { e: "🕯️", k: "ろうそく" }, { e: "📏", k: "ものさし" }, { e: "⚡", k: "かみなり" },
  { e: "🦇", k: "こうもり" },
  /* 4もじ・てんてん */
  { e: "🧤", k: "てぶくろ" }, { e: "✏️", k: "えんぴつ" },
  { e: "🔨", k: "かなづち" }, { e: "🐧", k: "ぺんぎん" },
  { e: "🦗", k: "こおろぎ" }, { e: "🌼", k: "たんぽぽ" },
  /* 5もじ */
  { e: "🐌", k: "かたつむり" }, { e: "🍒", k: "さくらんぼ" }, { e: "🦔", k: "はりねずみ" },
];

const SEION = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん";
const DAKUON = "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ";
const hasDaku = (k) => [...k].some((c) => DAKUON.includes(c));

/* すすむほど ことばが ながくなり、シャボンも ふえて はやくなる。
   len = なんもじの ことばが でるか / daku = てんてんの ことばを だすか
   （false=ださない true=かならず だす null=どちらも） */
const STAGES = [
  { name: "ちいさな いけ",   icon: "💧", len: [2],    daku: false, bubbles: 5, speed: 0.19, clear: 4 },
  { name: "はらっぱ",        icon: "🌱", len: [3],    daku: false, bubbles: 6, speed: 0.23, clear: 5 },
  { name: "おおきな うみ",   icon: "🌊", len: [4],    daku: false, bubbles: 7, speed: 0.27, clear: 5 },
  { name: "てんてんの もり", icon: "🌳", len: [2, 3], daku: true,  bubbles: 7, speed: 0.30, clear: 5 },
  { name: "そらの うえ",     icon: "☁️", len: [4, 5], daku: null,  bubbles: 8, speed: 0.34, clear: 6 },
];

const wordsOf = (st) =>
  WORDS.filter(
    (w) => st.len.includes(w.k.length) && (st.daku === null || hasDaku(w.k) === st.daku)
  );

/* ================= せってい ================= */

const TICK = 33;          // 1フレーム(ms) およそ30まい/びょう
const BUBBLE_PX = 62;     // シャボンの おおきさ。ちいさい ゆびでも おせる ように
const AUTO_HINT = 240;    // なにも あたらないまま この フレームすうで ヒントが ひかる（およそ8びょう）
const SAME_WORD_RATE = 0.4; // にせものの もじが「その ことばの ほかの もじ」に なる わりあい

/* ================= ちいさい どうぐ ================= */

let idc = 1;
const nextId = () => idc++;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* セーブキーは "<id>:save:v1" の かたち。ほかの ゲームと まざらない */
const save = createSave("kotoba:save:v1");

const C = { ...THEME, water: "#bfe9ff", deep: "#7fc6e8" };

/* ================= ほんたい ================= */

export default function KotobaGame() {
  const [tab, setTab] = useState("play");
  const [stage, setStage] = useState(0);
  const [word, setWord] = useState(null);
  const [filled, setFilled] = useState(0);
  const [bubbles, setBubbles] = useState([]);
  const [pops, setPops] = useState([]);      // われた あとの もじ
  const [shakeId, setShakeId] = useState(0); // まちがえて おした シャボン
  const [got, setGot] = useState([]);        // ずかんに ならんだ ことば
  const [cleared, setCleared] = useState(0); // いまの ステージで あつめた かず
  const [glow, setGlow] = useState(false);   // ただしい シャボンが ひかる
  const [reveal, setReveal] = useState(false); // つぎの もじを ますに だす
  const [over, setOver] = useState(null);    // { type:"word" | "stage" | "all" }
  const [sound, setSound] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const blip = useBlip(sound);
  const speak = useSpeak(sound);

  const st = STAGES[stage];
  /* つぎに さがす もじ。ぜんぶ そろっていたら null */
  const need = word && filled < word.k.length ? word.k[filled] : null;

  /* うごきの ほんたいは ref に もつ。1フレームに 1かいだけ state へ うつす */
  const bubblesRef = useRef([]);
  const needRef = useRef(null);
  const stageRef = useRef(0);
  const wordRef = useRef(null);
  const pausedRef = useRef(false);
  const idleRef = useRef(0);
  const queueRef = useRef({ si: -1, list: [] });
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  useEffect(() => { needRef.current = need; }, [need]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { wordRef.current = word; }, [word]);
  useEffect(() => { pausedRef.current = over !== null || tab !== "play"; }, [over, tab]);

  const say = useCallback((text, tone = "normal") => {
    const id = nextId();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => {
      if (aliveRef.current) setToasts((t) => t.filter((x) => x.id !== id));
    }, 1800);
  }, []);

  /* ---------- セーブの よみこみ ----------
     localStorage は ほんにんが かきかえられる。ぜんぶ うたがって けんさする */
  useEffect(() => {
    const d = save.load();
    if (d) {
      if (typeof d.sound === "boolean") setSound(d.sound);
      const s = Math.floor(safeNum(d.stage, 0, STAGES.length - 1, 0));
      setStage(s);
      setCleared(Math.floor(safeNum(d.cleared, 0, STAGES[s].clear - 1, 0)));
      if (Array.isArray(d.got)) {
        const ok = new Set(WORDS.map((w) => w.k));
        setGot([...new Set(d.got.filter((k) => ok.has(k)))]);
      }
    }
    setLoaded(true);
  }, []);

  /* ---------- じどうセーブ ---------- */
  const gotSig = got.join(",");
  useEffect(() => {
    if (!loaded || !save.available) return;
    save.save({ sound, stage, cleared, got });
    setSaving(true);
    const t = setTimeout(() => { if (aliveRef.current) setSaving(false); }, 500);
    return () => clearTimeout(t);
  }, [loaded, sound, stage, cleared, gotSig]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- ことばを 1つ えらぶ ----------
     おなじ ことばが つづけて でないよう、シャッフルした やまから 1まいずつ ひく */
  const drawWord = useCallback((si) => {
    const pool = wordsOf(STAGES[si]);
    let q = queueRef.current;
    if (q.si !== si || q.list.length === 0) q = { si, list: shuffle(pool) };
    const w = q.list.shift();
    queueRef.current = q;
    return w;
  }, []);

  const startWord = useCallback(
    (si) => {
      const w = drawWord(si);
      setWord(w);
      wordRef.current = w;
      needRef.current = w.k[0];
      setFilled(0);
      setGlow(false);
      setReveal(false);
      idleRef.current = 0;
      speak(w.k);
    },
    [drawWord, speak]
  );

  /* さいしょの 1つ。よみこみが おわってから */
  useEffect(() => {
    if (loaded && !word) startWord(stage);
  }, [loaded, word, stage, startWord]);

  /* ---------- シャボンを つくる ---------- */
  const makeBubble = useCallback((kana) => ({
    id: nextId(),
    kana,
    x: 10 + Math.random() * 80,
    y: 108 + Math.random() * 10,
    amp: 1.5 + Math.random() * 3,
    ph: Math.random() * Math.PI * 2,
    sp: 0.85 + Math.random() * 0.35,
  }), []);

  /* にせものの もじ。ときどき「その ことばの べつの もじ」を まぜると、
     じゅんばんを ちゃんと みる れんしゅうに なる */
  const decoy = useCallback(() => {
    const s = STAGES[stageRef.current];
    const w = wordRef.current;
    if (w && Math.random() < SAME_WORD_RATE) return pick([...w.k]);
    const pool = s.daku === false ? SEION : SEION + DAKUON;
    return pick([...pool]);
  }, []);

  /* ---------- ゲームループ ---------- */
  useEffect(() => {
    const t = setInterval(() => {
      if (pausedRef.current) return;
      const s = STAGES[stageRef.current];
      let arr = bubblesRef.current
        .map((b) => ({ ...b, y: b.y - s.speed * b.sp, ph: b.ph + 0.045 }))
        .filter((b) => b.y > -14);

      /* さがしている もじが 1つも うかんでいなければ、かならず ながす。
         「おせる ものが ない」じかんを つくらない */
      const nd = needRef.current;
      if (nd && !arr.some((b) => b.kana === nd)) arr.push(makeBubble(nd));
      while (arr.length < s.bubbles) arr.push(makeBubble(decoy()));

      bubblesRef.current = arr;
      setBubbles(arr);

      /* ずっと あたらないと ヒントが ひとりでに ひかる */
      if (nd) {
        idleRef.current++;
        if (idleRef.current === AUTO_HINT) setGlow(true);
      }
    }, TICK);
    return () => clearInterval(t);
  }, [makeBubble, decoy]);

  /* ---------- シャボンを おす ---------- */
  const tapBubble = (b) => {
    if (pausedRef.current || !need) return;

    if (b.kana !== need) {
      /* まちがえても なにも へらない。ぷるっと ゆれるだけ */
      blip(200, 0.1);
      setShakeId(b.id);
      setTimeout(() => { if (aliveRef.current) setShakeId(0); }, 320);
      return;
    }

    blip(680 + filled * 90, 0.14);
    const rest = bubblesRef.current.filter((x) => x.id !== b.id);
    bubblesRef.current = rest;
    setBubbles(rest);

    const pid = nextId();
    setPops((p) => [...p, { id: pid, x: b.x, y: b.y, kana: b.kana }]);
    setTimeout(() => {
      if (aliveRef.current) setPops((p) => p.filter((x) => x.id !== pid));
    }, 520);

    const n = filled + 1;
    setFilled(n);
    setGlow(false);
    setReveal(false);
    idleRef.current = 0;

    if (n >= word.k.length) {
      needRef.current = null;
      setGot((g) => (g.includes(word.k) ? g : [...g, word.k]));
      setTimeout(() => {
        if (!aliveRef.current) return;
        blip(1040, 0.3);
        speak(word.k);
        setOver({ type: "word" });
      }, 340);
    }
  };

  /* ---------- つぎへ ---------- */
  const nextWord = () => {
    const c = cleared + 1;
    if (c >= st.clear) {
      setOver({ type: stage < STAGES.length - 1 ? "stage" : "all" });
      return;
    }
    setCleared(c);
    setOver(null);
    startWord(stage);
  };

  const nextStage = () => {
    const s = Math.min(stage + 1, STAGES.length - 1);
    setStage(s);
    setCleared(0);
    setOver(null);
    startWord(s);
  };

  /* さいごの ステージを クリアしたら、そのまま おなじ ステージを つづける */
  const keepGoing = () => {
    setCleared(0);
    setOver(null);
    startWord(stage);
  };

  /* ---------- ヒント ---------- */
  const useHint = () => {
    if (!need) return;
    blip(520, 0.16);
    if (!glow) { setGlow(true); say("ひかっている シャボンだよ 💡"); return; }
    setReveal(true);
    say(`つぎは「${need}」だよ`);
  };

  /* わからないまま つまっても にげ道を のこす */
  const skipWord = () => {
    blip(360, 0.14);
    say("べつの ことばに するね");
    startWord(stage);
  };

  /* ---------- みため ---------- */
  const total = WORDS.length;
  const pill = {
    display: "flex", alignItems: "center", gap: 3, background: "#fff",
    borderRadius: 999, padding: "3px 10px", border: `2px solid ${C.gold}`,
  };
  const hint = { margin: "0 0 6px", textAlign: "center", fontSize: 14, color: C.ink, opacity: 0.75 };

  return (
    <div style={{ fontFamily: FONT, color: C.ink, minHeight: "100%", background: C.sky,
                  userSelect: "none", WebkitUserSelect: "none", paddingBottom: 24 }}>
      <style>{`
        @keyframes toastUp {
          0%{ transform:translateY(14px) scale(.8); opacity:0 }
          20%{ transform:translateY(0) scale(1); opacity:1 }
          80%{ opacity:1 } 100%{ opacity:0 }
        }
        @keyframes pop { 0%{ transform:scale(.4) } 70%{ transform:scale(1.15) } 100%{ transform:scale(1) } }
        @keyframes burst {
          0%{ transform:translate(-50%,-50%) scale(1); opacity:1 }
          100%{ transform:translate(-50%,-160%) scale(1.9); opacity:0 }
        }
        @keyframes wob { 0%,100%{ transform:translate(-50%,-50%) rotate(-9deg) }
                         50%{ transform:translate(-50%,-50%) rotate(9deg) } }
        @keyframes ring { 0%,100%{ box-shadow:0 0 0 0 rgba(255,201,60,.9) }
                          50%{ box-shadow:0 0 0 10px rgba(255,201,60,0) } }
        @keyframes blink { 0%,100%{ opacity:.35 } 50%{ opacity:1 } }
        @keyframes drift { 0%{ transform:translateX(0) } 100%{ transform:translateX(6px) } }
        .homelink { text-decoration:none; }
        .bigbtn { border:none; cursor:pointer; font-family:inherit; font-weight:800;
                  -webkit-tap-highlight-color:transparent; }
        .bigbtn:active { transform: translateY(3px); }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important } }
      `}</style>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
                    background: C.cream, borderBottom: `4px solid ${C.gold}`, flexWrap: "wrap" }}>
        <a className="homelink" href="../../" aria-label="ゲームをえらぶ"
           style={{ fontSize: 20, padding: "2px 4px" }}>🏠</a>
        <div style={pill}><span style={{ fontSize: 18 }}>{st.icon}</span>
          <b style={{ fontSize: 15 }}>{st.name}</b></div>
        <div style={pill}><span style={{ fontSize: 18 }}>📔</span>
          <b style={{ fontSize: 18 }}>{got.length}</b>
          <span style={{ fontSize: 12 }}>/{total}</span></div>
        <span style={{ marginLeft: "auto", fontSize: 16, opacity: saving ? 1 : 0.15,
                       transition: "opacity .3s" }} title="セーブちゅう">💾</span>
        <button className="bigbtn" onClick={() => setSound((s) => !s)} aria-label="おと"
          style={{ background: "transparent", fontSize: 22, padding: 4 }}>
          {sound ? "🔊" : "🔇"}
        </button>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", gap: 6, padding: 8, background: C.cream }}>
        {[["play", "💭 あそぶ"], ["book", "📔 ずかん"]].map(([key, label]) => (
          <button key={key} className="bigbtn" onClick={() => setTab(key)}
            style={{ flex: 1, padding: "12px 4px", fontSize: 16, borderRadius: 16,
                     background: tab === key ? C.coral : "#ffe9c9",
                     color: tab === key ? "#fff" : C.ink,
                     boxShadow: tab === key ? "0 4px 0 #c9522a" : "0 4px 0 #e5c79a" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ===== あそぶ ===== */}
      {tab === "play" && word && (
        <div style={{ padding: 8 }}>
          <p style={hint}>えを みて、その なまえの もじを じゅんばんに おそう！</p>

          {/* おだいの カード */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        background: "#fff", borderRadius: 22, border: `4px solid ${C.gold}`,
                        boxShadow: "0 4px 0 #e5c79a", marginBottom: 8 }}>
            <button className="bigbtn" onClick={() => { blip(760, 0.1); speak(word.k); }}
              aria-label="よみあげ"
              style={{ background: "transparent", fontSize: 52, lineHeight: 1, padding: 0 }}>
              {word.e}
            </button>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
              {[...word.k].map((ch, i) => {
                const done = i < filled;
                const now = i === filled;
                return (
                  <span key={i} style={{
                    width: 40, height: 40, borderRadius: 12, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 22, fontWeight: 900,
                    background: done ? C.coral : now ? "#fff3d6" : "#f1f5f8",
                    color: done ? "#fff" : C.ink,
                    border: `3px solid ${done ? "#c9522a" : now ? C.gold : "#dfe7ee"}`,
                    animation: now && !done ? "ring 1.3s ease-out infinite" : "none",
                  }}>
                    {done ? ch : now && reveal ? <span style={{ opacity: 0.4 }}>{ch}</span> : "　"}
                  </span>
                );
              })}
            </div>
            <span style={{ fontSize: 26, opacity: 0.5 }} aria-hidden>🗣️</span>
          </div>

          {/* シャボンの うみ */}
          <div style={{ position: "relative", height: "46vh", minHeight: 300, borderRadius: 22,
                        overflow: "hidden", touchAction: "manipulation",
                        border: `4px solid ${C.gold}`,
                        background: `linear-gradient(180deg,#eaf9ff 0%,${C.water} 55%,${C.deep} 100%)` }}>
            {/* そこの かざり */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26,
                          background: "rgba(255,255,255,.4)", pointerEvents: "none",
                          borderRadius: "50% 50% 0 0 / 16px 16px 0 0" }} />
            {["🐠", "🌿", "🐚"].map((d, i) => (
              <span key={i} style={{ position: "absolute", bottom: 2, left: `${16 + i * 32}%`,
                fontSize: 20, opacity: 0.7, pointerEvents: "none" }}>{d}</span>
            ))}

            {/* シャボン */}
            {bubbles.map((b) => {
              const on = glow && b.kana === need;
              return (
                <button key={b.id} className="bigbtn" onPointerDown={() => tapBubble(b)}
                  aria-label={b.kana}
                  style={{
                    position: "absolute",
                    left: `${b.x + Math.sin(b.ph) * b.amp}%`, top: `${b.y}%`,
                    width: BUBBLE_PX, height: BUBBLE_PX, borderRadius: "50%", padding: 0,
                    transform: "translate(-50%,-50%)",
                    fontSize: 27, fontWeight: 900, color: C.ink, touchAction: "manipulation",
                    background: on
                      ? "radial-gradient(circle at 32% 26%, rgba(255,255,255,.98) 0%, rgba(255,240,200,.7) 40%, rgba(255,201,60,.75) 100%)"
                      : "radial-gradient(circle at 32% 26%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.45) 24%, rgba(173,224,255,.5) 58%, rgba(120,190,240,.6) 100%)",
                    border: `2px solid ${on ? "#ffb300" : "rgba(255,255,255,.85)"}`,
                    boxShadow: on
                      ? "0 0 0 5px rgba(255,201,60,.45), 0 3px 10px rgba(0,0,0,.15)"
                      : "0 3px 10px rgba(0,0,0,.12)",
                    animation: b.id === shakeId ? "wob .32s ease-in-out 2"
                      : on ? "ring 1.1s ease-out infinite" : "none",
                  }}>
                  {b.kana}
                </button>
              );
            })}

            {/* われた あとの もじ */}
            {pops.map((p) => (
              <span key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
                fontSize: 30, fontWeight: 900, color: "#fff", pointerEvents: "none",
                textShadow: `0 2px 0 ${C.coral}, 0 0 10px rgba(255,255,255,.9)`,
                animation: "burst .52s ease-out forwards" }}>
                {p.kana}
              </span>
            ))}

            <ToastRow toasts={toasts} />
          </div>

          {/* ステージの すすみぐあい */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 2px 8px" }}>
            <span style={{ fontSize: 13, opacity: 0.75 }}>あと {Math.max(0, st.clear - cleared)}こで つぎの ばしょ</span>
            <div style={{ flex: 1, height: 14, borderRadius: 999, background: "#dce9f0", overflow: "hidden" }}>
              <div style={{ width: `${(cleared / st.clear) * 100}%`, height: "100%",
                            background: C.gold, transition: "width .3s" }} />
            </div>
          </div>

          {/* たすけ */}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="bigbtn" onClick={useHint}
              style={{ flex: 2, padding: "14px 8px", fontSize: 18, borderRadius: 16,
                       background: C.gold, color: C.ink, boxShadow: "0 5px 0 #d9a520" }}>
              💡 ヒント
            </button>
            <button className="bigbtn" onClick={skipWord}
              style={{ flex: 1, padding: "14px 8px", fontSize: 15, borderRadius: 16,
                       background: "#fff", color: C.ink, boxShadow: "0 5px 0 #d8e3ea" }}>
              🔀 べつの
            </button>
          </div>
        </div>
      )}

      {/* ===== ずかん ===== */}
      {tab === "book" && (
        <div style={{ padding: 10 }}>
          <p style={hint}>あつめた ことば {got.length} / {total}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(76px,1fr))",
                        gap: 8 }}>
            {WORDS.map((w) => {
              const have = got.includes(w.k);
              return (
                <button key={w.k} className="bigbtn" disabled={!have}
                  onClick={() => { blip(700, 0.1); speak(w.k); }}
                  style={{ background: have ? "#fff" : "#eef3f7", borderRadius: 16, padding: "8px 4px",
                           border: `3px solid ${have ? C.gold : "#dde6ec"}`, textAlign: "center",
                           cursor: have ? "pointer" : "default" }}>
                  <div style={{ fontSize: 30, lineHeight: 1.1, filter: have ? "none" : "grayscale(1)",
                                opacity: have ? 1 : 0.3 }}>
                    {have ? w.e : "❔"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, marginTop: 3,
                                color: have ? C.ink : "#b9c7d1" }}>
                    {have ? w.k : "？".repeat(w.k.length)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== できた！ ===== */}
      {over && word && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 20,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: C.cream, borderRadius: 26, padding: 20, width: "100%",
                        maxWidth: 340, textAlign: "center", border: `5px solid ${C.gold}` }}>
            {over.type === "word" && (
              <>
                <p style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>できた！ ✨</p>
                <div style={{ fontSize: 88, lineHeight: 1.1, animation: "pop .45s ease-out" }}>
                  {word.e}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "10px 0 16px" }}>
                  {[...word.k].map((ch, i) => (
                    <span key={i} style={{ width: 40, height: 40, borderRadius: 12, fontSize: 22,
                      fontWeight: 900, background: C.coral, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      animation: `pop .3s ease-out ${i * 0.09}s both` }}>{ch}</span>
                  ))}
                </div>
                <button className="bigbtn" onClick={nextWord}
                  style={{ width: "100%", padding: "16px 8px", fontSize: 20, borderRadius: 16,
                           background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
                  つぎの ことば ▶
                </button>
              </>
            )}

            {over.type === "stage" && (
              <>
                <p style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>
                  {st.name} クリア！ 🎉
                </p>
                <div style={{ fontSize: 74, lineHeight: 1.2, animation: "pop .45s ease-out" }}>
                  {STAGES[stage + 1].icon}
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, margin: "8px 0 16px" }}>
                  つぎは「{STAGES[stage + 1].name}」
                </p>
                <button className="bigbtn" onClick={nextStage}
                  style={{ width: "100%", padding: "16px 8px", fontSize: 20, borderRadius: 16,
                           background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
                  いってみる ▶
                </button>
              </>
            )}

            {over.type === "all" && (
              <>
                <p style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>ぜんぶ クリア！ 🏆</p>
                <div style={{ fontSize: 74, lineHeight: 1.2, animation: "pop .45s ease-out" }}>🌟</div>
                <p style={{ fontSize: 15, margin: "10px 0 16px", opacity: 0.8 }}>
                  ずかんを いっぱいに してみよう
                </p>
                <button className="bigbtn" onClick={keepGoing}
                  style={{ width: "100%", padding: "16px 8px", fontSize: 20, borderRadius: 16,
                           background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
                  まだまだ あそぶ ▶
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "book" && <ToastRow toasts={toasts} fixed />}
    </div>
  );
}

/* ================= ぶひん ================= */

/* ふきだし */
function ToastRow({ toasts, fixed = false }) {
  return (
    <div style={{ position: fixed ? "fixed" : "absolute", left: 0, right: 0,
      bottom: fixed ? 16 : 12, display: "flex", flexDirection: "column",
      alignItems: "center", gap: 4, pointerEvents: "none", zIndex: 10 }}>
      {toasts.map((t) => (
        <span key={t.id} style={{ animation: "toastUp 1.8s ease-out forwards",
          background: t.tone === "warn" ? "#ffd6c9" : "#fff",
          border: `3px solid ${t.tone === "warn" ? "#e06a3c" : THEME.gold}`,
          borderRadius: 999, padding: "6px 14px", fontSize: 15, fontWeight: 800,
          boxShadow: "0 3px 6px rgba(0,0,0,.2)" }}>
          {t.text}
        </span>
      ))}
    </div>
  );
}
