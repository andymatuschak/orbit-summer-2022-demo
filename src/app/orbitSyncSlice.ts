import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AttachmentID,
  AttachmentIngestEvent,
  AttachmentMIMEType,
  Event,
  EventID,
  EventType,
  generateUniqueID,
  getAttachmentMIMETypeForFilename,
  TaskContentField,
  TaskContentType,
  TaskID,
  TaskProvenance,
  TaskProvenanceSelector,
  TaskProvenanceSelectorType,
  TaskSpec,
  TaskSpecType,
} from "@withorbit/core";
import { generateOrbitIDForString } from "../util/generateOrbitIDForString";
import { normalizeURL } from "../util/normalizeURL";
import { getDocumentTitle, getSiteName } from "../util/siteMetadata";
import { Prompt, PromptID, PromptSelectorType } from "./promptSlice";

export type OrbitSyncState = {
  queue: Event[];
  attachments: AttachmentEntry[];
} & ({ status: "signedOut" } | { status: "signedIn"; user: UserState });

export interface UserState {
  id: string;
  emailAddress: string;

  idToken: string;
  refreshToken: string;
  expirationTimestamp: number;
}

export interface AttachmentEntry {
  id: AttachmentID;
  url: string;
  type: AttachmentMIMEType;
}

const orbitSyncSlice = createSlice({
  name: "auth",
  initialState: {
    queue: [],
    status: "signedOut",
    attachments: [],
  } as OrbitSyncState,
  reducers: {
    signIn(state, action: PayloadAction<UserState>) {
      if (state.status === "signedOut") {
        return { ...state, status: "signedIn", user: action.payload };
      } else {
        console.error("Ignoring duplicate sign in", action.payload);
        return state;
      }
    },

    signOut(state) {
      if (state.status === "signedIn") {
        const { user: _, ...stateWithoutUser } = state;
        return { ...stateWithoutUser, status: "signedOut" };
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
      const { spec, attachments } = parsePrompt(prompt);
      state.attachments.push(...attachments);

      for (const attachment of attachments) {
        state.queue.push(ingestAttachmentEvent(attachment));
      }
      state.queue.push({
        id: generateUniqueID(),
        type: EventType.TaskIngest,
        entityID: id as TaskID,
        provenance: getOrbitProvenance(prompt),
        timestampMillis: Date.now(),
        metadata: {
          author: prompt.isByAuthor ? "__provenanceAuthor" : "__user",
        },
        spec,
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
      const { spec, attachments } = parsePrompt(prompt);
      // Inefficient, but whatever.
      const existingAttachmentIDs = new Set(
        state.attachments.map(({ id }) => id),
      );
      for (const attachment of attachments) {
        if (!existingAttachmentIDs.has(attachment.id)) {
          state.attachments.push(attachment);
          state.queue.push(ingestAttachmentEvent(attachment));
        }
      }
      state.queue.push({
        id: generateUniqueID(),
        type: EventType.TaskUpdateSpecEvent,
        entityID: id as TaskID,
        timestampMillis: Date.now(),
        spec,
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
export const orbitSyncReducer = orbitSyncSlice.reducer;

function ingestAttachmentEvent(
  attachmentEntry: AttachmentEntry,
): AttachmentIngestEvent {
  return {
    id: generateUniqueID(),
    type: EventType.AttachmentIngest,
    timestampMillis: Date.now(),
    entityID: attachmentEntry.id,
    mimeType: attachmentEntry.type,
  };
}

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

export function parsePrompt(prompt: Prompt): {
  spec: TaskSpec;
  attachments: AttachmentEntry[];
} {
  function extractAttachments(text: string): {
    orbitText: string;
    attachments: AttachmentEntry[];
  } {
    const attachments: AttachmentEntry[] = [];
    const orbitText = text.replace(
      /\s*<img.+src="(.+?)".*?>/g,
      (imageTag, url) => {
        const resolvedURL = new URL(url, document.baseURI);

        const filename = resolvedURL.pathname.split("/").pop();
        const type = filename
          ? getAttachmentMIMETypeForFilename(filename)
          : null;
        if (type) {
          const idMatch = imageTag.match(/data-attachmentID="(.+?)"/);
          const id = (() => {
            if (idMatch) {
              return idMatch[1];
            } else {
              console.warn(
                `No stable attachment ID for attachment in ${text}; generating from URL`,
              );
              return generateOrbitIDForString(resolvedURL.href);
            }
          })();
          attachments.push({
            id: id as AttachmentID,
            url: resolvedURL.href,
            type,
          });
          return "";
        } else {
          return imageTag;
        }
      },
    );
    return { orbitText, attachments };
  }

  const attachments: AttachmentEntry[] = [];
  function prepareOrbitField(text: string): TaskContentField {
    const { orbitText, attachments: fieldAttachments } =
      extractAttachments(text);
    attachments.push(...fieldAttachments);
    return {
      text: orbitText,
      attachments: fieldAttachments.map(({ id }) => id),
    };
  }

  return {
    attachments,
    spec: {
      type: TaskSpecType.Memory,
      content: {
        type: TaskContentType.QA,
        body: prepareOrbitField(prompt.content.front),
        answer: prepareOrbitField(prompt.content.back),
      },
    },
  };
}

function getOrbitProvenance(prompt: Prompt): TaskProvenance {
  const normalizedURL = normalizeURL(window.location.href);
  return {
    identifier: normalizedURL,
    url: normalizedURL,
    title: getDocumentTitle(),
    containerTitle: getSiteName(),
    selectors: getOrbitSelectors(prompt),
    colorPaletteName:
      colorPaletteNames[hashString(normalizedURL) % colorPaletteNames.length],
  };
}

function hashString(input: string): number {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const colorPaletteNames = [
  "red",
  "orange",
  "brown",
  "yellow",
  "lime",
  "green",
  "turquoise",
  "cyan",
  "blue",
  "violet",
  "purple",
  "pink",
] as const;
