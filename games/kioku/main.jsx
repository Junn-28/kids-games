import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/shared/base.css";
import KiokuGame from "./KiokuGame.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <KiokuGame />
  </React.StrictMode>
);
