import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { autopopulateReviewAreas } from "./app/inlineReviewModuleSlice";
import { initializeOrbitSyncMiddleware } from "./app/orbitSyncMiddleware";
import { loadPrompts } from "./app/promptSlice";
import ProxyApp from "./app/ProxyApp";
import { persistor, store } from "./app/store";
import "./static/styles/index.css";

const init = async () => {
  // await store.dispatch(loadPrompts(subpath));
  await store.dispatch(autopopulateReviewAreas(store.getState().prompts));
  await initializeOrbitSyncMiddleware(store);
};

init();
const div = document.getElementById("proxy-root");
console.log("====> embedded app!", div);
const root = ReactDOM.createRoot(div!);
root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ProxyApp />
    </PersistGate>
  </Provider>,
);
