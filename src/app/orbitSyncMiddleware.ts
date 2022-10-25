import {
  createListenerMiddleware,
  TypedStartListening,
} from "@reduxjs/toolkit";
import { addIngestPromptEvent, drainEventQueue } from "./authSlice";
import { OrbitSyncManager } from "./orbitSync";
import { savePrompt } from "./promptSlice";
import { AppDispatch, AppStore, RootState } from "./store";

let syncManager: OrbitSyncManager | null;

export const orbitSyncMiddleware = createListenerMiddleware();

export type AppStartListening = TypedStartListening<RootState, AppDispatch>;

export const startListening =
  orbitSyncMiddleware.startListening as AppStartListening;

startListening({
  predicate: (action, currentState, originalState) =>
    currentState.auth.queue.length > 0,
  effect: async (action, listenerAPI) => {
    const eventQueue = listenerAPI.getState().auth.queue;
    console.log("Queue has grown", eventQueue);
    if (syncManager) {
      listenerAPI.unsubscribe();
      await syncManager.storeAndSync(eventQueue);
      listenerAPI.dispatch(drainEventQueue(eventQueue.map(({ id }) => id)));
      listenerAPI.subscribe();
    } else {
      // TODO: popup auth!
      console.warn("POP UP AUTH");
    }
  },
});

startListening({
  actionCreator: savePrompt,
  effect: async (action, listenerAPI) => {
    const id = action.payload;
    const newPromptState = listenerAPI.getState().prompts[id];
    if (
      !listenerAPI.getOriginalState().prompts[id].isSaved &&
      newPromptState.isSaved
    ) {
      listenerAPI.dispatch(
        addIngestPromptEvent({ id, prompt: newPromptState }),
      );
    }
  },
});

export async function performInitialSync(store: AppStore) {
  const initialState = store.getState();
  if (initialState.auth.status === "signedOut") {
    console.info(
      "Skipping initial sync with remote Orbit states because user is signed out.",
    );
    return;
  }

  if (syncManager) {
    throw new Error("Sync manager shouldn't already exist");
  }

  syncManager = new OrbitSyncManager(
    initialState.auth.user.id,
    authenticateRequest(store),
  );

  const tasks = await syncManager.getRemoteTaskStates(
    Object.keys(initialState.prompts),
  );
  console.log("Got remote tasks", tasks);
  // TODO apply tasks to local prompt state
}

function authenticateRequest(store: AppStore) {
  return async () => {
    const { auth } = store.getState();
    if (auth.status === "signedOut") {
      throw new Error("Can't authenticate request: user is signed out");
    }

    let user = auth.user;
    if (Date.now() >= auth.user.expirationTimestamp) {
      // TODO re-auth user
      // make sure to assign to user
    }

    return { idToken: user.idToken };
  };
}
