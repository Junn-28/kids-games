import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createSave, safeNum } from "../../src/shared/storage.js";
import { useBlip } from "../../src/shared/useBlip.js";
import { FONT, C as THEME } from "../../src/shared/theme.js";

/* ================= データ ================= */

/* ステージの え。
     .  ゆか      #  かべ（とおれない）
     S  スタート  G  おうち（ゴール）   *  おつかいの しな

   limit は おける カードの まいすう。
   さいたん手数は BFS で かくにんずみ。さきに いくほど よゆうが へる:
     1〜7ばん +2 / 8〜10ばん +1 / 11・12ばん ぴったり */
const STAGES = [
  { name: "まっすぐ すすむ",     limit: 5,  goods: [],
    map: ["....", "....", "S..G"] },
  { name: "まがって みよう",     limit: 6,  goods: [],
    map: ["..G.", "....", "S..."] },
  { name: "かべを よけて",       limit: 7,  goods: [],
    map: ["...G", ".##.", "S..."] },
  { name: "かべの なかの おうち", limit: 8,  goods: [],
    map: [".....", ".#G#.", ".###.", "S...."] },
  { name: "おつかい ひとつ",     limit: 9,  goods: ["🍎"],
    map: ["..*.", "....", "S..G"] },
  { name: "はじめての めいろ",   limit: 10, goods: [],
    map: ["S..#.", ".#.#.", ".#...", ".###.", "....G"] },
  { name: "めいろで おつかい",   limit: 12, goods: ["🥕"],
    map: ["S....", ".###.", "...*.", ".###.", "G...."] },
  { name: "ふたつの おつかい",   limit: 11, goods: ["🍞", "🥛"],
    map: ["*...*", ".....", ".###.", "S...G"] },
  { name: "みっつ ひろって",     limit: 13, goods: ["🍌", "🧀", "🍩"],
    map: ["S.*..", ".#.#.", "*....", ".#.#.", "..*.G"] },
  { name: "ながい みち",         limit: 13, goods: ["🍫"],
    map: ["S...*", ".###.", ".....", ".###.", "G...."] },
  { name: "かべだらけ",          limit: 12, goods: ["🍎", "🥐"],
    map: ["S.#..", "..#.*", ".....", "*.#..", "..#.G"] },
  { name: "さいごの おつかい",   limit: 12, goods: ["🍓", "🥨", "🍪"],
    map: ["S.*..", ".###.", "*...*", ".###.", "G...."] },
];

/* うごく むき。がめんの うえ・した・ひだり・みぎ。
   「ロボットから みて」ではなく「がめんから みて」に する。
   5さいには こちらの ほうが ずっと わかりやすい */
const DIRS = {
  U: { v: [0, -1], emoji: "⬆️" },
  D: { v: [0, 1],  emoji: "⬇️" },
  L: { v: [-1, 0], emoji: "⬅️" },
  R: { v: [1, 0],  emoji: "➡️" },
};
const DIR_KEYS = ["U", "D", "L", "R"];

/* ================= せってい ================= */

const STEP_MS = 430;   // 1つの めいれいを こなす じかん。おいかけられる はやさに
const CELL_GAP = 3;

/* ================= ちいさい どうぐ ================= */

let idc = 1;
const nextId = () => idc++;

/* セーブキーは "<id>:save:v1" の かたち。ほかの ゲームと まざらない */
const save = createSave("robot:save:v1");

const C = { ...THEME, floor: "#fff3dc", wall: "#8a5a33", wallTop: "#a97148", grass: "#cfe9c0" };

/* え を よんで、かべ・スタート・ゴール・しなものの いちに ばらす */
function parseMap(map) {
  const h = map.length, w = map[0].length;
  let start = [0, 0], goal = [0, 0];
  const items = [], wall = [];
  for (let y = 0; y < h; y++) {
    wall.push([]);
    for (let x = 0; x < w; x++) {
      const c = map[y][x];
      wall[y].push(c === "#");
      if (c === "S") start = [x, y];
      if (c === "G") goal = [x, y];
      if (c === "*") items.push([x, y]);
    }
  }
  return { w, h, start, goal, items, wall, full: (1 << items.length) - 1 };
}

