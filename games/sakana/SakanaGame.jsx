import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C as THEME, clamp } from "../../src/shared/theme.js";

/* ================= データ ================= */

const KINDS = [
  { id: "fish",   emoji: "🐟", name: "こざかな",      price: 10,  w: 26, size: 1.0, slow: 1.0 },
  { id: "tropic", emoji: "🐠", name: "きんぎょ",      price: 20,  w: 20, size: 1.0, slow: 1.0 },
  { id: "puffer", emoji: "🐡", name: "ふぐ",          price: 30,  w: 12, size: 1.1, slow: 1.2 },
  { id: "squid",  emoji: "🦑", name: "いか",          price: 40,  w: 8,  size: 1.2, slow: 1.1 },
  { id: "crab",   emoji: "🦀", name: "かに",          price: 50,  w: 7,  size: 1.1, slow: 1.3 },
  { id: "shark",  emoji: "🦈", name: "サメ",          price: 120, w: 7,  size: 1.7, slow: 1.3 },
  { id: "croc",   emoji: "🐊", name: "ワニ",          price: 150, w: 6,  size: 1.7, slow: 1.4 },
  { id: "whale",  emoji: "🐳", name: "くじら",        price: 180, w: 5,  size: 1.9, slow: 1.6 },
  { id: "dino",   emoji: "🦕", name: "くびながりゅう", price: 200, w: 5,  size: 1.9, slow: 1.6 },
  { id: "trex",   emoji: "🦖", name: "きょうりゅう",   price: 250, w: 4,  size: 1.8, slow: 1.5 },
  { id: "swim",   emoji: "🏊", name: "およぐひと",    price: 50,  w: 6,  size: 1.3, slow: 1.0, faceRight: true },
  { id: "dive",   emoji: "🤿", name: "ダイバー",      price: 80,  w: 5,  size: 1.3, slow: 1.2, faceRight: true },
  { id: "surf",   emoji: "🏄", name: "サーファー",    price: 60,  w: 4,  size: 1.3, slow: 0.9, faceRight: true },
  { id: "merm",   emoji: "🧜", name: "にんぎょ",      price: 200, w: 3,  size: 1.4, slow: 1.3, faceRight: true },
  { id: "sushi",  emoji: "🍣", name: "おすし",        price: 100, w: 6,  size: 1.1, slow: 1.0, faceRight: true },
  { id: "sofa",   emoji: "🛋️", name: "ソファー",      price: 300, w: 3,  size: 1.5, slow: 1.7, faceRight: true },
];

