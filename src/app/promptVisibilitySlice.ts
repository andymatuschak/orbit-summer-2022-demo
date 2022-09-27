import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PromptVisibilitySetting } from "../components/OrbitMenuPromptVisibilityControl";

const promptVisibilitySlice = createSlice({
  name: "promptVisibility",
  initialState: getInitialPromptVisibility(),
  reducers: {
    setPromptVisibility: (
      state,
      action: PayloadAction<PromptVisibilitySetting>,
    ) => action.payload,
  },
});

export const { setPromptVisibility } = promptVisibilitySlice.actions;
export const promptVisibilityReducer = promptVisibilitySlice.reducer;

function getInitialPromptVisibility(): PromptVisibilitySetting {
  if (document.location.pathname.includes("/shapeup")) {
    return PromptVisibilitySetting.All;
  } else if (document.location.pathname.includes("/ims")) {
    return PromptVisibilitySetting.All;
  } else {
    throw new Error("Unsupported path");
  }
}
