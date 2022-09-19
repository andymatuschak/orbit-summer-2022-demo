import React, { useCallback } from "react";
import { PromptListSpec } from "../components/prompt/PromptList";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import "../static/styles/ShapeUp.css";
import App from "./App";

const promptListSpecs: { [chapterName: string]: PromptListSpec } = {
  "1.1-chapter-02": {
    promptIDs: [
      "Why might over-specifying a design make it harder to estimate?",
      "Three key properties of shaped work introduced in this chapter? (one word each)",
      `Why do under-specified projects naturally grow out of control?`,
      'What are the two "tracks" Basecamp team members work on?',
      'Visualize the level of fidelity used to define the "dot grid" solution to Basecamp\'s calendar project.',
    ],
  },
  "1.2-chapter-03": {
    promptIDs: [
      "What's the first step of shaping?",
      'What\'s meant by "appetite"?',
      'To plan based on appetite, we use this principle: "??? time, ??? scope".',
      "What key insight did the Basecamp team discover when they interviewed the user who requested a calendar?",
      "What's the default reaction to raw product ideas at Basecamp?",
      'What\'s wrong with "redesign" or "refactoring" projects?',
    ],
  },
};

export default function ShapeUpApp() {
  const markerX = useLayoutDependentValue(
    useCallback(() => {
      const main = document.getElementById("main")!;
      const rect = main.children.item(3)!.getBoundingClientRect();
      return rect.right - 25;
    }, []),
  );

  return (
    <App
      marginX={markerX}
      textRoot={document.getElementById("main")!.parentElement!}
      // Shape Up chapters have just one prompt list, with ID promptList.
      promptLists={{ promptList: promptListSpecs[getShapeUpChapterName()] }}
    />
  );
}

export function getShapeUpChapterName() {
  return window.location.pathname.match(
    /\/shape-up\/shapeup\/(.+?)(\/.*)?$/,
  )![1];
}
