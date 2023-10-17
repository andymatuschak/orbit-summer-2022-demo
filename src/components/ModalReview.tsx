import shuffle from "knuth-shuffle-seeded";
import React, { DOMAttributes, useState } from "react";
import ScrollLock from "react-scrolllock";
import { getOrbitPromptProps } from "../app/inlineReviewModuleSlice";
import {
  endModalReview,
  ModalReviewState,
  viewSourceForPromptID,
} from "../app/modalReviewSlice";
import { useAppDispatch, useAppSelector } from "../app/store";
import zIndices from "./common/zIndices";
import { CompletedReviewOverlay } from "./CompletedReviewOverlay";

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    // noinspection JSUnusedGlobalSymbols
    interface IntrinsicElements {
      ["orbit-reviewarea"]: CustomElement<
        HTMLElement & {
          height?: string;
          ref: any;
          modal: boolean;
          color: string;
        }
      >;
      ["orbit-prompt"]: CustomElement<{
        question: string;
        answer: string;
        id: string;
        key: string;
      }>;
    }
  }
}

export function ModalReview(props: NonNullable<ModalReviewState>) {
  const dispatch = useAppDispatch();
  const prompts = useAppSelector((state) => state.prompts);
  const [reviewAreaID] = useState(() => `reviewArea-${Date.now()}`);

  const [isReviewComplete, setReviewComplete] = useState(false);

  // A bit of a hack: we tee up the review queue when this component is mounted.
  const [queuedPromptIDs] = useState<string[]>(() => {
    return shuffle(props.promptIDs.slice(), 314159265);
  });

  function onExitReview() {
    dispatch(endModalReview());
  }

  function onViewSource(taskID: string) {
    const prompt = props.extraPrompts[taskID] ?? prompts[taskID];
    dispatch(viewSourceForPromptID(prompt.showSourceOverrideID ?? taskID));
  }

  return (
    <ScrollLock>
      <div
        css={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          backgroundColor: "var(--bgPrimary)",
          zIndex: zIndices.modalReview,
          display: props.viewingSourceID ? "none" : "block",
        }}
      >
        <orbit-reviewarea
          id={reviewAreaID}
          color="brown"
          modal
          ref={(
            element: {
              onExitReview: () => void;
              onReviewComplete: () => void;
              onViewSource: (taskID: string) => void;
            } | null,
          ) => {
            if (element) {
              element.onExitReview = onExitReview;
              element.onViewSource = onViewSource;

              element.onReviewComplete = function () {
                setReviewComplete(true);
              };
            }
          }}
          height="100vh"
        >
          {queuedPromptIDs.map((id) => (
            <orbit-prompt
              {...getOrbitPromptProps(props.extraPrompts[id] ?? prompts[id])}
              id={id}
              key={id}
            ></orbit-prompt>
          ))}
        </orbit-reviewarea>

        <CompletedReviewOverlay
          context="modal"
          isVisible={isReviewComplete}
          onClose={onExitReview}
        />
      </div>
    </ScrollLock>
  );
}