const inGrid = (g, x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h && !g.wall[y][x];
const itemIndexAt = (g, x, y) => g.items.findIndex((p) => p[0] === x && p[1] === y);

/* いまの ばしょ・もちもの から、ゴールまでの いちばん みじかい みちを さがす。
   ヒントにも ほしの かずにも これを つかう。
   マスは おおくても 36、もちものは 3つまでなので すぐ おわる */
function solveFrom(g, sx, sy, smask) {
  const key = (x, y, m) => (m * g.h + y) * g.w + x;
  const seen = new Set([key(sx, sy, smask)]);
  const q = [[sx, sy, smask, []]];
  while (q.length) {
    const [x, y, m, path] = q.shift();
    if (x === g.goal[0] && y === g.goal[1] && m === g.full) return path;
    for (const d of DIR_KEYS) {
      const [dx, dy] = DIRS[d].v;
      const nx = x + dx, ny = y + dy;
      if (!inGrid(g, nx, ny)) continue;
      const i = itemIndexAt(g, nx, ny);
      const nm = i >= 0 ? m | (1 << i) : m;
      const k = key(nx, ny, nm);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny, nm, path.concat(d)]);
    }
  }
  return null;
}

/* カードを ならべたとおりに あたまの なかで うごかしてみる。
   かべに ぶつかった ときは その ばに とどまる（しっぱいには しない） */
function simulate(g, prog) {
  let x = g.start[0], y = g.start[1], mask = 0;
  for (let i = 0; i < prog.length; i++) {
    const [dx, dy] = DIRS[prog[i]].v;
    const nx = x + dx, ny = y + dy;
    if (!inGrid(g, nx, ny)) continue;
    x = nx; y = ny;
    const it = itemIndexAt(g, x, y);
    if (it >= 0) mask |= 1 << it;
    if (x === g.goal[0] && y === g.goal[1] && mask === g.full) {
      return { x, y, mask, won: true, steps: i + 1 };
    }
  }
  return { x, y, mask, won: false, steps: prog.length };
}

/* つかった カードが すくないほど ほしが ふえる。ヒントを つかっても へらさない */
const starsFor = (steps, opt) => (steps <= opt ? 3 : steps <= opt + 2 ? 2 : 1);

/* ================= ほんたい ================= */

