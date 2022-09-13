import { createSlice } from "@reduxjs/toolkit";
import { loadPrompts, PromptsState } from "./promptSlice";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface InlineReviewModule {
  frame: Rect;
  promptIDs: string[];
}

export type InlineReviewModuleState = { [id: string]: InlineReviewModule };
const initialState: InlineReviewModuleState = {};

const inlineReviewModuleSlice = createSlice({
  name: "inlineReviewModules",
  initialState,
  reducers: {
    updateReviewModuleFrames(state) {
      for (const id of Object.keys(state)) {
        const element = document.getElementById(id)!;
        state[id].frame = getFrame(element);
      }
    },
  },
  extraReducers(builder) {
    // We scan the page for review modules once we've loaded the prompt data for the page.
    builder.addCase(loadPrompts.fulfilled, (_state, action) => {
      return indexReviewModules(action.payload);
    });
    // TODO: implement extra reducers to update inline review module state when prompt contents are edited
  },
});

export const { updateReviewModuleFrames } = inlineReviewModuleSlice.actions;
export const inlineReviewModuleReducer = inlineReviewModuleSlice.reducer;

interface ReviewArea extends HTMLElement {
  iframe: HTMLIFrameElement;
  getConfiguration(): {
    reviewItems: {
      task: {
        id: string;
        metadata: { externalID: string };
      };
    }[];
  };
}

function indexReviewModules(prompts: PromptsState): InlineReviewModuleState {
  const reviewAreas = document.getElementsByTagName(
    "orbit-reviewarea",
  ) as HTMLCollectionOf<ReviewArea>;
  return Object.fromEntries(
    [...reviewAreas].map((reviewArea, i) => {
      if (!reviewArea.id) {
        reviewArea.id = `inlineReviewModule-${i}`;
      }

      // Check to make sure we know about all the prompts referenced in the review area.
      const config = reviewArea.getConfiguration();
      const promptIDs = config.reviewItems.map((item) => {
        const id = item.task.metadata.externalID ?? item.task.id;
        if (!prompts[id]) {
          throw new Error(`Review area includes unknown prompt ID ${id}`);
        }
        return id;
      });

      return [
        reviewArea.id,
        {
          frame: getFrame(reviewArea),
          promptIDs,
        },
      ];
    }),
  );
}

function getFrame(element: HTMLElement): Rect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return {
    left: left + window.scrollX,
    top: top + window.scrollY,
    width,
    height,
  };
}
