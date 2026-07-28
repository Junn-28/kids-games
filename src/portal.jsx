import React from "react";
import { createRoot } from "react-dom/client";
import "./shared/base.css";
import { GAMES, urlOf } from "./games.js";
import { FONT, C } from "./shared/theme.js";

function Portal() {
  return (
    <div
      style={{
        fontFamily: FONT,
        background: C.sky,
        minHeight: "100vh",
        color: C.ink,
        padding: "24px 16px 40px",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <style>{`
        @keyframes bob { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-6px) } }
        .card { text-decoration:none; display:block; transition:transform .12s ease; }
        .card:active { transform:translateY(3px); }
        @media (prefers-reduced-motion: reduce) { * { animation-duration:.01ms !important } }
      `}</style>

      <header style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 56, animation: "bob 2.5s ease-in-out infinite" }}>🎮</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "6px 0 4px" }}>こどもゲーム</h1>
        <p style={{ fontSize: 14, color: "#5b7f9c", margin: 0, lineHeight: 1.6 }}>
          あそびたい ゲームを えらんでね
        </p>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 14,
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        {GAMES.map((g) => (
          <a key={g.id} className="card" href={urlOf(g)}>
            <div
              style={{
                background: "#fff",
                borderRadius: 22,
                padding: "18px 16px",
                boxShadow: "0 5px 0 #d8e9f3",
                borderTop: `6px solid ${g.color}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ fontSize: 46, lineHeight: 1 }}>{g.emoji}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 900 }}>{g.title}</div>
                <div style={{ fontSize: 13, color: "#5b7f9c", marginTop: 2 }}>{g.tagline}</div>
                <div style={{ fontSize: 12, color: "#8aa6b8", marginTop: 4 }}>{g.age}</div>
              </div>
            </div>
          </a>
        ))}
      </main>

      <footer
        style={{
          maxWidth: 760,
          margin: "30px auto 0",
          fontSize: 12,
          color: "#8aa6b8",
          textAlign: "center",
          lineHeight: 1.8,
        }}
      >
        広告なし・登録なし・外部への通信なし。
        <br />
        セーブデータは つかっている 端末の なかだけに ほぞんされます。
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Portal />
  </React.StrictMode>
);
