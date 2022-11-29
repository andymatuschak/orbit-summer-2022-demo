import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import ProxyApp from "./app/ProxyApp";
import { persistor, store } from "./app/store";
import "./static/styles/index.css";

const ORBIT_APP_ROOT_ID = process.env.ORBIT_APP_ROOT_ID || "proxy-root";
const div = document.getElementById(ORBIT_APP_ROOT_ID);
const root = ReactDOM.createRoot(div!);

root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ProxyApp />
    </PersistGate>
  </Provider>,
);
