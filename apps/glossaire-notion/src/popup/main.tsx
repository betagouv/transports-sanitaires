// Browser entry point of the popup: mounts the React tree.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./Popup";
import "./popup.css";

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root absent de index.html.");

createRoot(root).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
