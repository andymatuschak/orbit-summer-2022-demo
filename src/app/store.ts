import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  useStore,
} from "react-redux";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import { authReducer } from "./authSlice";
import { inlineReviewModuleReducer } from "./inlineReviewModuleSlice";
import { forceLocalMode, orbitSyncMiddleware } from "./orbitSyncMiddleware";
import { promptsReducer } from "./promptSlice";
import { promptVisibilityReducer } from "./promptVisibilitySlice";

const persistConfig = {
  key: forceLocalMode
    ? document.location.pathname.replace(/\/(index.html)?$/, "")
    : "orbit-summer-2022",
  storage,
  whitelist: forceLocalMode ? ["prompts"] : ["auth"],
  throttle: 1000,
};

const reducer = persistReducer(
  persistConfig,
  combineReducers({
    prompts: promptsReducer,
    inlineReviewModules: inlineReviewModuleReducer,
    promptVisibility: promptVisibilityReducer,
    auth: authReducer,
  }),
);

export const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(orbitSyncMiddleware.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Typed versions of useDispatch and useSelector.
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore = useStore as () => typeof store;
