import {
  createListenerMiddleware,
  isAnyOf,
  TypedStartListening,
} from "@reduxjs/toolkit";
import { Event } from "@withorbit/core";
import {
  apiConfig,
  orbitAuthAPIBaseURL,
  orbitAuthAPIKey,
  orbitRefreshTokenURL,
  orbitWebappBaseURL,
  prototypeBackendBaseURL,
} from "../config";
import { OrbitSyncManager } from "./orbitSync";
import {
  addDeletePromptEvent,
  addIngestPromptEvent,
  addUpdatePromptContentEvent,
  AttachmentEntry,
  drainEventQueue,
  signIn,
  signOut,
  updateTokens,
} from "./orbitSyncSlice";
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

export const orbitSyncMiddleware = createListenerMiddleware();

type AppStartListening = TypedStartListening<RootState, AppDispatch>;

const startListening = orbitSyncMiddleware.startListening as AppStartListening;

async function storeEvents(
  syncManager: OrbitSyncManager,
  eventQueue: Event[],
  attachments: AttachmentEntry[],
  dispatch: AppDispatch,
) {
  await syncManager.storeAndSync(eventQueue, attachments);
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

export async function uploadImage(
  id: string,
  contents: ArrayBuffer,
  contentType: string,
): Promise<string | null> {
  const response = await fetch(`${prototypeBackendBaseURL}/images/${id}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: contents,
  });
  if (response.ok) {
    return await response.text();
  } else {
    alert(`Couldn't upload image`);
    return null;
  }
}

function broadcastLoginTokenToOrbitIframes(loginToken: string) {
  // HACK: People's browser settings will sometimes prevent the iframes from signing in, since we're using a weird Orbit webapp channel. We'll broadcast our token to them.
  const reviewAreas = document.getElementsByTagName("orbit-reviewarea");
  for (const reviewArea of reviewAreas) {
    const { iframe } = reviewArea as any;
    if (iframe.src.startsWith(orbitWebappBaseURL)) {
      iframe.contentWindow?.postMessage(
        { loginToken: { _token: loginToken } },
        orbitWebappBaseURL,
      );
    }
  }
}

function connectAuthFlow(store: AppStore) {
  // When the event queue grows, drain it (if signed in) or pop an auth dialog (if not).
  startListening({
    predicate: (action, currentState, originalState) =>
      currentState.auth.queue.length > originalState.auth.queue.length,
    effect: async (action, listenerAPI) => {
      const syncState = listenerAPI.getState().auth;
      const { queue, attachments } = syncState;
      console.log("Queue has grown", queue, attachments);
      if (syncManager) {
        listenerAPI.cancelActiveListeners();
        await listenerAPI.delay(1000);
        await storeEvents(
          syncManager,
          queue,
          attachments,
          listenerAPI.dispatch,
        );
      } else {
        // openLoginPopup();
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
        // openLoginPopup();
      } else if (syncManager) {
        await syncManager.storeAndSync([], []);
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

      const token = data.loginToken._token;
      broadcastLoginTokenToOrbitIframes(token);

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
              token: token,
              returnSecureToken: true,
            }),
          },
        );
        if (!loginResponse.ok) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error(`Couldn't sign in: ${await loginResponse.text()}`);
        }
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
        if (!userDataResponse.ok) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error(
            `Couldn't get user data: ${await userDataResponse.text()}`,
          );
        }
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

  const syncState = store.getState().auth;
  if (syncState.status === "signedOut") {
    throw new Error("Can't sync when user is signed out");
  }
  syncManager = new OrbitSyncManager(
    syncState.user.id,
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
  if (syncState.queue.length > 0) {
    await storeEvents(
      syncManager,
      syncState.queue,
      syncState.attachments,
      store.dispatch,
    );
  }

  const tasks = await syncManager.getRemoteTaskStates();
  console.log("Got remote tasks", tasks);
  store.dispatch(syncPromptStateFromRemoteTasks(tasks));
}

export async function initializeOrbitSyncMiddleware(store: AppStore) {
  connectAuthFlow(store);

  const initialState = store.getState();
  if (initialState.auth.status === "signedOut") {
    console.info(
      "Skipping initial sync with remote Orbit states because user is signed out.",
    );
    return;
  }
  await performInitialSync(store);

  // HACK: There are a lot of rules about third party iframe storage, particularly in Safari. In many cases this means that the host frame may have a valid token while the iframe does not. We'll pass one down.
  const postSyncState = store.getState();
  if (postSyncState.auth.status === "signedIn") {
    try {
      const authenticationResult = await authenticateRequest(store);
      const loginToken = await fetchLoginToken(authenticationResult.idToken);
      broadcastLoginTokenToOrbitIframes(loginToken);
    } catch (e) {
      console.warn("Couldn't broadcast initial login token to iframes", e);
    }
  }
}

async function fetchLoginToken(idToken: string) {
  const fetchResult = await fetch(
    `${apiConfig.baseURL}/internal/auth/createLoginToken?idToken=${idToken}`,
  );
  if (fetchResult.ok) {
    return await fetchResult.text();
  } else {
    throw new Error(
      `Sign in failed with status code ${
        fetchResult.status
      }: ${await fetchResult.text()}`,
    );
  }
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
    if (!response.ok) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(`Couldn't refresh token ${await response.text()}`);
    }
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
