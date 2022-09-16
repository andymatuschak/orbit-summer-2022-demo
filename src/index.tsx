import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import IMSApp from "./app/IMSApp";
import { loadPrompts } from "./app/promptSlice";
import ShapeUpApp from "./app/ShapeUpApp";
import "./static/styles/index.css";
import { store } from "./app/store";

let page: ReactNode | null = null;

if (document.location.pathname.includes("shape-up")) {
  page = <ShapeUpApp />;
  const chapterName = window.location.pathname.match(
    /\/shape-up\/shapeup\/(.+?)(\/.*)?$/,
  )![1];
  store.dispatch(loadPrompts(`shapeup/${chapterName}`));
} else if (document.location.pathname.includes("ims")) {
  page = <IMSApp />;
  const chapterName = window.location.pathname.match(/\/ims\/(.+?).html$/)![1];
  // Give the LaTeX a chance to resolve...
  setTimeout(() => {
    store.dispatch(loadPrompts(`ims/${chapterName}`));
  }, 1000);
}

if (page) {
  const root = ReactDOM.createRoot(document.getElementById("demo-root")!);
  root.render(<Provider store={store}>{page}</Provider>);
}
