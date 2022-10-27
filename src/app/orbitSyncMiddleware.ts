import {
  createListenerMiddleware,
  isAnyOf,
  TypedStartListening,
} from "@reduxjs/toolkit";
import { Event } from "@withorbit/core";
import {
  orbitAuthAPIBaseURL,
  orbitAuthAPIKey,
  orbitRefreshTokenURL,
  orbitWebappBaseURL,
} from "../config";
import {
  addDeletePromptEvent,
  addIngestPromptEvent,
  addUpdatePromptContentEvent,
  drainEventQueue,
  signIn,
  signOut,
  updateTokens,
} from "./authSlice";
import { OrbitSyncManager } from "./orbitSync";
import {
  createNewPrompt,
  deletePrompt,
  PromptID,
  reloadPromptsFromJSON,
  savePrompt,
  syncPromptFromReview,
  syncPromptStateFromRemoteTasks,
  unsavePrompt,
  updatePromptBack,
  updatePromptFront,
  UpdatePromptText,
} from "./promptSlice";
import { AppDispatch, AppStore, RootState } from "./store";

let syncManager: OrbitSyncManager | null;

export const forceLocalMode = window.location.hash === "#local";

export const orbitSyncMiddleware = createListenerMiddleware();

export type AppStartListening = TypedStartListening<RootState, AppDispatch>;

export const startListening =
  orbitSyncMiddleware.startListening as AppStartListening;

async function storeEvents(
  syncManager: OrbitSyncManager,
  eventQueue: Event[],
  dispatch: AppDispatch,
) {
  await syncManager.storeAndSync(eventQueue);
  dispatch(drainEventQueue(eventQueue.map(({ id }) => id)));
}

export function openLoginPopup() {
  window.open(
    `${orbitWebappBaseURL}/login?tokenTarget=opener&origin=${encodeURIComponent(
      window.location.origin,
    )}`,
    "Sign in",
    "width=375,height=550",
  );
}

