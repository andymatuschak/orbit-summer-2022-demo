import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Event,
  EventID,
  EventType,
  generateUniqueID,
  TaskContentType,
  TaskID,
  TaskIngestEvent,
  TaskProvenance,
  TaskSpecType,
} from "@withorbit/core";
import { Prompt, PromptId } from "./promptSlice";

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
        // TODO: how should the queue actually be handled here?
        return { queue: state.queue, status: "signedOut" };
      } else {
        return state;
      }
    },

    drainEventQueue(state, action: PayloadAction<EventID[]>) {
      state.queue = state.queue.filter(
        ({ id }) => !action.payload.includes(id),
      );
    },

    addIngestPromptEvent(
      state,
      action: PayloadAction<{ id: PromptId; prompt: Prompt }>,
    ) {
      const { id, prompt } = action.payload;
      const event: TaskIngestEvent = {
        id: generateUniqueID(),
        type: EventType.TaskIngest,
        entityID: id as TaskID,
        provenance: getProvenance(),
        timestampMillis: Date.now(),
        metadata: {
          // TODO: include selectors
          // TODO: include info about whether it was by the author
        },
        spec: {
          type: TaskSpecType.Memory,
          content: {
            type: TaskContentType.QA,
            // TODO: attachments
            body: {
              text: prompt.content.front,
              attachments: [],
            },
            answer: {
              text: prompt.content.back,
              attachments: [],
            },
          },
        },
      };
      state.queue.push(event);
    },
  },
});

export const { signIn, signOut, drainEventQueue, addIngestPromptEvent } =
  orbitSyncSlice.actions;
export const authReducer = orbitSyncSlice.reducer;

function getProvenance(): TaskProvenance {
  return {
    identifier: window.location.href,
    url: window.location.href,
    title: document.title, // TODO improve, use siteName, etc.
  };
}
