/* あたらしすぎる絵文字を見つける。
 *
 * こどものタブレットは古いことがある。絵文字は端末のフォントに入っている
 * ぶんしか出ず、入っていないと □ や × になる。実際に、じぶんで作った料理の
 * アイコンが × になる不具合があった（🫕 U+1FAD5 = Unicode 13.0）。
 *
 * このリポジトリの基準は Unicode 11.0（2018年）まで。
 * 材料の 🥬 🥩 と ヘッダーの 🧺 が 11.0 なので、そこが下限になっている。
 *
 *   npm run check:emoji
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/* Symbols and Pictographs Extended-A。まるごと Unicode 12.0 以降 */
const EXT_A = [0x1FA70, 0x1FAFF];

/* このブロックの外にある 12.0 以降の絵文字。見つけたら足す */
const NEW_OUTSIDE = new Map([
  [0x1F93F, "🤿 12.0"], [0x1F9CB, "🧋 13.0"], [0x1F9A3, "🦣 13.0"],
  [0x1F9A4, "🦤 13.0"], [0x1F9A5, "🦥 12.0"], [0x1F9A6, "🦦 12.0"],
  [0x1F9A7, "🦧 12.0"], [0x1F9A8, "🦨 12.0"], [0x1F9A9, "🦩 12.0"],
  [0x1F9AA, "🦪 12.0"], [0x1F9AB, "🦫 13.0"], [0x1F9AC, "🦬 13.0"],
  [0x1F9AD, "🦭 13.0"], [0x1F9AE, "🦮 12.0"], [0x1F971, "🥱 12.0"],
  [0x1F97B, "🩱 12.0"], [0x1FAE0, "🫠 14.0"],
]);

/* 中身が新しい ZWJ 合字。分解して出るぶん × よりはマシだが、崩れる */
const NEW_ZWJ = new Map([["🐻‍❄️", "13.0"], ["🧔‍♀️", "13.0"], ["👨‍🍼", "13.0"]]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ([".jsx", ".js", ".html", ".md", ".css"].includes(extname(p))) out.push(p);
  }
  return out;
};

const root = process.argv[2] || ".";
const problems = [];

for (const file of walk(root)) {
  const src = readFileSync(file, "utf8");
  const seen = new Set();

  for (const ch of src) {
    const cp = ch.codePointAt(0);
    const inExtA = cp >= EXT_A[0] && cp <= EXT_A[1];
    if (!inExtA && !NEW_OUTSIDE.has(cp)) continue;
    const key = file + cp;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = src.slice(0, src.indexOf(ch)).split("\n").length;
    problems.push({
      file, line, ch,
      cp: "U+" + cp.toString(16).toUpperCase(),
      why: NEW_OUTSIDE.get(cp) || "Unicode 12.0 以降",
    });
  }

  for (const [seq, ver] of NEW_ZWJ) {
    if (!src.includes(seq)) continue;
    const line = src.slice(0, src.indexOf(seq)).split("\n").length;
    problems.push({ file, line, ch: seq, cp: "ZWJ合字", why: `Unicode ${ver}` });
  }
}

if (!problems.length) {
  console.log("✅ あたらしすぎる絵文字はありません（基準: Unicode 11.0）");
  process.exit(0);
}

console.log("❌ 古い端末で □ や × になる絵文字があります（基準: Unicode 11.0）\n");
for (const p of problems)
  console.log(`  ${p.file}:${p.line}  ${p.ch}  ${p.cp}  ${p.why}`);
console.log("\nUnicode 11.0 までの絵文字に置きかえてください。");
console.log("並び順が意味を持つ配列（ORIG_EMOJI など）は、位置を変えずに差しかえること。");
process.exit(1);
