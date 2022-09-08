import React, { useEffect, useState } from "react";
import { Store } from "../app/store";
import { readPromptsFromHypothesisJSON } from "../util/readPromptsFromHypothesisJSON";

export function useStore(): [Store | null | undefined, React.Dispatch<React.SetStateAction<Store | null | undefined>>] {
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
  
    return [store, setStore];
  }