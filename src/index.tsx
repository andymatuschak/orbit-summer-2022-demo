import React from "react";
import ReactDOM from "react-dom/client";
import ShapeUpApp from "./app/ShapeUpApp";
import "./static/styles/index.css";

const root = ReactDOM.createRoot(document.getElementById("demo-root")!);
if (document.location.pathname.includes("shape-up")) {
  root.render(<ShapeUpApp />);
}
