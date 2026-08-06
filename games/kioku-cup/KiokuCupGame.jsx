import React, { useState, useEffect, useRef, useCallback } from "react";
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C as THEME, clamp } from "../../src/shared/theme.js";

/* きおくカップ。
   おとなの「メモリースポーツ（きおくの きょうぎ）」を こども向けに した たいかい。

   ほんかの きょうぎは、きめられた じかんで おぼえて、そのあとに 思いだす。
   じゅんばんが 1つでも ずれると てんに ならない、という きびしい ルールだが、
   ここでは 1つずつ あっているか を みる（できた ぶんだけ てんに なる）。

   4しゅもく。かっこの 中が ほんかの きょうぎ名。
     🔢 すうじ         （ランダム数字）
     🃏 カードならべ   （スピードカード）
     🙂 かおと なまえ  （人名と顔）
     🔴 しるしの ならび（バイナリ／抽象画）

   たいせつなのは 点そのものより「おぼえかた」なので、しゅもくに 入る前に
   かならず コツ（きおくじゅつ）を 1つ 出す。すうじなら 2つずつ くぎる、
   カードなら おはなしに する、など。ここが ただの きおくゲームとの ちがい。

   きろくは レベルごと・しゅもくごとに のこる。じぶんの さいこうきろくを
   こえるのが めあてなので、たいせんは いれていない。 */

/* ================= しゅもく ================= */

const EVENTS = [
  {
    id: "num", icon: "🔢", name: "すうじ", real: "ランダム数字",
    what: (L) => `${L.len}この すうじを ${L.sec}びょうで`,
    tip: "2つずつ くぎって「よんじゅうなな」「ぜろさん」と こえに 出すと、\nおぼえる かずが はんぶんに なるよ。",
  },
  {
    id: "card", icon: "🃏", name: "カードならべ", real: "スピードカード",
    what: (L) => `${L.n}まいの ならびを ${L.sec}びょうで`,
    tip: "じゅんばんに おはなしを つくろう。\n「いぬが りんごを たべて、くるまに のった」みたいに つなげると わすれないよ。",
  },
  {
    id: "face", icon: "🙂", name: "かおと なまえ", real: "人名と顔",
    what: (L) => `${L.n}ひきの なまえを ${L.sec}びょうで`,
    tip: "なまえを こえに 出しながら、かおの どこか（みみ・いろ・かたち）を\nひとつ きめて、なまえと むすびつけよう。",
  },
  {
    id: "mark", icon: "🔴", name: "しるしの ならび", real: "バイナリ",
    what: (L) => `${L.len}この しるしを ${L.sec}びょうで`,
    tip: "3つずつ くぎって、かたまりで おぼえよう。\n「あか あお あか」を ひとつの かたまりとして 見るのが コツ。",
  },
];

/* レベル。1つの すうじで 4しゅもく ぜんぶの むずかしさが きまる。
   ざっくり: レベル1＝はじめて、レベル3＝なれてきた、レベル5＝おとなでも むずかしい */
const LEVELS = [
  { num: { len: 4,  sec: 12 }, card: { n: 4,  sec: 10 }, face: { n: 3, sec: 15 }, mark: { len: 6,  kinds: 2, sec: 10 } },
  { num: { len: 6,  sec: 13 }, card: { n: 5,  sec: 12 }, face: { n: 4, sec: 17 }, mark: { len: 9,  kinds: 2, sec: 12 } },
  { num: { len: 8,  sec: 14 }, card: { n: 6,  sec: 13 }, face: { n: 5, sec: 19 }, mark: { len: 12, kinds: 3, sec: 14 } },
  { num: { len: 10, sec: 15 }, card: { n: 8,  sec: 15 }, face: { n: 6, sec: 21 }, mark: { len: 15, kinds: 3, sec: 16 } },
  { num: { len: 12, sec: 16 }, card: { n: 10, sec: 16 }, face: { n: 8, sec: 24 }, mark: { len: 18, kinds: 4, sec: 18 } },
];

/* ================= おだいの もと ================= */

/* カードならべ の え。1かいの もんだいの 中で おなじ えは 出ない
   （おなじ えが 2まい あると、どちらを おしても いいことに なってしまう）*/
const CARDS = [
  "🐶", "🐱", "🐟", "🐸", "🐧", "🐘", "🐝", "🐬",
  "🍎", "🍌", "🍓", "🍄", "🍩", "🍦", "🍕", "🥕",
  "🚗", "🚌", "✈️", "🚂", "🚀", "⛵", "🚲", "🛴",
  "🌙", "⭐", "🌈", "🌸", "🌻", "⛄", "🔑", "🎈",
  "🎁", "🎩", "👑", "⚽", "🎸", "📷", "🕐", "💡",
];

/* かおと なまえ の かお。ひとの かおの 絵文字は にていて 見わけにくいので
   どうぶつに した。おぼえる ちからは おなじ（かお と 音を むすびつける） */
const ANIMALS = [
  "🐱", "🐶", "🦊", "🐼", "🐸", "🐧", "🐰", "🐻", "🦁", "🐯",
  "🐷", "🐮", "🐵", "🐨", "🐭", "🐹", "🐺", "🐴", "🐔", "🐗",
];

/* なまえ。どうぶつの ほんとうの なまえとは かんけいない ことで、
   「かお と 音を むすびつける」れんしゅうに なる。
   ちいさい「ゃゅょっ」と のばす「ー」は 5さいには よみにくいので いれない */
const NAMES = [
  "ぽこ", "たろ", "みみ", "くう", "ぱん", "るる", "もこ", "まる",
  "そら", "ここ", "ぷう", "のん", "りん", "ばん", "とと", "ぴぴ",
  "なな", "こま", "ふく", "げん", "ぽち", "たま", "しろ", "くろ",
  "はな", "もも", "ちび", "かの", "ぬい", "れん",
];

