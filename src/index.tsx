import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import BRApp, { getBoundedRegretChapterName } from "./app/BRApp";
import DAApp, { getDeltaAcademyChapterName } from "./app/DAApp";
import IMSApp from "./app/IMSApp";
import { autopopulateReviewAreas } from "./app/inlineReviewModuleSlice";
import { initializeOrbitSyncMiddleware } from "./app/orbitSyncMiddleware";
import PDFApp from "./app/PDFApp";
import { loadPrompts } from "./app/promptSlice";
import ShapeUpApp, { getShapeUpChapterName } from "./app/ShapeUpApp";
import { persistor, store } from "./app/store";
import "./static/styles/index.css";
import { prototypeBackendBaseURL } from "./config";

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
} else if (document.location.pathname.startsWith("/pdfjs")) {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(async () => {
      // Force all the PDF pages to be rendered to the DOM.
      // @ts-ignore
      const app = PDFViewerApplication;
      await app.pdfLoadingTask.promise;
      const pdfViewer = app.pdfViewer;
      await pdfViewer.pagesPromise;
      console.log("DONE loading PDF");

      const url = new URL(document.location.href);
      const file = url.searchParams.get("file");

      const reactRoot = document.createElement("DIV");
      reactRoot.id = "demo-root";
      document.getElementById("viewerContainer")!.prepend(reactRoot);

      const orbitScript = document.createElement("SCRIPT") as HTMLScriptElement;
      orbitScript.type = "module";
      orbitScript.src = "/orbit-web-component.js";
      document.head.prepend(orbitScript);

      // HACK: Lazily assuming that file always begins with /
      loadPageData(<PDFApp />, `pdf/${file!.slice(1)}`);
    }, 1000); // HACK
  });
} else if (document.location.pathname.startsWith("/pdf")) {
  const url = new URL(document.location.href);
  const pdfURL = url.searchParams.get("url");
  if (!pdfURL) {
    alert("Provide a PDF URL via /pdf?url=...");
    throw new Error("No PDF URL");
  }
  const fileParam = `${prototypeBackendBaseURL}/pdf?url=${encodeURIComponent(
    pdfURL,
  )}`;
  document.location.href = `/pdfjs/web/viewer.html?file=${encodeURIComponent(
    fileParam,
  )}`;
} else if (document.location.pathname.startsWith("/sh/da")) {
  window.addEventListener(
    "load",
    () => {
      const reactRoot = document.createElement("DIV");
      reactRoot.id = "demo-root";
      document.body.prepend(reactRoot);

      const favicon1 = document.createElement("LINK") as HTMLLinkElement;
      favicon1.rel = "icon";
      favicon1.type = "image/png";
      favicon1.href = "/sh/da/delta_logo.png";
      document.head.prepend(favicon1);

      const favicon2 = document.createElement("LINK") as HTMLLinkElement;
      favicon2.rel = "apple-touch-icon";
      favicon2.type = "image/png";
      favicon2.href = "/sh/da/delta_logo.png";
      document.head.prepend(favicon2);

      const orbitScript = document.createElement("SCRIPT") as HTMLScriptElement;
      orbitScript.type = "module";
      orbitScript.src = "/orbit-web-component.js";
      document.head.prepend(orbitScript);

      // Iframes don't export properly from Notion.
      const iframeLinks =
        document.querySelectorAll<HTMLAnchorElement>("figure .source a");
      for (const link of iframeLinks) {
        const iframe = document.createElement("iframe");
        iframe.style.border = "none";

        if (link.href.endsWith(".mp4")) {
          const videoElement = document.createElement("video");
          videoElement.style.width = "100%";
          videoElement.controls = true;
          videoElement.autoplay = false;
          videoElement.src = link.href;
          link.parentElement!.replaceWith(videoElement);
        } else {
          const ytMatch = link.href.match(/youtube\.com\/watch\?v=(.+)$/);
          if (ytMatch) {
            iframe.src = `https://youtube.com/embed/${ytMatch[1]}`;
          } else {
            iframe.src = link.href;
          }
          if (link.href.includes("notionlytics")) {
            iframe.width = "0";
            iframe.height = "0";
          } else {
            iframe.width = "666";
            iframe.height = "400";
          }
          link.parentElement!.replaceWith(iframe);
        }
      }

      // Narrow the page.
      document.head.innerHTML = document.head.innerHTML.replace(
        "max-width: 900px",
        "max-width: 650px",
      );

      // Replace orbit review placeholders with the placeholders we'll fill in.
      const reviews = document.evaluate(
        "//p[contains(., 'ORBIT REVIEW')]",
        document.body,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null,
      );
      for (let i = 0; i < reviews.snapshotLength; i++) {
        const review = reviews.snapshotItem(i) as Element;
        const reviewAreaPlaceholder = document.createElement("div");
        reviewAreaPlaceholder.className = "orbit-reviewarea";
        reviewAreaPlaceholder.style.marginTop = "16px";
        review.replaceWith(reviewAreaPlaceholder);
      }

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
  // await store.dispatch(autopopulateReviewAreas(store.getState().prompts));
  await initializeOrbitSyncMiddleware(store);

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
