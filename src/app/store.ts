import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  useStore,
} from "react-redux";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { inlineReviewModuleReducer } from "./inlineReviewModuleSlice";
import { modalReviewReducer } from "./modalReviewSlice"; // defaults to localStorage for web
import { orbitSyncMiddleware } from "./orbitSyncMiddleware";
import { orbitSyncReducer } from "./orbitSyncSlice";
import { promptsReducer } from "./promptSlice";
import { promptVisibilityReducer } from "./promptVisibilitySlice";

export function getPersistenceKey() {
  if (document.location.pathname.startsWith("/pdfjs")) {
    const url = new URL(document.location.href);
    const pdfFileURL = url.searchParams.get("file");
    return `pdf-${pdfFileURL}`;
  } else {
    return document.location.pathname.replace(/\/(index.html)?$/, "");
  }
}

const persistConfig = {
  key: getPersistenceKey(),
  storage,
  whitelist: ["prompts", "auth"],
  throttle: 1000,
};

const reducer = persistReducer(
  persistConfig,
  combineReducers({
    prompts: promptsReducer,
    inlineReviewModules: inlineReviewModuleReducer,
    promptVisibility: promptVisibilityReducer,
    auth: orbitSyncReducer,
    modalReview: modalReviewReducer,
  }),
);

export const store = configureStore({
  reducer,
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware().prepend(orbitSyncMiddleware.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Typed versions of useDispatch and useSelector.
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore = useStore as () => typeof store;
