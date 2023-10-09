import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  getReviewQueueFuzzyDueTimestampThreshold,
  mainTaskComponentID,
  Task,
  TaskContentField,
  TaskContentType,
  TaskProvenance,
  TaskProvenanceSelectorType,
} from "@withorbit/core";
import { prototypeBackendBaseURL } from "../config";
import {
  HypothesisJSONData,
  readPromptsFromHypothesisJSON,
} from "../util/hypothesisJSON";

export type PromptID = string;

export interface Prompt {
  content: {
    front: string;
    back: string;
  };
  selectors: PromptSelector[];

  creationTimestampMillis: number;
  isByAuthor: boolean;
  isSaved: boolean;
  isDue: boolean;
  showAnchors: boolean;

  // For prompts saved automatically via review, we track the ID of the review area where it came from, so that we can implement the "undo" feature allowing users to *unsave* those auto-saved prompts.
  sourceReviewAreaID?: string;
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
  [id: PromptID]: Prompt;
}

export type IdAction = PayloadAction<PromptID>;
export type UpdatePromptText = PayloadAction<
  [id: PromptID, promptText: string]
>;
export type CreateNewPrompt = PayloadAction<{ id: PromptID; prompt: Prompt }>;
export type SyncPromptFromReview = PayloadAction<{
  id: PromptID;
  wasSkipped: boolean;
  newInterval: number;
  sourceReviewAreaID: string;
}>;

const initialState: PromptsState = {};

const promptSlice = createSlice({
  name: "prompts",
  initialState,
  reducers: {
    savePrompt(state, action: IdAction) {
      const prompt = state[action.payload];
      if (!prompt.isSaved && !isPromptSectionReviewButton(prompt)) {
        prompt.isDue = true;
      }
      prompt.isSaved = true;
    },
    unsavePrompt(state, action: IdAction) {
      const prompt = state[action.payload];
      prompt.isSaved = false;
      prompt.isDue = false;
      prompt.sourceReviewAreaID = undefined;
    },
    deletePrompt(state, action: IdAction) {
      delete state[action.payload];
    },
    updatePromptFront(state, action: UpdatePromptText) {
      const prompt = state[action.payload[0]];
      prompt.content.front = action.payload[1];
      if (isPromptSectionReviewButton(prompt)) {
        prompt.isDue = false;
      }
    },
    updatePromptBack(state, action: UpdatePromptText) {
      const prompt = state[action.payload[0]];
      prompt.content.back = action.payload[1];
    },
    createNewPrompt(state, action: CreateNewPrompt) {
      state[action.payload.id] = action.payload.prompt;
    },
    syncPromptFromReview(state, action: SyncPromptFromReview) {
      const { id, wasSkipped, newInterval, sourceReviewAreaID } =
        action.payload;
      const prompt = state[id];
      if (!prompt.isSaved && !wasSkipped) {
        prompt.isSaved = true;

        if (!prompt.sourceReviewAreaID) {
          prompt.sourceReviewAreaID = sourceReviewAreaID;
        }
      }

      // This hacky predicate corresponds to the data we'll see if they marked the prompt as forgotten (i.e. so it's still due).
      prompt.isDue = newInterval === 0 && !wasSkipped;
    },

    syncPromptStateFromRemoteTasks(
      state,
      action: PayloadAction<{ [id: PromptID]: Task }>,
    ) {
      for (const [id, task] of Object.entries(action.payload)) {
        const { content } = task.spec;
        if (content.type !== TaskContentType.QA) {
          console.warn("Ignoring non-QA task", task);
          continue;
        }

        const promptContent = {
          front: formatPromptTextWithAttachments(content.body),
          back: formatPromptTextWithAttachments(content.answer),
        };
        const isSaved = !task.isDeleted;
        const isDue =
          isSaved &&
          task.componentStates[mainTaskComponentID].dueTimestampMillis <=
            getReviewQueueFuzzyDueTimestampThreshold(Date.now());

        const prompt = state[id];
        if (prompt) {
          prompt.isSaved = isSaved;
          prompt.isDue = isDue;
          prompt.content = promptContent;
        } else if (isSaved && task.provenance) {
          state[id] = {
            content: promptContent,
            isSaved,
            isDue,
            isByAuthor: false,
            showAnchors: true,
            selectors: getHypothesisSelectors(task.provenance),
            creationTimestampMillis: task.createdAtTimestampMillis,
          };
        }
      }
    },

    // Used by the Ctrl+D author shortcut to "reset" the page state after serializing prompt JSON.
    // Also used when the user signs out.
    reloadPromptsFromJSON(state, action: PayloadAction<HypothesisJSONData>) {
      return readPromptsFromHypothesisJSON(action.payload);
    },
  },
  extraReducers(builder) {
    builder.addCase(loadPrompts.fulfilled, (_state, action) => {
      // Merge the loaded prompts with any persisted prompts.
      for (const [id, prompt] of Object.entries(action.payload)) {
        if (!_state[id]) {
          _state[id] = prompt;
        }
      }
    });
  },
});

