import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/shared/base.css";
import CraneGame from "./CraneGame.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CraneGame />
  </React.StrictMode>
);
