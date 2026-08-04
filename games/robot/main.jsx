import React from "react";
import { createRoot } from "react-dom/client";
import "../../src/shared/base.css";
import RobotGame from "./RobotGame.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RobotGame />
  </React.StrictMode>
);