export const loadPrompts = createAsyncThunk(
  "prompts/loadPrompts",
  async (promptDataSubpath: string): Promise<PromptsState> => {
    try {
      const json = await import(
        `../static/promptData/${promptDataSubpath}.json`
      );
      return readPromptsFromHypothesisJSON(json);
    } catch (e) {
      // console.error(e);
      return {};
    }
  },
);

function getHypothesisSelectors(provenance: TaskProvenance): PromptSelector[] {
  return (provenance.selectors ?? []).map((selector) => {
    switch (selector.type) {
      case TaskProvenanceSelectorType.Range:
        const { startSelector, endSelector } = selector;
        if (startSelector.type !== TaskProvenanceSelectorType.XPath) {
          throw new Error(`Unsupported startSelector ${startSelector.type}`);
        }
        if (endSelector.type !== TaskProvenanceSelectorType.XPath) {
          throw new Error(`Unsupported endSelector ${endSelector.type}`);
        }
        if (!startSelector.refinedBy) {
          throw new Error(`Missing startSelector.refinedBy`);
        }
        if (!endSelector.refinedBy) {
          throw new Error(`Missing endSelector.refinedBy`);
        }
        const startPosition = startSelector.refinedBy;
        if (startPosition.type !== TaskProvenanceSelectorType.TextPosition) {
          throw new Error(`Unsupported startSelector.refinedBy`);
        }
        const endPosition = endSelector.refinedBy;
        if (endPosition.type !== TaskProvenanceSelectorType.TextPosition) {
          throw new Error(`Unsupported endSelector.refinedBy`);
        }
        return {
          type: PromptSelectorType.RangeSelector,
          startContainer: startSelector.value,
          startOffset: startSelector.refinedBy.start,
          endContainer: endSelector.value,
          endOffset: endSelector.refinedBy.end,
        };
      case TaskProvenanceSelectorType.TextPosition:
        return {
          ...selector,
          type: PromptSelectorType.TextPositionSelector,
        };
      case TaskProvenanceSelectorType.TextQuote:
        return {
          ...selector,
          type: PromptSelectorType.TextQuoteSelector,
        };
      default:
        throw new Error(`Unexpected Orbit provenance type ${selector.type}`);
    }
  });
}

export function isPromptSectionReviewButton(prompt: Prompt) {
  return prompt.content.front.startsWith("SECTION REVIEW");
}

export const {
  savePrompt,
  unsavePrompt,
  deletePrompt,
  updatePromptFront,
  updatePromptBack,
  createNewPrompt,
  syncPromptFromReview,
  syncPromptStateFromRemoteTasks,
  reloadPromptsFromJSON,
} = promptSlice.actions;
export const promptsReducer = promptSlice.reducer;

function formatPromptTextWithAttachments(field: TaskContentField) {
  let output = field.text;
  for (const id of field.attachments) {
    // TODO think this through!
    // HACK HACK HACK assuming it's PNG here. The trouble here is that our data model refers to images by ID alone, but <img> tags want URLs with extensions (e.g. Anki expects this; some browsers struggle with extension-less images)
    output += ` <img src="${prototypeBackendBaseURL}/images/${id}.png" data-attachmentID="${id}">`;
  }
  return output;
}