function connectAuthFlow(store: AppStore) {
  // When the event queue grows, drain it (if signed in) or pop an auth dialog (if not).
  startListening({
    predicate: (action, currentState, originalState) =>
      currentState.auth.queue.length > originalState.auth.queue.length,
    effect: async (action, listenerAPI) => {
      const eventQueue = listenerAPI.getState().auth.queue;
      console.log("Queue has grown", eventQueue);
      if (syncManager) {
        listenerAPI.cancelActiveListeners();
        await listenerAPI.delay(1000);
        await storeEvents(syncManager, eventQueue, listenerAPI.dispatch);
      } else {
        openLoginPopup();
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

  const newPromptIDsAwaitingContent = new Set<PromptID>();
  startListening({
    actionCreator: createNewPrompt,
    effect: async (action, listenerAPI) => {
      const { id } = action.payload;
      newPromptIDsAwaitingContent.add(id);
      // Wait until we have a front and a back to ingest, or give up after 10 seconds and just ingest what we have.
      const result = await listenerAPI.condition((_, state) => {
        const prompt = state.prompts[id];
        return (
          prompt &&
          prompt.content.front.length > 0 &&
          prompt.content.back.length > 0
        );
      }, 10000);
      console.log("Finished waiting for new prompt content", result);
      const prompt = listenerAPI.getState().prompts[id];
      // Note: It could have been deleted.
      if (prompt) {
        listenerAPI.dispatch(addIngestPromptEvent({ id, prompt }));
      }
      newPromptIDsAwaitingContent.delete(id);
    },
  });

  startListening({
    matcher: isAnyOf(unsavePrompt, deletePrompt),
    effect: async (action, listenerAPI) => {
      if (!newPromptIDsAwaitingContent.has(action.payload)) {
        listenerAPI.dispatch(addDeletePromptEvent(action.payload));
      }
    },
  });

  startListening({
    matcher: isAnyOf(updatePromptFront, updatePromptBack),
    effect: (action: UpdatePromptText, listenerAPI) => {
      const [id] = action.payload;
      const oldPrompt = listenerAPI.getOriginalState().prompts[id];
      const newPrompt = listenerAPI.getState().prompts[id];
      if (
        !newPromptIDsAwaitingContent.has(id) &&
        (oldPrompt.content.front !== newPrompt.content.front ||
          oldPrompt.content.back !== newPrompt.content.back)
      ) {
        listenerAPI.dispatch(
          addUpdatePromptContentEvent({ id, prompt: newPrompt }),
        );
      }
    },
  });

  startListening({
    actionCreator: syncPromptFromReview,
    effect: async (action, listenerAPI) => {
      if (listenerAPI.getState().auth.status === "signedOut") {
        openLoginPopup();
      } else if (syncManager) {
        await syncManager.storeAndSync([]);
      }
    },
  });

  // When we receive a login token from the popup, sign in.
  window.addEventListener("message", async (event) => {
    const { data } = event;
    if (
      typeof data === "object" &&
      "loginToken" in data &&
      typeof data.loginToken === "object" &&
      typeof data.loginToken._token === "string"
    ) {
      console.log("Received login token");
      try {
        const requestTimestamp = Date.now();
        const loginResponse = await fetch(
          `${orbitAuthAPIBaseURL}/v1/accounts:signInWithCustomToken?key=${orbitAuthAPIKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token: data.loginToken._token,
              returnSecureToken: true,
            }),
          },
        );
        const loginResponseJSON = await loginResponse.json();
        const { idToken, refreshToken, expiresIn } = loginResponseJSON;
        const expirationTimestamp = requestTimestamp + expiresIn * 1000;
        console.log("Logged in", idToken, refreshToken, expirationTimestamp);

        const userDataResponse = await fetch(
          `${orbitAuthAPIBaseURL}/v1/accounts:lookup?key=${orbitAuthAPIKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idToken: loginResponseJSON.idToken,
            }),
          },
        );
        const userDataJSON = await userDataResponse.json();
        const { localId: id, email: emailAddress } = userDataJSON.users[0];
        console.log("Got user data", id, emailAddress);

        store.dispatch(
          signIn({
            id,
            emailAddress,
            idToken,
            refreshToken,
            expirationTimestamp,
          }),
        );
        await performInitialSync(store);
      } catch (error) {
        alert(`Couldn't sign in: ${error}`);
      }
    }
  });

  startListening({
    actionCreator: signOut,
    effect: (action, listenerAPI) => {
      listenerAPI.dispatch(reloadPromptsFromJSON);
      syncManager = null;
    },
  });
}

async function performInitialSync(store: AppStore) {
  if (syncManager) {
    throw new Error("Sync manager shouldn't already exist");
  }

  const state = store.getState();
  if (state.auth.status === "signedOut") {
    throw new Error("Can't sync when user is signed out");
  }
  syncManager = new OrbitSyncManager(
    state.auth.user.id,
    () => authenticateRequest(store),
    async (retry) => {
      const newToken = await refreshIDToken(store);
      if (newToken) {
        await retry();
      } else {
        console.warn("Giving up; couldn't refresh ID token");
      }
    },
  );

  // Drain any pending events
  if (state.auth.queue.length > 0) {
    await storeEvents(syncManager, state.auth.queue, store.dispatch);
  }

  const tasks = await syncManager.getRemoteTaskStates();
  console.log("Got remote tasks", tasks);
  store.dispatch(syncPromptStateFromRemoteTasks(tasks));
}

export async function initializeOrbitSyncMiddleware(store: AppStore) {
  if (forceLocalMode) {
    console.log("Not loading Orbit sync middleware: forced local mode");
    return;
  }

  connectAuthFlow(store);

  const initialState = store.getState();
  if (initialState.auth.status === "signedOut") {
    console.info(
      "Skipping initial sync with remote Orbit states because user is signed out.",
    );
    return;
  }
  await performInitialSync(store);
}

async function refreshIDToken(store: AppStore): Promise<string | null> {
  const { auth } = store.getState();
  if (auth.status === "signedOut") {
    throw new Error("Can't refresh ID token: user is signed out");
  }

  console.log("ID token has expired; attempting to refresh...");
  const requestTimestamp = Date.now();
  try {
    const response = await fetch(orbitRefreshTokenURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: auth.user.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const responseJSON = await response.json();
    const idToken = responseJSON["id_token"];
    store.dispatch(
      updateTokens({
        id: responseJSON["user_id"],
        refreshToken: responseJSON["refresh_token"],
        idToken,
        expirationTimestamp:
          requestTimestamp + Number.parseInt(responseJSON["expires_in"]) * 1000,
      }),
    );
    return idToken;
  } catch (e) {
    store.dispatch(signOut());
    alert(`We're unable to sign you in. Try again?`);
    openLoginPopup();
    return null;
  }
}

async function authenticateRequest(store: AppStore) {
  const { auth } = store.getState();
  if (auth.status === "signedOut") {
    throw new Error("Can't authenticate request: user is signed out");
  }

  if (Date.now() >= auth.user.expirationTimestamp) {
    const newIDToken = await refreshIDToken(store);
    if (!newIDToken) {
      throw new Error("Aborting--credentials invalid");
    }
    return { idToken: newIDToken };
  } else {
    return { idToken: auth.user.idToken };
  }
}
