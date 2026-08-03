import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C as THEME } from "../../src/shared/theme.js";

/* ================= データ ================= */

/* ながれてくる ざいりょう。
   short は「じぶんの りょうり」の なまえを つくるときに つかう みじかい よびかた */
const ING = [
  { id: "fish",    emoji: "🐟", name: "さかな",       short: "さかな" },
  { id: "shrimp",  emoji: "🦐", name: "えび",         short: "えび" },
  { id: "crab",    emoji: "🦀", name: "かに",         short: "かに" },
  { id: "egg",     emoji: "🥚", name: "たまご",       short: "たまご" },
  { id: "rice",    emoji: "🍚", name: "ごはん",       short: "ごはん" },
  { id: "wheat",   emoji: "🌾", name: "こむぎ",       short: "こむぎ" },
  { id: "carrot",  emoji: "🥕", name: "にんじん",     short: "にんじん" },
  { id: "potato",  emoji: "🥔", name: "じゃがいも",   short: "いも" },
  { id: "tomato",  emoji: "🍅", name: "トマト",       short: "トマト" },
  { id: "corn",    emoji: "🌽", name: "とうもろこし", short: "コーン" },
  { id: "mush",    emoji: "🍄", name: "きのこ",       short: "きのこ" },
  { id: "cabbage", emoji: "🥬", name: "やさい",       short: "やさい" },
  { id: "cheese",  emoji: "🧀", name: "チーズ",       short: "チーズ" },
  { id: "meat",    emoji: "🥩", name: "おにく",       short: "にく" },
];
const ING_MAP = Object.fromEntries(ING.map((i) => [i.id, i]));
const ingOf = (id) => ING_MAP[id] || ING[0];

/* レシピ。need の ざいりょうが そろうと つくれる。
   steps は りょうりの てじゅん。cut=きる / mix=まぜる / heat=ひにかける */
const RECIPES = [
  { id: "medama",  emoji: "🍳", name: "めだまやき", need: ["egg"],
    steps: [{ t: "heat", label: "やく" }] },
  { id: "onigiri", emoji: "🍙", name: "おにぎり", need: ["rice", "cabbage"],
    steps: [{ t: "mix", label: "にぎる" }] },
  { id: "ebifry",  emoji: "🍤", name: "えびフライ", need: ["shrimp", "wheat"],
    steps: [{ t: "cut", label: "きる" }, { t: "heat", label: "あげる" }] },
  { id: "sushi",   emoji: "🍣", name: "おすし", need: ["rice", "fish", "shrimp"],
    steps: [{ t: "cut", label: "きる" }, { t: "mix", label: "にぎる" }] },
  { id: "curry",   emoji: "🍛", name: "カレー", need: ["carrot", "potato", "meat"],
    steps: [{ t: "cut", label: "きる" }, { t: "mix", label: "まぜる" }, { t: "heat", label: "にこむ" }] },
  { id: "pizza",   emoji: "🍕", name: "ピザ", need: ["wheat", "cheese", "tomato"],
    steps: [{ t: "mix", label: "こねる" }, { t: "heat", label: "やく" }] },
  { id: "nabe",    emoji: "🍲", name: "おなべ", need: ["crab", "mush", "cabbage"],
    steps: [{ t: "cut", label: "きる" }, { t: "heat", label: "にる" }] },
  { id: "ramen",   emoji: "🍜", name: "ラーメン", need: ["wheat", "egg", "corn"],
    steps: [{ t: "mix", label: "こねる" }, { t: "heat", label: "ゆでる" }] },
];
const RECIPE_MAP = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
const recipeOf = (id) => RECIPE_MAP[id] || RECIPES[0];

const STEP_ICON = { cut: "🔪", mix: "🥄", heat: "🔥" };

/* さいしょから もっている レシピ。なにも できないと つまらないので 1つだけ */
const FIRST_RECIPE = "medama";

/* ================= じぶんの りょうり ================= */

/* すきな ざいりょうを 2〜3こ えらぶと、あたらしい りょうりが うまれる。

   だいじなのは「おなじ くみあわせなら いつも おなじ りょうりに なる」こと。
   でたらめに きめてしまうと、まぐれで 1かい でただけの りょうりに なって
   「にんじんと チーズで つくれるよ」と ともだちに おしえられない。
   ざいりょうの id から けいさんで きめれば、だれが いつ つくっても おなじに なる。 */

const FREE_MIN = 2;
const FREE_MAX = 3;

const hashOf = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const ORIG_STEPS = [
  [{ t: "cut", label: "きる" }, { t: "heat", label: "やく" }],
  [{ t: "mix", label: "まぜる" }, { t: "heat", label: "にる" }],
  [{ t: "cut", label: "きる" }, { t: "mix", label: "あえる" }],
  [{ t: "heat", label: "やく" }],
  [{ t: "cut", label: "きる" }, { t: "mix", label: "まぜる" }, { t: "heat", label: "にこむ" }],
  [{ t: "mix", label: "こねる" }],
];

/* さいごの てじゅんで なまえの おしりが かわる */
const ORIG_SUFFIX = {
  cut: ["サラダ", "もりあわせ", "あえもの"],
  mix: ["あえ", "まぜまぜ", "ボール"],
  heat: ["やき", "いため", "スープ", "シチュー", "グラタン"],
};

/* にくの プリンでも いい。へんな くみあわせほど おもしろい */
const ORIG_EMOJI = ["🍲","🥘","🍛","🥗","🍱","🥙","🌮","🧆","🥧","🍮","🥞","🍝","🥪","🍢","🍥","🫕","🍜","🧁"];

function makeOriginal(ids) {
  /* なまえは とった じゅんばんではなく id じゅん。
     「にんじん＋チーズ」と「チーズ＋にんじん」を おなじ りょうりに するため */
  const sorted = [...ids].sort();
  const key = sorted.join("+");
  const h = hashOf(key);
  const steps = ORIG_STEPS[h % ORIG_STEPS.length];
  const last = steps[steps.length - 1].t;
  const suffix = ORIG_SUFFIX[last][(h >> 3) % ORIG_SUFFIX[last].length];
  return {
    key,
    isOrig: true,
    need: sorted,
    steps,
    name: sorted.map((id) => ingOf(id).short).join("") + suffix,
    emoji: ORIG_EMOJI[(h >> 7) % ORIG_EMOJI.length],
  };
}

/* まいかい つくりなおさないよう おぼえておく */
const origCache = new Map();
const originalOf = (key) => {
  if (!origCache.has(key)) {
    const ids = String(key).split("+").filter((id) => ING_MAP[id]);
    origCache.set(key, makeOriginal(ids.length ? ids : ["rice"]));
  }
  return origCache.get(key);
};
/* セーブから よんだ キーが ほんとうに つかえるか */
const validOrigKey = (key) => {
  if (typeof key !== "string") return false;
  const ids = key.split("+");
  return ids.length >= FREE_MIN && ids.length <= FREE_MAX
    && ids.every((id) => ING_MAP[id])
    && [...ids].sort().join("+") === key;
};

/* ================= おきゃくさん ================= */

/* だれかの ために つくる、が この ゲームの まんなか。
   まってくれる だけで、おこったり かえったり しない。しっぱいは つくらない */
const GUESTS = [
  { emoji: "🐻", name: "くまさん" },
  { emoji: "🐰", name: "うさぎさん" },
  { emoji: "🐼", name: "ぱんださん" },
  { emoji: "🐧", name: "ぺんぎんさん" },
  { emoji: "🦊", name: "きつねさん" },
  { emoji: "🐸", name: "かえるさん" },
  { emoji: "🐱", name: "ねこさん" },
  { emoji: "🐶", name: "いぬさん" },
  { emoji: "🐵", name: "さるさん" },
  { emoji: "🦁", name: "らいおんさん" },
];

const GUEST_WAIT = 2600;   // つぎの おきゃくさんが くるまで(ms)
const GIFT_MIN = 2;        // おれいに もらえる ざいりょう
const GIFT_MAX = 3;
const RECIPE_EVERY = 3;    // なんにん めに レシピを おしえてもらえるか

/* ================= せってい ================= */

const TICK = 33;            // 1フレーム(ms) およそ30まい/びょう
const CRANE_SPEED = 0.6;    // ボタンを おしている あいだの よこの はやさ(%/フレーム)
const CRANE_MIN = 8;
const CRANE_MAX = 92;
/* たての いちは ぜんぶ「つめさき」で かんがえる。
   つめの えは SVGの てっぺんから CLAW_TIP_PX した が つめさき */
const CLAW_TIP_PX = 46;
const TIP_TOP = 26;         // まちうけの つめさき(%)
const TIP_MAX = 84;         // いちばん ふかく おろせる つめさき(%)。いちばん したの レーンに とどく
const CLAW_DOWN = 0.95;     // おりる はやさ。ボタンを はなすと とまる
const CLAW_UP = 1.7;        // あがる はやさ
const GRIP_TICKS = 9;       // つめを とじている あいだ
const CATCH_R = 10;         // つかめる よこはば(%)。ひろめ＝やさしい
const CATCH_V = 8;          // つかめる たてはば(%)
const RAIL_Y = 6;           // レールの たかさ(%)
const WATER = 46;           // みずめん(%)

/* ながれてくる ふかさは 3だん。ふかいほど ゆっくり ながれる。
   レシピと たからばこは ふかいところにしか ながれてこない＝ふかく おろす りゆう */
const LANES = [
  { y: 53, speed: 1.0,  raft: true },
  { y: 68, speed: 0.72, raft: false },
  { y: 83, speed: 0.52, raft: false },
];
const MIN_TIP = LANES[0].y; // はやく はなしても ここまでは おりる

