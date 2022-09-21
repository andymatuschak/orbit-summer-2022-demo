import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import IMSApp from "./app/IMSApp";
import { autopopulateReviewAreas } from "./app/inlineReviewModuleSlice";
import { loadPrompts } from "./app/promptSlice";
import ShapeUpApp, { getShapeUpChapterName } from "./app/ShapeUpApp";
import { persistor, store } from "./app/store";
import "./static/styles/index.css";

if (document.location.pathname.includes("shape-up")) {
  window.addEventListener(
    "load",
    () => {
      const chapterName = getShapeUpChapterName();
      loadPageData(<ShapeUpApp />, `shapeup/${chapterName}`);
    },
    { once: true },
  );
} else if (document.location.pathname.includes("ims")) {
  // Give the LaTeX a chance to resolve...
  setTimeout(() => {
    const chapterName =
      window.location.pathname.match(/\/ims\/(.+?).html$/)![1];
    loadPageData(<IMSApp />, `ims/${chapterName}`);
  }, 2000);
}

async function loadPageData(page: ReactNode, subpath: string) {
  await store.dispatch(loadPrompts(subpath));
  await store.dispatch(autopopulateReviewAreas(store.getState().prompts));

  if (page) {
    const root = ReactDOM.createRoot(document.getElementById("demo-root")!);
    root.render(
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          {page}
        </PersistGate>
      </Provider>,
    );
  }
}