/* うみは すすむたびに かわる。ねだんは ぜんぶ ×3 になる */
const SEAS = [
  {
    name: "あさい うみ",
    top: "#63d3f5", mid: "#1b8ed0", bot: "#0a5aa0", sand: "#ffd98a", deco: ["🌿", "🪸"],
    extra: [],
  },
  {
    name: "ふかい うみ",
    top: "#2f9fd0", mid: "#0d5f9e", bot: "#052f5c", sand: "#e9c987", deco: ["🌱", "🐚"],
    extra: [
      { id:"octo",   emoji:"🐙", name:"たこ",         price:60,  w:9, size:1.2, slow:1.2 },
      { id:"turtle", emoji:"🐢", name:"かめ",         price:90,  w:7, size:1.3, slow:1.7 },
      { id:"lob",    emoji:"🦞", name:"ロブスター",   price:140, w:5, size:1.2, slow:1.4 },
    ],
  },
  {
    name: "よるの うみ",
    top: "#3b3f8f", mid: "#1e2461", bot: "#0a0d33", sand: "#8d7fbf", deco: ["🌙", "⭐"],
    extra: [
      { id:"ghost", emoji:"👻", name:"おばけ",   price:220, w:8, size:1.4, slow:1.1, faceRight:true },
      { id:"bat",   emoji:"🦇", name:"こうもり", price:180, w:6, size:1.2, slow:0.9 },
      { id:"drag",  emoji:"🐉", name:"りゅう",   price:400, w:5, size:1.9, slow:1.5, faceRight:true },
    ],
  },
  {
    name: "こおりの うみ",
    top: "#cdf0fb", mid: "#79bfdd", bot: "#2a6f9e", sand: "#eaf6ff", deco: ["❄️", "🧊"],
    extra: [
      { id:"peng", emoji:"🐧",   name:"ペンギン",     price:260, w:9, size:1.3, slow:1.1, faceRight:true },
      { id:"snow", emoji:"⛄",   name:"ゆきだるま",   price:300, w:6, size:1.4, slow:1.7 },
      { id:"bear", emoji:"🐻‍❄️", name:"しろくま",     price:500, w:5, size:1.7, slow:1.5, faceRight:true },
    ],
  },
  {
    name: "うちゅうの うみ",
    top: "#5b3aa0", mid: "#2a1354", bot: "#07001f", sand: "#7a6bb5", deco: ["🪐", "✨"],
    extra: [
      { id:"alien",  emoji:"👽", name:"うちゅうじん", price:600,  w:9, size:1.3, slow:1.1, faceRight:true },
      { id:"rocket", emoji:"🚀", name:"ロケット",     price:800,  w:6, size:1.4, slow:0.8, faceRight:true },
      { id:"ufo",    emoji:"🛸", name:"ゆーふぉー",   price:1000, w:5, size:1.5, slow:1.3, faceRight:true },
    ],
  },
  {
    name: "ぬいぐるみの うみ",
    only: true,
    top: "#ffd8ea", mid: "#ffaed0", bot: "#e06fa6", sand: "#fff0f6", deco: ["🎀", "🧵"],
    extra: [
      { id:"ted",  emoji:"🧸", name:"くまの ぬいぐるみ",     price:20,  w:10, size:1.3, slow:1.2, faceRight:true },
      { id:"rab",  emoji:"🐰", name:"うさぎの ぬいぐるみ",   price:30,  w:9,  size:1.3, slow:1.1, faceRight:true },
      { id:"pan",  emoji:"🐼", name:"ぱんだの ぬいぐるみ",   price:40,  w:7,  size:1.4, slow:1.3, faceRight:true },
      { id:"frog", emoji:"🐸", name:"かえるの ぬいぐるみ",   price:50,  w:6,  size:1.3, slow:1.1, faceRight:true },
      { id:"uni",  emoji:"🦄", name:"ゆにこーんの ぬいぐるみ", price:100, w:4, size:1.6, slow:1.3, faceRight:true },
    ],
  },
  {
    name: "めだまの うみ",
    only: true,
    top: "#c9b6f0", mid: "#7a5bc4", bot: "#33206b", sand: "#b3a0e0", deco: ["🌀", "✨"],
    extra: [
      { id:"eye1", emoji:"👁️", name:"め",         price:30,  w:10, size:1.1, slow:1.0, faceRight:true },
      { id:"eye2", emoji:"👀", name:"めだま",     price:60,  w:8,  size:1.3, slow:1.1, faceRight:true },
      { id:"eye3", emoji:"🧿", name:"まんまるめ", price:120, w:5,  size:1.5, slow:1.2, faceRight:true },
    ],
  },
  {
    name: "はの うみ",
    only: true,
    top: "#e8fbff", mid: "#9fdfe8", bot: "#3f97a8", sand: "#ffffff", deco: ["🪥", "✨"],
    extra: [
      { id:"th1", emoji:"🦷", name:"にゅうし",     price:40,  w:10, size:1.0, slow:1.0, faceRight:true },
      { id:"th2", emoji:"🦷", name:"おとなの は", price:70,  w:8,  size:1.4, slow:1.2, faceRight:true },
      { id:"th3", emoji:"🦷", name:"おやしらず",   price:150, w:5,  size:1.9, slow:1.4, faceRight:true },
    ],
  },
  {
    name: "おふとんの うみ",
    only: true,
    top: "#dcd6f7", mid: "#8d84c8", bot: "#3b3466", sand: "#c9c1ea", deco: ["💤", "🌙"],
    extra: [
      { id:"fu1", emoji:"💤",  name:"すやすや",     price:40,  w:9,  size:1.1, slow:1.0, faceRight:true },
      { id:"fu2", emoji:"🛏️", name:"おふとん",     price:80,  w:8,  size:1.5, slow:1.4, faceRight:true },
      { id:"fu3", emoji:"🛌",  name:"ねてる ひと",  price:180, w:5,  size:1.6, slow:1.5, faceRight:true },
    ],
  },
  {
    name: "ドアの うみ",
    only: true,
    top: "#ffe6c2", mid: "#d9a05b", bot: "#6b4423", sand: "#f0d3a8", deco: ["🔑", "🪟"],
    extra: [
      { id:"dr1", emoji:"🚪", name:"ちいさい ドア", price:50,  w:10, size:1.0, slow:1.0, faceRight:true },
      { id:"dr2", emoji:"🚪", name:"ふつうの ドア", price:90,  w:7,  size:1.5, slow:1.3, faceRight:true },
      { id:"dr3", emoji:"🚪", name:"おおきい ドア", price:200, w:4,  size:2.1, slow:1.6, faceRight:true },
    ],
  },
  {
    name: "クラゲの うみ",
    only: true,
    top: "#d8f3ff", mid: "#7fc6e8", bot: "#2f5f9e", sand: "#bfe6f5", deco: ["🫧", "🌊"],
    extra: [
      { id:"je1", emoji:"🪼", name:"ちいさい クラゲ", price:40,  w:10, size:1.1, slow:1.3, faceRight:true },
      { id:"je2", emoji:"🪼", name:"おおきい クラゲ", price:80,  w:7,  size:1.7, slow:1.6, faceRight:true },
      { id:"je3", emoji:"🪼", name:"でんき クラゲ",   price:180, w:4,  size:2.2, slow:1.2, faceRight:true },
    ],
  },
  {
    name: "おすしの うみ",
    only: true,
    top: "#fff4f0", mid: "#ffb9a8", bot: "#c2523c", sand: "#ffe9de", deco: ["🥢", "🍵"],
    extra: [
      { id:"sus1", emoji:"🍣", name:"たまご",   price:50,  w:10, size:1.0, slow:1.0, faceRight:true },
      { id:"sus2", emoji:"🍣", name:"まぐろ",   price:100, w:7,  size:1.4, slow:1.2, faceRight:true },
      { id:"sus3", emoji:"🍣", name:"おおとろ", price:250, w:4,  size:1.9, slow:1.4, faceRight:true },
    ],
  },
  {
    name: "うんちの うみ",
    only: true,
    top: "#e0b98a", mid: "#a97844", bot: "#5c3b1c", sand: "#8b5e33", deco: ["🧻", "🚽"],
    extra: [
      { id:"po1", emoji:"💩", name:"ちいさい うんち", price:50,  w:10, size:1.0, slow:1.0, faceRight:true },
      { id:"po2", emoji:"💩", name:"ふつうの うんち", price:100, w:7,  size:1.4, slow:1.2, faceRight:true },
      { id:"po3", emoji:"💩", name:"でっかい うんち", price:300, w:4,  size:2.0, slow:1.5, faceRight:true },
    ],
  },
];

const ALL_KINDS = KINDS.concat(...SEAS.map((s) => s.extra));

/* そだてるほど ねだんは ×3、みためは ×1.12 */
const GROW_PRICE = 3;
const GROW_SIZE = 1.12;
const SIZE_CAP = 3.4;

const LABELS = ["ちび", "おおきい", "きょだい", "キング", "でんせつの", "しんわの", "うちゅうの", "むげんの"];
const labelOf = (lv) => LABELS[Math.min(lv, LABELS.length - 1)];

/* えさは かうたびに 10%ずつ たかくなる */
const FEED_RATE = 1.1;
const NEXT_SEA_AT = 20;
const TANK_MAX = 20;

/* セーブデータ検証用の上限。ふつうに遊ぶぶんには絶対に届かない値だが、
   ここを超えると 3^lv が Infinity に落ちて 表示が「∞」で固まるので 蓋をしておく */
const LV_CAP = 400;
const NUM_CAP = 1e300;

const C = THEME;

const kindOf = (id) => ALL_KINDS.find((k) => k.id === id) || ALL_KINDS[0];
const pow3 = (n) => Math.pow(GROW_PRICE, n);

