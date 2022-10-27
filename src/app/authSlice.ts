import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Event,
  EventID,
  EventType,
  generateUniqueID,
  TaskContentType,
  TaskID,
  TaskProvenance,
  TaskProvenanceSelector,
  TaskProvenanceSelectorType,
  TaskSpec,
  TaskSpecType,
} from "@withorbit/core";
import { getSiteName } from "../util/getSiteName";
import { normalizeURL } from "../util/normalizeURL";
import { Prompt, PromptID, PromptSelectorType } from "./promptSlice";

type OrbitSyncState = { queue: Event[] } & (
  | { status: "signedOut" }
  | { status: "signedIn"; user: UserState }
);

export interface UserState {
  id: string;
  emailAddress: string;

  idToken: string;
  refreshToken: string;
  expirationTimestamp: number;
}

const orbitSyncSlice = createSlice({
  name: "auth",
  initialState: { queue: [], status: "signedOut" } as OrbitSyncState,
  reducers: {
    signIn(state, action: PayloadAction<UserState>) {
      if (state.status === "signedOut") {
        return { status: "signedIn", user: action.payload, queue: state.queue };
      } else {
        console.error("Ignoring duplicate sign in", action.payload);
        return state;
      }
    },

    signOut(state) {
      if (state.status === "signedIn") {
        return { queue: [], status: "signedOut" };
      } else {
        return state;
      }
    },

    updateTokens(
      state,
      action: PayloadAction<{
        id: string;
        idToken: string;
        refreshToken: string;
        expirationTimestamp: number;
      }>,
    ) {
      const { id, idToken, refreshToken, expirationTimestamp } = action.payload;
      if (state.status === "signedOut") {
        throw new Error("Can't update tokens when signed out");
      } else if (state.user.id !== id) {
        throw new Error(
          `Updating tokens for mismatched user (${id} vs ${state.user.id})`,
        );
      } else {
        state.user.idToken = idToken;
        state.user.refreshToken = refreshToken;
        state.user.expirationTimestamp = expirationTimestamp;
      }
    },

    drainEventQueue(state, action: PayloadAction<EventID[]>) {
      state.queue = state.queue.filter(
        ({ id }) => !action.payload.includes(id),
      );
    },

    addIngestPromptEvent(
      state,
      action: PayloadAction<{ id: PromptID; prompt: Prompt }>,
    ) {
      const { id, prompt } = action.payload;
      state.queue.push({
        id: generateUniqueID(),
        type: EventType.TaskIngest,
        entityID: id as TaskID,
        provenance: getOrbitProvenance(prompt),
        timestampMillis: Date.now(),
        metadata: {
          // TODO: include some flag indicating whether it was by the author
        },
        spec: getOrbitSpec(prompt),
      });
    },

    addDeletePromptEvent(state, action: PayloadAction<PromptID>) {
      state.queue.push({
        id: generateUniqueID(),
        type: EventType.TaskUpdateDeleted,
        entityID: action.payload as TaskID,
        timestampMillis: Date.now(),
        isDeleted: true,
      });
    },

    addUpdatePromptContentEvent(
      state,
      action: PayloadAction<{ id: PromptID; prompt: Prompt }>,
    ) {
      const { id, prompt } = action.payload;
      state.queue.push({
        id: generateUniqueID(),
        type: EventType.TaskUpdateSpecEvent,
        entityID: id as TaskID,
        timestampMillis: Date.now(),
        spec: getOrbitSpec(prompt),
      });
    },
  },
});

export const {
  signIn,
  signOut,
  updateTokens,
  drainEventQueue,
  addIngestPromptEvent,
  addDeletePromptEvent,
  addUpdatePromptContentEvent,
} = orbitSyncSlice.actions;
export const authReducer = orbitSyncSlice.reducer;

function getOrbitSelectors(prompt: Prompt): TaskProvenanceSelector[] {
  return prompt.selectors.map((selector) => {
    switch (selector.type) {
      case PromptSelectorType.RangeSelector:
        return {
          type: TaskProvenanceSelectorType.Range,
          startSelector: {
            type: TaskProvenanceSelectorType.XPath,
            value: selector.startContainer,
            refinedBy: {
              type: TaskProvenanceSelectorType.TextPosition,
              start: selector.startOffset,
              end: selector.startOffset,
            },
          },
          endSelector: {
            type: TaskProvenanceSelectorType.XPath,
            value: selector.endContainer,
            refinedBy: {
              type: TaskProvenanceSelectorType.TextPosition,
              start: selector.endOffset,
              end: selector.endOffset,
            },
          },
        };
      case PromptSelectorType.TextQuoteSelector:
        return {
          ...selector,
          type: TaskProvenanceSelectorType.TextQuote,
        };
      case PromptSelectorType.TextPositionSelector:
        return {
          ...selector,
          type: TaskProvenanceSelectorType.TextPosition,
        };
      default:
        throw new Error("Unexpected selector type");
    }
  });
}

function getOrbitSpec(prompt: Prompt): TaskSpec {
  return {
    type: TaskSpecType.Memory,
    content: {
      type: TaskContentType.QA,
      // TODO: handle attachments
      body: {
        text: prompt.content.front,
        attachments: [],
      },
      answer: {
        text: prompt.content.back,
        attachments: [],
      },
    },
  };
}

function getOrbitProvenance(prompt: Prompt): TaskProvenance {
  const normalizedURL = normalizeURL(window.location.href);
  return {
    identifier: normalizedURL,
    url: normalizedURL,
    title: document.title,
    containerTitle: getSiteName(),
    selectors: getOrbitSelectors(prompt),
  };
}
