import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { inlineReviewModuleReducer } from "./inlineReviewModuleSlice";
import { promptsReducer } from "./promptSlice";
import { promptVisibilityReducer } from "./promptVisibilitySlice";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web

const persistConfig = {
  key: document.location.pathname.replace(/\/(index.html)?$/, ""),
  storage,
  whitelist: ["prompts"],
  throttle: 1000,
};

export const store = configureStore({
  reducer: persistReducer(
    persistConfig,
    combineReducers({
      prompts: promptsReducer,
      inlineReviewModules: inlineReviewModuleReducer,
      promptVisibility: promptVisibilityReducer,
    }),
  ),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed versions of useDispatch and useSelector.
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
