import React, { DOMAttributes, useState } from "react";
import ScrollLock from "react-scrolllock";
import { getOrbitPromptProps } from "../app/inlineReviewModuleSlice";
import { useAppSelector } from "../app/store";
import zIndices from "./common/zIndices";
import { CompletedReviewOverlay } from "./CompletedReviewOverlay";
import shuffle from "knuth-shuffle-seeded";

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    // noinspection JSUnusedGlobalSymbols
    interface IntrinsicElements {
      ["orbit-reviewarea"]: CustomElement<
        HTMLElement & { height?: string; ref: any; modal: boolean }
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

export type ModalReviewState =
  | {
      // i.e. we're reviewing a list of prompts specified by the author
      mode: "list";
      promptIDs: string[];
      onReviewExit: (reviewAreaID: string) => void;
    }
  | {
      // i.e. we're reviewing all the due prompts the user has saved
      mode: "user";
    };

export type ModalReviewProps = {
  onClose: (reviewAreaID: string) => void;
  onContinueReview: (reviewAreaID: string) => void; // i.e. when the user is successfully upsold from author list to review their due prompts
} & ModalReviewState;

export function ModalReview(props: ModalReviewProps) {
  const prompts = useAppSelector((state) => state.prompts);
  const duePromptIDs = useAppSelector((state) =>
    Object.keys(state.prompts).filter((id) => state.prompts[id].isDue),
  );
  const [reviewAreaID] = useState(() => `reviewArea-${Date.now()}`);

  const [isReviewComplete, setReviewComplete] = useState(false);

  // A bit of a hack: we tee up the review queue when this component is mounted.
  const [queuedPromptIDs] = useState<string[]>(() =>
    props.mode === "list" ? props.promptIDs : shuffle(duePromptIDs, 314159265),
  );

  return (
    <ScrollLock>
      <div
        css={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          backgroundColor: "#ff5252",
          zIndex: zIndices.modalReview,
        }}
      >
        <orbit-reviewarea
          id={reviewAreaID}
          modal
          ref={(
            element: {
              onExitReview: () => void;
              onReviewComplete: () => void;
            } | null,
          ) => {
            if (element) {
              element.onExitReview = () => {
                props.onClose(reviewAreaID);
              };

              element.onReviewComplete = function () {
                setReviewComplete(true);
              };
            }
          }}
          height="100vh"
        >
          {queuedPromptIDs.map((id) => (
            <orbit-prompt
              {...getOrbitPromptProps(prompts[id], true)}
              id={id}
              key={id}
            ></orbit-prompt>
          ))}
        </orbit-reviewarea>

        <CompletedReviewOverlay
          mode={props.mode}
          context="modal"
          isVisible={isReviewComplete}
          onClose={() => props.onClose(reviewAreaID)}
          onContinueReview={() => props.onContinueReview(reviewAreaID)}
        />
      </div>
    </ScrollLock>
  );
}