const priceOf = (f) => Math.round(kindOf(f.kind).price * f.mul * pow3(f.lv));
const sizeOf = (lv) => Math.min(Math.pow(GROW_SIZE, lv), SIZE_CAP);

/* ねだんが たかい ものほど はやく およぐ（おおきい ものは すこし ゆっくり） */
const speedOf = (k) => clamp(Math.pow(k.price / 10, 0.22), 1, 2.6) / Math.sqrt(k.slow);

const feedPrice = (depth, bought) =>
  Math.ceil(10 * pow3(depth) * Math.pow(FEED_RATE, bought));
const feedBundle = (depth, bought, n) => {
  let s = 0;
  for (let i = 0; i < n; i++) s += feedPrice(depth, bought + i);
  return s;
};

/* けたを そのまま みせる（1,234,567） */
const comma = (n) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString("ja-JP") : "∞";

/* まん・おく・ちょうで きっちり よむ（123まん4567） */
const jpNum = (n) => {
  if (!Number.isFinite(n)) return "∞";
  let rest = Math.round(n);
  if (rest < 10000) return String(rest);
  let out = "";
  for (const [v, label] of [[1e16, "けい"], [1e12, "ちょう"], [1e8, "おく"], [1e4, "まん"]]) {
    const q = Math.floor(rest / v);
    if (q > 0) { out += `${q}${label}`; rest -= q * v; }
  }
  if (rest > 0) out += String(rest);
  return out;
};

/* ふきだし などの せまい ところ よう */
const yen = (n) => {
  if (!Number.isFinite(n)) return "∞";
  const cut = (v) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
  if (n >= 1e12) return `${cut(n / 1e12)}ちょう`;
  if (n >= 1e8) return `${cut(n / 1e8)}おく`;
  if (n >= 1e4) return `${cut(n / 1e4)}まん`;
  return `${Math.round(n)}`;
};

const moneyText = (v) =>
  v >= 10000 ? `+${comma(v)}えん\n（${jpNum(v)}えん）` : `+${comma(v)}えん`;

const pickFrom = (pool) => {
  const total = pool.reduce((s, k) => s + k.w, 0);
  let r = Math.random() * total;
  for (const k of pool) {
    r -= k.w;
    if (r <= 0) return k;
  }
  return pool[0];
};

const localPos = (e, el) => {
  const w = el.clientWidth || 1;
  const h = el.clientHeight || 1;
  try {
    const ne = e.nativeEvent || e;
    if (e.target === el && typeof ne.offsetX === "number")
      return { x: ne.offsetX, y: ne.offsetY, w, h };
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) * (r.width ? w / r.width : 1);
    const y = (e.clientY - r.top) * (r.height ? h / r.height : 1);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y, w, h };
  } catch (err) { /* むし */ }
  return { x: w / 2, y: h / 2, w, h };
};

const save = createSave("sakanaya:save:v1");

let uid = 1;
const nextId = () => uid++;

/* ================= 本体 ================= */

