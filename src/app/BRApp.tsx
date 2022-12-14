import React, { useCallback } from "react";
import { useAuthorSaveDataFeature } from "../hooks/useAuthorSaveDataFeature";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App, { PromptListSpec } from "./App";

const promptListSpecs: { [chapterName: string]: PromptListSpec } = {
  "more-is-different-for-ai": {
    promptsByFrontText: [
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
  useAuthorSaveDataFeature(getBoundedRegretChapterName());
  return (
    <App
      marginX={markerX}
      textRoot={document.getElementsByTagName("article").item(0)!}
      promptLists={promptList ? { promptList } : {}}
    />
  );
}

export function getBoundedRegretChapterName() {
  return window.location.pathname.match(/\/sh\/br\/(.+?)(\/.*)?$/)![1];
}
