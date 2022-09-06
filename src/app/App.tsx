import React, { useCallback, useEffect, useState } from "react";
import PrototypeUI from "../components/PrototypeUI";
import { useAsyncLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import { readPromptsFromHypothesisJSON } from "../util/readPromptsFromHypothesisJSON";
import { resolvePromptLocations } from "../util/resolvePromptLocations";
import { Store } from "./store";

export function useStore() {
  // TODO: move to redux, etc...
  const [store, setStore] = useState<Store | null>();

  // TODO: generalize paths here beyond Shape Up
  useEffect(() => {
    async function loadInitialData() {
      const chapterName = window.location.pathname.match(
        /\/shape-up\/shapeup\/(.+?)(\/.*)?$/,
      )![1];
      const json = await import(
        `../static/promptData/shapeup/${chapterName}.json`
      );
      const prompts = readPromptsFromHypothesisJSON(json);
      setStore({ prompts });

      // TODO: load/merge saved store state
      // TODO: set up prompt list modules
      // TODO: set up inline review modules
    }

    loadInitialData();
  }, []);

  return store;
}

export interface AppProps {
  marginX: number;
}

export default function App({ marginX }: AppProps) {
  const store = useStore();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const promptLocations = useAsyncLayoutDependentValue(
    null,
    useCallback(async () => {
      if (!store) return null;
      return await resolvePromptLocations(store.prompts);
      // TODO: We don't really want to rerun this every time `store` changes. Think more carefully about this...
    }, [store]),
  );

  console.log(promptLocations);

  if (store && promptLocations) {
    return (
      <PrototypeUI
        marginX={marginX}
        store={store /* TODO: use context provider, etc */}
        promptLocations={promptLocations}
      />
    );
  } else {
    return null;
  }
}
