import React, { useCallback } from "react";
import { PromptListSpec } from "../components/prompt/PromptList";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App from "./App";

const promptListSpecs: { [chapterName: string]: PromptListSpec } = {
  "more-is-different-for-ai": {
    promptIDs: [
      "Name two approaches Steinhardt says people take when thinking about safety risks from ML",
      "Describe the Engineering worldview in Steinhardt's dichotomy",
      "Describe the Philosophy worldview in Steinhardt's dichotomy",
      "Give an example of something the Engineering worldview might say in Steinhardt's dichotomy",
      "Give an example of something the Philosophy worldview might say in Steinhardt's dichotomy",
      "Steinhardt on which worldview (in his AI dichotomy) is underrated by most ML researchers",
    ],
  },
};

export default function BRApp() {
  const markerX = useLayoutDependentValue(
    useCallback(() => {
      const main = document.getElementsByTagName("article").item(0)!;
      const rect = main.children.item(0)!.getBoundingClientRect();
      return rect.right + 16;
    }, []),
  );

  const promptList = promptListSpecs[getBoundedRegretChapterName()];
  // const promptList = null;
  return (
    <App
      marginX={markerX}
      textRoot={document.getElementById("content")!}
      promptLists={promptList ? { promptList } : {}}
    />
  );
}

export function getBoundedRegretChapterName() {
  return window.location.pathname.match(/\/sh\/br\/(.+?)(\/.*)?$/)![1];
}
