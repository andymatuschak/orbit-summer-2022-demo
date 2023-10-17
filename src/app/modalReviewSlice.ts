import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Prompt, PromptID } from "./promptSlice";

export type ModalReviewState = {
  promptIDs: PromptID[];
  viewingSourceID: PromptID | null;
  extraPrompts: { [promptID: string]: Prompt };
} | null;

const modalReviewSlice = createSlice({
  name: "modalReview",
  initialState: null as ModalReviewState,
  reducers: {
    startReviewForPrompts(
      state,
      action: PayloadAction<{
        promptIDs: PromptID[];
        extraPrompts: { [promptID: string]: Prompt };
      }>,
    ) {
      return {
        promptIDs: action.payload.promptIDs,
        viewingSourceID: null,
        extraPrompts: action.payload.extraPrompts,
      };
    },

    endModalReview() {
      return null;
    },

    viewSourceForPromptID(state, action: PayloadAction<PromptID>) {
      if (state === null) {
        throw new Error("Can't view source for prompt ID when not reviewing");
      }
      state.viewingSourceID = action.payload;
    },

    resumeReview(state) {
      if (state === null) {
        throw new Error("Can't resume review when not reviewing");
      }
      if (!state.viewingSourceID) {
        throw new Error("Can't resume review when not viewing source");
      }
      state.viewingSourceID = null;
    },
  },
});

export const {
  startReviewForPrompts,
  endModalReview,
  viewSourceForPromptID,
  resumeReview,
} = modalReviewSlice.actions;
export const modalReviewReducer = modalReviewSlice.reducer;