/* しるし。レベルが 上がると しゅるいが ふえる。
   まえの 2つは いろだけの ちがい、あとの 2つは かたちも ちがう */
const MARKS = ["🔴", "🔵", "🔶", "⭐"];

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
/* すうじの ボタンは でんたくと おなじ ならび（1〜9 のあとに 0）*/
const PAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

/* ================= ちいさい どうぐ ================= */

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
/* n こずつの かたまりに わける。おぼえやすくする ための くぎり */
const chunk = (arr, n) =>
  range(Math.ceil(arr.length / n)).map((i) => arr.slice(i * n, i * n + n));

const save = createSave("kioku-cup:save:v1");

const C = { ...THEME, blue: "#3b56b8", deep: "#2a3f8f", pale: "#eef1fc", good: "#2e9e5b" };

const evInfo = (id) => EVENTS.find((e) => e.id === id);
const specOf = (id, level) => LEVELS[level - 1][id];

/* めだる。ぜんしゅもくの へいきんてんで きまる */
const MEDALS = [
  { min: 90, e: "🥇", t: "きんメダル！" },
  { min: 75, e: "🥈", t: "ぎんメダル！" },
  { min: 60, e: "🥉", t: "どうメダル！" },
  { min: 0,  e: "🎈", t: "よく がんばりました" },
];
const medalOf = (avg) => MEDALS.find((m) => avg >= m.min);

/* ================= おだいを つくる ================= */

/* かえすもの（しゅもくで 中身が ちがう）:
     ev       しゅもくの id
     secs     おぼえる びょうすう
     seq      こたえの ならび（すうじ・カード・しるし）
     palette  こたえるときに おす ものの 一覧。こたえは この ばんごうで もつ
     oneUse   palette の おなじ ものを 1かいしか つかえないか（カードだけ true）
     group    なんこずつ くぎって 見せるか
     pairs    かおと なまえ の [{ av, name }]
     order    かおと なまえ を きく じゅんばん（pairs の ばんごう）
     choices  かおと なまえ の こたえの えらびかた */
function buildQ(ev, level) {
  const L = specOf(ev, level);

  if (ev === "num") {
    return {
      ev, secs: L.sec, group: 2, oneUse: false, palette: DIGITS,
      seq: range(L.len).map(() => String(Math.floor(Math.random() * 10))),
    };
  }
  if (ev === "mark") {
    const palette = MARKS.slice(0, L.kinds);
    return {
      ev, secs: L.sec, group: 3, oneUse: false, palette,
      seq: range(L.len).map(() => pick(palette)),
    };
  }
  if (ev === "card") {
    const seq = shuffle(CARDS).slice(0, L.n);
    /* こたえるときの カードは ばらばらに ならべる。
       おぼえた ならびの ままだと、ただ 左から おすだけに なってしまう */
    return { ev, secs: L.sec, group: 5, oneUse: true, palette: shuffle(seq), seq };
  }
  /* face */
  const names = shuffle(NAMES).slice(0, L.n);
  const pairs = shuffle(ANIMALS).slice(0, L.n).map((av, i) => ({ av, name: names[i] }));
  return { ev, secs: L.sec, pairs, order: shuffle(range(L.n)), choices: shuffle(names) };
}

/* あっている かず。1つずつ みる（じゅんばんが ずれても、あった ぶんは てんに なる）*/
function hitsOf(q, ans) {
  if (q.ev === "face") return q.order.filter((pi, i) => ans[i] === q.pairs[pi].name).length;
  return q.seq.filter((s, i) => ans[i] != null && q.palette[ans[i]] === s).length;
}
const sizeOf = (q) => (q.ev === "face" ? q.pairs.length : q.seq.length);

/* ================= セーブ ================= */

const emptyBest = () => ({
  num: range(LEVELS.length).fill(0), card: range(LEVELS.length).fill(0),
  face: range(LEVELS.length).fill(0), mark: range(LEVELS.length).fill(0),
  all: range(LEVELS.length).fill(0),
});
const allOn = () => ({ num: true, card: true, face: true, mark: true });

/* セーブは ほんにんが かきかえられる。よみこんだ ものは ぜんぶ けんさする */
const readRow = (v) =>
  range(LEVELS.length).map((i) => Math.floor(safeNum(Array.isArray(v) ? v[i] : 0, 0, 100, 0)));

/* ================= ほんたい ================= */

