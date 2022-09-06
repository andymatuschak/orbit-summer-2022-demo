import React from "react";
import ReactDOM from "react-dom/client";
import ShapeUp from "./components/ShapeUp";
import "./static/styles/index.css";

const root = ReactDOM.createRoot(document.getElementById("demo-root")!);
if (document.location.pathname.includes("shape-up")) {
  root.render(<ShapeUp />);
}
