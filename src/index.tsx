import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import IMSApp from "./app/IMSApp";
import { loadPrompts } from "./app/promptSlice";
import ShapeUpApp, { getShapeUpChapterName } from "./app/ShapeUpApp";
import { store } from "./app/store";
import "./static/styles/index.css";

let page: ReactNode | null = null;

if (document.location.pathname.includes("shape-up")) {
  page = <ShapeUpApp />;
  window.addEventListener(
    "load",
    () => {
      const chapterName = getShapeUpChapterName();
      store.dispatch(loadPrompts(`shapeup/${chapterName}`));
    },
    { once: true },
  );
} else if (document.location.pathname.includes("ims")) {
  page = <IMSApp />;
  const chapterName = window.location.pathname.match(/\/ims\/(.+?).html$/)![1];
  // Give the LaTeX a chance to resolve...
  setTimeout(() => {
    store.dispatch(loadPrompts(`ims/${chapterName}`));
  }, 2000);
}

if (page) {
  const root = ReactDOM.createRoot(document.getElementById("demo-root")!);
  root.render(<Provider store={store}>{page}</Provider>);
}
