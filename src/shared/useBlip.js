import { useRef, useCallback } from "react";

/* ぴこっという効果音。音源ファイルなし＝ネットワークアクセスなし。
   音が出せない環境でも 例外を投げずに 無音で続行する。 */
export function useBlip(on) {
  const ctxRef = useRef(null);
  return useCallback(
    (freq, dur = 0.12) => {
      if (!on) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!ctxRef.current) ctxRef.current = new Ctx();
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") ctx.resume();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(freq * 1.6, ctx.currentTime + dur);
        g.gain.setValueAtTime(0.18, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + dur);
      } catch {
        /* おとが でなくても あそべる */
      }
    },
    [on]
  );
}
