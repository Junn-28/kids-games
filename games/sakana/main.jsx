import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/shared/base.css";
import SakanaGame from "./SakanaGame.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SakanaGame />
  </React.StrictMode>
);
