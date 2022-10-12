import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PromptVisibilitySetting } from "../components/OrbitMenuPromptVisibilityControl";

const promptVisibilitySlice = createSlice({
  name: "promptVisibility",
  initialState: PromptVisibilitySetting.All,
  reducers: {
    setPromptVisibility: (
      state,
      action: PayloadAction<PromptVisibilitySetting>,
    ) => action.payload,
  },
});

export const { setPromptVisibility } = promptVisibilitySlice.actions;
export const promptVisibilityReducer = promptVisibilitySlice.reducer;
