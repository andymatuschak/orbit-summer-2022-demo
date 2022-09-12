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
  isNew?: boolean; // TODO: for when we serialize to local storage - don't persist this 
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

export type IdAction = PayloadAction<string>
export type UpdatePromptText = PayloadAction<[id: string, promptText: string]>;
export type CreateNewPrompt = PayloadAction<{id: string, prompt: Prompt}>;

const initialState: PromptsState = {};

const promptsSlice = createSlice({
  name: "prompts",
  initialState,
  reducers: {
    savePrompt(state, action: IdAction) {
      const prompt = state[action.payload];
      prompt.isSaved = true;
      prompt.isDue = true;
    },
    updatePromptFront(state, action: UpdatePromptText) {
      const prompt = state[action.payload[0]];
      prompt.content.front = action.payload[1]
    },
    updatePromptBack(state, action: UpdatePromptText) {
      const prompt = state[action.payload[0]];
      prompt.content.back = action.payload[1]
    },
    createNewPrompt(state, action: CreateNewPrompt) {
      state[action.payload.id] = action.payload.prompt;
    },
    markAsNotNew(state, action: IdAction) {
      const prompt = state[action.payload];
      prompt.isNew = false;
    }
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

export const { savePrompt, updatePromptFront, updatePromptBack, createNewPrompt, markAsNotNew } = promptsSlice.actions;
export const promptsReducer = promptsSlice.reducer;
