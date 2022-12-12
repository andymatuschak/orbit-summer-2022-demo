import React, { useCallback, useEffect, useState } from "react";
import { useAuthorSaveDataFeature } from "../hooks/useAuthorSaveDataFeature";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App, { PromptListSpec } from "./App";
import { store } from "../app/store";
import { initializeOrbitSyncMiddleware } from "./orbitSyncMiddleware";
import { autopopulateReviewAreas } from "./inlineReviewModuleSlice";
import { loadPrompts } from "./promptSlice";
import { HypothesisJSONData } from "../util/hypothesisJSON";

const SEARCH_PRIORITY = ["article", "main", "content", "body"];

const getTextRoot = () => {
  for (const tag of SEARCH_PRIORITY) {
    const root = document.getElementsByTagName(tag)?.item(0);
    if (root) return root;
  }
  return;
};

// ====[TODO] will need a flexible way of doing this
const RIGHT_MARKER_OFFSET = -350;
const PROXY_ROOT_PATH = "/proxy/html/";

const getTargetURL = (orbitProxyURL: string) =>
  orbitProxyURL.replace(PROXY_ROOT_PATH, "");

type EmbedPath = {
  before: boolean;
  cssSelector: string;
};

export type PromptConfig = {
  promptLists: {
    [k: string]: { embedPath: EmbedPath; promptsByFrontText: string[] };
  };
  prompts: HypothesisJSONData;
  // TODO: could include this! and/or have quality-of-life user controls
  pageConfig: {
    markerX: number;
    textRoot: string;
  };
};

const ORBIT_PROMPT_OVERRIDE_SOURCE_URL_KEY = "promptURL";
const ORBIT_JSON_ID = "orbit-json-data";
const getPromptConfig = async (
  url: string,
  overrideSourceURL: string | null,
): Promise<PromptConfig> => {
  // check override, then local script, then orbit remote
  if (overrideSourceURL) {
    const config = await fetch(overrideSourceURL)
      .then((o) => o.json())
      .catch((e) => {
        console.warn("Error fetching remote json", e);
        return false;
      });

    if (config) return config;
  }

  const localJSON = document.getElementById(ORBIT_JSON_ID)?.innerHTML;
  if (localJSON) {
    try {
      const json = JSON.parse(localJSON);
      return json;
    } catch (e) {
      console.warn("Error parsing local json, checking for remote!", e);
    }
  }

  // probably an irrelevant case, but maybe if the app is embedded outside the proxy server?
  const { config } = await fetch("/prompts/config/" + url)
    .then((o) => o.json())
    .catch((e) => {
      console.warn("Error fetching remote json", e);
      return {};
    });

  return config;
};

const getPromptLists = async (
  url: string,
): Promise<{ [k: string]: PromptListSpec }> => {
  const { promptLists } = await fetch("/prompts/inline/" + url)
    .then((o) => o.json())
    .catch((e) => {
      console.warn("Error fetching remote json", e);
      return {};
    });

  return promptLists;
};

const ProxyApp = () => {
  // ====[TODO] need to review how local state should change when page changes (e.g. don't full reload for url params, only path)
  console.log("AHHHHAHFLJKAKJFL:KJ!");
  const [pageID, setPageID] = useState(getTargetURL(window.location.pathname));
  useEffect(() => {
    setPageID(getTargetURL(window.location.pathname));
  }, []);

  // key is div id on page for embedding
  const [promptLists, setPromptLists] = useState<{
    [k: string]: PromptListSpec;
  }>({});

  useEffect(() => {
    const initWithPrompts = async () => {
      await store.dispatch(autopopulateReviewAreas(store.getState().prompts));
      await initializeOrbitSyncMiddleware(store);

      let overrideSourceURL = null;
      const currentURL = new URL(window.location.href);

      if (currentURL.searchParams.get(ORBIT_PROMPT_OVERRIDE_SOURCE_URL_KEY)) {
        overrideSourceURL = currentURL.searchParams.get(
          ORBIT_PROMPT_OVERRIDE_SOURCE_URL_KEY,
        );
      }

      const promptConfig = await getPromptConfig(pageID, overrideSourceURL);
      if (promptConfig) {
        await store.dispatch(loadPrompts(promptConfig.prompts));
        setPromptLists(promptConfig.promptLists || {});
      }
    };
    initWithPrompts();
  }, [pageID]);

  const textRoot = useLayoutDependentValue(getTextRoot);

  useEffect(() => {
    if (textRoot) {
      textRoot.className += " orbit-container";
    }
  }, [textRoot]);

  const markerX = useLayoutDependentValue(
    useCallback(() => {
      if (textRoot) {
        const rect = textRoot.getBoundingClientRect();
        return rect.right + RIGHT_MARKER_OFFSET;
      }
      return 0;
    }, [textRoot]),
  );

  useAuthorSaveDataFeature(pageID);
  console.log("textRoot, markerX", textRoot, markerX, promptLists);

  return (
    <>
      {textRoot && pageID && (
        <App
          marginX={markerX}
          textRoot={textRoot.parentElement!}
          pageID={pageID}
          promptLists={promptLists}
        />
      )}
      {!textRoot && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            border: "1px solid black",
            padding: 2,
          }}
        >
          <div>No Valid Text Root Found</div>
        </div>
      )}
    </>
  );
};

export default ProxyApp;
