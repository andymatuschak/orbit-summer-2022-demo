import React, { useCallback, useState } from "react";
import { useResizeHandler } from "../hooks/useResizeHandler";
import App from "./App";
import "../static/styles/ShapeUp.css";

// TODO: Insert prompt list module with these prompts at the bottom of the chapter.
/*const selectedPrompts = {
  "1.1-chapter-02": [
    "Why might over-specifying a design make it harder to estimate?",
    `Why do under-specified projects naturally grow out of control?`,
    'Visualize the level of fidelity used to define the "dot grid" solution to Basecamp\'s calendar project.',
    "Three key properties of shaped work introduced in this chapter? (one word each)",
    'What are the two "tracks" Basecamp team members work on?',
  ],
  "1.2-chapter-03": [
    "What's the first step of shaping?",
    'What\'s meant by "appetite"?',
    'To plan based on appetite, we use this principle: "??? time, ??? scope".',
    "What key insight did the Basecamp team discover when they interviewed the user who requested a calendar?",
    "What's the default reaction to raw product ideas at Basecamp?",
    'What\'s wrong with "redesign" or "refactoring" projects?',
  ],
};*/

export default function ShapeUpApp() {
  const [markerX, setMarkerX] = useState(1120);
  useResizeHandler(
    useCallback(() => {
      const main = document.getElementById("main")!;
      const rect = main.children.item(3)!.getBoundingClientRect();
      setMarkerX(rect.right - 25);
    }, []),
  );

  return <App marginX={markerX} />;
}
