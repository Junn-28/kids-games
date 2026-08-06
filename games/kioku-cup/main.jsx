import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/shared/base.css";
import KiokuCupGame from "./KiokuCupGame.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <KiokuCupGame />
  </React.StrictMode>
);
