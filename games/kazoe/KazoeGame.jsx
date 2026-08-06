import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C as THEME, clamp } from "../../src/shared/theme.js";

/* なんこ あるかな。
   いろんな えが ならんだ 中から、めあての えが なんこ あるかを かぞえる。
   せいげん じかんの あいだに なんもん こたえられるかの しょうぶ。

   こどもが つまずくのは「かぞえた ところを 見うしなう」ところなので、
   えを おすと しるしが つくようにした。しるしは かずを おしえないので、
   たすけには なっても こたえには ならない。

   じかんぎれで おわるゲームなので、まちがえても じかんは へらさない。
   あせって てきとうに おすより、かぞえなおした ほうが とくに なるようにしている。 */

/* ================= データ ================= */

/* 1もんの 中は おなじ なかまで そろえる。
   くだものと のりものが まざっていると、めあての えを さがす まえに
   「にている え」を えらぶ しごとが ふえて、かぞえる ゲームでは なくなる。

   絵文字は Unicode 11.0（2018年）までのものだけ。
   古いタブレットで □ や × に ならないように。npm run check:emoji で けんさできる */
const THEMES = [
  { name: "くだもの", items: ["🍎", "🍊", "🍌", "🍇", "🍓", "🍉", "🍑", "🍐", "🍒", "🍍"] },
  { name: "どうぶつ", items: ["🐶", "🐱", "🐭", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷"] },
  { name: "うみ",     items: ["🐟", "🐠", "🐡", "🐙", "🦑", "🦐", "🦀", "🐢", "🐬", "🐳"] },
  { name: "のりもの", items: ["🚗", "🚌", "🚑", "🚒", "🚓", "🚚", "🚲", "✈️", "🚀", "🚢"] },
  { name: "おかし",   items: ["🍩", "🍪", "🍰", "🍫", "🍬", "🍭", "🍦", "🍮", "🧁", "🍯"] },
  { name: "そら",     items: ["⭐", "🌙", "☀️", "🌈", "❄️", "⛄", "☁️", "⚡", "🔥", "💧"] },
  { name: "はな",     items: ["🌸", "🌻", "🌷", "🌹", "🌼", "🍀", "🍁", "🌵", "🌲", "🍄"] },
  { name: "あそび",   items: ["⚽", "🏀", "🎾", "⚾", "🎳", "🎈", "🎁", "🎀", "🎸", "🥁"] },
];

/* せっていの はば。ここを こえて むずかしく／やさしく することは できない */
const COUNT = { min: 6, max: 40 };  // ならぶ えの かず
const KINDS = { min: 2, max: 6 };   // しゅるいの かず
const TIMES = [30, 60, 90];         // せいげん じかん（びょう）

/* レベルは はやわざ。おすと したの 3つが まとめて かわる。
   そのあと ➖➕ で 1つずつ こまかく かえられる */
const LEVELS = [
  { count: 8,  kinds: 2, mess: false },
  { count: 14, kinds: 3, mess: false },
  { count: 20, kinds: 4, mess: true },
  { count: 28, kinds: 5, mess: true },
  { count: 36, kinds: 6, mess: true },
];

/* こたえの ボタンの かず。えが おおいほど まよう はばを ひろげる。
   すくないうちに 5つも ならべると、ぜんぶ ためして あたってしまう */
const choiceCountOf = (count) => (count <= 10 ? 3 : count <= 24 ? 4 : 5);

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

/* ぜんぶで total この えを、kinds しゅるいに くばる。
   ・どの しゅるいも かならず 1こ いじょう（0こを「なんこ？」と きかない ため）
   ・1つの しゅるいに かたよらない ように、うわげんを きめて くばる。
     かたよると「おおいほう」を えらぶだけの もんだいに なってしまう */
function share(total, kinds) {
  const n = Array(kinds).fill(1);
  const cap = Math.max(2, Math.round((total / kinds) * 1.7));
  for (let i = kinds; i < total; i++) {
    const room = range(kinds).filter((j) => n[j] < cap);
    n[pick(room.length ? room : range(kinds))]++;
  }
  return n;
}

/* こたえの えらびかた。せいかいの となりの かずを まぜる。
   はなれた かず（1 と 20 など）を ならべると、ざっと 見ただけで あたってしまう */
function choicesOf(answer, max, want) {
  const set = new Set([answer]);
  for (let guard = 0; set.size < want && guard < 60; guard++) {
    const v = answer + pick([-3, -2, -1, 1, 2, 3]);
    if (v >= 1 && v <= max) set.add(v);
  }
  /* はしの ほうの こたえ（1こ など）で となりが たりない ときの うめあわせ */
  for (let v = 1; set.size < want && v <= max; v++) set.add(v);
  return [...set].sort((a, b) => a - b);
}

/* セーブキーは "<id>:save:v1" の かたち。ほかの ゲームと まざらない */
const save = createSave("kazoe:save:v1");

const C = { ...THEME, pink: "#d6337f", deep: "#a82361", board: "#fff4f9" };

/* さいこうきろくは「レベル」と「じかん」の くみあわせ ごとに もつ。
   じかんが ちがえば とれる もんすうも ちがうので、いっしょにすると くらべられない */
const keyOf = (lv, t) => `l${lv + 1}t${t}`;
const BEST_KEYS = new Set(LEVELS.flatMap((_, i) => TIMES.map((t) => keyOf(i, t))));

/* いまの せっていが どの レベルと おなじか。ちがえば -1（きろくは のこさない） */
const levelOf = (p) =>
  LEVELS.findIndex((L) => L.count === p.count && L.kinds === p.kinds && L.mess === p.mess);

/* ================= もんだいを つくる ================= */

/* かえすもの:
     icon     めあての え
     answer   その えの かず（せいかい）
     items    [{ id, icon, jx, jy, rot }]  jx/jy = マスの 中での ずれ（マスの はばに たいする ひりつ）
     cols     よこに ならべる かず
     choices  こたえの ボタンに ならべる かず（ちいさい じゅん） */
function buildRound(p) {
  const theme = pick(THEMES);
  const kinds = clamp(p.kinds, KINDS.min, Math.min(KINDS.max, theme.items.length));
  const count = Math.max(p.count, kinds);
  const icons = shuffle(theme.items).slice(0, kinds);
  const nums = share(count, kinds);

  /* めあては なるべく 2こ いじょう ある ものから。
     「1こ」ばかり きかれると、かぞえずに 見つけるだけの ゲームに なる */
  const many = range(kinds).filter((i) => nums[i] >= 2);
  const ti = pick(many.length ? many : range(kinds));

  /* よこに すこし ひろい ならびに する。たてに ながいと スマホで はみ出す */
  const cols = Math.ceil(Math.sqrt(count * 1.15));

  /* ばらばら モードの ずれは マスの 17% まで。
     えは マスの 58% の 大きさなので、29% + 17% = 46% < 50%。
     どんなに ずれても となりの マスには かからない ＝ かさなって かぞえられない ことが ない */
  const j = p.mess ? 0.17 : 0;
  const jitter = () => (Math.random() * 2 - 1) * j;

  const items = shuffle(nums.flatMap((n, i) => range(n).map(() => icons[i]))).map((icon) => ({
    id: nextId(),
    icon,
    jx: jitter(),
    jy: jitter(),
    rot: p.mess ? Math.round((Math.random() * 2 - 1) * 22) : 0,
  }));

  return {
    theme: theme.name,
    icon: icons[ti],
    answer: nums[ti],
    items,
    cols,
    choices: choicesOf(nums[ti], count, choiceCountOf(count)),
  };
}

/* せいかいの ⭕ を みせている あいだ（ミリびょう）。そのぶん じかんは とめる */
const FLASH = 480;

/* ================= ほんたい ================= */

export default function KazoeGame() {
  /* せってい */
  const [sound, setSound] = useState(true);
  const [time, setTime] = useState(60);
  const [p, setPlay] = useState({ count: 14, kinds: 3, mess: false });
  const [best, setBest] = useState({});

  /* しんこう */
  const [phase, setPhase] = useState("home"); // home / yoi / play / result
  const [cd, setCd] = useState(3);
  const [round, setRound] = useState(null);
  const [marked, setMarked] = useState(() => new Set());
  const [bad, setBad] = useState(() => new Set());
  const [hit, setHit] = useState(0);          // せいかいした こたえ（0 = まだ）
  const [shake, setShake] = useState(false);
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [left, setLeft] = useState(0);
  const [ask, setAsk] = useState(null);       // "quit" | "clear"

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const blip = useBlip(sound);
  const aliveRef = useRef(true);
  const endRef = useRef(0);    // おわりの じこく
  const scoreRef = useRef(0);  // じかんぎれの ときに よむ。state だと 0 のままに なる

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const lv = levelOf(p);
  const bestKey = lv >= 0 ? keyOf(lv, time) : null;
  const bestNow = bestKey ? best[bestKey] || 0 : 0;

  /* ---------- セーブの よみこみ ----------
     localStorage は ほんにんが かきかえられる。ぜんぶ うたがって けんさする */
  useEffect(() => {
    const d = save.load();
    if (d) {
      if (typeof d.sound === "boolean") setSound(d.sound);
      if (TIMES.includes(d.time)) setTime(d.time);
      if (d.p && typeof d.p === "object") {
        const kinds = Math.floor(safeNum(d.p.kinds, KINDS.min, KINDS.max, 3));
        setPlay({
          kinds,
          /* えの かずは しゅるいの かず いじょう。でないと 0この しゅるいが できる */
          count: Math.floor(safeNum(d.p.count, Math.max(COUNT.min, kinds), COUNT.max, 14)),
          mess: typeof d.p.mess === "boolean" ? d.p.mess : false,
        });
      }
      if (d.best && typeof d.best === "object" && !Array.isArray(d.best)) {
        const b = {};
        for (const [k, v] of Object.entries(d.best)) {
          if (BEST_KEYS.has(k)) b[k] = Math.floor(safeNum(v, 0, 999, 0));
        }
        setBest(b);
      }
    }
    setLoaded(true);
  }, []);

  /* ---------- じどうセーブ ---------- */
  const pSig = JSON.stringify(p);
  const bSig = JSON.stringify(best);
  useEffect(() => {
    if (!loaded || !save.available) return;
    save.save({ sound, time, p, best });
    setSaving(true);
    const t = setTimeout(() => { if (aliveRef.current) setSaving(false); }, 500);
    return () => clearTimeout(t);
  }, [loaded, sound, time, pSig, bSig]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- よーい ドン ----------
     いきなり はじまると、もんだいを 見るまえに じかんが へる。
     3・2・1 の あいだに ばんを 見わたして もらう */
  useEffect(() => {
    if (phase !== "yoi") return;
    if (cd <= 0) {
      endRef.current = Date.now() + time * 1000;
      setLeft(time * 1000);
      setPhase("play");
      return;
    }
    blip(520 + (3 - cd) * 90, 0.12);
    const t = setTimeout(() => { if (aliveRef.current) setCd((c) => c - 1); }, 700);
    return () => clearTimeout(t);
  }, [phase, cd, time, blip]);

  /* ---------- のこり じかん ---------- */
  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => {
      const rest = endRef.current - Date.now();
      if (rest > 0) { setLeft(rest); return; }
      clearInterval(t);
      setLeft(0);
      blip(240, 0.35);
      const s = scoreRef.current;
      if (bestKey) setBest((b) => (s > (b[bestKey] || 0) ? { ...b, [bestKey]: s } : b));
      setPhase("result");
    }, 100);
    return () => clearInterval(t);
  }, [phase, bestKey, blip]);

  /* ---------- はじめる ---------- */
  const start = () => {
    blip(760, 0.14);
    scoreRef.current = 0;
    setScore(0);
    setMiss(0);
    setRound(buildRound(p));
    setMarked(new Set());
    setBad(new Set());
    setHit(0);
    setCd(3);
    setPhase("yoi");
  };

  const nextRound = () => {
    setRound(buildRound(p));
    setMarked(new Set());
    setBad(new Set());
    setHit(0);
  };

  /* ---------- えを おす（かぞえた しるし） ----------
     かずは おしえない。「どこまで かぞえたか」だけが わかる たすけ */
  const tapItem = (id) => {
    if (phase !== "play" || hit) return;
    setMarked((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
    blip(marked.has(id) ? 430 : 660, 0.06);
  };

  /* ---------- こたえる ---------- */
  const tapChoice = (v) => {
    if (phase !== "play" || hit || bad.has(v)) return;

    if (v === round.answer) {
      blip(920, 0.18);
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setHit(v);
      /* ⭕ を みせている あいだは じかんを とめる。
         せいかいした ぶんだけ そんを する、には しない */
      endRef.current += FLASH;
      setTimeout(() => { if (aliveRef.current) nextRound(); }, FLASH);
      return;
    }

    /* まちがい。じかんは へらさない。あわてて おすより かぞえなおす ほうが とく */
    blip(200, 0.16);
    setMiss((m) => m + 1);
    setBad((b) => new Set(b).add(v));
    setShake(true);
    setTimeout(() => { if (aliveRef.current) setShake(false); }, 340);
  };

  const backHome = () => {
    setPhase("home");
    setRound(null);
    setAsk(null);
  };

  const setP = (patch) => setPlay((v) => ({ ...v, ...patch }));

  /* ---------- せっていの つまみ ----------
     しゅるいを ふやすと えが たりなくなることが ある。いっしょに ふやす */
  const setCount = (v) => {
    blip(560, 0.1);
    setP({ count: clamp(v, Math.max(COUNT.min, p.kinds), COUNT.max) });
  };
  const setKinds = (v) => {
    const k = clamp(v, KINDS.min, KINDS.max);
    blip(600 + k * 30, 0.1);
    setP({ kinds: k, count: Math.max(p.count, k) });
  };

  /* ================= みため ================= */

  const hint = { margin: "0 0 8px", textAlign: "center", fontSize: 14, color: C.ink, opacity: 0.75 };
  const card = {
    background: "#fff", borderRadius: 20, border: `4px solid ${C.gold}`,
    boxShadow: "0 4px 0 #e5c79a", padding: 12, marginBottom: 10,
  };
  const label = { fontSize: 14, fontWeight: 900, margin: "0 0 8px", opacity: 0.8 };
  const chip = (on) => ({
    flex: 1, padding: "13px 4px", fontSize: 16, borderRadius: 14,
    background: on ? C.pink : "#fdeef5", color: on ? "#fff" : C.ink,
    boxShadow: `0 4px 0 ${on ? C.deep : "#f0d5e2"}`,
  });

  const lowTime = phase === "play" && left <= 10000;

  return (
    <div style={{ fontFamily: FONT, color: C.ink, minHeight: "100%", background: C.sky,
                  userSelect: "none", WebkitUserSelect: "none", paddingBottom: 28 }}>
      <style>{`
        @keyframes pop { 0%{ transform:scale(.4) } 70%{ transform:scale(1.14) } 100%{ transform:scale(1) } }
        @keyframes bob { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-5px) } }
        @keyframes shake { 0%,100%{ transform:translateX(0) } 25%{ transform:translateX(-7px) }
                           75%{ transform:translateX(7px) } }
        @keyframes fade { 0%{ opacity:0; transform:scale(.5) } 40%{ opacity:1; transform:scale(1.05) }
                          100%{ opacity:1; transform:scale(1) } }
        @keyframes tick { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.12) } }
        .homelink { text-decoration:none; }
        .bigbtn { border:none; cursor:pointer; font-family:inherit; font-weight:800;
                  -webkit-tap-highlight-color:transparent; }
        .bigbtn:active { transform: translateY(3px); }
        .bigbtn:disabled { cursor:default; transform:none; }
        /* えは ばしょが ずれると かぞえにくい。:active で うごかさない */
        .icn { border:none; padding:0; margin:0; background:transparent; cursor:pointer;
               font-family:inherit; -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
        .icn:disabled { cursor:default; }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important } }
      `}</style>

      {/* ===== ヘッダー ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                    background: C.cream, borderBottom: `4px solid ${C.gold}`, flexWrap: "wrap" }}>
        <a className="homelink" href="../../" aria-label="ゲームをえらぶ"
           style={{ fontSize: 20, padding: "2px 4px" }}>🏠</a>
        <b style={{ fontSize: 16 }}>🔍 なんこ あるかな</b>
        {(phase === "play" || phase === "yoi") && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff",
                         borderRadius: 999, padding: "3px 10px", border: `2px solid ${C.pink}` }}>
            <span style={{ fontSize: 15 }}>⭕</span>
            <b style={{ fontSize: 16 }}>{score}</b>
          </span>
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
          <p style={hint}>めあての えが なんこ あるか、じかんない に かぞえよう！</p>

          <div style={card}>
            <p style={label}>せいげん じかん</p>
            <div style={{ display: "flex", gap: 8 }}>
              {TIMES.map((t) => (
                <button key={t} className="bigbtn"
                  onClick={() => { blip(680, 0.1); setTime(t); }} style={chip(time === t)}>
                  {t}びょう
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  {lv >= 0 ? `レベル ${lv + 1}` : "じぶんで せってい"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {bestNow > 0
                    ? `この レベルの さいこう ${bestNow}もん`
                    : lv >= 0 ? "まだ きろくが ないよ" : "きろくは のこらないよ"}
                </div>
              </div>
              <button className="bigbtn"
                onClick={() => { blip(500, 0.1); setP({ mess: !p.mess }); }}
                style={{ padding: "11px 10px", fontSize: 13, borderRadius: 14,
                         background: p.mess ? C.pink : "#fdeef5",
                         color: p.mess ? "#fff" : C.ink,
                         boxShadow: `0 4px 0 ${p.mess ? C.deep : "#f0d5e2"}` }}>
                🌀 ばらばら
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: `repeat(${LEVELS.length},1fr)`, gap: 5 }}>
              {LEVELS.map((L, i) => (
                <button key={i} className="bigbtn"
                  onClick={() => { blip(560 + i * 40, 0.1); setPlay({ ...L }); }}
                  aria-label={`レベル ${i + 1}`}
                  style={{ padding: "12px 0", fontSize: 16, borderRadius: 12,
                           background: lv === i ? C.pink : "#fdeef5",
                           color: lv === i ? "#fff" : C.ink,
                           boxShadow: `0 4px 0 ${lv === i ? C.deep : "#f0d5e2"}` }}>
                  {i + 1}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 4, borderTop: "2px dashed #f3dbe6", paddingTop: 4 }}>
              <Stepper name="ならぶ かず" text={`${p.count} こ`}
                dec={() => setCount(p.count - 2)} inc={() => setCount(p.count + 2)}
                canDec={p.count > Math.max(COUNT.min, p.kinds)} canInc={p.count < COUNT.max} />
              <Stepper name="しゅるいの かず" text={`${p.kinds} しゅるい`}
                dec={() => setKinds(p.kinds - 1)} inc={() => setKinds(p.kinds + 1)}
                canDec={p.kinds > KINDS.min} canInc={p.kinds < KINDS.max} />
            </div>
          </div>

          <button className="bigbtn" onClick={start}
            style={{ width: "100%", padding: "18px 8px", fontSize: 21, borderRadius: 18,
                     background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
            ▶ はじめる
          </button>

          <div style={{ ...card, marginTop: 14, background: "#fffdf6" }}>
            <p style={{ ...label, margin: "0 0 6px" }}>あそびかた</p>
            <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0, opacity: 0.85 }}>
              うえに でている えが、ばんの 中に <b>なんこ</b> あるかを かぞえて、
              したの すうじを おします。せいげん じかんまでに
              なんもん せいかいできるかの しょうぶです。<br />
              かぞえるときは、<b>ばんの えを おすと しるしが つきます</b>。
              どこまで かぞえたかが わかるので、まよったら つかって ください
              （かずは おしえません）。まちがえても じかんは へりません。
              ゆっくり かぞえなおして だいじょうぶです。<br />
              <b>🌀 ばらばら</b>を つけると、えが すこし ずれて ななめに なります。
              きれいに ならんで いないと ぐっと むずかしく なります。
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

      {/* ===== よーい ドン ===== */}
      {phase === "yoi" && round && (
        <div style={{ padding: "34px 14px", textAlign: "center", maxWidth: 460, margin: "0 auto" }}>
          <p style={{ fontSize: 15, opacity: 0.75, margin: "0 0 10px" }}>
            {time}びょう しょうぶ　／　{p.count}こ の {round.theme}
          </p>
          <div style={{ fontSize: 78, lineHeight: 1.2, animation: "bob 2.4s ease-in-out infinite" }}>
            {round.icon}
          </div>
          <p style={{ fontSize: 20, fontWeight: 900, margin: "8px 0 18px" }}>
            この えを かぞえるよ
          </p>
          <div key={cd} style={{ fontSize: 76, fontWeight: 900, color: C.coral, lineHeight: 1,
                                 animation: "pop .5s ease-out" }}>
            {cd}
          </div>
        </div>
      )}

      {/* ===== ほんばん ===== */}
      {phase === "play" && round && (
        <div style={{ padding: 10, maxWidth: 460, margin: "0 auto" }}>
          {/* のこり じかん */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
            <span style={{ fontSize: 18, animation: lowTime ? "tick .5s ease-in-out infinite" : "none" }}>
              ⏱️
            </span>
            <div style={{ flex: 1, height: 14, borderRadius: 999, background: "#f6dfe9",
                          overflow: "hidden" }}>
              <div style={{ width: `${(left / (time * 1000)) * 100}%`, height: "100%",
                            background: lowTime ? C.coral : C.pink, transition: "width .1s linear" }} />
            </div>
            <b style={{ fontSize: 18, minWidth: 26, textAlign: "right",
                        color: lowTime ? C.coral : C.ink }}>
              {Math.ceil(left / 1000)}
            </b>
          </div>

          {/* おだい */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                        background: "#fff", borderRadius: 20, border: `4px solid ${C.gold}`,
                        boxShadow: "0 4px 0 #e5c79a", marginBottom: 10 }}>
            <span style={{ fontSize: 42, lineHeight: 1 }}>{round.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 900 }}>は なんこ？</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                えを おすと しるしが つくよ
              </div>
            </div>
          </div>

          <Board round={round} marked={marked} onTap={tapItem} shake={shake} hit={hit} />

          {/* こたえ */}
          <div style={{ display: "grid", gap: 8, marginTop: 10,
                        gridTemplateColumns: `repeat(${round.choices.length},1fr)` }}>
            {round.choices.map((v) => {
              const wrong = bad.has(v);
              const win = hit === v;
              return (
                <button key={v} className="bigbtn" disabled={wrong || (!!hit && !win)}
                  onClick={() => tapChoice(v)} aria-label={`${v}こ`}
                  style={{
                    padding: "17px 0", fontSize: 25, borderRadius: 16,
                    background: win ? "#2fa36b" : wrong ? "#f1f5f8" : "#fff",
                    color: win ? "#fff" : wrong ? "#c3d0d8" : C.ink,
                    boxShadow: win ? "0 5px 0 #217a4f" : wrong ? "none" : "0 5px 0 #e7d0dd",
                    border: wrong ? "none" : `3px solid ${win ? "#217a4f" : C.pink}`,
                  }}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== けっか ===== */}
      {phase === "result" && (
        <Result score={score} miss={miss} time={time} lv={lv} best={bestNow}
          onAgain={start} onHome={backHome} />
      )}

      {/* ===== かくにん ===== */}
      {ask && (
        <Overlay>
          <p style={{ fontSize: 18, fontWeight: 900, margin: "0 0 6px" }}>
            {ask === "quit" ? "やめて いいですか？" : "きろくを けしますか？"}
          </p>
          <p style={{ fontSize: 14, opacity: 0.8, margin: "0 0 18px" }}>
            {ask === "quit"
              ? "いまの てんすうは きえます"
              : "さいこうきろくと せっていが もとに もどります"}
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
                setBest({});
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

/* ➖ かず ➕ の 1ぎょう */
function Stepper({ name, text, dec, inc, canDec, canInc }) {
  const btn = (on) => ({
    width: 44, height: 44, borderRadius: 12, fontSize: 20, padding: 0,
    background: on ? "#fdeef5" : "#f6f8f9",
    color: on ? C.ink : "#c9d6da",
    boxShadow: on ? "0 3px 0 #f0d5e2" : "none",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.8, flex: 1, minWidth: 0 }}>
        {name}
      </span>
      <button className="bigbtn" disabled={!canDec} onClick={dec}
        aria-label={`${name}を へらす`} style={btn(canDec)}>－</button>
      <b style={{ fontSize: 15, minWidth: 78, textAlign: "center" }}>{text}</b>
      <button className="bigbtn" disabled={!canInc} onClick={inc}
        aria-label={`${name}を ふやす`} style={btn(canInc)}>＋</button>
    </div>
  );
}

/* ばん。えを マスめに ならべる。
   マスの 大きさは よこはばを cols で わったぶん。がめんの 大きさが かわっても、
   ならびかたは かわらない（もんだいの むずかしさが 画面で かわらない ように） */
function Board({ round, marked, onTap, shake, hit }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);

  /* もじの 大きさだけは ピクセルで きめたい。ばんの よこはばを はかる */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setW(el.clientWidth);
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const cell = (w || 320) / round.cols;
  const fs = Math.max(15, Math.round(cell * 0.58));

  return (
    <div style={{ position: "relative", animation: shake ? "shake .34s ease-in-out" : "none" }}>
      <div ref={ref}
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "center",
                 borderRadius: 22, border: `4px solid ${C.pink}`, overflow: "hidden",
                 background: `radial-gradient(circle at 30% 20%, #ffffff 0%, ${C.board} 60%, #ffe6f1 100%)` }}>
        {round.items.map((it) => {
          const on = marked.has(it.id);
          return (
            <button key={it.id} className="icn" disabled={!!hit}
              onPointerDown={() => onTap(it.id)}
              aria-label={on ? "しるしを けす" : "しるしを つける"}
              style={{ position: "relative", width: `${100 / round.cols}%`, height: 0,
                       paddingBottom: `${100 / round.cols}%` }}>
              <span style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                             display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* かぞえた しるし。かずは 出さない ＝ こたえには ならない */}
                {on && (
                  <span style={{ position: "absolute", width: "72%", height: "72%",
                                 borderRadius: "50%", border: `3px solid ${C.coral}`,
                                 background: "rgba(255,122,69,.16)", animation: "fade .2s ease-out" }} />
                )}
                <span style={{ fontSize: fs, lineHeight: 1, display: "inline-block",
                               opacity: on ? 0.55 : 1,
                               transform: `translate(${it.jx * 100}%, ${it.jy * 100}%) rotate(${it.rot}deg)` }}>
                  {it.icon}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* せいかいの ⭕。つぎの もんだいが 出るまでの あいだ だけ */}
      {!!hit && (
        <span style={{ position: "absolute", top: "50%", left: "50%", fontSize: 96,
                       transform: "translate(-50%,-50%)", animation: "fade .25s ease-out",
                       pointerEvents: "none", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.25))" }}>
          ⭕
        </span>
      )}
    </div>
  );
}

/* じかんぎれの けっか */
function Result({ score, miss, time, lv, best, onAgain, onHome }) {
  const isBest = lv >= 0 && score > 0 && score >= best;
  /* 1もんに どれくらい かかったか。てんすうの かわりに はやさが わかる */
  const per = score > 0 ? (time / score).toFixed(1) : null;

  return (
    <div style={{ padding: 14, maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 70, lineHeight: 1.2, animation: "pop .5s ease-out" }}>
        {score === 0 ? "🐣" : score >= 10 ? "🏆" : "✨"}
      </div>
      <p style={{ fontSize: 15, opacity: 0.75, margin: "6px 0 0" }}>じかんぎれ！</p>
      <p style={{ fontSize: 30, fontWeight: 900, margin: "2px 0 12px" }}>
        {score} もん せいかい
      </p>
      {isBest && (
        <p style={{ fontSize: 15, fontWeight: 800, color: C.coral, margin: "-6px 0 12px" }}>
          さいこうきろく こうしん！ 🎉
        </p>
      )}

      <div style={{ background: "#fff", borderRadius: 20, border: `4px solid ${C.gold}`,
                    boxShadow: "0 4px 0 #e5c79a", padding: 14, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>まちがえた かず</div>
            <b style={{ fontSize: 22 }}>{miss}</b>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>1もんに かかった じかん</div>
            <b style={{ fontSize: 22 }}>{per ? `${per}びょう` : "-"}</b>
          </div>
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, margin: "12px 0 0", lineHeight: 1.7 }}>
          {lv >= 0
            ? <>レベル {lv + 1} / {time}びょう の さいこうきろくは <b>{Math.max(best, score)}もん</b></>
            : <>じぶんで せっていした ときは きろくを のこしません</>}
        </p>
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
        むずかしさを かえる
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
