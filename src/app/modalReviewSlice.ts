import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PromptID } from "./promptSlice";

export type ModalReviewState =
  | {
      // i.e. we're reviewing a list of prompts specified by the author
      mode: "list";
      promptIDs: string[];
      modalReviewID: string;
      viewingSourceID: PromptID | null;
    }
  | {
      // i.e. we're reviewing all the due prompts the user has saved
      mode: "user";
      viewingSourceID: PromptID | null;
    }
  | null;

const modalReviewSlice = createSlice({
  name: "modalReview",
  initialState: null as ModalReviewState,
  reducers: {
    startReviewForAllDuePrompts() {
      return {
        mode: "user",
        viewingSourceID: null,
      };
    },

    startReviewForInlineReviewModule(
      state,
      action: PayloadAction<{ promptIDs: PromptID[]; modalReviewID: string }>,
    ) {
      const { modalReviewID, promptIDs } = action.payload;
      return {
        mode: "list",
        promptIDs,
        modalReviewID,
        viewingSourceID: null,
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
  startReviewForAllDuePrompts,
  startReviewForInlineReviewModule,
  endModalReview,
  viewSourceForPromptID,
  resumeReview,
} = modalReviewSlice.actions;
export const modalReviewReducer = modalReviewSlice.reducer;