export default function SakanaGame() {
  const [tab, setTab] = useState("sea");
  const [money, setMoney] = useState(0);
  const [feed, setFeed] = useState(3);
  const [bought, setBought] = useState(0);
  const [depth, setDepth] = useState(0);
  const [tank, setTank] = useState([]);
  const [pellets, setPellets] = useState([]);
  const [sparks, setSparks] = useState([]);
  const [creatures, setCreatures] = useState([]);
  const [nets, setNets] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [sound, setSound] = useState(true);
  const [askReset, setAskReset] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const seaRef = useRef(null);
  const poolRef = useRef(null);
  const blip = useBlip(sound);

  const fishRef = useRef(tank);
  fishRef.current = tank;
  const pelletRef = useRef(pellets);
  pelletRef.current = pellets;

  /* アンマウント後に state を触らないための番人 */
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const sea = SEAS[Math.min(depth, SEAS.length - 1)];
  const mul = pow3(depth);
  const pool = useMemo(() => {
    const cur = SEAS[Math.min(depth, SEAS.length - 1)];
    if (cur.only) return cur.extra;
    return KINDS.concat(...SEAS.slice(1, depth + 1).map((s) => s.extra));
  }, [depth]);
  const nextFeed = feedPrice(depth, bought);
  const canDive = bought >= NEXT_SEA_AT;
  const total = tank.reduce((s, f) => s + priceOf(f), 0);

  /* さいしょに セーブデータを よむ。
     中身は「ユーザーがいじれるデータ」として一切信用せず、全項目を検証する */
  useEffect(() => {
    const d = save.load();
    if (d) {
      setMoney(safeNum(d.money, 0, NUM_CAP, 0));
      setFeed(Math.floor(safeNum(d.feed, 0, 1e9, 0)));
      setBought(Math.floor(safeNum(d.bought, 0, 1e9, 0)));
      setDepth(Math.floor(safeNum(d.depth, 0, SEAS.length - 1, 0)));
      if (typeof d.sound === "boolean") setSound(d.sound);
      if (Array.isArray(d.tank)) {
        setTank(
          d.tank
            .filter((f) => f && ALL_KINDS.some((k) => k.id === f.kind))
            .slice(0, TANK_MAX)
            .map((f) => ({
              id: nextId(),
              kind: f.kind,
              lv: Math.floor(safeNum(f.lv, 0, LV_CAP, 0)),
              mul: safeNum(f.mul, 1, NUM_CAP, 1),
              x: 20 + Math.random() * 60,
              y: 30 + Math.random() * 40,
              vx: Math.random() < 0.5 ? 0.6 : -0.6,
              vy: 0.2,
              face: 1,
            }))
        );
      }
    }
    setLoaded(true);
  }, []);

  /* かわったら じどうで セーブ（さかなの いちは のこさない） */
  const tankSig = useMemo(
    () => tank.map((f) => `${f.kind},${f.lv},${f.mul}`).join("|"),
    [tank]
  );

  useEffect(() => {
    if (!loaded || !save.available) return;
    const t = setTimeout(() => {
      const ok = save.save({
        v: 1, money, feed, bought, depth, sound,
        tank: fishRef.current.map((f) => ({ kind: f.kind, lv: f.lv, mul: f.mul })),
      });
      if (!ok) return; /* ほぞん できなくても あそべる */
      setSaving(true);
      setTimeout(() => { if (aliveRef.current) setSaving(false); }, 600);
    }, 700);
    return () => clearTimeout(t);
  }, [loaded, money, feed, bought, depth, sound, tankSig]);

  const say = useCallback((text, tone = "normal") => {
    const id = nextId();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => {
      if (aliveRef.current) setToasts((t) => t.filter((x) => x.id !== id));
    }, 1800);
  }, []);

  /* ---------- うみ ---------- */
  useEffect(() => {
    if (tab !== "sea") { setCreatures([]); return; }
    const spawn = setInterval(() => {
      setCreatures((cs) => {
        if (cs.length >= 8) return cs;
        const k = pickFrom(pool);
        const dir = Math.random() < 0.5 ? 1 : -1;
        return [...cs, {
          id: nextId(), kind: k.id,
          x: dir === 1 ? -12 : 112,
          y: 16 + Math.random() * 58,
          vx: dir * (0.30 + Math.random() * 0.25) * speedOf(k),
          ph: Math.random() * 6,
          size: (30 + Math.random() * 10) * k.size,
        }];
      });
    }, 900);
    const move = setInterval(() => {
      setCreatures((cs) =>
        cs.map((c) => ({ ...c, x: c.x + c.vx, ph: c.ph + 0.12 }))
          .filter((c) => c.x > -18 && c.x < 118)
      );
    }, 60);
    return () => { clearInterval(spawn); clearInterval(move); };
  }, [tab, pool]);

  const showNet = (x, y) => {
    const id = nextId();
    setNets((n) => [...n.slice(-3), { id, x, y }]);
    setTimeout(() => {
      if (aliveRef.current) setNets((n) => n.filter((v) => v.id !== id));
    }, 600);
  };

  const grab = (e, c) => {
    e.stopPropagation();
    const el = seaRef.current;
    const w = el ? el.clientWidth : 300;
    const h = el ? el.clientHeight : 300;
    showNet((w * c.x) / 100, (h * c.y) / 100);
    if (fishRef.current.length >= TANK_MAX) {
      say("いけすが いっぱい！ おみせで うろう", "warn");
      blip(220, 0.2);
      return;
    }
    setCreatures((cs) => cs.filter((v) => v.id !== c.id));
    setTank((t) => [...t, {
      id: nextId(), kind: c.kind, lv: 0, mul,
      x: 20 + Math.random() * 60, y: 30 + Math.random() * 40,
      vx: Math.random() < 0.5 ? 0.6 : -0.6, vy: 0.2, face: 1,
    }]);
    say(`${kindOf(c.kind).name}を つかまえた！`, "good");
    blip(660);
  };

  const swingNet = (e) => {
    const el = seaRef.current;
    if (!el) return;
    const { x, y } = localPos(e, el);
    showNet(x, y);
    blip(300, 0.07);
  };

  /* ---------- いけす ---------- */
  const step = () => {
    const fish = fishRef.current.map((f) => ({ ...f }));
    const pel = pelletRef.current.map((p) => ({ ...p }));
    if (!fish.length && !pel.length) return;

    const ids = fish.map((f) => f.id);
    pel.forEach((p) => {
      if (!ids.includes(p.target)) {
        const free = fish.find((f) => !pel.some((q) => q !== p && q.target === f.id));
        p.target = free ? free.id : null;
      }
    });

    const eaten = [];
    const grown = [];

    fish.forEach((f) => {
      const t = pel.find((p) => p.target === f.id);
      if (t) {
        const dx = t.x - f.x, dy = t.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 6) {
          eaten.push(t.id);
          f.lv = Math.min(f.lv + 1, LV_CAP);
          grown.push({ id: nextId(), x: f.x, y: f.y, lv: f.lv, kind: f.kind });
          f.vx = (Math.random() - 0.5) * 1.4;
          f.vy = (Math.random() - 0.5) * 0.8;
        } else {
          f.x += (dx / d) * 2.3;
          f.y += (dy / d) * 2.3;
          f.face = dx > 0 ? 1 : -1;
          f.vx = (dx / d) * 0.8;
          f.vy = (dy / d) * 0.5;
        }
      } else {
        f.vx = clamp(f.vx + (Math.random() - 0.5) * 0.28, -1.1, 1.1);
        f.vy = clamp(f.vy + (Math.random() - 0.5) * 0.18, -0.6, 0.6);
        f.x += f.vx;
        f.y += f.vy;
        if (Math.abs(f.vx) > 0.08) f.face = f.vx > 0 ? 1 : -1;
      }
      const sc = sizeOf(f.lv);
      const mx = 4 + sc * 3.5;
      const my = 8 + sc * 5;
      if (f.x < mx) { f.x = mx; f.vx = Math.abs(f.vx); }
      if (f.x > 100 - mx) { f.x = 100 - mx; f.vx = -Math.abs(f.vx); }
      if (f.y < my) { f.y = my; f.vy = Math.abs(f.vy); }
      if (f.y > 100 - my) { f.y = 100 - my; f.vy = -Math.abs(f.vy); }
    });

    setTank(fish);
    setPellets(
      pel.filter((p) => !eaten.includes(p.id)).map((p) => ({ ...p, y: Math.min(p.y + 1.1, 82) }))
    );

    if (grown.length) {
      setSparks((s) => [...s, ...grown]);
      const gids = grown.map((g) => g.id);
      setTimeout(() => {
        if (aliveRef.current) setSparks((s) => s.filter((x) => !gids.includes(x.id)));
      }, 800);
      const g = grown[0];
      const newTier = g.lv < LABELS.length;
      say(
        newTier ? `${labelOf(g.lv)}${kindOf(g.kind).name}に なった！` : "ねだんが ×3！",
        "good"
      );
      blip(760 + Math.min(g.lv, 8) * 60, 0.2);
    }
  };

  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (tab !== "tank") { setPellets([]); return; }
    const iv = setInterval(() => stepRef.current(), 60);
    return () => clearInterval(iv);
  }, [tab]);

  const dropFeed = (xPercent) => {
    if (!tank.length) { say("いけすが からっぽだよ", "warn"); return; }
    if (feed <= 0) { say("えさが ないよ。おみせで かおう", "warn"); blip(220, 0.2); return; }
    const eligible = tank.filter((f) => !pellets.some((p) => p.target === f.id));
    if (!eligible.length) { say("みんな ごはん ちゅう！", "warn"); return; }
    const x = clamp(Number.isFinite(xPercent) ? xPercent : 50, 8, 92);
    let best = eligible[0], bd = Infinity;
    eligible.forEach((f) => {
      const d = Math.hypot(f.x - x, f.y - 4);
      if (d < bd) { bd = d; best = f; }
    });
    setFeed((v) => v - 1);
    setPellets((p) => [...p, { id: nextId(), x, y: 4, target: best.id }]);
    blip(520, 0.1);
  };

  const throwFeed = (e) => {
    const el = poolRef.current;
    if (!el) return dropFeed(50);
    const { x, w } = localPos(e, el);
    dropFeed((x / w) * 100);
  };

  const sell = (f) => {
    const p = priceOf(f);
    setMoney((m) => Math.min(m + p, NUM_CAP));
    setTank((t) => t.filter((x) => x.id !== f.id));
    say(moneyText(p), "money");
    blip(520, 0.2);
  };

  const sellAll = () => {
    if (!tank.length) return;
    const sum = total;
    setMoney((m) => Math.min(m + sum, NUM_CAP));
    setTank([]);
    say(moneyText(sum), "money");
    blip(600, 0.28);
  };

  const buyFeed = (n) => {
    const cost = feedBundle(depth, bought, n);
    if (money < cost) { say("おかねが たりないよ", "warn"); blip(220, 0.2); return; }
    setMoney((m) => m - cost);
    setFeed((v) => v + n);
    setBought((b) => b + n);
    say(`えさを ${n}こ かった\n${comma(cost)}えん` + (cost >= 10000 ? `（${jpNum(cost)}）` : ""), "good");
    blip(440, 0.15);
  };

  const resetAll = () => {
    save.clear();
    setMoney(0);
    setFeed(3);
    setBought(0);
    setDepth(0);
    setTank([]);
    setPellets([]);
    setCreatures([]);
    setSparks([]);
    setAskReset(false);
    setTab("sea");
    say("はじめから！ いってらっしゃい", "good");
    blip(520, 0.3);
  };

  const diveNext = () => {
    if (!canDive) return;
    const sum = total;
    setMoney((m) => Math.min(m + sum, NUM_CAP));
    setTank([]);
    setPellets([]);
    setBought(0);
    setDepth((d) => Math.min(d + 1, SEAS.length - 1));
    setTab("sea");
    const ni = Math.min(depth + 1, SEAS.length - 1);
    const nx = SEAS[ni];
    say(
      ni === SEAS.length - 1
        ? `さいごの うみ！\n${nx.name}へ ようこそ`
        : `${nx.name}へ！ ねだんが ぜんぶ ×3`,
      "money"
    );
    blip(980, 0.35);
  };

  if (!loaded) {
    return (
      <div style={{ fontFamily:FONT, background:"#e8f7ff", minHeight:"100%", color:C.ink,
                    display:"flex", flexDirection:"column", alignItems:"center",
                    justifyContent:"center", gap:10, padding:40 }}>
        <div style={{ fontSize:52, animation:"none" }}>🐟</div>
        <div style={{ fontSize:17, fontWeight:900 }}>よみこみちゅう…</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:FONT, background:"#e8f7ff", minHeight:"100%", color:C.ink,
                  userSelect:"none", WebkitUserSelect:"none", WebkitTouchCallout:"none",
                  WebkitTapHighlightColor:"transparent" }}>
      <style>{`
        @keyframes bob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-8px) } }
        @keyframes rise { from { bottom:-10%; opacity:.7 } to { bottom:105%; opacity:0 } }
        @keyframes netHit {
          0% { transform: translate(-50%,-140%) scale(.4) rotate(-25deg); opacity:0 }
          35% { transform: translate(-50%,-50%) scale(1.25) rotate(5deg); opacity:1 }
          100% { transform: translate(-50%,-50%) scale(.9) rotate(0); opacity:0 }
        }
        @keyframes sparkle {
          0%{ transform:translate(-50%,-50%) scale(.4); opacity:0 }
          40%{ transform:translate(-50%,-50%) scale(1.5); opacity:1 }
          100%{ transform:translate(-50%,-90%) scale(1.1); opacity:0 }
        }
        @keyframes toastIn {
          0%{ transform:translateY(14px) scale(.8); opacity:0 }
          20%{ transform:translateY(0) scale(1); opacity:1 }
          80%{ opacity:1 } 100%{ opacity:0 }
        }
        @keyframes sway { 0%,100%{ transform:rotate(-6deg) } 50%{ transform:rotate(6deg) } }
        @keyframes shine { 0%,100%{ filter:brightness(1) } 50%{ filter:brightness(1.25) } }
        .bigbtn { border:none; cursor:pointer; font-family:inherit; font-weight:800;
                  -webkit-tap-highlight-color:transparent; }
        .bigbtn:active { transform: translateY(3px); }
        .grabbable:active { filter: brightness(1.35); }
        .homelink { text-decoration:none; }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important } }
      `}</style>

      {/* ヘッダー */}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 12px",
                    background:C.cream, borderBottom:`4px solid ${C.gold}`, flexWrap:"wrap" }}>
        <a className="homelink" href="../../" aria-label="ゲームをえらぶ"
           style={{ fontSize:20, padding:"2px 4px" }}>🏠</a>
        <div style={pill}><span style={{fontSize:20}}>🪙</span>
          <Money n={money} size={20} /><span style={{fontSize:13}}>えん</span></div>
        <div style={pill}><span style={{fontSize:20}}>🍚</span>
          <b style={{fontSize:20}}>{feed}</b><span style={{fontSize:13}}>こ</span></div>
        <div style={{ ...pill, background:"#dff1ff" }}>
          <span style={{fontSize:16}}>🌊</span>
          <b style={{fontSize:14}}>{sea.name}</b>
          <span style={{fontSize:13}}>×{comma(mul)}</span>
        </div>
        <span style={{ marginLeft:"auto", fontSize:16, opacity: saving ? 1 : 0.15,
                       transition:"opacity .3s" }} title="セーブちゅう">💾</span>
        <button className="bigbtn" onClick={() => setSound((s) => !s)} aria-label="おと"
          style={{ background:"transparent", fontSize:22, padding:4 }}>
          {sound ? "🔊" : "🔇"}
        </button>
      </div>

      {/* タブ */}
      <div style={{ display:"flex", gap:6, padding:8, background:C.cream }}>
        {[["sea","🥅 うみ"],["tank","🍚 いけす"],["shop","🏪 おみせ"]].map(([key,label]) => (
          <button key={key} className="bigbtn" onClick={() => setTab(key)}
            style={{ flex:1, padding:"12px 4px", fontSize:17, borderRadius:16,
                     background: tab===key ? C.coral : "#ffe9c9",
                     color: tab===key ? "#fff" : C.ink,
                     boxShadow: tab===key ? "0 4px 0 #c9522a" : "0 4px 0 #e5c79a" }}>
            {label}{key==="tank" && tank.length>0 ? ` (${tank.length})` : ""}
          </button>
        ))}
      </div>

      {/* ===== うみ ===== */}
      {tab === "sea" && (
        <div style={{ padding:8 }}>
          <p style={hint}>ひかってる ものは たかい！ でも はやいよ</p>
          <div ref={seaRef} onClick={swingNet}
            style={{ position:"relative", height:"58vh", minHeight:320, borderRadius:22,
                     overflow:"hidden", border:`5px solid ${C.gold}`, cursor:"pointer",
                     background:`linear-gradient(180deg, ${sea.top} 0%, ${sea.mid} 55%, ${sea.bot} 100%)` }}>
            {[12,34,58,77,90].map((l,i) => (
              <div key={i} style={{ position:"absolute", left:`${l}%`, width:10+(i%3)*5,
                height:10+(i%3)*5, borderRadius:"50%", background:"rgba(255,255,255,.35)",
                pointerEvents:"none", animation:`rise ${6+i}s linear ${i}s infinite` }} />
            ))}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:46,
                          pointerEvents:"none", background:sea.sand,
                          borderRadius:"50% 50% 0 0 / 30px 30px 0 0" }} />
            <div style={{ position:"absolute", bottom:6, left:14, fontSize:30, pointerEvents:"none" }}>{sea.deco[0]}</div>
            <div style={{ position:"absolute", bottom:4, right:20, fontSize:26, pointerEvents:"none" }}>{sea.deco[1]}</div>

            {creatures.map((c) => {
              const k = kindOf(c.kind);
              const right = c.vx > 0;
              const flip = k.faceRight ? (right ? 1 : -1) : right ? -1 : 1;
              const hit = Math.max(58, c.size * 1.5);
              return (
                <div key={c.id} className="grabbable" onClick={(e) => grab(e, c)}
                  style={{ position:"absolute", left:`${c.x}%`, top:`${c.y + Math.sin(c.ph)*2}%`,
                           width:hit, height:hit, marginLeft:-hit/2, marginTop:-hit/2,
                           display:"flex", alignItems:"center", justifyContent:"center",
                           cursor:"pointer" }}>
                  <span style={{ fontSize:c.size, lineHeight:1, pointerEvents:"none",
                                 transform:`scaleX(${flip})`,
                                 filter: k.price >= 100
                                   ? "drop-shadow(0 0 7px rgba(255,201,60,.95)) drop-shadow(0 3px 4px rgba(0,0,0,.3))"
                                   : "drop-shadow(0 3px 4px rgba(0,0,0,.25))" }}>
                    {k.emoji}
                  </span>
                </div>
              );
            })}

            {nets.map((n) => (
              <div key={n.id} style={{ position:"absolute", left:n.x, top:n.y, fontSize:84,
                pointerEvents:"none", animation:"netHit .6s ease-out forwards" }}>🥅</div>
            ))}
            <ToastRow toasts={toasts} bottom={56} />
          </div>
          <p style={{ ...hint, marginTop:8 }}>いけす {tank.length} / {TANK_MAX}</p>
        </div>
      )}

      {/* ===== いけす ===== */}
      {tab === "tank" && (
        <div style={{ padding:8 }}>
          <p style={hint}>えさを 1かい たべると ねだんが ×3！</p>
          <div ref={poolRef} onClick={throwFeed}
            style={{ position:"relative", height:"56vh", minHeight:310, borderRadius:18,
                     overflow:"hidden", cursor:"pointer",
                     border:"6px solid #9fd8ee", boxShadow:"inset 0 0 30px rgba(255,255,255,.5)",
                     background:"linear-gradient(180deg,#bfefff 0%,#7fd8f2 45%,#3fb2dd 100%)" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:14,
                          background:"rgba(255,255,255,.55)", pointerEvents:"none" }} />
            {[20,45,70,88].map((l,i) => (
              <div key={i} style={{ position:"absolute", left:`${l}%`, width:8+(i%3)*4,
                height:8+(i%3)*4, borderRadius:"50%", background:"rgba(255,255,255,.5)",
                pointerEvents:"none", animation:`rise ${5+i}s linear ${i*1.3}s infinite` }} />
            ))}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:36,
                          background:"#ffd98a", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:22, left:16, fontSize:34, pointerEvents:"none",
                          transformOrigin:"bottom center", animation:"sway 4s ease-in-out infinite" }}>🌿</div>
            <div style={{ position:"absolute", bottom:20, right:18, fontSize:30, pointerEvents:"none",
                          transformOrigin:"bottom center", animation:"sway 5s ease-in-out infinite" }}>🌱</div>

            {pellets.map((p) => (
              <div key={p.id} style={{ position:"absolute", left:`${p.x}%`, top:`${p.y}%`,
                width:12, height:12, marginLeft:-6, marginTop:-6, borderRadius:"50%",
                pointerEvents:"none",
                background:"radial-gradient(circle at 30% 30%, #f0b26b, #a3602a)",
                boxShadow:"0 1px 2px rgba(0,0,0,.3)" }} />
            ))}

            {tank.map((f) => {
              const k = kindOf(f.kind);
              const sc = sizeOf(f.lv);
              const flip = k.faceRight ? (f.face === 1 ? 1 : -1) : f.face === 1 ? -1 : 1;
              return (
                <span key={f.id} style={{ position:"absolute", left:`${f.x}%`, top:`${f.y}%`,
                  fontSize: 34 * sc * (k.size > 1.5 ? 1.15 : 1), lineHeight:1, pointerEvents:"none",
                  transform:`translate(-50%,-50%) scaleX(${flip})`,
                  animation: f.lv >= 8 ? "shine 1.6s ease-in-out infinite" : "none",
                  filter:"drop-shadow(0 3px 4px rgba(0,0,0,.2))" }}>
                  {k.emoji}
                </span>
              );
            })}

            {sparks.map((s) => (
              <div key={s.id} style={{ position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
                fontSize:32, fontWeight:900, color:"#fff", pointerEvents:"none",
                textShadow:"0 2px 6px rgba(0,0,0,.35)",
                animation:"sparkle .8s ease-out forwards" }}>×3</div>
            ))}

            {!tank.length && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
                            alignItems:"center", justifyContent:"center", gap:6, color:"#1b6a92",
                            pointerEvents:"none" }}>
                <div style={{ fontSize:44 }}>🥅</div>
                <div style={{ fontWeight:900, fontSize:17 }}>水そうは からっぽ</div>
                <div style={{ fontSize:14 }}>「うみ」で つかまえてこよう</div>
              </div>
            )}
            <ToastRow toasts={toasts} bottom={44} />
          </div>

          <button className="bigbtn" onClick={() => dropFeed(20 + Math.random() * 60)}
            style={{ width:"100%", marginTop:8, padding:"14px 4px", fontSize:18, borderRadius:16,
                     background:"#4fc36a", color:"#fff", boxShadow:"0 4px 0 #2f8c46" }}>
            🍚 えさを なげる（のこり {feed}こ）
          </button>
          <div style={{ ...hint, marginTop:8, display:"flex", alignItems:"center",
                        justifyContent:"center", gap:5, flexWrap:"wrap" }}>
            <span>いけす {tank.length}/{TANK_MAX} ・ ぜんぶで</span>
            <Money n={total} size={16} color="#2c6b96" />
            <span>えん</span>
          </div>
        </div>
      )}

      {/* ===== おみせ ===== */}
      {tab === "shop" && (
        <div style={{ padding:12 }}>
          <div style={shopHead}>
            <div style={{ fontSize:46, animation:"bob 2.5s ease-in-out infinite" }}>🐊</div>
            <div style={bubble}>
              いらっしゃい！<br />
              えさは かうたびに すこし たかく なるよ
            </div>
          </div>

          {/* えさ */}
          <div style={{ ...card, padding:14, marginBottom:14, textAlign:"left" }}>
            <div style={{ fontSize:17, fontWeight:900, marginBottom:6 }}>🍚 えさをかう</div>
            <div style={{ fontSize:14, color:"#5b7f9c", marginBottom:10 }}>
              つぎの 1こ： <Money n={nextFeed} size={17} />
              <span style={{ marginLeft:4 }}>えん　（かった かず {bought}こ）</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {[1, 5, 10].map((n) => {
                const cost = feedBundle(depth, bought, n);
                const ok = money >= cost;
                return (
                  <button key={n} className="bigbtn" onClick={() => buyFeed(n)}
                    style={{ ...actionBtn, flex:1, lineHeight:1.3,
                             background: ok ? C.gold : "#e4e9ee",
                             color: ok ? C.ink : "#9aabb8",
                             boxShadow: ok ? "0 3px 0 #c99a10" : "0 3px 0 #c9d2d9" }}>
                    {n}こ<br /><span style={{ fontSize:12 }}>{yen(cost)}えん</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* つぎの うみ */}
          <div style={{ ...card, padding:14, marginBottom:14, textAlign:"left",
                        border: canDive ? "3px solid #4fc36a" : "3px solid transparent" }}>
            <div style={{ fontSize:17, fontWeight:900, marginBottom:6 }}>🌊 つぎの うみへ</div>
            <div style={{ fontSize:13, color:"#5b7f9c", marginBottom:10, lineHeight:1.5 }}>
              いけすの ものを ぜんぶ うって、あたらしい うみへ。<br />
              ねだんが ぜんぶ <b>×3</b>、えさの ねだんも リセット！
            </div>
            <button className="bigbtn" onClick={diveNext} disabled={!canDive}
              style={{ ...actionBtn, padding:"14px 4px", fontSize:17,
                       background: canDive ? "#4fc36a" : "#e4e9ee",
                       color: canDive ? "#fff" : "#9aabb8",
                       boxShadow: canDive ? "0 4px 0 #2f8c46" : "0 4px 0 #c9d2d9",
                       cursor: canDive ? "pointer" : "default" }}>
              {canDive
                ? `${SEAS[Math.min(depth + 1, SEAS.length - 1)].name}へ すすむ！`
                : `えさを あと ${NEXT_SEA_AT - bought}こ かうと いけるよ`}
            </button>
          </div>

          {/* うる */}
          <div style={{ display:"flex", alignItems:"center", gap:8, margin:"4px 0 8px" }}>
            <div style={{ fontSize:17, fontWeight:900 }}>
              🐟 うる
              <span style={{ fontSize:13, color:"#5b7f9c", marginLeft:6 }}>ぜんぶで</span>
              <span style={{ marginLeft:4 }}><Money n={total} size={15} color="#5b7f9c" /></span>
              <span style={{ fontSize:13, color:"#5b7f9c" }}>えん</span>
            </div>
            {tank.length > 0 && (
              <button className="bigbtn" onClick={sellAll}
                style={{ marginLeft:"auto", padding:"8px 14px", fontSize:14, borderRadius:14,
                         background:"#4fc36a", color:"#fff", boxShadow:"0 3px 0 #2f8c46" }}>
                ぜんぶ うる
              </button>
            )}
          </div>

          {tank.length === 0 ? (
            <div style={{ background:"#fff", border:"3px dashed #bcd9ea", borderRadius:20,
                          padding:"26px 14px", textAlign:"center" }}>
              <div style={{ fontSize:40 }}>🥅</div>
              <div style={{ fontWeight:900, fontSize:17, marginTop:6 }}>うるものが ない</div>
              <div style={{ fontSize:14, color:"#5b7f9c", marginTop:4 }}>「うみ」で つかまえてこよう</div>
            </div>
          ) : (
            <div style={grid}>
              {tank.map((f) => {
                const k = kindOf(f.kind);
                return (
                  <div key={f.id} style={card}>
                    <div style={{ fontSize: Math.min(34 * sizeOf(f.lv), 58), height:66, lineHeight:"66px" }}>
                      {k.emoji}
                    </div>
                    <div style={{ fontSize:14, fontWeight:800 }}>{labelOf(f.lv)}{k.name}</div>
                    <div style={{ fontSize:12, color:"#8aa6b8" }}>えさ {f.lv}かい</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                                  gap:3, margin:"2px 0 6px" }}>
                      <span style={{ fontSize:13 }}>🪙</span>
                      <Money n={priceOf(f)} size={15} color="#2c6b96" />
                      <span style={{ fontSize:12, color:"#2c6b96", fontWeight:900 }}>えん</span>
                    </div>
                    <button className="bigbtn" onClick={() => sell(f)}
                      style={{ ...actionBtn, background:C.coral, boxShadow:"0 3px 0 #c9522a" }}>
                      うる
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {/* はじめから */}
          <div style={{ marginTop:20, marginBottom:8, textAlign:"center" }}>
            {!askReset ? (
              <>
                <button className="bigbtn" onClick={() => setAskReset(true)}
                  style={{ background:"transparent", color:"#8aa6b8", fontSize:13,
                           padding:"10px 14px", borderRadius:12 }}>
                  🔄 はじめから やりなおす
                </button>
                <div style={{ fontSize:12, color:"#a9bccb", marginTop:2 }}>
                  {save.available
                    ? "💾 じどうで セーブされます"
                    : "⚠️ この ブラウザでは セーブできません"}
                </div>
              </>
            ) : (
              <div style={{ ...card, padding:14 }}>
                <div style={{ fontSize:15, fontWeight:900, marginBottom:4 }}>
                  ほんとうに はじめから？
                </div>
                <div style={{ fontSize:13, color:"#8aa6b8", marginBottom:10 }}>
                  おかねも いけすも うみも ぜんぶ 0に もどるよ。<br />
                  セーブデータも きえます
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="bigbtn" onClick={resetAll}
                    style={{ ...actionBtn, flex:1, background:C.coral, boxShadow:"0 3px 0 #c9522a" }}>
                    はい
                  </button>
                  <button className="bigbtn" onClick={() => setAskReset(false)}
                    style={{ ...actionBtn, flex:1, background:"#dfe9f0", color:C.ink,
                             boxShadow:"0 3px 0 #bdcbd6" }}>
                    やめる
                  </button>
                </div>
              </div>
            )}
          </div>

          <FloatToasts toasts={toasts} />
        </div>
      )}
    </div>
  );
}

/* ================= ぶひん ================= */

/* けたと よみかたを どうじに みせる */
function Money({ n, size = 20, color = "#123a5c" }) {
  return (
    <span style={{ display:"inline-flex", flexDirection:"column", alignItems:"flex-start",
                   lineHeight:1.15, verticalAlign:"middle" }}>
      <b style={{ fontSize:size, color }}>{comma(n)}</b>
      {n >= 10000 && (
        <span style={{ fontSize:Math.max(10, size * 0.6), color:"#7f9cb0", fontWeight:800 }}>
          {jpNum(n)}
        </span>
      )}
    </span>
  );
}

function ToastRow({ toasts, bottom }) {
  return (
    <div style={{ position:"absolute", left:0, right:0, bottom, display:"flex",
                  flexDirection:"column", alignItems:"center", gap:6, pointerEvents:"none" }}>
      {toasts.map((t) => <div key={t.id} style={toastStyle(t.tone)}>{t.text}</div>)}
    </div>
  );
}

function FloatToasts({ toasts }) {
  return (
    <div style={{ position:"fixed", left:0, right:0, bottom:18, display:"flex",
                  flexDirection:"column", alignItems:"center", gap:6, pointerEvents:"none" }}>
      {toasts.map((t) => <div key={t.id} style={toastStyle(t.tone)}>{t.text}</div>)}
    </div>
  );
}

const toastStyle = (tone) => ({
  background: tone === "money" ? "#ffc93c" : tone === "warn" ? "#ff9f68" : "rgba(255,255,255,.95)",
  color: "#123a5c", fontWeight: 900, fontSize: 16, padding: "8px 16px", borderRadius: 20,
  whiteSpace: "pre-line", textAlign: "center", lineHeight: 1.3,
  boxShadow: "0 4px 10px rgba(0,0,0,.2)", animation: "toastIn 1.8s ease-out forwards",
});

const pill = {
  display: "flex", alignItems: "center", gap: 4, background: "#fff",
  borderRadius: 999, padding: "4px 12px", boxShadow: "0 2px 0 #e5c79a",
};

const shopHead = { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 };

const bubble = {
  flex: 1, background: "#fff", borderRadius: 18, padding: "10px 14px",
  fontSize: 15, fontWeight: 800, lineHeight: 1.5, color: "#123a5c",
  boxShadow: "0 4px 0 #d8e9f3",
};

const hint = {
  margin: "0 0 8px", fontSize: 15, fontWeight: 800, textAlign: "center", color: "#2c6b96",
};

const grid = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10,
};

const card = {
  background: "#fff", borderRadius: 18, padding: "10px 8px",
  textAlign: "center", boxShadow: "0 4px 0 #d8e9f3",
};

const actionBtn = {
  width: "100%", padding: "10px 4px", fontSize: 15, borderRadius: 14, color: "#fff",
};