export default function KiokuCupGame() {
  /* せってい */
  const [sound, setSound] = useState(true);
  const [level, setLevel] = useState(2);
  const [on, setOn] = useState(allOn);
  const [best, setBest] = useState(emptyBest);

  /* しんこう */
  const [phase, setPhase] = useState("home"); // home/ready/memo/recall/result/final
  const [list, setList] = useState([]);       // この たいかいで やる しゅもく
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState(null);
  const [ans, setAns] = useState([]);
  const [got, setGot] = useState([]);         // しゅもくごとの てん
  const [left, setLeft] = useState(0);        // おぼえる のこり(ms)
  const [used, setUsed] = useState(0);        // おぼえるのに つかった びょう
  const [upEv, setUpEv] = useState(false);    // この しゅもくで きろく こうしん
  const [upAll, setUpAll] = useState(false);  // そうごうで きろく こうしん
  const [ask, setAsk] = useState(null);       // "quit" | "clear"

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const blip = useBlip(sound);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const evId = list[idx];
  const ev = evId ? evInfo(evId) : null;
  const chosen = EVENTS.filter((e) => on[e.id]);

  /* ---------- セーブの よみこみ ---------- */
  useEffect(() => {
    const d = save.load();
    if (d) {
      if (typeof d.sound === "boolean") setSound(d.sound);
      setLevel(clamp(Math.floor(safeNum(d.level, 1, LEVELS.length, 2)), 1, LEVELS.length));
      if (d.on && typeof d.on === "object") {
        const next = {};
        for (const e of EVENTS) next[e.id] = d.on[e.id] !== false;
        /* ぜんぶ けした セーブが きても、しゅもく 0こでは あそべない */
        if (EVENTS.some((e) => next[e.id])) setOn(next);
      }
      if (d.best && typeof d.best === "object") {
        setBest({
          num: readRow(d.best.num), card: readRow(d.best.card),
          face: readRow(d.best.face), mark: readRow(d.best.mark),
          all: readRow(d.best.all),
        });
      }
    }
    setLoaded(true);
  }, []);

  /* ---------- じどうセーブ ---------- */
  const onSig = JSON.stringify(on);
  const bestSig = JSON.stringify(best);
  useEffect(() => {
    if (!loaded || !save.available) return;
    save.save({ sound, level, on, best });
    setSaving(true);
    const t = setTimeout(() => { if (aliveRef.current) setSaving(false); }, 500);
    return () => clearTimeout(t);
  }, [loaded, sound, level, onSig, bestSig]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- おぼえる じかん ---------- */
  useEffect(() => {
    if (phase !== "memo" || !q) return;
    const ms = q.secs * 1000;
    const end = Date.now() + ms;
    setLeft(ms);
    const t = setInterval(() => {
      const rest = end - Date.now();
      if (rest <= 0) {
        clearInterval(t);
        setLeft(0);
        setUsed(q.secs);
        setPhase("recall");
      } else {
        setLeft(rest);
      }
    }, 80);
    return () => clearInterval(t);
  }, [phase, q]);

  /* ---------- たいかいを はじめる ---------- */
  const startMeet = () => {
    const ids = EVENTS.filter((e) => on[e.id]).map((e) => e.id);
    if (!ids.length) return;
    blip(780, 0.16);
    setList(ids);
    setIdx(0);
    setGot([]);
    setUpAll(false);
    setPhase("ready");
  };

  const startEvent = useCallback(() => {
    blip(720, 0.14);
    setQ(buildQ(list[idx], level));
    setAns([]);
    setUpEv(false);
    setPhase("memo");
  }, [blip, list, idx, level]);

  /* おぼえおわった。のこり じかんを つかった じかんに なおす */
  const endMemo = () => {
    blip(880, 0.1);
    setUsed(Math.max(1, Math.round(q.secs - left / 1000)));
    setPhase("recall");
  };

  /* ---------- こたえあわせ ---------- */
  const submit = () => {
    const pts = Math.round((hitsOf(q, ans) / sizeOf(q)) * 100);
    const up = pts > best[q.ev][level - 1];
    setUpEv(up);
    if (up) {
      setBest((b) => ({ ...b, [q.ev]: b[q.ev].map((v, i) => (i === level - 1 ? pts : v)) }));
    }
    setGot((g) => [...g, pts]);
    setTimeout(() => {
      if (!aliveRef.current) return;
      blip(pts === 100 ? 1040 : pts >= 60 ? 820 : 330, pts >= 60 ? 0.28 : 0.18);
    }, 200);
    setPhase("result");
  };

  const nextEvent = () => {
    blip(700, 0.12);
    const k = idx + 1;
    if (k >= list.length) {
      /* そうごうきろくは 4しゅもく そろえた ときだけ のこす。
         しゅもくを へらした へいきんと ならべたら、くらべる いみが なくなる */
      if (list.length === EVENTS.length && got.length === EVENTS.length) {
        const avg = Math.round(got.reduce((s, x) => s + x, 0) / got.length);
        if (avg > best.all[level - 1]) {
          setUpAll(true);
          setBest((b) => ({ ...b, all: b.all.map((v, i) => (i === level - 1 ? avg : v)) }));
        }
      }
      setPhase("final");
      return;
    }
    setIdx(k);
    setPhase("ready");
  };

  const backHome = () => {
    setPhase("home");
    setQ(null);
    setAsk(null);
  };

  /* ================= みため ================= */

  const total = got.reduce((s, x) => s + x, 0);
  const hint = { margin: "0 0 8px", textAlign: "center", fontSize: 14, color: C.ink, opacity: 0.75 };

  return (
    <div style={{ fontFamily: FONT, color: C.ink, minHeight: "100%", background: C.sky,
                  userSelect: "none", WebkitUserSelect: "none", paddingBottom: 28 }}>
      <style>{`
        @keyframes pop { 0%{ transform:scale(.4) } 70%{ transform:scale(1.14) } 100%{ transform:scale(1) } }
        @keyframes bob { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-5px) } }
        .homelink { text-decoration:none; }
        .bigbtn { border:none; cursor:pointer; font-family:inherit; font-weight:800;
                  -webkit-tap-highlight-color:transparent; }
        .bigbtn:active { transform: translateY(3px); }
        .bigbtn:disabled { cursor:default; transform:none; }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important } }
      `}</style>

      {/* ===== ヘッダー ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                    background: C.cream, borderBottom: `4px solid ${C.gold}`, flexWrap: "wrap" }}>
        <a className="homelink" href="../../" aria-label="ゲームをえらぶ"
           style={{ fontSize: 20, padding: "2px 4px" }}>🏠</a>
        <b style={{ fontSize: 16 }}>🏅 きおくカップ</b>
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

      {/* ===== しゅもくの すすみぐあい ===== */}
      {phase !== "home" && (
        <div style={{ display: "flex", gap: 5, padding: "7px 8px", background: "#fff",
                      borderBottom: `3px solid ${C.gold}`, alignItems: "stretch" }}>
          {list.map((id, i) => {
            const now = i === idx && phase !== "final";
            const done = i < got.length;
            return (
              <div key={id} style={{
                flex: "1 1 0", minWidth: 0, textAlign: "center", borderRadius: 13,
                padding: "4px 2px", background: now ? C.pale : done ? "#f2fbf5" : "#f6f8fa",
                border: `2px solid ${now ? C.blue : done ? "#bfe6cd" : "#e3e9f0"}`,
              }}>
                <div style={{ fontSize: 18, lineHeight: 1.2 }}>{evInfo(id).icon}</div>
                <b style={{ fontSize: 14, color: done ? C.good : "#aab8c6" }}>
                  {done ? got[i] : "-"}
                </b>
              </div>
            );
          })}
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column",
                        justifyContent: "center", padding: "0 6px 0 8px",
                        borderLeft: "2px dashed #e0e7f0" }}>
            <span style={{ fontSize: 10, opacity: 0.65, lineHeight: 1.2 }}>ごうけい</span>
            <b style={{ fontSize: 17, lineHeight: 1.1 }}>{total}</b>
          </div>
        </div>
      )}

      {/* ===== したく ===== */}
      {phase === "home" && (
        <Home level={level} setLevel={setLevel} on={on} setOn={setOn} best={best}
              chosen={chosen} blip={blip} onStart={startMeet}
              onClear={() => setAsk("clear")} />
      )}

      {/* ===== しゅもくの まえおき ===== */}
      {phase === "ready" && ev && (
        <Ready ev={ev} level={level} no={idx + 1} of={list.length}
               best={best[ev.id][level - 1]} onGo={startEvent} />
      )}

      {/* ===== おぼえる ===== */}
      {phase === "memo" && q && (
        <div style={{ padding: 10, maxWidth: 460, margin: "0 auto" }}>
          <Bar left={left} full={q.secs * 1000} />
          <p style={hint}>{ev.icon} {ev.name} ─ よく みて おぼえよう</p>
          <div style={{ ...CARD, padding: "16px 10px" }}>
            {q.ev === "face" ? <FaceShow q={q} /> : <SeqShow q={q} />}
          </div>
          <button className="bigbtn" onClick={endMemo}
            style={{ width: "100%", padding: "16px 8px", fontSize: 18, borderRadius: 16,
                     background: C.gold, color: C.ink, boxShadow: "0 5px 0 #d9a520" }}>
            おぼえた！ こたえる
          </button>
          <p style={{ ...hint, marginTop: 10, fontSize: 12 }}>
            はやく おぼえられたら おしてね。のこり じかんは てんに ひびかないよ
          </p>
        </div>
      )}

      {/* ===== こたえる ===== */}
      {phase === "recall" && q && (
        <div style={{ padding: 10, maxWidth: 460, margin: "0 auto" }}>
          {q.ev === "face" ? (
            <FaceRecall q={q} ans={ans} setAns={setAns} blip={blip} onDone={submit} />
          ) : (
            <SeqRecall q={q} ans={ans} setAns={setAns} blip={blip} onDone={submit} />
          )}
        </div>
      )}

      {/* ===== しゅもくの けっか ===== */}
      {phase === "result" && q && (
        <div style={{ padding: 10, maxWidth: 460, margin: "0 auto" }}>
          <div style={{ ...CARD, textAlign: "center" }}>
            <div style={{ fontSize: 44, lineHeight: 1.2, animation: "pop .45s ease-out" }}>
              {got[idx] === 100 ? "🎉" : got[idx] >= 60 ? "👍" : "💭"}
            </div>
            <p style={{ fontSize: 17, fontWeight: 900, margin: "4px 0 2px" }}>
              {ev.icon} {ev.name}　{hitsOf(q, ans)} / {sizeOf(q)} せいかい
            </p>
            <p style={{ fontSize: 34, fontWeight: 900, margin: "0 0 2px", color: C.coral }}>
              {got[idx]} てん
            </p>
            {upEv ? (
              <p style={{ fontSize: 15, fontWeight: 900, color: C.good, margin: "0 0 6px" }}>
                ★ じこベスト こうしん！
              </p>
            ) : (
              <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 6px" }}>
                レベル{level} の じこベスト {best[q.ev][level - 1]} てん
              </p>
            )}
            <p style={{ fontSize: 12, opacity: 0.65, margin: 0 }}>
              おぼえるのに つかった じかん {used}びょう / {q.secs}びょう
            </p>
          </div>

          <div style={CARD}>
            <p style={LABEL}>こたえあわせ</p>
            {q.ev === "face" ? <FaceReview q={q} ans={ans} /> : <SeqReview q={q} ans={ans} />}
          </div>

          <button className="bigbtn" onClick={nextEvent}
            style={{ width: "100%", padding: "17px 8px", fontSize: 19, borderRadius: 18,
                     background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
            {idx + 1 >= list.length
              ? "そうごう せいせきを みる ▶"
              : `つぎは ${evInfo(list[idx + 1]).icon} ${evInfo(list[idx + 1]).name} ▶`}
          </button>
        </div>
      )}

      {/* ===== そうごう せいせき ===== */}
      {phase === "final" && (
        <Final list={list} got={got} best={best} level={level} upAll={upAll}
          onAgain={() => { blip(780, 0.14); setGot([]); setIdx(0); setUpAll(false); setPhase("ready"); }}
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
              ? "いまの たいかいは きえます"
              : "じこベストと せっていが もとに もどります"}
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
                setBest(emptyBest());
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

/* ================= みための もと ================= */

const CARD = {
  background: "#fff", borderRadius: 20, border: `4px solid ${C.gold}`,
  boxShadow: "0 4px 0 #e5c79a", padding: 12, marginBottom: 10,
};
const LABEL = { fontSize: 14, fontWeight: 900, margin: "0 0 8px", opacity: 0.8 };

/* たまに ならぶ 1こぶん。しゅもくで おおきさが ちがう */
const boxOf = (ev) =>
  ev === "num" ? { w: 38, h: 50, f: 27 } : ev === "card" ? { w: 46, h: 46, f: 28 }
    : { w: 40, h: 40, f: 25 };

/* ================= したく ================= */

function Home({ level, setLevel, on, setOn, best, chosen, blip, onStart, onClear }) {
  const toggle = (id) => {
    /* さいごの 1しゅもくは けせない。0しゅもくの たいかいは 成り立たない */
    if (on[id] && chosen.length <= 1) { blip(220, 0.1); return; }
    blip(on[id] ? 480 : 760, 0.1);
    setOn({ ...on, [id]: !on[id] });
  };

  return (
    <div style={{ padding: 10, maxWidth: 460, margin: "0 auto" }}>
      <p style={{ margin: "0 0 10px", textAlign: "center", fontSize: 14, opacity: 0.75 }}>
        きおくの きょうぎたいかい。しゅもくを じゅんに こなして、そうごうてんを だそう！
      </p>

      <div style={CARD}>
        <p style={LABEL}>レベル</p>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${LEVELS.length},1fr)`, gap: 5 }}>
          {range(LEVELS.length).map((i) => {
            const lv = i + 1;
            const sel = lv === level;
            return (
              <button key={lv} className="bigbtn"
                onClick={() => { blip(560 + i * 40, 0.1); setLevel(lv); }}
                aria-label={`レベル ${lv}`}
                style={{ padding: "13px 0", fontSize: 17, borderRadius: 12,
                         background: sel ? C.blue : C.pale, color: sel ? "#fff" : C.ink,
                         boxShadow: `0 4px 0 ${sel ? C.deep : "#d7ddf2"}` }}>
                {lv}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, margin: "8px 0 0", textAlign: "center" }}>
          レベル1＝はじめて　／　レベル5＝おとなでも むずかしい
        </p>
      </div>

      <div style={CARD}>
        <p style={LABEL}>しゅもく（おす と 入れる・はずす）</p>
        {EVENTS.map((e) => {
          const sel = on[e.id];
          const L = specOf(e.id, level);
          const b = best[e.id][level - 1];
          return (
            <button key={e.id} className="bigbtn" onClick={() => toggle(e.id)}
              aria-label={`${e.name} ${sel ? "を はずす" : "を いれる"}`}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                       textAlign: "left", marginBottom: 6, padding: "10px 12px",
                       borderRadius: 16, background: sel ? C.pale : "#f6f8fa",
                       boxShadow: `0 4px 0 ${sel ? "#d7ddf2" : "#e6ecf2"}`,
                       opacity: sel ? 1 : 0.55 }}>
              <span style={{ fontSize: 30, lineHeight: 1 }}>{e.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 900, display: "block" }}>{e.name}</span>
                <span style={{ fontSize: 11.5, opacity: 0.75, display: "block" }}>
                  {e.what(L)}
                  {b > 0 && `　／　じこベスト ${b}てん`}
                </span>
              </span>
              <span style={{ fontSize: 20 }}>{sel ? "✅" : "⬜"}</span>
            </button>
          );
        })}
        <p style={{ fontSize: 12, opacity: 0.7, margin: "6px 0 0", textAlign: "center" }}>
          {chosen.length}しゅもく　／　まんてんは {chosen.length * 100}てん
        </p>
      </div>

      <button className="bigbtn" onClick={onStart}
        style={{ width: "100%", padding: "18px 8px", fontSize: 21, borderRadius: 18,
                 background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
        ▶ たいかい スタート
      </button>

      {/* そうごうきろく。4しゅもく そろえた ときだけ のこる */}
      {best.all.some((v) => v > 0) && (
        <div style={{ ...CARD, marginTop: 14 }}>
          <p style={LABEL}>🏆 そうごう（4しゅもく）の じこベスト</p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${LEVELS.length},1fr)`, gap: 5 }}>
            {best.all.map((v, i) => (
              <div key={i} style={{ textAlign: "center", borderRadius: 12, padding: "6px 2px",
                                    background: i + 1 === level ? C.pale : "#f6f8fa",
                                    border: `2px solid ${i + 1 === level ? C.blue : "#e6ecf2"}` }}>
                <div style={{ fontSize: 10, opacity: 0.7 }}>レベル{i + 1}</div>
                <b style={{ fontSize: 16 }}>{v || "-"}</b>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, opacity: 0.7, margin: "8px 0 0", textAlign: "center" }}>
            4しゅもく ぜんぶ 入れて あそんだ ときの へいきんてん
          </p>
        </div>
      )}

      <div style={{ ...CARD, marginTop: 14, background: "#fffdf6" }}>
        <p style={{ ...LABEL, margin: "0 0 6px" }}>おうちの かたへ</p>
        <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0, opacity: 0.85 }}>
          おとなの きおく きょうぎ（メモリースポーツ）の しゅもくを、
          こども向けに ちいさく した ものです。
          <b>ランダム数字・スピードカード・人名と顔・バイナリ</b> の 4つに あたります。
          てんすうを あげる ことより、しゅもくの まえに 出る
          <b>「コツ」</b>（2つずつ くぎる、おはなしに して つなげる、といった きおくじゅつ）を
          つかって みる ことの ほうが たいせつです。
          さいしょは レベル1〜2 で、こたえあわせを いっしょに 見ながら
          「どう おぼえた？」と きいて あげて ください。
        </p>
      </div>

      {save.available && (
        <button className="bigbtn" onClick={onClear}
          style={{ width: "100%", marginTop: 6, padding: "10px 8px", fontSize: 13,
                   borderRadius: 12, background: "transparent", color: "#8aa6b8" }}>
          きろくを けす
        </button>
      )}
    </div>
  );
}

