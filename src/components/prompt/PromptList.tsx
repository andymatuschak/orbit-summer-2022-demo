import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  savePrompt,
  updatePromptBack,
  updatePromptFront,
} from "../../app/promptSlice";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { useLayoutDependentValue } from "../../hooks/useLayoutDependentValue";
import zIndices from "../common/zIndices";
import PromptBox from "./PromptBox";

export interface PromptListSpec {
  promptIDs: string[];
}

export interface PromptListProps extends PromptListSpec {
  // Very much a hack. To make prompt lists appear to be "in" the main flow of the text, without adding N different React roots, we add an empty placeholder <div> to the body of the article. This component uses that <div>s width and y position to define its own, then lays out an absolutely-positioned *overlay* in the floating prototype root node. Then it syncs the height of that laid-out component *back* to the placeholder <div> in the main flow of the article, so that content below is repositioned accordingly.
  targetElementID: string;
}

export function PromptList({ promptIDs, targetElementID }: PromptListProps) {
  const promptEntries = useAppSelector((state) =>
    promptIDs.map((id) => [id, state.prompts[id]] as const),
  );

  const targetElement = useMemo(() => {
    const element = document.getElementById(targetElementID);
    if (!element)
      throw new Error(`Missing prompt list target ID ${targetElementID}`);
    return element;
  }, [targetElementID]);

  const [left, top, width] = useLayoutDependentValue(
    useCallback(() => {
      const rect = targetElement.getBoundingClientRect();
      return [rect.x + window.scrollX, rect.y + window.scrollY, rect.width];
    }, [targetElement]),
  );

  // Apply this component's height to the target element.
  const [listElement, setListElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!listElement) return;
    const observer = new ResizeObserver(() => {
      // hackily not bothering to read the observer entries
      const rect = listElement.getBoundingClientRect();
      targetElement.style.height = `${rect.height}px`;
    });
    observer.observe(listElement);
    return () => observer.disconnect();
  }, [listElement, targetElement]);

  const dispatch = useAppDispatch();

  return (
    <div
      css={{
        position: "absolute",
        left,
        top,
        width,
        zIndex: zIndices.displayOverContent,
      }}
      ref={setListElement}
    >
      {promptEntries.map(([id, prompt]) => (
        <PromptBox
          prompt={prompt}
          savePrompt={() => dispatch(savePrompt(id))}
          updatePromptFront={(newPrompt) =>
            dispatch(updatePromptFront([id, newPrompt]))
          }
          updatePromptBack={(newPrompt) =>
            dispatch(updatePromptBack([id, newPrompt]))
          }
        />
      ))}
    </div>
  );
}