const SPAWN_TICKS = 32;     // つぎが ながれてくるまで
const FLOAT_MAX = 7;        // どうじに ながれる かず
const RECIPE_RATE = 0.18;   // レシピが ながれてくる かくりつ
const GIFT_RATE = 0.07;     // たからばこが ながれてくる かくりつ
const BAG_CAP = 20;         // ざいりょうは 1しゅるい 20こまで
const DISH_MAX = 8;         // テーブルに おける おりょうりの かず

const CUT_TAPS = 4;         // きる かいすう
const MIX_DEG = 360 * 2.5;  // まぜる かいてんりょう
const HEAT_RATE = 2.4;      // 40msごとの あたたまりかた
const BITES = 3;            // ひとくちの かず
const CHEW_MS = 620;        // もぐもぐ している あいだ

/* ================= ちいさい どうぐ ================= */

let idc = 1;
const nextId = () => idc++;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hasAll = (bag, need) => need.every((id) => (bag[id] || 0) > 0);

/* セーブキーは "<id>:save:v1" の かたち。ほかの ゲームと まざらない */
const save = createSave("crane:save:v1");

const C = { ...THEME, wood: "#c98a4b", kitchen: "#fff1d6", steel: "#cfe0ee", steelDark: "#3f5266" };

/* テーブルの おさらは レシピの ものと じぶんの ものが まざる */
const dishOf = (d) => (d.kind === "orig" ? originalOf(d.ref) : recipeOf(d.ref));

/* ================= ほんたい ================= */