/* ================= しゅもくの まえおき ================= */

/* ここで かならず コツ（きおくじゅつ）を 1つ 出す。
   この ゲームの ねらいは 点より「おぼえかたを 知る」ことなので、
   とばせない ばしょに おいている */
function Ready({ ev, level, no, of, best, onGo }) {
  const L = specOf(ev.id, level);
  return (
    <div style={{ padding: "22px 14px", textAlign: "center", maxWidth: 460, margin: "0 auto" }}>
      <p style={{ fontSize: 14, opacity: 0.75, margin: "0 0 4px" }}>
        {no} しゅもくめ / {of}　・　レベル {level}
      </p>
      <div style={{ fontSize: 76, lineHeight: 1.2, animation: "bob 2.4s ease-in-out infinite" }}>
        {ev.icon}
      </div>
      <p style={{ fontSize: 23, fontWeight: 900, margin: "6px 0 0" }}>{ev.name}</p>
      <p style={{ fontSize: 12, opacity: 0.6, margin: "2px 0 8px" }}>
        メモリースポーツの「{ev.real}」
      </p>
      <p style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px" }}>{ev.what(L)}</p>
      <p style={{ fontSize: 12.5, opacity: 0.7, margin: "0 0 16px" }}>
        {best > 0 ? `レベル${level} の じこベスト ${best}てん` : "はじめての ちょうせん！"}
      </p>

      <div style={{ ...CARD, textAlign: "left", background: "#fffdf6" }}>
        <p style={{ ...LABEL, margin: "0 0 4px" }}>💡 おぼえかたの コツ</p>
        <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>
          {ev.tip}
        </p>
      </div>

      <button className="bigbtn" onClick={onGo}
        style={{ width: "100%", padding: "20px 8px", fontSize: 21, borderRadius: 18,
                 background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
        👀 スタート
      </button>
    </div>
  );
}

/* ================= おぼえる がめん ================= */

function Bar({ left, full }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
      <span style={{ fontSize: 18 }}>⏱️</span>
      <div style={{ flex: 1, height: 14, borderRadius: 999, background: "#dfe4f5", overflow: "hidden" }}>
        <div style={{ width: `${(left / full) * 100}%`, height: "100%",
                      background: left / full < 0.25 ? C.coral : C.blue,
                      transition: "width .08s linear" }} />
      </div>
      <b style={{ fontSize: 18, minWidth: 24, textAlign: "right" }}>{Math.ceil(left / 1000)}</b>
    </div>
  );
}

/* すうじ・カード・しるし の おだい。かたまりに くぎって 見せる。
   くぎりが そのまま「2つずつ／3つずつ おぼえる」という コツの てほんに なる */
function SeqShow({ q }) {
  const b = boxOf(q.ev);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 16px" }}>
      {chunk(q.seq, q.group).map((g, gi) => (
        <div key={gi} style={{ display: "flex", gap: 4 }}>
          {g.map((s, i) => (
            <span key={i} style={{
              width: b.w, height: b.h, fontSize: b.f, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, lineHeight: 1, boxSizing: "border-box",
              background: "#fff", border: `3px solid ${C.blue}`, color: C.ink,
            }}>
              {s}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* かおと なまえ の おだい。ぜんぶ いちどに 見せる */
function FaceShow({ q }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(88px,1fr))", gap: 8 }}>
      {q.pairs.map((p, i) => (
        <div key={i} style={{ textAlign: "center", borderRadius: 16, padding: "8px 4px",
                              background: C.pale, border: `3px solid ${C.blue}` }}>
          <div style={{ fontSize: 40, lineHeight: 1.1 }}>{p.av}</div>
          <div style={{ fontSize: 19, fontWeight: 900, marginTop: 2 }}>{p.name}</div>
        </div>
      ))}
    </div>
  );
}

/* ================= こたえる がめん ================= */

/* すうじ・カード・しるし の こたえ。
   ますを 左から うめていく。palette の ばんごうで こたえを もつので、
   おなじ 見た目の ものが あっても どれを おしたか わかる */
function SeqRecall({ q, ans, setAns, blip, onDone }) {
  const n = q.seq.length;
  const b = boxOf(q.ev);
  const full = ans.length >= n;

  const put = (pi) => {
    if (full) { blip(220, 0.1); return; }
    blip(620 + ans.length * 25, 0.09);
    setAns([...ans, pi]);
  };
  const back = () => {
    if (!ans.length) return;
    blip(320, 0.1);
    setAns(ans.slice(0, -1));
  };

  const key = (extra = {}) => ({
    height: 52, fontSize: 24, borderRadius: 12, padding: 0,
    background: C.pale, color: C.ink, boxShadow: "0 4px 0 #d7ddf2", ...extra,
  });

  return (
    <>
      <p style={{ margin: "0 0 8px", textAlign: "center", fontSize: 15, fontWeight: 800 }}>
        {evInfo(q.ev).icon} おぼえた じゅんばんに おそう
        <span style={{ fontSize: 13, opacity: 0.7 }}>　{ans.length} / {n}</span>
      </p>

      {/* うめる ます */}
      <div style={{ ...CARD, padding: "14px 10px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 16px" }}>
          {chunk(range(n), q.group).map((g, gi) => (
            <div key={gi} style={{ display: "flex", gap: 4 }}>
              {g.map((i) => {
                const filled = ans[i] != null;
                const now = i === ans.length;
                return (
                  <span key={i} style={{
                    width: b.w, height: b.h, fontSize: b.f, borderRadius: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, lineHeight: 1, boxSizing: "border-box",
                    background: filled ? "#fff" : now ? "#fff6e3" : "#f4f6fa",
                    border: `3px solid ${filled ? C.blue : now ? C.gold : "#e2e8f0"}`,
                    color: C.ink,
                  }}>
                    {filled ? q.palette[ans[i]] : ""}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* おす もの */}
      <div style={{ ...CARD, padding: 10 }}>
        {q.ev === "num" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
            {PAD.map((d) => (
              <button key={d} className="bigbtn" disabled={full} onClick={() => put(d)}
                style={key(full ? { opacity: 0.4, boxShadow: "none" } : {})}>
                {d}
              </button>
            ))}
          </div>
        ) : q.ev === "card" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
            {q.palette.map((c, pi) => {
              /* カードは 1まいずつ。もう おいた カードは おせない */
              const gone = ans.includes(pi);
              return (
                <button key={pi} className="bigbtn" disabled={gone || full}
                  onClick={() => put(pi)} aria-label={gone ? "おいた カード" : "カード"}
                  style={key({ height: 54, fontSize: 27,
                               opacity: gone ? 0.25 : full ? 0.4 : 1,
                               boxShadow: gone || full ? "none" : "0 4px 0 #d7ddf2" })}>
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "grid",
                        gridTemplateColumns: `repeat(${q.palette.length},1fr)`, gap: 6 }}>
            {q.palette.map((m, pi) => (
              <button key={pi} className="bigbtn" disabled={full} onClick={() => put(pi)}
                style={key({ height: 60, fontSize: 30,
                             opacity: full ? 0.4 : 1, boxShadow: full ? "none" : "0 4px 0 #d7ddf2" })}>
                {m}
              </button>
            ))}
          </div>
        )}

        <button className="bigbtn" onClick={back} disabled={!ans.length} aria-label="1つ もどす"
          style={{ width: "100%", marginTop: 6, height: 46, fontSize: 17, borderRadius: 12,
                   background: "#ffe9e2", color: C.ink,
                   boxShadow: ans.length ? "0 4px 0 #f0cabb" : "none",
                   opacity: ans.length ? 1 : 0.4 }}>
          ⌫ 1つ もどす
        </button>
      </div>

      <button className="bigbtn" onClick={onDone}
        style={{ width: "100%", padding: "17px 8px", fontSize: 19, borderRadius: 18,
                 background: full ? C.coral : "#9fb0c4", color: "#fff",
                 boxShadow: `0 6px 0 ${full ? "#c9522a" : "#8496aa"}` }}>
        {full ? "できた！ こたえあわせ" : `これで だす（あと ${n - ans.length}こ）`}
      </button>
    </>
  );
}

/* かおと なまえ の こたえ。1ぴきずつ きく。
   なまえの ボタンは いつも ぜんぶ 出す（つかった なまえを けすと、
   さいごの 1ぴきが かならず あたって しまう）*/
function FaceRecall({ q, ans, setAns, blip, onDone }) {
  const [at, setAt] = useState(0);
  const n = q.pairs.length;
  const av = q.pairs[q.order[at]].av;
  const last = at >= n - 1;

  const choose = (name) => {
    blip(700 + at * 20, 0.1);
    const next = [...ans];
    next[at] = name;
    setAns(next);
    if (!last) setAt(at + 1);
  };
  const back = () => {
    if (at === 0) return;
    blip(320, 0.1);
    setAt(at - 1);
  };

  return (
    <>
      <p style={{ margin: "0 0 8px", textAlign: "center", fontSize: 15, fontWeight: 800 }}>
        🙂 なまえは なんだった？
        <span style={{ fontSize: 13, opacity: 0.7 }}>　{at + 1} / {n}</span>
      </p>

      <div style={{ ...CARD, textAlign: "center", padding: "14px 10px" }}>
        <div style={{ fontSize: 78, lineHeight: 1.1 }}>{av}</div>
        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4,
                      color: ans[at] ? C.ink : "#b9c5d2", minHeight: 28 }}>
          {ans[at] || "？"}
        </div>
      </div>

      <div style={{ ...CARD, padding: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(84px,1fr))", gap: 6 }}>
          {q.choices.map((name) => {
            const sel = ans[at] === name;
            return (
              <button key={name} className="bigbtn" onClick={() => choose(name)}
                style={{ height: 52, fontSize: 19, borderRadius: 12, padding: 0,
                         background: sel ? C.blue : C.pale, color: sel ? "#fff" : C.ink,
                         boxShadow: `0 4px 0 ${sel ? C.deep : "#d7ddf2"}` }}>
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="bigbtn" onClick={back} disabled={at === 0} aria-label="まえに もどる"
          style={{ flex: 1, padding: "16px 8px", fontSize: 17, borderRadius: 18,
                   background: "#fff", color: C.ink,
                   boxShadow: at === 0 ? "none" : "0 6px 0 #d8e3ea",
                   opacity: at === 0 ? 0.4 : 1 }}>
          ◀ もどる
        </button>
        {last ? (
          <button className="bigbtn" onClick={onDone}
            style={{ flex: 2, padding: "16px 8px", fontSize: 19, borderRadius: 18,
                     background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
            できた！ こたえあわせ
          </button>
        ) : (
          <button className="bigbtn" onClick={() => { blip(660, 0.1); setAt(at + 1); }}
            style={{ flex: 2, padding: "16px 8px", fontSize: 19, borderRadius: 18,
                     background: C.gold, color: C.ink, boxShadow: "0 6px 0 #d9a520" }}>
            つぎの こ ▶
          </button>
        )}
      </div>
    </>
  );
}

/* ================= こたえあわせ ================= */

/* 上が せいかい、下が じぶんの こたえ。ちがった ところだけ あかく なる */
function SeqReview({ q, ans }) {
  const b = boxOf(q.ev);
  const cell = (txt, ok) => ({
    width: b.w, height: Math.min(b.h, 42), fontSize: Math.min(b.f, 23), borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, lineHeight: 1, boxSizing: "border-box",
    background: ok === null ? "#fff" : ok ? "#eaf8ef" : "#ffeceb",
    border: `3px solid ${ok === null ? "#dbe2ee" : ok ? "#8fd3a8" : "#f4b3ad"}`,
    color: ok === false ? "#c0392b" : C.ink,
  });

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <Row label="せいかい">
        {q.seq.map((s, i) => <span key={i} style={cell(s, null)}>{s}</span>)}
      </Row>
      <Row label="きみの こたえ">
        {q.seq.map((s, i) => {
          const mine = ans[i] != null ? q.palette[ans[i]] : null;
          return <span key={i} style={cell(mine, mine === s)}>{mine ?? "―"}</span>;
        })}
      </Row>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{children}</div>
    </div>
  );
}

function FaceReview({ q, ans }) {
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {q.order.map((pi, i) => {
        const p = q.pairs[pi];
        const ok = ans[i] === p.name;
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
            borderRadius: 12, background: ok ? "#eaf8ef" : "#ffeceb",
            border: `2px solid ${ok ? "#8fd3a8" : "#f4b3ad"}`,
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{p.av}</span>
            <b style={{ fontSize: 18, flex: 1 }}>{p.name}</b>
            {ok ? (
              <span style={{ fontSize: 20, color: C.good }}>○</span>
            ) : (
              <>
                <span style={{ fontSize: 12.5, color: "#c0392b" }}>
                  きみの こたえ {ans[i] || "―"}
                </span>
                <span style={{ fontSize: 20, color: "#c0392b" }}>✕</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= そうごう せいせき ================= */

function Final({ list, got, best, level, upAll, onAgain, onHome }) {
  const total = got.reduce((s, x) => s + x, 0);
  const avg = got.length ? Math.round(total / got.length) : 0;
  const m = medalOf(avg);
  const fullMeet = list.length === EVENTS.length;

  return (
    <div style={{ padding: 14, maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 74, lineHeight: 1.2, animation: "pop .5s ease-out" }}>{m.e}</div>
      <p style={{ fontSize: 23, fontWeight: 900, margin: "6px 0 2px" }}>{m.t}</p>
      <p style={{ fontSize: 16, margin: "0 0 4px" }}>
        ごうけい <b style={{ fontSize: 26, color: C.coral }}>{total}</b> / {list.length * 100} てん
      </p>
      <p style={{ fontSize: 14, opacity: 0.75, margin: "0 0 14px" }}>
        へいきん {avg} てん　・　レベル {level}
      </p>
      {upAll && (
        <p style={{ fontSize: 16, fontWeight: 900, color: C.good, margin: "-8px 0 14px" }}>
          ★ そうごうの じこベスト こうしん！ 🎉
        </p>
      )}

      <div style={{ ...CARD }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 66px", gap: 6,
                      alignItems: "center" }}>
          <span />
          <span style={{ fontSize: 11, opacity: 0.7 }}>きょうの てん</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>じこベスト</span>

          {list.map((id, i) => {
            const e = evInfo(id);
            const b = best[id][level - 1];
            return (
              <React.Fragment key={id}>
                <span style={{ textAlign: "left", fontSize: 14, fontWeight: 800,
                               overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.icon} {e.name}
                </span>
                <b style={{ fontSize: 18, color: got[i] === 100 ? C.coral : C.ink }}>{got[i]}</b>
                <span style={{ fontSize: 14, color: got[i] >= b ? C.good : "#8aa6b8",
                               fontWeight: got[i] >= b ? 900 : 600 }}>
                  {b}{got[i] >= b && b > 0 ? " ★" : ""}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ ...CARD, background: "#fffdf6", textAlign: "left" }}>
        <p style={{ ...LABEL, margin: "0 0 4px" }}>つぎに ためすこと</p>
        <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0, opacity: 0.85 }}>
          {avg >= 90
            ? "ほとんど まんてん！ レベルを 1つ 上げて、もっと ながい ならびに ちょうせんしよう。"
            : avg >= 60
              ? "いい ちょうし。にがてだった しゅもくだけ もういちど やって、コツを つかって みよう。"
              : "むずかしかったね。レベルを 1つ 下げて、コツの とおりに くぎって おぼえて みよう。"}
          {!fullMeet && "　4しゅもく ぜんぶ 入れると、そうごうの きろくも のこせるよ。"}
        </p>
      </div>

      <button className="bigbtn" onClick={onAgain}
        style={{ width: "100%", padding: "17px 8px", fontSize: 20, borderRadius: 18,
                 background: C.coral, color: "#fff", boxShadow: "0 6px 0 #c9522a" }}>
        🔄 もういちど（おなじ しゅもく）
      </button>
      <button className="bigbtn" onClick={onHome}
        style={{ width: "100%", marginTop: 10, padding: "15px 8px", fontSize: 17,
                 borderRadius: 16, background: "#fff", color: C.ink,
                 boxShadow: "0 5px 0 #d8e3ea" }}>
        レベル・しゅもくを かえる
      </button>
    </div>
  );
}

/* ================= まく ================= */

function Overlay({ children }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0,0,0,.6)", zIndex: 20, padding: 12,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.cream, borderRadius: 24, padding: 20,
                    width: "100%", maxWidth: 340, textAlign: "center",
                    border: `5px solid ${C.gold}`, boxSizing: "border-box",
                    maxHeight: "94vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