export default function RobotGame() {
  const [screen, setScreen] = useState("map");   // "map" ステージえらび / "play"
  const [si, setSi] = useState(0);               // いま あそんでいる ステージ
  const [prog, setProg] = useState([]);          // ならべた カード
  const [robot, setRobot] = useState({ x: 0, y: 0 });
  const [mask, setMask] = useState(0);           // ひろった しなもの
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);    // いま こなしている カード
  /* ロボットの うごきかた。n=なんてめ / bumps=かべに あたった かず / kind=すすんだ か あたった か。
     bumps を key に つかう。あたった ときは いちが かわらないので
     えを かけなおしても みため は かわらず、ゆれだけ もういちど ながれる。
     すすむ ときは かけなおさない。そうしないと なめらかに すべらず ワープして みえる */
  const [fx, setFx] = useState({ n: 0, bumps: 0, kind: null });
  const [hintLv, setHintLv] = useState(0);       // 0 なし / 1 みち / 2 ボタンも
  const [won, setWon] = useState(null);          // { stars, steps }
  const [stars, setStars] = useState(() => STAGES.map(() => 0));
  const [maxOpen, setMaxOpen] = useState(0);     // ここまで あそべる
  const [sound, setSound] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const blip = useBlip(sound);
  const aliveRef = useRef(true);
  const timerRef = useRef(null);

  const stage = STAGES[si];
  const g = useMemo(() => parseMap(stage.map), [stage]);
  const progSig = prog.join("");

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      setMaxOpen(Math.floor(safeNum(d.maxOpen, 0, STAGES.length - 1, 0)));
      if (Array.isArray(d.stars)) {
        setStars(STAGES.map((_, i) => Math.floor(safeNum(d.stars[i], 0, 3, 0))));
      }
    }
    setLoaded(true);
  }, []);

  /* ---------- じどうセーブ ---------- */
  const starSig = stars.join(",");
  useEffect(() => {
    if (!loaded || !save.available) return;
    save.save({ sound, stars, maxOpen });
    setSaving(true);
    const t = setTimeout(() => { if (aliveRef.current) setSaving(false); }, 500);
    return () => clearTimeout(t);
  }, [loaded, sound, starSig, maxOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- ステージを ひらく ---------- */
  const openStage = (i) => {
    if (i > maxOpen) { blip(200, 0.12); say("まえの ステージから やってみよう 🔒", "warn"); return; }
    if (timerRef.current) clearInterval(timerRef.current);
    const gg = parseMap(STAGES[i].map);
    setSi(i);
    setProg([]);
    setRobot({ x: gg.start[0], y: gg.start[1] });
    setMask(0);
    setRunning(false);
    setStepIdx(-1);
    setHintLv(0);
    setWon(null);
    setScreen("play");
    blip(700, 0.12);
  };

  const backToMap = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setStepIdx(-1);
    setWon(null);
    setScreen("map");
  };

  /* ---------- カードを おく・けす ---------- */
  const addCard = (d) => {
    if (running) return;
    if (prog.length >= stage.limit) {
      blip(200, 0.12);
      say("カードが いっぱい。🗑️ で けしてね", "warn");
      return;
    }
    blip(560, 0.09);
    setProg((p) => [...p, d]);
    setWon(null);
  };

  const removeCard = (i) => {
    if (running) return;
    blip(320, 0.09);
    setProg((p) => p.filter((_, k) => k !== i));
    setWon(null);
  };

  const clearAll = () => {
    if (running) return;
    blip(280, 0.14);
    setProg([]);
    setHintLv(0);
    setWon(null);
    setRobot({ x: g.start[0], y: g.start[1] });
    setMask(0);
  };

  /* このステージの さいたん手数。ほしの かずと ヒントの りょうほうで つかう */
  const opt = useMemo(() => {
    const s = solveFrom(g, g.start[0], g.start[1], 0);
    return s ? s.length : 0;
  }, [g]);

  /* ---------- うごかす ---------- */
  const runProgram = () => {
    if (running || prog.length === 0) return;
    setRunning(true);
    setWon(null);
    setHintLv(0);

    let i = 0, x = g.start[0], y = g.start[1], m = 0;
    setRobot({ x, y });
    setMask(0);
    setStepIdx(-1);
    setFx({ n: 0, bumps: 0, kind: null });

    const stop = () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
      if (!aliveRef.current) return;
      setRunning(false);
      setStepIdx(-1);
    };

    timerRef.current = setInterval(() => {
      if (!aliveRef.current) { clearInterval(timerRef.current); return; }

      if (i >= prog.length) {
        stop();
        say("ゴールできなかった。もういちど！", "warn");
        setTimeout(() => {
          if (!aliveRef.current) return;
          setRobot({ x: g.start[0], y: g.start[1] });
          setMask(0);
        }, 700);
        return;
      }

      setStepIdx(i);
      const [dx, dy] = DIRS[prog[i]].v;
      const nx = x + dx, ny = y + dy;

      if (!inGrid(g, nx, ny)) {
        /* かべに あたっても とまるだけ。げーむおーばーには しない */
        blip(180, 0.12);
        setFx((f) => ({ n: f.n + 1, bumps: f.bumps + 1, kind: "bump" }));
      } else {
        setFx((f) => ({ n: f.n + 1, bumps: f.bumps, kind: "hop" }));
        x = nx; y = ny;
        const it = itemIndexAt(g, x, y);
        if (it >= 0 && !(m & (1 << it))) {
          m |= 1 << it;
          blip(940, 0.16);
        } else {
          blip(500, 0.07);
        }
        setRobot({ x, y });
        setMask(m);
      }
      i++;

      if (x === g.goal[0] && y === g.goal[1] && m === g.full) {
        stop();
        const s = starsFor(i, opt);
        blip(1040, 0.3);
        setWon({ stars: s, steps: i });
        setStars((a) => (s > a[si] ? a.map((v, k) => (k === si ? s : v)) : a));
        setMaxOpen((v) => Math.max(v, Math.min(si + 1, STAGES.length - 1)));
      }
    }, STEP_MS);
  };

  /* ---------- ヒント ----------
     いま ならべた カードを あたまの なかで さいごまで うごかし、
     とまった ばしょから ゴールまでの みちを けいさんする。
     まちがった カードが はいっていても、その さきから ちゃんと あんないできる */
  const ghost = useMemo(() => simulate(g, prog), [g, progSig]); // eslint-disable-line react-hooks/exhaustive-deps
  const rest = useMemo(
    () => (ghost.won ? [] : solveFrom(g, ghost.x, ghost.y, ghost.mask)),
    [g, ghost]
  );

  /* ヒントの みちを マスの ならびに ひらく */
  const hintCells = useMemo(() => {
    if (hintLv < 1 || !rest || rest.length === 0) return [];
    const out = [];
    let x = ghost.x, y = ghost.y;
    rest.forEach((d) => {
      const [dx, dy] = DIRS[d].v;
      x += dx; y += dy;
      out.push({ x, y });
    });
    return out;
  }, [hintLv, rest, ghost]);

  const hintArrow = hintLv >= 2 && rest && rest.length ? rest[0] : null;

  const useHint = () => {
    if (running) return;
    blip(520, 0.16);
    if (ghost.won) { say("その ならびで ゴールできるよ。▶️ を おそう！"); return; }
    if (!rest) { say("🗑️ で けしてから やりなおそう", "warn"); return; }
    if (prog.length + rest.length > stage.limit) {
      setHintLv(1);
      say("カードが たりないよ。🗑️ で けしてみよう", "warn");
      return;
    }
    if (hintLv === 0) { setHintLv(1); say("うすい みちを たどってみて 💡"); return; }
    if (hintLv === 1) { setHintLv(2); say("ひかっている ボタンを おそう 💡"); return; }
    /* 3かいめは 1まい おいてあげる */
    setProg((p) => [...p, rest[0]]);
    say(`${DIRS[rest[0]].emoji} を 1まい おいたよ`);
  };

  /* ---------- みため ---------- */
  const left = stage.limit - prog.length;
  const pill = {
    display: "flex", alignItems: "center", gap: 3, background: "#fff",
    borderRadius: 999, padding: "3px 10px", border: `2px solid ${C.gold}`,
  };
  const hint = { margin: "0 0 8px", textAlign: "center", fontSize: 14, color: C.ink, opacity: 0.75 };
  const totalStars = stars.reduce((s, v) => s + v, 0);

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
        @keyframes bumpx {
          0%,100%{ transform:translate(-50%,-50%) }
          25%{ transform:translate(-58%,-50%) }
          75%{ transform:translate(-42%,-50%) }
        }
        @keyframes hopA {
          0%,100%{ transform:translate(-50%,-50%) scale(1,1) }
          40%{ transform:translate(-50%,-58%) scale(.92,1.08) }
        }
        @keyframes hopB {
          0%,100%{ transform:translate(-50%,-50%) scale(1,1) }
          40%{ transform:translate(-50%,-58%) scale(.92,1.08) }
        }
        @keyframes ring { 0%,100%{ box-shadow:0 0 0 0 rgba(255,201,60,.9) }
                          50%{ box-shadow:0 0 0 10px rgba(255,201,60,0) } }
        @keyframes dotIn { 0%{ transform:translate(-50%,-50%) scale(.2); opacity:0 }
                           100%{ transform:translate(-50%,-50%) scale(1); opacity:.85 } }
        @keyframes shine { 0%,100%{ filter:brightness(1) } 50%{ filter:brightness(1.3) } }
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
        {screen === "play" ? (
          <>
            <button className="bigbtn" onClick={backToMap}
              style={{ background: "#ffe9c9", borderRadius: 999, padding: "6px 12px", fontSize: 14,
                       boxShadow: "0 3px 0 #e5c79a" }}>
              ◀ ステージ
            </button>
            <div style={pill}><b style={{ fontSize: 15 }}>{si + 1}. {stage.name}</b></div>
          </>
        ) : (
          <div style={pill}><span style={{ fontSize: 18 }}>⭐</span>
            <b style={{ fontSize: 18 }}>{totalStars}</b>
            <span style={{ fontSize: 12 }}>/{STAGES.length * 3}</span></div>
        )}
        <span style={{ marginLeft: "auto", fontSize: 16, opacity: saving ? 1 : 0.15,
                       transition: "opacity .3s" }} title="セーブちゅう">💾</span>
        <button className="bigbtn" onClick={() => setSound((s) => !s)} aria-label="おと"
          style={{ background: "transparent", fontSize: 22, padding: 4 }}>
          {sound ? "🔊" : "🔇"}
        </button>
      </div>

      {/* ===== ステージえらび ===== */}
      {screen === "map" && (
        <div style={{ padding: 12 }}>
          <p style={hint}>ロボットに めいれいを ならべて、おつかいして おうちへ かえろう</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))",
                        gap: 10 }}>
            {STAGES.map((s, i) => {
              const open = i <= maxOpen;
              const got = stars[i];
              return (
                <button key={i} className="bigbtn" onClick={() => openStage(i)}
                  style={{ background: open ? "#fff" : "#eef3f7", borderRadius: 18, padding: "10px 6px",
                    border: `4px solid ${open ? (got ? C.gold : "#dfe7ee") : "#dde6ec"}`,
                    boxShadow: open ? "0 4px 0 #e5c79a" : "none", textAlign: "center",
                    opacity: open ? 1 : 0.65 }}>
                  <div style={{ fontSize: 26, lineHeight: 1.1 }}>{open ? "🤖" : "🔒"}</div>
                  <div style={{ fontSize: 12, fontWeight: 900, margin: "3px 0 2px" }}>
                    {i + 1}. {s.name}
                  </div>
                  <div style={{ fontSize: 13, letterSpacing: 1 }}>
                    {open ? "⭐".repeat(got) + "・".repeat(3 - got) : "　"}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                    カード {s.limit}まい{s.goods.length ? ` / ${s.goods.join("")}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
          <ToastRow toasts={toasts} fixed />
        </div>
      )}

      {/* ===== あそぶ ===== */}
      {screen === "play" && (
        <div style={{ padding: 10 }}>
          <p style={hint}>
            {stage.goods.length
              ? `${stage.goods.join("")} を ぜんぶ ひろってから 🏠 へ`
              : "🏠 まで つれていこう"}
          </p>

          {/* めいろ */}
          <div style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto",
                        padding: CELL_GAP, borderRadius: 20, background: C.grass,
                        boxShadow: "0 5px 0 #a9c99a" }}>
            <div style={{ position: "relative" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${g.w},1fr)`, gap: 0 }}>
                {Array.from({ length: g.w * g.h }, (_, k) => {
                  const x = k % g.w, y = Math.floor(k / g.w);
                  const isWall = g.wall[y][x];
                  const isGoal = x === g.goal[0] && y === g.goal[1];
                  const isStart = x === g.start[0] && y === g.start[1];
                  const it = itemIndexAt(g, x, y);
                  const taken = it >= 0 && (mask & (1 << it));
                  return (
                    <div key={k} style={{ aspectRatio: "1 / 1", padding: CELL_GAP / 2 }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "min(6vw,26px)", lineHeight: 1,
                        background: isWall
                          ? `linear-gradient(180deg,${C.wallTop} 0%,${C.wall} 100%)`
                          : C.floor,
                        border: isWall ? "none" : "2px solid rgba(0,0,0,.06)",
                        boxShadow: isWall ? "inset 0 -3px 0 rgba(0,0,0,.2)" : "none" }}>
                        {isWall ? "🧱"
                          : isGoal ? "🏠"
                          : it >= 0
                            ? <span style={{ opacity: taken ? 0.18 : 1,
                                             animation: taken ? "none" : "shine 1.6s ease-in-out infinite" }}>
                                {stage.goods[it] || "🍎"}
                              </span>
                            : isStart ? <span style={{ opacity: 0.25, fontSize: "min(4vw,16px)" }}>🚩</span>
                            : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ヒントの みち */}
              {hintCells.map((c, i) => (
                <span key={i} style={{ position: "absolute", pointerEvents: "none",
                  left: `${((c.x + 0.5) / g.w) * 100}%`, top: `${((c.y + 0.5) / g.h) * 100}%`,
                  width: 12, height: 12, borderRadius: "50%", background: C.gold,
                  border: "2px solid #fff",
                  animation: `dotIn .25s ease-out ${i * 0.05}s both` }} />
              ))}

              {/* カードを さいごまで うごかしたら とまる ばしょ */}
              {hintLv >= 1 && prog.length > 0 && !ghost.won && (
                <span style={{ position: "absolute", pointerEvents: "none",
                  left: `${((ghost.x + 0.5) / g.w) * 100}%`, top: `${((ghost.y + 0.5) / g.h) * 100}%`,
                  transform: "translate(-50%,-50%)", width: "min(11vw,42px)", height: "min(11vw,42px)",
                  borderRadius: 12, border: `3px dashed ${C.coral}`, opacity: 0.8 }} />
              )}

              {/* ロボット。ぴょんの アニメは おなじ なかみの hopA / hopB を かわりばんこに
                  つかう。なまえが かわると さいしょから ながれるので、えを かけなおさずに
                  1ぽごと ぴょんと できる */}
              <span key={fx.bumps} style={{ position: "absolute", pointerEvents: "none",
                left: `${((robot.x + 0.5) / g.w) * 100}%`, top: `${((robot.y + 0.5) / g.h) * 100}%`,
                transform: "translate(-50%,-50%)", fontSize: "min(7vw,30px)", lineHeight: 1,
                transition: "left .2s ease-out, top .2s ease-out",
                filter: "drop-shadow(0 3px 3px rgba(0,0,0,.3))",
                animation: !running ? "none"
                  : fx.kind === "bump" ? "bumpx .3s ease-in-out"
                  : fx.kind === "hop" ? `${fx.n % 2 ? "hopA" : "hopB"} .43s ease-in-out`
                  : "none" }}>
                🤖
              </span>
            </div>
            <ToastRow toasts={toasts} />
          </div>

          {/* ならべた カード */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center",
                        margin: "12px auto 8px", padding: 8, background: "#fff", borderRadius: 16,
                        border: `3px solid ${C.gold}`, maxWidth: 340 }}>
            {Array.from({ length: stage.limit }, (_, i) => {
              const d = prog[i];
              const now = running && i === stepIdx;
              return (
                <button key={i} className="bigbtn" disabled={!d || running}
                  onClick={() => removeCard(i)} aria-label={d ? "けす" : "からっぽ"}
                  style={{ width: 36, height: 36, borderRadius: 11, fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: d ? (now ? C.gold : "#ffe9c9") : "transparent",
                    border: d ? `2px solid ${now ? "#d9a520" : "#e5c79a"}`
                             : "2px dashed #dfe7ee",
                    cursor: d && !running ? "pointer" : "default",
                    transform: now ? "translateY(-2px)" : "none" }}>
                  {d ? DIRS[d].emoji : ""}
                </button>
              );
            })}
          </div>

          {/* じゅうじボタン */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,64px)",
                        gridTemplateRows: "repeat(3,64px)", gap: 6, justifyContent: "center",
                        margin: "0 auto 10px" }}>
            {[
              null, "U", null,
              "L", "mid", "R",
              null, "D", null,
            ].map((cell, k) => {
              if (cell === null) return <span key={k} />;
              if (cell === "mid") {
                return (
                  <span key={k} style={{ display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", borderRadius: 14,
                    background: left > 0 ? "#fff" : "#ffd6c9",
                    border: `3px solid ${left > 0 ? "#dfe7ee" : "#e06a3c"}` }}>
                    <b style={{ fontSize: 22, lineHeight: 1 }}>{left}</b>
                    <span style={{ fontSize: 10, opacity: 0.75 }}>のこり</span>
                  </span>
                );
              }
              const lit = hintArrow === cell;
              return (
                <button key={k} className="bigbtn" onClick={() => addCard(cell)}
                  disabled={running} aria-label={cell}
                  style={{ borderRadius: 16, fontSize: 30, padding: 0,
                    background: lit ? C.gold : "#fff",
                    border: `4px solid ${lit ? "#d9a520" : "#dfe7ee"}`,
                    boxShadow: `0 5px 0 ${lit ? "#c08e14" : "#d8e3ea"}`,
                    opacity: running || left === 0 ? 0.5 : 1,
                    animation: lit ? "ring 1.1s ease-out infinite" : "none" }}>
                  {DIRS[cell].emoji}
                </button>
              );
            })}
          </div>

          {/* そうさ */}
          <div style={{ display: "flex", gap: 8, maxWidth: 340, margin: "0 auto" }}>
            <button className="bigbtn" onClick={runProgram} disabled={running || prog.length === 0}
              style={{ flex: 2, padding: "16px 8px", fontSize: 20, borderRadius: 16,
                background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a",
                opacity: running || prog.length === 0 ? 0.5 : 1 }}>
              {running ? "うごいてる…" : "▶️ スタート"}
            </button>
            <button className="bigbtn" onClick={useHint} disabled={running}
              style={{ flex: 1, padding: "16px 4px", fontSize: 17, borderRadius: 16,
                background: C.gold, color: C.ink, boxShadow: "0 5px 0 #d9a520",
                opacity: running ? 0.5 : 1 }}>
              💡 ヒント
            </button>
            <button className="bigbtn" onClick={clearAll} disabled={running || prog.length === 0}
              style={{ flex: 1, padding: "16px 4px", fontSize: 19, borderRadius: 16,
                background: "#fff", color: C.ink, boxShadow: "0 5px 0 #d8e3ea",
                opacity: running || prog.length === 0 ? 0.5 : 1 }}>
              🗑️
            </button>
          </div>
        </div>
      )}

      {/* ===== クリア ===== */}
      {won && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 20,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: C.cream, borderRadius: 26, padding: 20, width: "100%",
                        maxWidth: 340, textAlign: "center", border: `5px solid ${C.gold}` }}>
            <p style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>ただいま！ 🎉</p>
            <div style={{ fontSize: 64, lineHeight: 1.2, animation: "pop .45s ease-out" }}>🤖🏠</div>
            <div style={{ fontSize: 34, letterSpacing: 4, margin: "8px 0 2px" }}>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} style={{ opacity: i < won.stars ? 1 : 0.22,
                  display: "inline-block",
                  animation: i < won.stars ? `pop .4s ease-out ${i * 0.14}s both` : "none" }}>⭐</span>
              ))}
            </div>
            <p style={{ fontSize: 14, margin: "6px 0 14px", opacity: 0.8 }}>
              つかった カード {won.steps}まい{won.steps > opt ? `（さいたんは ${opt}まい）` : "・さいたん！"}
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="bigbtn" onClick={() => openStage(si)}
                style={{ flex: 1, padding: "14px 6px", fontSize: 16, borderRadius: 16,
                  background: "#fff", color: C.ink, boxShadow: "0 5px 0 #d8e3ea" }}>
                🔁 もういちど
              </button>
              {si < STAGES.length - 1 ? (
                <button className="bigbtn" onClick={() => openStage(si + 1)}
                  style={{ flex: 2, padding: "14px 6px", fontSize: 18, borderRadius: 16,
                    background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
                  つぎの ステージ ▶
                </button>
              ) : (
                <button className="bigbtn" onClick={backToMap}
                  style={{ flex: 2, padding: "14px 6px", fontSize: 18, borderRadius: 16,
                    background: C.coral, color: "#fff", boxShadow: "0 5px 0 #c9522a" }}>
                  ぜんぶ クリア！ 🏆
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
