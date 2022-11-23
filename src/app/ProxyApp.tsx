import React, { useCallback, useEffect, useState } from "react";
import { useAuthorSaveDataFeature } from "../hooks/useAuthorSaveDataFeature";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App, { PromptListSpec } from "./App";
import { persistor, store } from "../app/store";
import { initializeOrbitSyncMiddleware } from "./orbitSyncMiddleware";
import { autopopulateReviewAreas } from "./inlineReviewModuleSlice";
import { loadPrompts } from "./promptSlice";

const SEARCH_PRIORITY = ["article", "main", "content", "body"];

// ====[TODO] flexible way of doing this + prompt provenance?
const getTextRoot = () => {
  for (const tag of SEARCH_PRIORITY) {
    // const root = document.getElementsByTagName(tag)?.item(0);
    const root = document.getElementById(tag);
    if (root) return root;
  }
  return;
};

// ====[TODO] will need a flexible way of doing this
const RIGHT_MARKER_OFFSET = -25;
const PROXY_ROOT_PATH = "/api/proxy/";
const getRealURL = (orbitProxyURL: string) =>
  orbitProxyURL.replace(PROXY_ROOT_PATH, "");

const getPromptLists = async (
  url: string,
): Promise<{ [k: string]: PromptListSpec }> => {
  const { promptLists } = await fetch("/api/prompt-lists/" + url)
    .then((o) => o.json())
    .catch((e) => {
      console.warn("Error fetching remote json", e);
      return {};
    });

  return promptLists;
};

export default () => {
  // ====[TODO] need to review how local state should change when page changes (e.g. don't full reload for url params, only path)
  const [pageID, setPageID] = useState(getRealURL(window.location.pathname));
  useEffect(() => {
    setPageID(getRealURL(window.location.pathname));
  }, [window.location.href]);

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
      setPromptLists(promptLists);
    };
    initWithPrompts();
  }, [pageID]);

  const textRoot = useLayoutDependentValue(getTextRoot);
  const markerX = useLayoutDependentValue(
    useCallback(() => {
      if (textRoot) {
        const rect = textRoot.children.item(3)!.getBoundingClientRect();
        return rect.right + RIGHT_MARKER_OFFSET;
      }
      return 0;
    }, [textRoot]),
  );

  useAuthorSaveDataFeature(pageID);
  console.log(textRoot, promptLists);

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
