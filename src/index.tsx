import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import BRApp, { getBoundedRegretChapterName } from "./app/BRApp";
import DAApp, { getDeltaAcademyChapterName } from "./app/DAApp";
import IMSApp from "./app/IMSApp";
import { autopopulateReviewAreas } from "./app/inlineReviewModuleSlice";
import { performInitialSync } from "./app/orbitSyncMiddleware";
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
} else if (document.location.pathname.startsWith("/sh/br")) {
  window.addEventListener(
    "load",
    () => {
      const chapterName = getBoundedRegretChapterName();
      loadPageData(<BRApp />, `sh/br/${chapterName}`);
    },
    { once: true },
  );
} else if (document.location.pathname.startsWith("/sh/da")) {
  window.addEventListener(
    "load",
    () => {
      const reactRoot = document.createElement("DIV");
      reactRoot.id = "demo-root";
      document.body.prepend(reactRoot);

      const orbitScript = document.createElement("SCRIPT") as HTMLScriptElement;
      orbitScript.type = "module";
      orbitScript.src = "/orbit-web-component.js";
      document.head.prepend(orbitScript);

      const chapterName = getDeltaAcademyChapterName();
      loadPageData(<DAApp />, `sh/da/${chapterName}`);
    },
    { once: true },
  );
} else if (document.location.pathname.includes("ims")) {
  window.addEventListener(
    "load",
    () => {
      // Give the LaTeX a chance to resolve...
      // @ts-ignore
      MathJax.Hub.Register.StartupHook("End", () => {
        const chapterName =
          window.location.pathname.match(/\/ims\/(.+?).html$/)![1];
        loadPageData(<IMSApp />, `ims/${chapterName}`);
      });
    },
    { once: true },
  );
}

async function loadPageData(page: ReactNode, subpath: string) {
  await store.dispatch(loadPrompts(subpath));
  await store.dispatch(autopopulateReviewAreas(store.getState().prompts));
  await performInitialSync(store);

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
