import { generateUniqueID } from "@withorbit/core";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import zIndices from "../components/common/zIndices";
import ContextualMenu from "../components/ContextualMenu";
import { InlineReviewOverlay } from "../components/InlineReviewOverlay";
import { ModalReview, ModalReviewState } from "../components/ModalReview";
import { OrbitMenu } from "../components/OrbitMenu";
import { PromptLayoutManager } from "../components/prompt/PromptLayoutManager";
import { PromptList } from "../components/prompt/PromptList";
import { useAsyncLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import { useReviewAreaIntegration } from "../hooks/useReviewAreaIntegration";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import {
  PromptLocation,
  resolvePromptLocations,
} from "../util/resolvePromptLocations";
import { describe } from "../vendor/hypothesis-annotator/html";
import { InlineReviewModuleState } from "./inlineReviewModuleSlice";
import {
  createNewPrompt,
  Prompt,
  PromptID,
  PromptsState,
  savePrompt,
} from "./promptSlice";
import { useAppDispatch, useAppSelector } from "./store";

export interface AppProps {
  marginX: number;
  textRoot: Element;
  pageID: string;
}

export interface PromptListSpec {
  promptsByFrontText: string[];
}

export default function App({ marginX, textRoot, pageID }: AppProps) {
  const prompts = useAppSelector((state) => state.prompts);
  const inlineReviewModules = useAppSelector(
    (state) => state.inlineReviewModules,
  );
  useReviewAreaIntegration();

  // HACK HACK: when orbit-reviewarea lays out, it'll move prompts down the page. Lay out again a couple seconds after load...
  const [promptRelayoutTime, setPromptRelayoutTime] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      setPromptRelayoutTime(Date.now());
    }, 2000);
  }, []);

  const promptLocations = useAsyncLayoutDependentValue(
    null,
    useCallback(async () => {
      // noinspection JSUnusedLocalSymbols
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const unused = promptRelayoutTime;
      return await resolvePromptLocations(prompts);
      // TODO: We don't really want to rerun this every time `prompts` changes. Think more carefully about this...
    }, [prompts, promptRelayoutTime]),
  );

  const dispatch = useAppDispatch();

  const { selectionPosition, selectionRange, clearSelectionPosition } =
    useSelectionBounds();

  const selectedPromptIDs = useMemo(() => {
    return selectionRange && promptLocations
      ? findIntersectingPrompts(selectionRange, promptLocations)
      : [];
  }, [selectionRange, promptLocations]);

  const suggestedPromptIDs = useMemo(
    () => selectedPromptIDs.filter((id) => !prompts[id].isSaved),
    [prompts, selectedPromptIDs],
  );

  const [modalReviewState, setModalReviewState] =
    useState<ModalReviewState | null>(null);

  const [newPromptId, setNewPromptId] = useState<string | undefined>();
  const mousePosition = useRef<{ x: number; y: number }>();

  // Listen to mouse events for context menu
  useEffect(() => {
    const onMouseMove = function (e: MouseEvent) {
      mousePosition.current = {
        x: e.clientX + window.scrollX,
        y: e.clientY + window.scrollY,
      };
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  function onModalReviewComplete(
    reviewAreaID: string,
    nextState: ModalReviewState | null,
  ) {
    if (modalReviewState?.mode === "list") {
      modalReviewState.onReviewExit(reviewAreaID);
    }
    setModalReviewState(nextState);
  }

  const promptListData = useMemo(() => {
    console.log("-- compute prompt list data", prompts);
    return computePromptListData(pageID, prompts, inlineReviewModules);
  }, [pageID, inlineReviewModules, prompts]);

  if (promptLocations === null) return null;

  console.log("====promptListData", promptListData);
  return (
    <>
      <div
        css={{
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <div
          css={{
            position: "absolute",
            left: selectionPosition?.left ? mousePosition.current?.x ?? 0 : 0,
            top: selectionPosition?.top ? mousePosition.current?.y ?? 0 : 0,
            width: 0,
            height: 0,
            pointerEvents: selectionPosition ? "auto" : "none",
            opacity: selectionPosition ? 1 : 0,
            zIndex: zIndices.orbitMenu,
          }}
        >
          <ContextualMenu
            items={[
              {
                title: "New Prompt",
                onClick: () => {
                  clearSelectionPosition();
                  if (selectionRange) {
                    const newPrompt: Prompt = {
                      content: {
                        front: "",
                        back: "",
                      },
                      selectors: describe(textRoot, selectionRange),
                      isByAuthor: false,
                      isSaved: true,
                      isDue: true,
                      showAnchors: true,
                    };
                    const newId = generateUniqueID();
                    dispatch(createNewPrompt({ id: newId, prompt: newPrompt }));
                    setNewPromptId(newId);
                  }
                },
                shortcutKey: "N",
                isEnabled: !!selectionPosition,
              },
              ...(suggestedPromptIDs.length > 0
                ? [
                    {
                      title: `Save Suggested Prompt${
                        suggestedPromptIDs.length > 1 ? "s" : ""
                      }`,
                      onClick: () => {
                        clearSelectionPosition();
                        suggestedPromptIDs.forEach((id) =>
                          dispatch(savePrompt(id)),
                        );
                      },
                      shortcutKey: "S",
                      isEnabled: true,
                    },
                  ]
                : []),
            ]}
          />
        </div>
        <PromptLayoutManager
          prompts={prompts}
          promptLocations={promptLocations}
          marginX={marginX}
          newPromptId={newPromptId}
          clearNewPrompt={() => setNewPromptId(undefined)}
          suggestedPromptIDs={suggestedPromptIDs}
        />
        <>
          {Object.entries(inlineReviewModules).map(([id, reviewModule]) => (
            <div
              key={id}
              css={{
                position: "absolute",
                zIndex: zIndices.displayOverContent,
                pointerEvents: "none",
                ...reviewModule.frame,
              }}
            >
              <InlineReviewOverlay
                reviewModuleID={id}
                promptIDs={reviewModule.promptIDs}
                onContinueReview={() => setModalReviewState({ mode: "user" })}
              />
            </div>
          ))}
        </>
      </div>
      <div
        css={{
          position: "fixed",
          right: 48,
          bottom: 40,
          zIndex: zIndices.orbitMenu,
          pointerEvents: "none",
        }}
      >
        <OrbitMenu
          onStartReview={() =>
            setModalReviewState(
              { mode: "user" },
              // To test the list mode upsell behavior:
              /*{
              mode: "list",
              promptIDs: ["Why keep shaped work rough?"],
            }*/
            )
          }
        />
      </div>
      {modalReviewState && (
        <ModalReview
          key={modalReviewState.mode} /* remount when mode changes */
          onClose={(id) => onModalReviewComplete(id, null)}
          onContinueReview={(id) => onModalReviewComplete(id, { mode: "user" })}
          {...modalReviewState}
        />
      )}
      {promptListData.map((promptList) => (
        <PromptList
          key={`promptList-${promptList.promptListID}`}
          targetElementID={promptList.promptListID}
          promptLocations={promptLocations}
          onStartReview={(onReviewExit) =>
            setModalReviewState({
              mode: "list",
              promptIDs: promptList.promptIDs,
              onReviewExit,
            })
          }
          promptIDs={promptList.promptIDs}
          inlineReviewID={promptList.inlineReviewID}
        />
      ))}
    </>
  );
}

function computePromptListData(
  pageID: string,
  prompts: PromptsState,
  inlineReviewModules: InlineReviewModuleState,
): {
  promptListID: string;
  promptIDs: PromptID[];
  inlineReviewID?: string;
}[] {
  const promptIDsByFrontText: { [frontText: string]: PromptID } = {};
  for (const [id, prompt] of Object.entries(prompts)) {
    promptIDsByFrontText[prompt.content.front] = id;
  }
  return [
    // previously we included multiple pages worth of ids/prompt, but now we only have one
    {
      promptListID: pageID,
      promptIDs: Object.keys(prompts),
    },
    ...Object.entries(inlineReviewModules)
      // Include inline review modules which have been "turned into" prompt lists.
      .filter(([, inlineReviewModule]) => !!inlineReviewModule.promptListID)
      .map(([id, inlineReviewModule]) => ({
        promptListID: inlineReviewModule.promptListID!,
        promptIDs: inlineReviewModule.promptIDs,
        inlineReviewID: id,
      })),
  ];
}

function findIntersectingPrompts(
  range: Range,
  locations: { [promptID: string]: PromptLocation },
) {
  if (range.collapsed) return [];
  return Object.keys(locations).filter((id) => {
    const promptRange = locations[id].range;
    // A prompt intersects the range if its start point is before the range's end point, and its end point is after the range's start point
    return (
      promptRange.compareBoundaryPoints(Range.END_TO_START, range) <= 0 &&
      promptRange.compareBoundaryPoints(Range.START_TO_END, range) >= 0
    );
  });
}
