import React, { useEffect } from "react";
import { resolveHypothesisPrompts } from "../util/resolveHypothesisPrompts";
import PrototypeUI from "../components/PrototypeUI";

export function useStore() {
  // TODO: generalize paths here beyond Shape Up
  useEffect(() => {
    const chapterName = window.location.pathname.match(
      /\/shape-up\/shapeup\/(.+?)(\/.*)?$/,
    )![1];

    async function loadInitialData() {
      // const data = await import(`../promptData/shapeup/${chapterName}.json`);
      // const prompts = await resolvePrompts(data);
      // TODO: load data into store
      // TODO: load/merge saved store state
      // TODO: set up prompt list modules
      // TODO: set up inline review modules
    }

    loadInitialData();

    let sequenceCounter = 0;

    async function updateLayout() {
      sequenceCounter++;
      const eventSequence = sequenceCounter;
      const data = await import(
        `../static/promptData/shapeup/${chapterName}.json`
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const prompts = await resolveHypothesisPrompts(data);
      if (sequenceCounter === eventSequence) {
        // TODO: update store with new prompt layouts
      }
    }

    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  // TODO: return store
  return [
    {},
    () => {
      return;
    },
  ];
}

export interface AppProps {
  marginX: number;
}

export default function App({ marginX }: AppProps) {
  const [store] = useStore();

  if (store) {
    return <PrototypeUI marginX={marginX} />;
  } else {
    return null;
  }
}
