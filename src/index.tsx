import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { loadPrompts } from "./app/promptSlice";
import ShapeUpApp from "./app/ShapeUpApp";
import "./static/styles/index.css";
import { store } from "./app/store";

let page: ReactNode | null = null;

if (document.location.pathname.includes("shape-up")) {
  page = <ShapeUpApp />;
}

if (page) {
  // TODO: generalize path bits for IMS
  const chapterName = window.location.pathname.match(
    /\/shape-up\/shapeup\/(.+?)(\/.*)?$/,
  )![1];
  store.dispatch(loadPrompts(`shapeup/${chapterName}`));

  const root = ReactDOM.createRoot(document.getElementById("demo-root")!);
  root.render(
    <Provider store={store}>
      <ShapeUpApp />
    </Provider>,
  );
}
