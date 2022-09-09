import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { readPromptsFromHypothesisJSON } from "../util/readPromptsFromHypothesisJSON";

export interface Prompt {
  content: {
    front: string;
    back: string;
  };
  selectors: PromptSelector[];

  isByAuthor: boolean;
  isSaved: boolean;
  isDue: boolean;
}

// i.e. following Hypothes.is's selector format, as specified in src/vendor/hypothesis-annotator
// annoyingly, this is distinct from the W3 Annotation format which hypothes.is helped define: https://www.w3.org/TR/annotation-model
export type PromptSelector =
  | RangeSelector
  | TextPositionSelector
  | TextQuoteSelector;

export enum PromptSelectorType {
  RangeSelector = "RangeSelector",
  TextPositionSelector = "TextPositionSelector",
  TextQuoteSelector = "TextQuoteSelector",
}

export interface RangeSelector {
  type: PromptSelectorType.RangeSelector;
  startOffset: number;
  endOffset: number;
  startContainer: string; // i.e. an XPath string
  endContainer: string; // i.e. an XPath string
}

// specifies an index range within the innerText of the page
export interface TextPositionSelector {
  type: PromptSelectorType.TextPositionSelector;
  start: number;
  end: number;
}

export interface TextQuoteSelector {
  type: PromptSelectorType.TextQuoteSelector;
  exact: string;
  prefix: string;
  suffix: string;
}

//---

export interface PromptsState {
  [id: string]: Prompt;
}

const initialState: PromptsState = {};

const promptsSlice = createSlice({
  name: "prompts",
  initialState,
  reducers: {
    savePrompt(state, action: PayloadAction<string>) {
      const prompt = state[action.payload];
      prompt.isSaved = true;
      prompt.isDue = true;
    },
  },
  extraReducers(builder) {
    builder.addCase(loadPrompts.fulfilled, (_state, action) => {
      return action.payload;
    });
  },
});

export const loadPrompts = createAsyncThunk(
  "prompts/loadPrompts",
  async (promptDataSubpath: string): Promise<PromptsState> => {
    const json = await import(`../static/promptData/${promptDataSubpath}.json`);
    return readPromptsFromHypothesisJSON(json);
  },
);

export const { savePrompt } = promptsSlice.actions;
export const promptsReducer = promptsSlice.reducer;
