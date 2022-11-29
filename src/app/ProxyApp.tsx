import React, { useCallback, useEffect, useState } from "react";
import { useAuthorSaveDataFeature } from "../hooks/useAuthorSaveDataFeature";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App, { PromptListSpec } from "./App";
import { store } from "../app/store";
import { initializeOrbitSyncMiddleware } from "./orbitSyncMiddleware";
import { autopopulateReviewAreas } from "./inlineReviewModuleSlice";
import { loadPrompts } from "./promptSlice";

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
      await store.dispatch(loadPrompts(pageID));
      await store.dispatch(autopopulateReviewAreas(store.getState().prompts));
      await initializeOrbitSyncMiddleware(store);

      const promptLists = await getPromptLists(pageID);
      setPromptLists(promptLists || {});
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