export default function CraneGame() {
  const [tab, setTab] = useState("sea");
  const [floats, setFloats] = useState([]);
  const [crane, setCrane] = useState({ x: 50, y: TIP_TOP, phase: "idle", open: true, held: null });
  const [bag, setBag] = useState({});
  const [known, setKnown] = useState([FIRST_RECIPE]);
  const [origs, setOrigs] = useState([]);      // じぶんで つくった りょうりの キー
  const [dishes, setDishes] = useState([]);    // { id, kind:"recipe"|"orig", ref }
  const [eaten, setEaten] = useState({});      // レシピの りょうりを たべた かず
  const [origEaten, setOrigEaten] = useState({});
  const [served, setServed] = useState(0);
  const [guest, setGuest] = useState(null);    // { id, emoji, name, want }
  const [cook, setCook] = useState(null);      // { dish }
  const [eating, setEating] = useState(null);  // { dishId, dish }
  const [freeing, setFreeing] = useState(false);
  const [sound, setSound] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const blip = useBlip(sound);

  /* うごきの ほんたいは ref に もつ。1フレームに 1かいだけ state へ うつす */
  const floatsRef = useRef([]);
  const xRef = useRef(50);
  const moveRef = useRef(0);   // -1 ひだり / 0 とまる / 1 みぎ
  const dragRef = useRef(false);
  const seaRef = useRef(null);
  const dropRef = useRef(() => {});
  const releaseRef = useRef(() => {});
  const yRef = useRef(TIP_TOP);
  const phaseRef = useRef("idle");
  const gripRef = useRef(0);
  const holdRef = useRef(false);  // まんなかの ボタンを おしているか
  const heldRef = useRef(null);
  const spawnRef = useRef(SPAWN_TICKS);
  const bagRef = useRef({});
  const knownRef = useRef([FIRST_RECIPE]);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  useEffect(() => { bagRef.current = bag; }, [bag]);
  useEffect(() => { knownRef.current = known; }, [known]);

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
      if (d.bag && typeof d.bag === "object" && !Array.isArray(d.bag)) {
        const b = {};
        ING.forEach((i) => {
          const n = Math.floor(safeNum(d.bag[i.id], 0, BAG_CAP, 0));
          if (n > 0) b[i.id] = n;
        });
        setBag(b);
      }
      if (Array.isArray(d.known)) {
        const k = [...new Set(d.known.filter((id) => RECIPE_MAP[id]))];
        setKnown(k.includes(FIRST_RECIPE) ? k : [FIRST_RECIPE, ...k]);
      }
      const okOrigs = Array.isArray(d.origs)
        ? [...new Set(d.origs.filter(validOrigKey))]
        : [];
      setOrigs(okOrigs);
      if (Array.isArray(d.dishes)) {
        setDishes(
          d.dishes
            .filter((x) => x && (x.kind === "orig"
              ? validOrigKey(x.ref)
              : RECIPE_MAP[x.ref]))
            .slice(0, DISH_MAX)
            .map((x) => ({ id: nextId(), kind: x.kind === "orig" ? "orig" : "recipe", ref: x.ref }))
        );
      }
      if (d.eaten && typeof d.eaten === "object" && !Array.isArray(d.eaten)) {
        const e = {};
        RECIPES.forEach((r) => {
          const n = Math.floor(safeNum(d.eaten[r.id], 0, 99999, 0));
          if (n > 0) e[r.id] = n;
        });
        setEaten(e);
      }
      if (d.origEaten && typeof d.origEaten === "object" && !Array.isArray(d.origEaten)) {
        const e = {};
        okOrigs.forEach((k) => {
          const n = Math.floor(safeNum(d.origEaten[k], 0, 99999, 0));
          if (n > 0) e[k] = n;
        });
        setOrigEaten(e);
      }
      setServed(Math.floor(safeNum(d.served, 0, 99999, 0)));
    }
    setLoaded(true);
  }, []);

  /* ---------- じどうセーブ ---------- */
  const dishSig = useMemo(() => dishes.map((d) => `${d.kind}:${d.ref}`).join(","), [dishes]);
  useEffect(() => {
    if (!loaded || !save.available) return;
    const t = setTimeout(() => {
      const ok = save.save({
        v: 1, sound, bag, known, origs, eaten, origEaten, served,
        dishes: dishes.map((d) => ({ kind: d.kind, ref: d.ref })),
      });
      if (!ok) return; /* ほぞん できなくても あそべる */
      setSaving(true);
      setTimeout(() => { if (aliveRef.current) setSaving(false); }, 600);
    }, 700);
    return () => clearTimeout(t);
  }, [loaded, sound, bag, known, origs, dishSig, eaten, origEaten, served]);

  /* ---------- ざいりょうを かごへ ---------- */
  const addIng = useCallback((id, n = 1) => {
    setBag((b) => ({ ...b, [id]: Math.min(BAG_CAP, (b[id] || 0) + n) }));
  }, []);

  /* ---------- つかんだ ものを かごへ ---------- */
  const deliver = useCallback(() => {
    const held = heldRef.current;
    heldRef.current = null;
    phaseRef.current = "idle";
    if (!held) return;

    if (held.kind === "gift") {
      /* たからばこは ふかいところ にしか ながれない。ふかく おろした ごほうび */
      const n = GIFT_MIN + Math.floor(Math.random() * (GIFT_MAX - GIFT_MIN + 1));
      const got = Array.from({ length: n }, () => pick(ING));
      got.forEach((i) => addIng(i.id));
      say(`🎁 あけたら ${got.map((i) => i.emoji).join("")} だった！`, "good");
      blip(940, 0.26);
      return;
    }

    if (held.kind === "recipe") {
      const rest = RECIPES.filter((r) => !knownRef.current.includes(r.id));
      if (rest.length) {
        const r = pick(rest);
        setKnown((k) => [...k, r.id]);
        say(`${r.emoji} ${r.name}の レシピを おぼえた！`, "good");
        blip(880, 0.2);
      } else {
        const i = pick(ING);
        addIng(i.id);
        say(`レシピは ぜんぶ そろった！ ${i.emoji}を もらった`, "good");
        blip(880, 0.2);
      }
      return;
    }

    const i = ingOf(held.ingId);
    if ((bagRef.current[i.id] || 0) >= BAG_CAP) {
      say(`${i.emoji} ${i.name}は もう いっぱい`, "warn");
      blip(240, 0.16);
      return;
    }
    addIng(i.id);
    say(`${i.emoji} ${i.name}を つかまえた！`, "good");
    blip(660);
  }, [addIng, blip, say]);

  /* ---------- つめが そこに ついた しゅんかん ---------- */
  const gripNow = useCallback((list) => {
    let best = null;
    let bestD = Infinity;
    list.forEach((f) => {
      const dx = Math.abs(f.x - xRef.current);
      const dy = Math.abs(LANES[f.lane].y - yRef.current);
      if (dx >= CATCH_R || dy >= CATCH_V) return;
      const d = dx + dy;
      if (d < bestD) { best = f; bestD = d; }
    });
    if (!best) {
      blip(200, 0.14);
      return list;
    }
    heldRef.current = { kind: best.kind, ingId: best.ingId };
    blip(520, 0.1);
    return list.filter((f) => f.id !== best.id);
  }, [blip]);

  /* ---------- ながれてくる ものを つくる ----------
     もっている レシピで まだ たりない ざいりょうを おおめに ながす。
     すすめなくなる ことが ないように */
  const spawnOne = useCallback(() => {
    if (Math.random() < GIFT_RATE) {
      /* たからばこは いちばん ふかい ところだけ */
      return { kind: "gift", ingId: null, lane: 2 };
    }
    const unknown = RECIPES.filter((r) => !knownRef.current.includes(r.id));
    if (unknown.length && Math.random() < RECIPE_RATE) {
      /* レシピは ふかいところ。ふかさを かえる りゆうを つくる */
      return { kind: "recipe", ingId: null, lane: Math.random() < 0.45 ? 1 : 2 };
    }
    const want = [];
    knownRef.current.forEach((id) => {
      const r = recipeOf(id);
      if (!hasAll(bagRef.current, r.need)) {
        r.need.forEach((n) => { if (!(bagRef.current[n] > 0)) want.push(n); });
      }
    });
    const id = want.length && Math.random() < 0.55 ? pick(want) : pick(ING).id;
    const r = Math.random();
    return { kind: "ing", ingId: id, lane: r < 0.45 ? 0 : r < 0.78 ? 1 : 2 };
  }, []);

  /* ---------- ゲームループ ---------- */
  useEffect(() => {
    if (tab !== "sea") {
      floatsRef.current = [];
      setFloats([]);
      phaseRef.current = "idle";
      yRef.current = TIP_TOP;
      holdRef.current = false;
      heldRef.current = null;
      return;
    }
    const timer = setInterval(() => {
      /* ながれてくる ものを うごかす */
      let list = floatsRef.current
        .map((f) => ({ ...f, x: f.x + f.vx, ph: f.ph + 0.09 }))
        .filter((f) => f.x > -14 && f.x < 114);

      /* あたらしく ながす */
      spawnRef.current -= 1;
      if (spawnRef.current <= 0) {
        spawnRef.current = SPAWN_TICKS;
        if (list.length < FLOAT_MAX) {
          const right = Math.random() < 0.5;
          const made = spawnOne();
          list = [...list, {
            id: nextId(),
            ...made,
            x: right ? -10 : 110,
            vx: (right ? 1 : -1) * (0.24 + Math.random() * 0.16) * LANES[made.lane].speed,
            ph: Math.random() * 6,
          }];
        }
      }

      /* クレーン */
      const p = phaseRef.current;
      if (p === "idle") {
        /* ボタンを おしている あいだだけ うごく。じどうでは うごかない */
        if (moveRef.current !== 0) {
          const x = xRef.current + moveRef.current * CRANE_SPEED;
          xRef.current = Math.min(CRANE_MAX, Math.max(CRANE_MIN, x));
        }
      } else {
        moveRef.current = 0; /* おろしている あいだは よこに うごかない */
      }
      if (p === "down") {
        /* ボタンを はなしたら そこで とまって つかむ。
           ただし いちばん うえの ふかさまでは かならず おりる */
        const letGo = !holdRef.current && yRef.current >= MIN_TIP;
        if (letGo || yRef.current >= TIP_MAX) {
          yRef.current = Math.min(yRef.current, TIP_MAX);
          phaseRef.current = "grip";
          gripRef.current = GRIP_TICKS;
          list = gripNow(list);
        } else {
          yRef.current = Math.min(TIP_MAX, yRef.current + CLAW_DOWN);
        }
      } else if (p === "grip") {
        gripRef.current -= 1;
        if (gripRef.current <= 0) phaseRef.current = "up";
      } else if (p === "up") {
        const y = yRef.current - CLAW_UP;
        if (y <= TIP_TOP) {
          yRef.current = TIP_TOP;
          holdRef.current = false;
          deliver();
        } else {
          yRef.current = y;
        }
      }

      floatsRef.current = list;
      setFloats(list);
      setCrane({
        x: xRef.current,
        y: yRef.current,
        phase: phaseRef.current,
        open: phaseRef.current === "idle" || phaseRef.current === "down",
        held: heldRef.current,
      });
    }, TICK);
    return () => clearInterval(timer);
  }, [tab, spawnOne, gripNow, deliver]);

  /* ---------- おきゃくさんが やってくる ----------
     ほしい ものは かならず「じぶんが しっている レシピ」か「なんでも」。
     つくれない ものを たのまれて つまる ことが ないように */
  useEffect(() => {
    if (!loaded || guest) return;
    const t = setTimeout(() => {
      if (!aliveRef.current) return;
      const g = pick(GUESTS);
      const want = Math.random() < 0.6 ? pick(knownRef.current) : "any";
      setGuest({ id: nextId(), emoji: g.emoji, name: g.name, want });
    }, GUEST_WAIT);
    return () => clearTimeout(t);
  }, [loaded, guest]);

  /* おきゃくさんに わたす。おれいに ざいりょうを もらう */
  const serve = (dish, dishId) => {
    if (!guest) return;
    const n = GIFT_MIN + Math.floor(Math.random() * (GIFT_MAX - GIFT_MIN + 1));
    const gift = Array.from({ length: n }, () => pick(ING));
    gift.forEach((i) => addIng(i.id));

    const count = served + 1;
    setServed(count);
    setDishes((list) => list.filter((x) => x.id !== dishId));

    /* ときどき レシピも おしえてくれる */
    let learned = null;
    const rest = RECIPES.filter((r) => !knownRef.current.includes(r.id));
    if (count % RECIPE_EVERY === 0 && rest.length) {
      learned = pick(rest);
      setKnown((k) => [...k, learned.id]);
    }

    setGuest((g) => (g ? { ...g, done: true, gift, learned, dish } : g));
    blip(880, 0.28);
    setTimeout(() => { if (aliveRef.current) setGuest(null); }, 2600);
  };

  /* ---------- そうさ ---------- */
  /* まんなかの ボタン: おしている あいだ おりる。はなした ふかさで つかむ */
  const drop = () => {
    if (phaseRef.current !== "idle") return;
    moveRef.current = 0;
    holdRef.current = true;
    phaseRef.current = "down";
    blip(300, 0.08);
  };
  const release = () => { holdRef.current = false; };
  dropRef.current = drop;
  releaseRef.current = release;

  /* ◀ ▶ ボタン。おしている あいだ うごく */
  const move = (dir) => {
    if (phaseRef.current !== "idle") return;
    moveRef.current = dir;
    if (dir !== 0) blip(360, 0.05);
  };

  /* うみを ゆびで なぞっても うごかせる */
  const dragTo = (e) => {
    const el = seaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = ((e.clientX - r.left) / r.width) * 100;
    xRef.current = Math.min(CRANE_MAX, Math.max(CRANE_MIN, pct));
  };
  const dragStart = (e) => {
    if (phaseRef.current !== "idle") return;
    dragRef.current = true;
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* むし */ }
    }
    dragTo(e);
  };
  const dragMove = (e) => {
    if (!dragRef.current || phaseRef.current !== "idle") return;
    dragTo(e);
  };
  const dragEnd = () => { dragRef.current = false; };

  /* パソコンの ← → と スペース */
  useEffect(() => {
    if (tab !== "sea") return;
    const kd = (e) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft") { moveRef.current = -1; e.preventDefault(); }
      else if (e.key === "ArrowRight") { moveRef.current = 1; e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") { dropRef.current(); e.preventDefault(); }
    };
    const ku = (e) => {
      if (e.key === "ArrowLeft" && moveRef.current === -1) moveRef.current = 0;
      if (e.key === "ArrowRight" && moveRef.current === 1) moveRef.current = 0;
      if (e.key === " " || e.key === "Enter") releaseRef.current();
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      moveRef.current = 0;
    };
  }, [tab]);

  /* ---------- りょうり ---------- */
  const takeIngredients = (need) => {
    setBag((b) => {
      const n = { ...b };
      need.forEach((id) => {
        n[id] = (n[id] || 0) - 1;
        if (n[id] <= 0) delete n[id];
      });
      return n;
    });
  };
  const giveBackIngredients = (need) => {
    setBag((b) => {
      const n = { ...b };
      need.forEach((id) => { n[id] = Math.min(BAG_CAP, (n[id] || 0) + 1); });
      return n;
    });
  };

  const tableFull = () => {
    if (dishes.length < DISH_MAX) return false;
    say("テーブルが いっぱい！ たべてから つくろう", "warn");
    blip(240, 0.16);
    return true;
  };

  const startCook = (r) => {
    if (!hasAll(bag, r.need)) return;
    if (tableFull()) return;
    takeIngredients(r.need);
    setCook({ dish: r });
    blip(420, 0.14);
  };

  /* じぶんの りょうり。えらんだ ざいりょうから レシピを つくって おなじ ながれへ */
  const startFree = (ids) => {
    setFreeing(false);
    if (tableFull()) return;
    const made = makeOriginal(ids);
    takeIngredients(made.need);
    setCook({ dish: made });
    blip(500, 0.16);
  };

  const finishCook = () => {
    const d = cook.dish;
    if (d.isOrig) {
      const isNew = !origs.includes(d.key);
      if (isNew) setOrigs((o) => [...o, d.key]);
      setDishes((list) => [...list, { id: nextId(), kind: "orig", ref: d.key }]);
      say(isNew ? `${d.emoji} 「${d.name}」を はつめいした！` : `${d.emoji} ${d.name}が できた！`, "good");
    } else {
      setDishes((list) => [...list, { id: nextId(), kind: "recipe", ref: d.id }]);
      say(`${d.emoji} ${d.name}が できた！`, "good");
    }
    setCook(null);
  };

  const cancelCook = () => {
    giveBackIngredients(cook.dish.need);
    setCook(null);
    blip(260, 0.12);
  };

  /* ---------- たべる ---------- */
  const finishEat = () => {
    const d = eating.dish;
    setDishes((list) => list.filter((x) => x.id !== eating.dishId));
    if (d.isOrig) setOrigEaten((e) => ({ ...e, [d.key]: (e[d.key] || 0) + 1 }));
    else setEaten((e) => ({ ...e, [d.id]: (e[d.id] || 0) + 1 }));
    setEating(null);
    say(`${d.name}、ごちそうさま！ 😋`, "good");
  };

  /* ---------- みため ---------- */
  const bagList = ING.filter((i) => (bag[i.id] || 0) > 0);
  const bagTotal = bagList.reduce((s, i) => s + bag[i.id], 0);
  const eatenTotal = RECIPES.reduce((s, r) => s + (eaten[r.id] || 0), 0)
    + origs.reduce((s, k) => s + (origEaten[k] || 0), 0);
  const canFree = bagList.length >= FREE_MIN;

  const pill = {
    display: "flex", alignItems: "center", gap: 3, background: "#fff",
    borderRadius: 999, padding: "3px 10px", border: `2px solid ${C.gold}`,
  };
  const hint = { margin: "0 0 6px", textAlign: "center", fontSize: 14, color: C.ink, opacity: 0.75 };

  return (
    <div style={{ fontFamily: FONT, color: C.ink, minHeight: "100%", background: C.sky,
                  userSelect: "none", WebkitUserSelect: "none", paddingBottom: 24 }}>
      <style>{`
        @keyframes rise { 0%{ transform:translateY(0); opacity:.7 } 100%{ transform:translateY(-120px); opacity:0 } }
        @keyframes toastUp {
          0%{ transform:translateY(14px) scale(.8); opacity:0 }
          20%{ transform:translateY(0) scale(1); opacity:1 }
          80%{ opacity:1 } 100%{ opacity:0 }
        }
        @keyframes shine { 0%,100%{ filter:brightness(1) } 50%{ filter:brightness(1.3) } }
        @keyframes wobble { 0%,100%{ transform:rotate(-3deg) } 50%{ transform:rotate(3deg) } }
        @keyframes pop { 0%{ transform:scale(.4) } 70%{ transform:scale(1.15) } 100%{ transform:scale(1) } }
        @keyframes knifeDown {
          0%{ transform:translate(-50%,-64px) rotate(-38deg) }
          45%{ transform:translate(-50%,6px) rotate(4deg) }
          100%{ transform:translate(-50%,-64px) rotate(-38deg) }
        }
        @keyframes flameUp { 0%,100%{ transform:scale(1,1) } 50%{ transform:scale(1.12,1.3) } }
        @keyframes steam {
          0%{ transform:translateY(0) scale(.7); opacity:0 }
          30%{ opacity:.8 } 100%{ transform:translateY(-46px) scale(1.3); opacity:0 }
        }
        @keyframes chew { 0%,100%{ transform:scale(1) } 35%{ transform:scale(.86,1.14) } 70%{ transform:scale(1.1,.9) } }
        @keyframes crumbFly {
          0%{ transform:translate(0,0) scale(1); opacity:1 }
          100%{ transform:translate(var(--dx),var(--dy)) scale(.3); opacity:0 }
        }
        @keyframes shakeIn { 0%{ transform:scale(1.3) rotate(-8deg) } 100%{ transform:scale(1) rotate(0) } }
        @keyframes hop { 0%,100%{ transform:translateY(0) } 40%{ transform:translateY(-9px) } }
        @keyframes sparkleTurn { 0%{ transform:rotate(0) scale(1) } 50%{ transform:rotate(180deg) scale(1.25) } 100%{ transform:rotate(360deg) scale(1) } }
        .bigbtn { border:none; cursor:pointer; font-family:inherit; font-weight:800;
                  -webkit-tap-highlight-color:transparent; }
        .bigbtn:active { transform: translateY(3px); }
        .homelink { text-decoration:none; }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important } }
      `}</style>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
                    background: C.cream, borderBottom: `4px solid ${C.gold}`, flexWrap: "wrap" }}>
        <a className="homelink" href="../../" aria-label="ゲームをえらぶ"
           style={{ fontSize: 20, padding: "2px 4px" }}>🏠</a>
        <div style={pill}><span style={{ fontSize: 18 }}>🧺</span>
          <b style={{ fontSize: 18 }}>{bagTotal}</b></div>
        <div style={pill}><span style={{ fontSize: 18 }}>🍽️</span>
          <b style={{ fontSize: 18 }}>{dishes.length}</b></div>
        <div style={pill}><span style={{ fontSize: 18 }}>📜</span>
          <b style={{ fontSize: 18 }}>{known.length}</b>
          <span style={{ fontSize: 12 }}>/{RECIPES.length}</span></div>
        <div style={pill}><span style={{ fontSize: 18 }}>😊</span>
          <b style={{ fontSize: 18 }}>{served}</b></div>
        <span style={{ marginLeft: "auto", fontSize: 16, opacity: saving ? 1 : 0.15,
                       transition: "opacity .3s" }} title="セーブちゅう">💾</span>
        <button className="bigbtn" onClick={() => setSound((s) => !s)} aria-label="おと"
          style={{ background: "transparent", fontSize: 22, padding: 4 }}>
          {sound ? "🔊" : "🔇"}
        </button>
      </div>

      {/* タブ。おきゃくさんが まっていると たべるタブに かおが でる */}
      <div style={{ display: "flex", gap: 6, padding: 8, background: C.cream }}>
        {[["sea", "🪝 うみ"], ["kitchen", "🍳 キッチン"], ["eat", "🍽️ おみせ"]].map(([key, label]) => (
          <button key={key} className="bigbtn" onClick={() => setTab(key)}
            style={{ position: "relative", flex: 1, padding: "12px 4px", fontSize: 16, borderRadius: 16,
                     background: tab === key ? C.coral : "#ffe9c9",
                     color: tab === key ? "#fff" : C.ink,
                     boxShadow: tab === key ? "0 4px 0 #c9522a" : "0 4px 0 #e5c79a" }}>
            {label}{key === "eat" && dishes.length > 0 ? ` (${dishes.length})` : ""}
            {key === "eat" && guest && !guest.done && tab !== "eat" && (
              <span style={{ position: "absolute", top: -7, right: -3, fontSize: 22,
                animation: "hop 1s ease-in-out infinite" }}>{guest.emoji}</span>
            )}
          </button>
        ))}
      </div>

      {/* ===== うみ ===== */}
      {tab === "sea" && (
        <div style={{ padding: 8 }}>
          <p style={hint}>◀ ▶ で よこ、まんなかを ながおしで ふかさ。はなすと つかむ！</p>

          {/* きょうたい。UFOキャッチャーの わく */}
          <div style={{ position: "relative", padding: 10, borderRadius: 26,
                        background: "linear-gradient(180deg,#5b7185 0%,#33465a 100%)",
                        boxShadow: "0 7px 0 #1e2b38" }}>
            {/* かどの ねじ */}
            {[{ top: 6, left: 6 }, { top: 6, right: 6 },
              { bottom: 6, left: 6 }, { bottom: 6, right: 6 }].map((pos, k) => (
              <span key={k} style={{ position: "absolute", ...pos, width: 9, height: 9,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%,#dfe8ef,#7f8f9d)" }} />
            ))}

          <div ref={seaRef}
            onPointerDown={dragStart} onPointerMove={dragMove}
            onPointerUp={dragEnd} onPointerCancel={dragEnd}
            style={{ position: "relative", height: "54vh", minHeight: 330, borderRadius: 16,
                     overflow: "hidden", cursor: "grab", touchAction: "none",
                     background: `linear-gradient(180deg,#bfe9ff 0%,#e9f7ff ${WATER - 4}%,#6fc9ef ${WATER}%,#2a95cf 78%,#12608f 100%)` }}>

            {/* そら */}
            <div style={{ position: "absolute", top: "14%", left: "11%", fontSize: 26,
                          pointerEvents: "none", opacity: 0.9 }}>☁️</div>
            <div style={{ position: "absolute", top: "21%", right: "13%", fontSize: 20,
                          pointerEvents: "none", opacity: 0.8 }}>☁️</div>

            {/* レール */}
            <div style={{ position: "absolute", top: `${RAIL_Y}%`, left: 0, right: 0, height: 9,
                          background: "linear-gradient(180deg,#a3b6c6 0%,#6b8299 55%,#44586a 100%)",
                          pointerEvents: "none" }} />

            {/* みずめん */}
            <div style={{ position: "absolute", top: `${WATER}%`, left: 0, right: 0, height: 6,
                          background: "rgba(255,255,255,.5)", pointerEvents: "none" }} />

            {/* うみのそこ */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 32,
                          background: "#0d4b78", pointerEvents: "none",
                          borderRadius: "50% 50% 0 0 / 20px 20px 0 0" }} />

            {/* ふかさメーター。いま つめさきが どこに いるか */}
            <div style={{ position: "absolute", left: 8, top: `${TIP_TOP}%`,
                          bottom: `${100 - TIP_MAX}%`, width: 7, borderRadius: 999,
                          background: "rgba(255,255,255,.28)", pointerEvents: "none" }}>
              {LANES.map((l, i) => (
                <span key={i} style={{ position: "absolute", left: -3.5,
                  top: `${((l.y - TIP_TOP) / (TIP_MAX - TIP_TOP)) * 100}%`,
                  width: 14, height: 14, marginTop: -7, borderRadius: "50%",
                  background: "rgba(255,255,255,.35)",
                  border: "2px solid rgba(255,255,255,.8)" }} />
              ))}
              <span style={{ position: "absolute", left: -6.5,
                top: `${((crane.y - TIP_TOP) / (TIP_MAX - TIP_TOP)) * 100}%`,
                width: 20, height: 20, marginTop: -10, borderRadius: "50%",
                background: C.coral, border: "3px solid #fff",
                boxShadow: "0 2px 4px rgba(0,0,0,.3)" }} />
            </div>

            {/* あわ */}
            {[18, 42, 66, 86].map((l, i) => (
              <div key={i} style={{ position: "absolute", left: `${l}%`, top: "88%",
                width: 8 + (i % 3) * 4, height: 8 + (i % 3) * 4, borderRadius: "50%",
                background: "rgba(255,255,255,.4)", pointerEvents: "none",
                animation: `rise ${5 + i}s linear ${i * 1.2}s infinite` }} />
            ))}

            {/* ながれてくるもの */}
            {floats.map((f) => {
              const special = f.kind !== "ing";
              const face = f.kind === "recipe" ? "📜" : f.kind === "gift" ? "🎁" : ingOf(f.ingId).emoji;
              const lane = LANES[f.lane];
              const bob = Math.sin(f.ph) * (f.lane === 0 ? 2.2 : 1.2);
              return (
                <div key={f.id} style={{ position: "absolute", left: `${f.x}%`,
                  top: `${lane.y + bob}%`, pointerEvents: "none",
                  transform: "translate(-50%,-50%)", textAlign: "center" }}>
                  <div style={{ fontSize: f.kind === "gift" ? 38 : 34, lineHeight: 1,
                    filter: special
                      ? "drop-shadow(0 0 8px rgba(255,201,60,.95)) drop-shadow(0 3px 4px rgba(0,0,0,.3))"
                      : "drop-shadow(0 3px 5px rgba(0,0,0,.35))",
                    animation: special ? "shine 1.4s ease-in-out infinite" : "none" }}>
                    {face}
                  </div>
                  {/* うみのうえの ものだけ いかだに のっている */}
                  {lane.raft && (
                    <div style={{ width: 44, height: 8, margin: "-4px auto 0", borderRadius: 6,
                                  background: "rgba(255,255,255,.65)" }} />
                  )}
                </div>
              );
            })}

            {/* ワイヤー。つめの あたままで のばす */}
            <div style={{ position: "absolute", left: `${crane.x}%`, top: `${RAIL_Y}%`,
              width: 3, marginLeft: -1.5, background: "#44586a", pointerEvents: "none",
              height: `calc(${Math.max(0, crane.y - RAIL_Y)}% - ${CLAW_TIP_PX}px)` }} />

            {/* だいしゃ */}
            <Trolley x={crane.x} />

            {/* つめ ＋ つかんだもの。crane.y は つめさきの いち */}
            <div style={{ position: "absolute", left: `${crane.x}%`, top: `${crane.y}%`,
              marginTop: -CLAW_TIP_PX, transform: "translateX(-50%)",
              pointerEvents: "none", lineHeight: 0 }}>
              <Claw open={crane.open} />
              {crane.held && (
                <div style={{ position: "absolute", top: CLAW_TIP_PX - 14, left: "50%",
                  transform: "translateX(-50%)", fontSize: 30, lineHeight: 1,
                  filter: "drop-shadow(0 3px 4px rgba(0,0,0,.3))" }}>
                  {crane.held.kind === "recipe" ? "📜"
                    : crane.held.kind === "gift" ? "🎁"
                    : ingOf(crane.held.ingId).emoji}
                </div>
              )}
            </div>

            {/* まえの ガラス */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(114deg, rgba(255,255,255,.26) 0 11%,"
                        + " rgba(255,255,255,0) 11.4% 21%,"
                        + " rgba(255,255,255,.14) 21.4% 27%,"
                        + " rgba(255,255,255,0) 27.4%)" }} />

            <ToastRow toasts={toasts} />
          </div>
          </div>

          {/* そうさパネル */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 12, marginTop: 14, padding: "12px 8px", borderRadius: 22,
                        background: "linear-gradient(180deg,#4a5d70 0%,#33465a 100%)",
                        boxShadow: "0 6px 0 #1e2b38" }}>
            <ArcadeBtn label="◀" size={76} fontSize={30} color="#3aa0e0" dark="#1c6a9e"
              onDown={() => move(-1)} onUp={() => move(0)} dim={crane.phase !== "idle"} />
            <ArcadeBtn label={crane.phase === "down" ? "はなす" : "おろす"}
              size={104} fontSize={19} color="#ffc93c" dark="#bf8f00"
              onDown={drop} onUp={release}
              dim={crane.phase === "grip" || crane.phase === "up"} />
            <ArcadeBtn label="▶" size={76} fontSize={30} color="#3aa0e0" dark="#1c6a9e"
              onDown={() => move(1)} onUp={() => move(0)} dim={crane.phase !== "idle"} />
          </div>

          <BagStrip bag={bag} bagList={bagList} />
        </div>
      )}

      {/* ===== キッチン ===== */}
      {tab === "kitchen" && (
        <div style={{ padding: 8 }}>
          <p style={hint}>ざいりょうが そろった レシピを つくろう</p>
          <BagStrip bag={bag} bagList={bagList} />

          {/* じぶんで つくる。レシピに ないものを うみだす ばしょ */}
          <button className="bigbtn" onClick={() => canFree && setFreeing(true)} disabled={!canFree}
            style={{ width: "100%", marginTop: 10, padding: "14px 12px", borderRadius: 20,
                     textAlign: "left", display: "flex", alignItems: "center", gap: 12,
                     background: canFree
                       ? "linear-gradient(120deg,#ffd86f 0%,#ff9f68 55%,#ff7ab0 100%)"
                       : "#e7ddcc",
                     color: canFree ? "#5b2f00" : "#9b8d78",
                     boxShadow: canFree ? "0 5px 0 #d1873c" : "none",
                     cursor: canFree ? "pointer" : "default" }}>
            <span style={{ fontSize: 34,
              animation: canFree ? "sparkleTurn 3s ease-in-out infinite" : "none" }}>✨</span>
            <span>
              <span style={{ display: "block", fontSize: 17 }}>じぶんで つくる</span>
              <span style={{ display: "block", fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                {canFree
                  ? `すきな ざいりょうを ${FREE_MIN}〜${FREE_MAX}こ えらぶと あたらしい りょうりが うまれる`
                  : `ざいりょうが ${FREE_MIN}しゅるい あつまると つくれるよ`}
              </span>
            </span>
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                        gap: 8, marginTop: 10 }}>
            {RECIPES.map((r) => {
              const got = known.includes(r.id);
              if (!got) {
                return (
                  <div key={r.id} style={{ background: "#efe6d6", borderRadius: 18, padding: 12,
                    border: "3px dashed #cbb89a", textAlign: "center", color: "#a08e74" }}>
                    <div style={{ fontSize: 34 }}>❓</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>レシピを ひろってね</div>
                  </div>
                );
              }
              const ready = hasAll(bag, r.need);
              return (
                <div key={r.id} style={{ background: "#fff", borderRadius: 18, padding: 12,
                  border: `3px solid ${ready ? C.coral : C.gold}`, textAlign: "center" }}>
                  <div style={{ fontSize: 38, lineHeight: 1.1 }}>{r.emoji}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, margin: "2px 0 6px" }}>{r.name}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 4,
                                flexWrap: "wrap", minHeight: 30 }}>
                    {r.need.map((id, k) => {
                      const have = (bag[id] || 0) > 0;
                      return (
                        <span key={k} title={ingOf(id).name}
                          style={{ fontSize: 22, opacity: have ? 1 : 0.3,
                                   filter: have ? "none" : "grayscale(1)" }}>
                          {ingOf(id).emoji}
                        </span>
                      );
                    })}
                  </div>
                  {/* てじゅん */}
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 5 }}>
                    {r.steps.map((s, k) => (
                      <span key={k}>{k > 0 ? " → " : ""}{STEP_ICON[s.t]}{s.label}</span>
                    ))}
                  </div>
                  <button className="bigbtn" onClick={() => startCook(r)} disabled={!ready}
                    style={{ width: "100%", marginTop: 8, padding: "12px 4px", fontSize: 17,
                             borderRadius: 14, background: ready ? C.coral : "#e7ddcc",
                             color: ready ? "#fff" : "#9b8d78",
                             boxShadow: ready ? "0 4px 0 #c9522a" : "none",
                             cursor: ready ? "pointer" : "default" }}>
                    {ready ? "つくる" : "たりない"}
                  </button>
                </div>
              );
            })}
          </div>
          <ToastRow toasts={toasts} fixed />
        </div>
      )}

      {/* ===== おみせ ===== */}
      {tab === "eat" && (
        <div style={{ padding: 8 }}>
          <GuestCard guest={guest} dishes={dishes} onServe={serve} />

          <p style={hint}>おりょうりを タップすると じぶんで たべられるよ</p>

          <div style={{ position: "relative", minHeight: 210, borderRadius: 20, padding: 14,
                        background: `linear-gradient(180deg,${C.wood} 0%,#a8703a 100%)`,
                        border: "5px solid #8a5a2b",
                        display: "flex", flexWrap: "wrap", gap: 12,
                        alignContent: "flex-start", justifyContent: "center" }}>
            {dishes.length === 0 && (
              <p style={{ color: "#fff8ec", fontSize: 15, marginTop: 56, textAlign: "center" }}>
                テーブルが からっぽ。<br />キッチンで つくろう 🍳
              </p>
            )}
            {dishes.map((d) => {
              const info = dishOf(d);
              return (
                <button key={d.id} className="bigbtn"
                  onClick={() => setEating({ dishId: d.id, dish: info })}
                  style={{ position: "relative", width: 92, height: 92, borderRadius: "50%",
                           background: "#fffdf7",
                           border: `4px solid ${info.isOrig ? "#ff9f68" : "#ffe6b8"}`,
                           boxShadow: "0 4px 0 #d8b98a",
                           display: "flex", alignItems: "center", justifyContent: "center",
                           padding: 0 }}>
                  <span style={{ fontSize: 44,
                                 filter: "drop-shadow(0 2px 3px rgba(0,0,0,.2))" }}>{info.emoji}</span>
                  {info.isOrig && (
                    <span style={{ position: "absolute", top: -4, right: -4, fontSize: 18 }}>✨</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* たべたよ ずかん */}
          <h3 style={{ fontSize: 16, margin: "14px 0 6px", textAlign: "center" }}>
            🌟 たべたよ ずかん（{eatenTotal}こ）
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(76px,1fr))", gap: 6 }}>
            {RECIPES.map((r) => {
              const n = eaten[r.id] || 0;
              return (
                <div key={r.id} style={{ background: n ? "#fff" : "#eee6d8", borderRadius: 14,
                  padding: "8px 2px", textAlign: "center",
                  border: `3px solid ${n ? C.gold : "#ddd0ba"}` }}>
                  <div style={{ fontSize: 26, filter: n ? "none" : "grayscale(1)", opacity: n ? 1 : 0.35 }}>
                    {r.emoji}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: n ? 1 : 0.4 }}>{r.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{n ? `×${n}` : "－"}</div>
                </div>
              );
            })}
          </div>

          {/* はつめいした りょうり。ここは じぶんだけの ページ */}
          <h3 style={{ fontSize: 16, margin: "16px 0 6px", textAlign: "center" }}>
            ✨ はつめい ノート（{origs.length}こ）
          </h3>
          {origs.length === 0 ? (
            <div style={{ background: "#fff", border: "3px dashed #ffc08e", borderRadius: 16,
                          padding: "18px 12px", textAlign: "center", fontSize: 14, opacity: 0.75 }}>
              キッチンの ✨じぶんで つくる で<br />あたらしい りょうりを うみだそう
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(112px,1fr))", gap: 6 }}>
              {origs.map((k) => {
                const o = originalOf(k);
                const n = origEaten[k] || 0;
                return (
                  <div key={k} style={{ background: "#fff", borderRadius: 14, padding: "8px 4px",
                    textAlign: "center", border: "3px solid #ff9f68" }}>
                    <div style={{ fontSize: 26 }}>{o.emoji}</div>
                    <div style={{ fontSize: 11, marginTop: 2, fontWeight: 800, lineHeight: 1.3 }}>
                      {o.name}
                    </div>
                    <div style={{ fontSize: 15, marginTop: 2 }}>
                      {o.need.map((id) => ingOf(id).emoji).join("")}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8 }}>
                      {n ? `たべた ×${n}` : "まだ たべてない"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <ToastRow toasts={toasts} fixed />
        </div>
      )}

      {freeing && (
        <FreeModal bag={bag} bagList={bagList} blip={blip}
          onMake={startFree} onCancel={() => setFreeing(false)} />
      )}
      {cook && (
        <CookModal recipe={cook.dish} blip={blip}
          onDone={finishCook} onCancel={cancelCook} />
      )}
      {eating && (
        <EatModal recipe={eating.dish} blip={blip}
          onDone={finishEat} onCancel={() => setEating(null)} />
      )}
    </div>
  );
}

/* ================= おきゃくさん ================= */

/* まっている あいだは わたせる おさらに ボタンが でる。
   もっていなくても せかさない。じかんぎれも きげんも ない */
function GuestCard({ guest, dishes, onServe }) {
  if (!guest) {
    return (
      <div style={{ background: "#fff", borderRadius: 20, padding: "14px 12px",
                    border: `3px dashed ${C.gold}`, textAlign: "center",
                    fontSize: 14, opacity: 0.7, marginBottom: 10 }}>
        🚪 つぎの おきゃくさんを まっています…
      </div>
    );
  }

  /* わたした あとの おれい */
  if (guest.done) {
    return (
      <div style={{ background: "linear-gradient(120deg,#fff3c4 0%,#ffd6e8 100%)",
                    borderRadius: 20, padding: "14px 12px", border: `3px solid ${C.gold}`,
                    textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 48, animation: "hop .5s ease-in-out 3" }}>{guest.emoji}</div>
        <div style={{ fontSize: 17, fontWeight: 800, margin: "4px 0" }}>
          {guest.dish.isOrig && guest.want === "any"
            ? "こんなの はじめて！ おいしい！"
            : "おいしかった！ ありがとう！"}
        </div>
        <div style={{ fontSize: 14, marginTop: 6 }}>
          🎁 おれいに {guest.gift.map((i, k) => <span key={k} style={{ fontSize: 22 }}>{i.emoji}</span>)}
        </div>
        {guest.learned && (
          <div style={{ fontSize: 14, marginTop: 6, fontWeight: 800 }}>
            📜 {guest.learned.emoji} {guest.learned.name}の つくりかたも おしえてくれた！
          </div>
        )}
      </div>
    );
  }

  /* この おきゃくさんに わたせる おさら */
  const wantAny = guest.want === "any";
  const wanted = wantAny ? null : recipeOf(guest.want);
  const okDishes = dishes.filter((d) =>
    wantAny ? true : d.kind === "recipe" && d.ref === guest.want);

  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "12px", marginBottom: 10,
                  border: `3px solid ${C.coral}`, display: "flex", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 46, animation: "hop 1.6s ease-in-out infinite" }}>{guest.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>
          {wantAny
            ? "なにか おいしいもの ちょうだい！"
            : <>{wanted.emoji} {wanted.name}が たべたいな</>}
        </div>
        {okDishes.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
            {wantAny ? "できるまで まってるね" : "つくってくれたら うれしいな"}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {okDishes.map((d) => {
              const info = dishOf(d);
              return (
                <button key={d.id} className="bigbtn" onClick={() => onServe(info, d.id)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
                           borderRadius: 999, fontSize: 15, background: C.coral, color: "#fff",
                           boxShadow: "0 3px 0 #c9522a" }}>
                  <span style={{ fontSize: 22 }}>{info.emoji}</span> あげる
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= じぶんで つくる ================= */

/* ざいりょうを えらぶ ところ。
   なまえを キーボードで いれさせない。こどもが うてないし、
   なまえを あずかると こじんじょうほうを もつことに なるため。
   なまえは くみあわせから じどうで きまる */
function FreeModal({ bag, bagList, blip, onMake, onCancel }) {
  const [sel, setSel] = useState([]);
  const full = sel.length >= FREE_MAX;
  const ready = sel.length >= FREE_MIN;

  const toggle = (id) => {
    setSel((s) => {
      if (s.includes(id)) { blip(300, 0.06); return s.filter((x) => x !== id); }
      if (s.length >= FREE_MAX) return s;
      blip(560 + s.length * 90, 0.08);
      return [...s, id];
    });
  };

  /* えらんでいる あいだ、できあがりを さきに みせる。
     「これを つくったら どうなる？」が この きのうの たのしみ */
  const preview = ready ? makeOriginal(sel) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 20,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: C.kitchen, borderRadius: 26, padding: 16, width: "100%",
                    maxWidth: 380, textAlign: "center", border: `5px solid ${C.gold}`,
                    position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        <button className="bigbtn" onClick={onCancel} aria-label="やめる"
          style={{ position: "absolute", top: 8, right: 8, width: 44, height: 44,
                   borderRadius: "50%", background: "#f0e3c8", fontSize: 20 }}>✕</button>

        <p style={{ fontSize: 19, fontWeight: 800, margin: "0 0 2px", paddingRight: 44 }}>
          ✨ じぶんで つくる
        </p>
        <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 10px" }}>
          ざいりょうを {FREE_MIN}〜{FREE_MAX}こ えらんでね
        </p>

        {/* できあがり よそう */}
        <div style={{ background: "#fff", borderRadius: 18, padding: "12px 8px", marginBottom: 12,
                      border: `3px solid ${ready ? "#ff9f68" : "#e7d9bd"}`, minHeight: 108,
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center" }}>
          {preview ? (
            <>
              <div key={preview.key} style={{ fontSize: 52, lineHeight: 1,
                animation: "pop .35s ease-out" }}>{preview.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{preview.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {preview.steps.map((s, k) => (
                  <span key={k}>{k > 0 ? " → " : ""}{STEP_ICON[s.t]}{s.label}</span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 44, opacity: 0.3 }}>❓</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>なにが できるかな？</div>
            </>
          )}
        </div>

        {/* えらんだ もの */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}>
          {Array.from({ length: FREE_MAX }).map((_, k) => (
            <span key={k} style={{ width: 48, height: 48, borderRadius: 14, fontSize: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: sel[k] ? "#fff" : "#e7d9bd",
              border: `3px solid ${sel[k] ? C.coral : "#d8c9ad"}` }}>
              {sel[k] ? ingOf(sel[k]).emoji : ""}
            </span>
          ))}
        </div>

        {/* かごの なかみ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(62px,1fr))",
                      gap: 6, marginBottom: 12 }}>
          {bagList.map((i) => {
            const on = sel.includes(i.id);
            const dim = !on && full;
            return (
              <button key={i.id} className="bigbtn" onClick={() => toggle(i.id)} disabled={dim}
                style={{ padding: "8px 2px", borderRadius: 14, background: on ? C.coral : "#fff",
                         border: `3px solid ${on ? "#c9522a" : C.gold}`,
                         opacity: dim ? 0.35 : 1, cursor: dim ? "default" : "pointer" }}>
                <div style={{ fontSize: 26 }}>{i.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: on ? "#fff" : C.ink }}>
                  {bag[i.id]}こ
                </div>
              </button>
            );
          })}
        </div>

        <button className="bigbtn" onClick={() => onMake(sel)} disabled={!ready}
          style={{ width: "100%", padding: "16px 8px", fontSize: 20, borderRadius: 16,
                   background: ready ? C.coral : "#e7ddcc", color: ready ? "#fff" : "#9b8d78",
                   boxShadow: ready ? "0 5px 0 #c9522a" : "none",
                   cursor: ready ? "pointer" : "default" }}>
          {ready ? "これで つくる！" : `あと ${FREE_MIN - sel.length}こ えらんでね`}
        </button>
      </div>
    </div>
  );
}

/* ================= クレーンの え ================= */

/* だいしゃ。しゃりんが レールに のって、ほんたいは その したに ぶらさがる */
function Trolley({ x }) {
  return (
    <svg width="58" height="36" viewBox="0 0 58 36" aria-hidden="true"
      style={{ position: "absolute", left: `${x}%`, top: `${RAIL_Y}%`,
               transform: "translateX(-50%)", marginTop: -4.5, pointerEvents: "none" }}>
      <circle cx="18" cy="9" r="6.5" fill="#9fb4c6" stroke="#3f5266" strokeWidth="3" />
      <circle cx="40" cy="9" r="6.5" fill="#9fb4c6" stroke="#3f5266" strokeWidth="3" />
      <rect x="9" y="16" width="40" height="16" rx="5" fill="#ffc93c" stroke="#8a6a12" strokeWidth="3" />
      <rect x="15" y="20" width="11" height="6" rx="2" fill="#fff3cf" />
    </svg>
  );
}

/* つめ。UFOキャッチャーの 3ぼんづめ。
   おろす あいだは ひらいていて、そこで とじる。
   よこの つめは じぶんの つけねを じくに かいてんする */
function Claw({ open }) {
  const a = open ? 22 : -16;   // ひだりの つめの かくど。みぎは その ぎゃく
  const back = open ? -4 : 3;
  const arm = (d, ang, px, py, isBack = false) => (
    <g transform={`rotate(${ang} ${px} ${py})`} style={{ transition: "transform .18s" }}>
      <path d={d} stroke={isBack ? "#22303f" : "#2f4152"} strokeWidth={isBack ? 10 : 13}
        fill="none" strokeLinecap="round" />
      <path d={d} stroke={isBack ? "#7f93a5" : "#cfe0ee"} strokeWidth={isBack ? 4 : 6}
        fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg width="72" height="56" viewBox="0 0 72 56" aria-hidden="true"
      style={{ display: "block", filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))" }}>
      {/* おくの つめ（1ぽん）。ほんたいの うしろに かくれる */}
      {arm("M36 21 C37 28, 37 35, 36 42", back, 36, 21, true)}
      {/* ワイヤーの つけね */}
      <rect x="31" y="0" width="10" height="7" rx="3" fill="#b8c6d2" stroke="#3f5266" strokeWidth="2.5" />
      <circle cx="36" cy="9" r="4.5" fill="#9fb4c6" stroke="#3f5266" strokeWidth="2.5" />
      {/* あかい ほんたい */}
      <path d="M22 12 H50 L46.5 22 H25.5 Z" fill="#e8452f" stroke="#8f2417"
        strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="27" y="14.5" width="8" height="4" rx="2" fill="#ffb3a5" />
      {/* まえの つめ（2ほん） */}
      {arm("M27 20 C24 28, 22 36, 26 46", a, 27, 20)}
      {arm("M45 20 C48 28, 50 36, 46 46", -a, 45, 20)}
    </svg>
  );
}

/* ゲームセンターの まるい ボタン。おしっぱなしを うけとる */
function ArcadeBtn({ label, size, fontSize, color, dark, onDown, onUp, dim }) {
  const [press, setPress] = useState(false);
  const down = (e) => {
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* むし */ }
    }
    setPress(true);
    onDown();
  };
  const up = () => {
    if (!press) return;
    setPress(false);
    if (onUp) onUp();
  };
  return (
    <button className="bigbtn" aria-label={label}
      onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
      style={{ width: size, height: size, borderRadius: "50%", padding: 0,
        touchAction: "none", color: "#fff", fontSize,
        textShadow: "0 2px 3px rgba(0,0,0,.4)",
        opacity: dim ? 0.5 : 1, transition: "opacity .2s",
        background: `radial-gradient(circle at 36% 28%, rgba(255,255,255,.75) 0%, ${color} 52%, ${dark} 100%)`,
        border: `4px solid ${dark}`,
        boxShadow: press ? `0 2px 0 ${dark}` : `0 7px 0 ${dark}`,
        transform: press ? "translateY(5px)" : "none" }}>
      {label}
    </button>
  );
}

/* ================= りょうり ================= */

function CookModal({ recipe, blip, onDone, onCancel }) {
  const [si, setSi] = useState(0);
  const [prog, setProg] = useState(0);
  const finished = si >= recipe.steps.length;
  const step = finished ? null : recipe.steps[si];

  /* 100% に なったら つぎの てじゅんへ */
  useEffect(() => {
    if (prog < 100) return;
    blip(920, 0.22);
    const t = setTimeout(() => { setSi((i) => i + 1); setProg(0); }, 520);
    return () => clearTimeout(t);
  }, [prog, blip]);

  /* HeatStep の setInterval が はりなおされないよう、おなじ かんすうを つかう */
  const add = useCallback((v) => setProg((p) => Math.min(100, p + v)), []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 20,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: C.kitchen, borderRadius: 26, padding: 16, width: "100%",
                    maxWidth: 360, textAlign: "center", border: `5px solid ${C.gold}`,
                    position: "relative" }}>
        {!finished && (
          <button className="bigbtn" onClick={onCancel} aria-label="やめる"
            style={{ position: "absolute", top: 8, right: 8, width: 44, height: 44,
                     borderRadius: "50%", background: "#f0e3c8", fontSize: 20 }}>✕</button>
        )}

        {/* てじゅんの ならび */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, flexWrap: "wrap",
                      marginBottom: 10, paddingRight: 44 }}>
          {recipe.steps.map((s, k) => (
            <span key={k} style={{ fontSize: 13, fontWeight: 800, borderRadius: 999,
              padding: "5px 10px",
              background: k < si ? "#bfe6b6" : k === si ? C.coral : "#eadfc6",
              color: k === si ? "#fff" : C.ink, opacity: k > si ? 0.6 : 1 }}>
              {k < si ? "✓" : STEP_ICON[s.t]} {s.label}
            </span>
          ))}
        </div>

        {finished ? (
          <>
            <p style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
              {recipe.isOrig ? "はつめい！ ✨" : "できた！ ✨"}
            </p>
            <div style={{ fontSize: 90, animation: "pop .45s ease-out", lineHeight: 1.1 }}>
              {recipe.emoji}
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 12px" }}>{recipe.name}</p>
            <button className="bigbtn" onClick={onDone}
              style={{ width: "100%", padding: "16px 8px", fontSize: 20, borderRadius: 16,
                       background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
              テーブルに はこぶ 🍽️
            </button>
          </>
        ) : (
          <>
            {step.t === "cut" && <CutStep recipe={recipe} prog={prog} add={add} blip={blip} />}
            {step.t === "mix" && <MixStep recipe={recipe} prog={prog} add={add} blip={blip} />}
            {step.t === "heat" && <HeatStep recipe={recipe} prog={prog} add={add} blip={blip} />}
            <div style={{ height: 18, borderRadius: 999, background: "#e7d9bd",
                          overflow: "hidden", marginTop: 12 }}>
              <div style={{ width: `${prog}%`, height: "100%", background: C.coral,
                            transition: "width .12s" }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* きる。タップするたび ざいりょうが こまかくなる */
function CutStep({ recipe, prog, add, blip }) {
  const [swing, setSwing] = useState(0);
  const cuts = Math.round((prog / 100) * CUT_TAPS);
  const tap = () => {
    if (prog >= 100) return;
    setSwing((s) => s + 1);
    blip(300 + cuts * 90, 0.09);
    add(100 / CUT_TAPS);
  };
  return (
    <>
      <p style={{ fontSize: 19, fontWeight: 800, margin: "0 0 8px" }}>とんとん きろう！ 🔪</p>
      <div onClick={tap}
        style={{ position: "relative", height: 150, borderRadius: 16, cursor: "pointer",
                 background: "linear-gradient(180deg,#e0b184 0%,#c9935e 100%)",
                 border: "4px solid #a3733f", display: "flex", alignItems: "center",
                 justifyContent: "center", gap: 6, flexWrap: "wrap", padding: 8,
                 overflow: "hidden" }}>
        {recipe.need.map((id) =>
          Array.from({ length: cuts + 1 }).map((_, k) => (
            <span key={id + k} style={{ fontSize: Math.max(16, 40 - cuts * 6),
              transform: `rotate(${((k * 37) % 40) - 20}deg)`,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }}>
              {ingOf(id).emoji}
            </span>
          ))
        )}
        {swing > 0 && (
          <span key={swing} style={{ position: "absolute", left: "50%", top: 0, fontSize: 52,
            animation: "knifeDown .32s ease-in", pointerEvents: "none" }}>🔪</span>
        )}
      </div>
      <p style={{ fontSize: 14, margin: "8px 0 0", opacity: 0.75 }}>
        あと {Math.max(0, CUT_TAPS - cuts)} かい タップ
      </p>
    </>
  );
}

/* まぜる。ゆびで ぐるぐる まわす（タップでも すすむ） */
function MixStep({ recipe, prog, add, blip }) {
  const bowlRef = useRef(null);
  const lastAng = useRef(null);
  const acc = useRef(0);
  const [spoon, setSpoon] = useState(-90);
  const spin = (prog / 100) * MIX_DEG;

  const angleAt = (e) => {
    const el = bowlRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2),
                       e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const push = (deg) => {
    acc.current += deg;
    if (acc.current > 70) { acc.current = 0; blip(420 + Math.min(360, spin / 4), 0.07); }
    add((deg / MIX_DEG) * 100);
  };
  const down = (e) => {
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* むし */ }
    }
    lastAng.current = angleAt(e);
    setSpoon(lastAng.current);
    push(26);
  };
  const move = (e) => {
    if (lastAng.current === null) return;
    const a = angleAt(e);
    let d = a - lastAng.current;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    lastAng.current = a;
    setSpoon(a);
    push(Math.abs(d));
  };
  const up = () => { lastAng.current = null; };

  return (
    <>
      <p style={{ fontSize: 19, fontWeight: 800, margin: "0 0 8px" }}>ゆびで ぐるぐる！ 🥄</p>
      <div ref={bowlRef} onPointerDown={down} onPointerMove={move}
        onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
        style={{ position: "relative", width: 190, height: 190, margin: "0 auto",
                 borderRadius: "50%", cursor: "grab", touchAction: "none",
                 background: "radial-gradient(circle at 50% 38%,#fffdf6 0%,#f3e3c4 62%,#dcc49a 100%)",
                 border: "8px solid #b9945f",
                 boxShadow: "inset 0 8px 18px rgba(0,0,0,.15)" }}>
        {/* なかみが まわる */}
        <div style={{ position: "absolute", inset: 0, transform: `rotate(${spin}deg)`,
                      pointerEvents: "none" }}>
          {recipe.need.map((id, k) => {
            const th = (k / recipe.need.length) * Math.PI * 2;
            return (
              <span key={id} style={{ position: "absolute", left: "50%", top: "50%", fontSize: 34,
                transform: `translate(-50%,-50%) translate(${Math.cos(th) * 46}px, ${Math.sin(th) * 46}px)`,
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,.2))" }}>
                {ingOf(id).emoji}
              </span>
            );
          })}
        </div>
        {/* おたま */}
        <span style={{ position: "absolute", left: "50%", top: "50%", fontSize: 44,
          pointerEvents: "none",
          transform: `translate(-50%,-50%) rotate(${spoon + 90}deg) translateY(-56px)` }}>🥄</span>
      </div>
      <p style={{ fontSize: 14, margin: "8px 0 0", opacity: 0.75 }}>
        {prog < 50 ? "まわして まわして…" : "もうすこし！"}
      </p>
    </>
  );
}

/* ひにかける。ながおし している あいだ あたたまる */
function HeatStep({ recipe, prog, add, blip }) {
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (!hold) return;
    const t = setInterval(() => add(HEAT_RATE), 40);
    const b = setInterval(() => blip(300 + Math.random() * 120, 0.05), 260);
    return () => { clearInterval(t); clearInterval(b); };
  }, [hold, add, blip]);

  const hot = prog > 35;
  const stop = () => setHold(false);

  return (
    <>
      <p style={{ fontSize: 19, fontWeight: 800, margin: "0 0 8px" }}>ボタンを ながおし！ 🔥</p>
      <div style={{ position: "relative", height: 168, display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
        {/* ゆげ */}
        {hot && [0, 1, 2].map((i) => (
          <span key={i} style={{ position: "absolute", bottom: 108, left: `${40 + i * 10}%`,
            fontSize: 22, opacity: 0.85, pointerEvents: "none",
            animation: `steam ${1.6 + i * 0.3}s ease-out ${i * 0.4}s infinite` }}>💨</span>
        ))}
        {/* なべ */}
        <span style={{ fontSize: 72, lineHeight: 1, zIndex: 1,
          animation: hold ? "wobble .35s ease-in-out infinite" : "none" }}>
          {prog >= 100 ? recipe.emoji : "🍲"}
        </span>
        {/* ひ */}
        <span style={{ fontSize: hold ? 46 : 26, marginTop: -14, transition: "font-size .2s",
          opacity: hold ? 1 : 0.45,
          animation: hold ? "flameUp .28s ease-in-out infinite" : "none" }}>🔥</span>
        {/* コンロ */}
        <div style={{ width: 150, height: 16, borderRadius: 8, background: "#8a8f96",
                      border: "3px solid #5f656c", marginTop: 2 }} />
      </div>
      <button className="bigbtn"
        onPointerDown={() => setHold(true)} onPointerUp={stop}
        onPointerLeave={stop} onPointerCancel={stop}
        style={{ width: "100%", marginTop: 10, padding: "18px 8px", fontSize: 20,
                 borderRadius: 16, touchAction: "none",
                 background: hold ? "#ff5c2b" : C.coral, color: "#fff",
                 boxShadow: hold ? "0 2px 0 #c9522a" : "0 6px 0 #c9522a" }}>
        {hold ? "あつあつ…！" : "🔥 おしっぱなし"}
      </button>
    </>
  );
}

/* ================= たべる ================= */

/* かじった あとに かぶせる まる（おさらの いろ）。3かいで なくなる */
const BITE_MARKS = [
  { top: "2%",  left: "56%", size: 62 },
  { top: "44%", left: "-4%", size: 66 },
  { top: "56%", left: "50%", size: 70 },
];

function EatModal({ recipe, blip, onDone, onCancel }) {
  const [bite, setBite] = useState(0);
  const [chewing, setChewing] = useState(false);
  const [crumbs, setCrumbs] = useState([]);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const done = bite >= BITES;

  const take = () => {
    if (chewing || done) return;
    const n = bite + 1;
    setBite(n);
    setChewing(true);
    blip(520 + n * 90, 0.12);
    /* くずが とびちる */
    const made = Array.from({ length: 7 }).map(() => ({
      id: nextId(),
      dx: `${(Math.random() - 0.5) * 190}px`,
      dy: `${-30 - Math.random() * 90}px`,
    }));
    setCrumbs((c) => [...c, ...made]);
    setTimeout(() => {
      if (!aliveRef.current) return;
      setCrumbs((c) => c.filter((x) => !made.some((m) => m.id === x.id)));
      setChewing(false);
      if (n >= BITES) blip(880, 0.26);
    }, CHEW_MS);
  };

  const face = done ? "😆" : chewing ? "😋" : "😮";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 20,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: C.kitchen, borderRadius: 26, padding: 16, width: "100%",
                    maxWidth: 360, textAlign: "center", border: `5px solid ${C.gold}`,
                    position: "relative" }}>
        {!done && (
          <button className="bigbtn" onClick={onCancel} aria-label="やめる"
            style={{ position: "absolute", top: 8, right: 8, width: 44, height: 44,
                     borderRadius: "50%", background: "#f0e3c8", fontSize: 20 }}>✕</button>
        )}

        <p style={{ fontSize: 19, fontWeight: 800, margin: "0 0 4px", paddingRight: 44 }}>
          {done ? "ごちそうさま！" : chewing ? "もぐもぐ…" : `${recipe.name}を たべよう`}
        </p>

        {/* おかお */}
        <div key={face + bite} style={{ fontSize: 62, lineHeight: 1.1,
          animation: chewing ? `chew ${CHEW_MS}ms ease-in-out` : "shakeIn .3s ease-out" }}>
          {face}
        </div>

        {/* おさら */}
        <div onClick={take}
          style={{ position: "relative", width: 200, height: 200, margin: "6px auto 0",
                   borderRadius: "50%", background: "#fffdf7",
                   border: "8px solid #ffe6b8", boxShadow: "0 6px 0 #d8b98a",
                   cursor: done ? "default" : "pointer",
                   display: "flex", alignItems: "center", justifyContent: "center",
                   overflow: "hidden" }}>
          {!done ? (
            <>
              <span style={{ fontSize: 118, lineHeight: 1,
                transform: `rotate(${bite * -7}deg) scale(${1 - bite * 0.07})`,
                transition: "transform .25s",
                filter: "drop-shadow(0 3px 4px rgba(0,0,0,.2))" }}>{recipe.emoji}</span>
              {/* かじった あと */}
              {BITE_MARKS.slice(0, bite).map((m, k) => (
                <span key={k} style={{ position: "absolute", top: m.top, left: m.left,
                  width: m.size, height: m.size, borderRadius: "50%", background: "#fffdf7",
                  animation: "pop .25s ease-out" }} />
              ))}
            </>
          ) : (
            <span style={{ fontSize: 64, animation: "pop .4s ease-out" }}>✨</span>
          )}

          {/* とびちる くず */}
          {crumbs.map((c) => (
            <span key={c.id} style={{ position: "absolute", left: "50%", top: "50%",
              width: 11, height: 11, borderRadius: "50%", background: "#c98a4b",
              pointerEvents: "none", "--dx": c.dx, "--dy": c.dy,
              animation: `crumbFly ${CHEW_MS}ms ease-out forwards` }} />
          ))}
        </div>

        {/* あと なんくち */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "12px 0 4px" }}>
          {Array.from({ length: BITES }).map((_, k) => (
            <span key={k} style={{ width: 16, height: 16, borderRadius: "50%",
              background: k < bite ? C.coral : "#e7d9bd" }} />
          ))}
        </div>

        {done ? (
          <button className="bigbtn" onClick={onDone}
            style={{ width: "100%", marginTop: 8, padding: "16px 8px", fontSize: 20,
                     borderRadius: 16, background: C.coral, color: "#fff",
                     boxShadow: "0 5px 0 #c9522a" }}>
            ごちそうさま 🌟
          </button>
        ) : (
          <button className="bigbtn" onClick={take} disabled={chewing}
            style={{ width: "100%", marginTop: 8, padding: "18px 8px", fontSize: 22,
                     borderRadius: 16, background: chewing ? "#ddc9b4" : C.coral,
                     color: "#fff",
                     boxShadow: chewing ? "0 6px 0 #b7a58f" : "0 6px 0 #c9522a" }}>
            {chewing ? "もぐもぐ…" : "あーん 😋"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ================= ぶひん ================= */

/* かごの なかみ */
function BagStrip({ bag, bagList }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, padding: 8,
                  background: "#fff", borderRadius: 16, border: `3px solid ${C.gold}`,
                  minHeight: 34, alignItems: "center",
                  justifyContent: bagList.length ? "flex-start" : "center" }}>
      {bagList.length === 0
        ? <span style={{ fontSize: 14, opacity: 0.6 }}>🧺 かごは からっぽ</span>
        : bagList.map((i) => (
            <span key={i.id} style={{ display: "flex", alignItems: "center", gap: 2,
              background: C.sky, borderRadius: 999, padding: "4px 9px", fontSize: 20 }}>
              {i.emoji}<b style={{ fontSize: 14 }}>{bag[i.id]}</b>
            </span>
          ))}
    </div>
  );
}

/* ふきだし */
function ToastRow({ toasts, fixed = false }) {
  return (
    <div style={{ position: fixed ? "fixed" : "absolute", left: 0, right: 0,
      bottom: fixed ? 16 : 12, display: "flex", flexDirection: "column",
      alignItems: "center", gap: 4, pointerEvents: "none", zIndex: 10 }}>
      {toasts.map((t) => (
        <span key={t.id} style={{ animation: "toastUp 1.8s ease-out forwards",
          background: t.tone === "warn" ? "#ffd6c9" : "#fff",
          border: `3px solid ${t.tone === "warn" ? "#e06a3c" : C.gold}`,
          borderRadius: 999, padding: "6px 14px", fontSize: 15, fontWeight: 800,
          boxShadow: "0 3px 6px rgba(0,0,0,.2)" }}>
          {t.text}
        </span>
      ))}
    </div>
  );
}
