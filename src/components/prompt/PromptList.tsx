import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  savePrompt,
  unsavePrompt,
  updatePromptBack,
  updatePromptFront,
} from "../../app/promptSlice";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { useLayoutDependentValue } from "../../hooks/useLayoutDependentValue";
import Check from "../../static/images/Icons/Check.png";
import { PromptLocation } from "../../util/resolvePromptLocations";
import Button from "../Button";
import zIndices from "../common/zIndices";
import { LabelColor, LabelSmall } from "../Type";
import PromptBox from "./PromptBox";
import { PromptContext } from "./PromptComponents";

interface AutosaveBannerProps {
  onUndo: () => void;
}

function AutosaveBanner({ onUndo }: AutosaveBannerProps) {
  return (
    <div
      css={{
        backgroundColor: `var(--bgSecondary)`,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: `var(--accentSecondary)`,
        paddingTop: 6,
        paddingRight: 16,
        paddingBottom: 6,
        paddingLeft: 9,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        css={{
          width: 24,
          height: 24,
          backgroundColor: "var(--accentSecondary)",
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskImage: `url(${Check})`,
          maskSize: "24px 24px",
          marginRight: 6,
        }}
      ></div>
      <div css={{ marginTop: -2, display: "flex", gap: 8 }}>
        <LabelSmall text="The prompts you reviewed have been saved to your Orbit." />
        <button
          onClick={onUndo}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <LabelSmall text="Unsave" color={LabelColor.AccentPrimary} />
        </button>
      </div>
    </div>
  );
}

export interface PromptListSpec {
  promptIDs: string[];

  // If this prompt list is "replacing" an inline review area, this prop should correspond to its ID.
  inlineReviewID?: string;
}

export interface PromptListProps extends PromptListSpec {
  // Very much a hack. To make prompt lists appear to be "in" the main flow of the text, without adding N different React roots, we add an empty placeholder <div> to the body of the article. This component uses that <div>s width and y position to define its own, then lays out an absolutely-positioned *overlay* in the floating prototype root node. Then it syncs the height of that laid-out component *back* to the placeholder <div> in the main flow of the article, so that content below is repositioned accordingly.
  targetElementID: string;
  promptLocations: { [id: string]: PromptLocation };
  onStartReview: (onReviewExit: (reviewAreaID: string) => void) => void;
}

export function PromptList({
  promptIDs,
  targetElementID,
  inlineReviewID,
  onStartReview,
  promptLocations,
}: PromptListProps) {
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
    targetElement.style.transition = "height 300ms var(--expoTiming)";
    const observer = new ResizeObserver(() => {
      // hackily not bothering to read the observer entries
      const rect = listElement.getBoundingClientRect();
      targetElement.style.height = `${rect.height}px`;
    });
    observer.observe(listElement);
    return () => observer.disconnect();
  }, [listElement, targetElement]);

  const dispatch = useAppDispatch();

  const [completedModalReviewID, setCompletedModalReviewID] = useState<
    string | null
  >(null);
  const mostRecentReviewID = completedModalReviewID ?? inlineReviewID;
  function onReviewComplete(reviewAreaID: string) {
    setCompletedModalReviewID(reviewAreaID);
  }

  const autosavedPromptIDs = useMemo(() => {
    return mostRecentReviewID
      ? promptEntries
          .filter(
            ([id, prompt]) => prompt.sourceReviewAreaID === mostRecentReviewID,
          )
          .map(([id]) => id)
      : [];
  }, [promptEntries, mostRecentReviewID]);

  function onUndoAutosave() {
    setCompletedModalReviewID(null);
    autosavedPromptIDs.forEach((id) => dispatch(unsavePrompt(id)));
  }

  const PromptListColumn = ({
    prompts,
    zStart,
    promptLocations,
  }: {
    prompts: typeof promptEntries;
    zStart: number;
    promptLocations: { [id: string]: PromptLocation };
  }) => {
    // We track prompt heights while they're being hovered to hackily create the "expand on hover without resizing" behavior seen in the prompt list.
    const [heightsByPromptID, setHeightsByPromptID] = useState<{
      [id: string]: number;
    }>({});

    return (
      <div css={{ flexBasis: "50%" }}>
        {prompts.map(([id, prompt], i) => (
          <div
            css={{
              marginBottom: 8,
              height: heightsByPromptID[id],
              zIndex: zStart - i, // i.e. in reverse order, so that lower-y items float above higher-y items
              position: "relative",
            }}
            key={id}
          >
            <PromptBox
              prompt={prompt}
              context={PromptContext.List}
              savePrompt={() => {
                setHeightsByPromptID({}); // Hover doesn't change size anymore.
                dispatch(savePrompt(id));
              }}
              unsavePrompt={() => {
                setHeightsByPromptID({}); // Hover doesn't change size anymore.
                dispatch(unsavePrompt(id));
              }}
              jumpToSrcLocation={() => {
                window.scrollTo({
                  left: window.scrollX,
                  top: promptLocations[id].top - window.innerHeight / 2,
                  behavior: "smooth",
                });
              }}
              updatePromptFront={(newPrompt) =>
                dispatch(updatePromptFront([id, newPrompt]))
              }
              updatePromptBack={(newPrompt) =>
                dispatch(updatePromptBack([id, newPrompt]))
              }
              onMouseEnter={(event) => {
                if (prompt.isSaved) return;
                setHeightsByPromptID((heights) => {
                  // Hack: we just use the first height we see, since if the user moves rapidly back and forth off and on a prompt, it could be animating in this moment. This means that we'll have the wrong height here if the user hovers a prompt list prompt, then saves and edits it *elsewhere* as a floating prompt, then *removes* it, then returns here and hovers it again. I don't think I care about that edge case.
                  if (heights[id]) return heights;
                  return {
                    ...heights,
                    [id]: event.currentTarget.getBoundingClientRect().height,
                  };
                });
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      css={{
        position: "absolute",
        left: left - (12 + 3),
        top,
        width: width + (12 + 3) * 2,
        zIndex: zIndices.displayOverContent,
        animation: "300ms linear fadeIn",
        "@keyframes fadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
      ref={setListElement}
    >
      <div css={{ display: "flex", marginBottom: 4 }}>
        <div css={{ flexGrow: 0 }}>
          <Button
            onClick={() => {
              for (const promptID of promptIDs) {
                dispatch(savePrompt(promptID));
              }
            }}
            icon="add"
            disabled={promptEntries.every(([_, { isSaved }]) => isSaved)}
          >
            Save All to Orbit
          </Button>
        </div>
        <div css={{ flexGrow: 0 }}>
          <Button
            onClick={() => onStartReview(onReviewComplete)}
            icon="rightArrow"
            disabled={promptEntries.every(
              ([_, { isSaved, isDue }]) => isSaved && !isDue,
            )}
          >
            Review All
          </Button>
        </div>
      </div>
      <div
        css={{
          height: autosavedPromptIDs.length > 0 ? 48 : 0,
          overflow: "hidden",
          transition:
            autosavedPromptIDs.length > 0
              ? "height 500ms 300ms var(--expoTiming)"
              : undefined,
        }}
      >
        <AutosaveBanner onUndo={onUndoAutosave} />
      </div>
      <div
        css={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        <PromptListColumn
          prompts={promptEntries.filter((_, i) => i % 2 === 0)}
          promptLocations={promptLocations}
          zStart={200}
        />
        <div css={{ width: 8 }}></div>
        <PromptListColumn
          prompts={promptEntries.filter((_, i) => i % 2 === 1)}
          promptLocations={promptLocations}
          zStart={100}
        />
      </div>
    </div>
  );
}
