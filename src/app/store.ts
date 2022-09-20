import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { inlineReviewModuleReducer } from "./inlineReviewModuleSlice";
import { promptsReducer } from "./promptSlice";
import { promptVisibilityReducer } from "./promptVisibilitySlice";

export const store = configureStore({
  reducer: {
    prompts: promptsReducer,
    inlineReviewModules: inlineReviewModuleReducer,
    promptVisibility: promptVisibilityReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed versions of useDispatch and useSelector.
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
