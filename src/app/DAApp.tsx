import React, { useCallback } from "react";
import { PromptListSpec } from "../components/prompt/PromptList";
import { useAuthorSaveDataFeature } from "../hooks/useAuthorSaveDataFeature";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App from "./App";

const promptListSpecs: { [chapterName: string]: PromptListSpec } = {};

export default function DAApp() {
  const markerX = useLayoutDependentValue(
    useCallback(() => {
      const main = document.getElementsByTagName("article").item(0)!;
      const rect = main.children.item(0)!.getBoundingClientRect();
      return rect.right + 16;
    }, []),
  );

  const promptList = promptListSpecs[getDeltaAcademyChapterName()];
  useAuthorSaveDataFeature(getDeltaAcademyChapterName());
  return (
    <App
      marginX={markerX}
      textRoot={document.getElementsByTagName("article").item(0)!}
      promptLists={promptList ? { promptList } : {}}
    />
  );
}

export function getDeltaAcademyChapterName() {
  return window.location.pathname.match(/\/sh\/da\/(.+?).html$/)![1];
}
