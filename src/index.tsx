import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import IMSApp from "./app/IMSApp";
import { autopopulateReviewAreas } from "./app/inlineReviewModuleSlice";
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
      loadPageData(`shapeup/${chapterName}`);
    },
    { once: true },
  );
} else if (document.location.pathname.includes("ims")) {
  page = <IMSApp />;
  // Give the LaTeX a chance to resolve...
  setTimeout(() => {
    const chapterName =
      window.location.pathname.match(/\/ims\/(.+?).html$/)![1];
    loadPageData(`ims/${chapterName}`);
  }, 2000);
}

if (page) {
  const root = ReactDOM.createRoot(document.getElementById("demo-root")!);
  root.render(<Provider store={store}>{page}</Provider>);
}

async function loadPageData(subpath: string) {
  await store.dispatch(loadPrompts(subpath));
  await store.dispatch(autopopulateReviewAreas(store.getState().prompts));
}
