import React, { DOMAttributes, useState } from "react";
import ScrollLock from "react-scrolllock";
import { useAppSelector } from "../app/store";
import Button from "./Button";
import zIndices from "./common/zIndices";
import { LabelColor } from "./Type";

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    // noinspection JSUnusedGlobalSymbols
    interface IntrinsicElements {
      ["orbit-reviewarea"]: CustomElement<
        HTMLElement & { height?: string; ref: any }
      >;
      ["orbit-prompt"]: CustomElement<{
        question: string;
        answer: string;
        id: string;
      }>;
    }
  }
}

export type ModalReviewState =
  | {
      // i.e. we're reviewing a list of prompts specified by the author
      mode: "list";
      promptIDs: string[];
    }
  | {
      // i.e. we're reviewing all the due prompts the user has saved
      mode: "user";
    };

export type ModalReviewProps = {
  onClose: () => void;
  onContinueReview: () => void; // i.e. when the user is successfully upsold from author list to review their due prompts
} & ModalReviewState;

export function ModalReview(props: ModalReviewProps) {
  const prompts = useAppSelector((state) => state.prompts);
  const duePromptIDs = useAppSelector((state) =>
    Object.keys(state.prompts).filter((id) => prompts[id].isDue),
  );

  const [isReviewComplete, setReviewComplete] = useState(false);
  const shouldShowContinueUpsell =
    props.mode === "list" && duePromptIDs.length > 0;

  // A bit of a hack: we tee up the review queue when this component is mounted.
  const [queuedPromptIDs] = useState<string[]>(() =>
    props.mode === "list" ? props.promptIDs : duePromptIDs,
  ); // TODO shuffle

  return (
    <ScrollLock>
      <div
        css={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          // TODO abstract palette for inline review
          backgroundColor: "#ff5252",
          zIndex: zIndices.modalReview,
        }}
      >
        <orbit-reviewarea
          ref={(
            element: {
              onExitReview: () => void;
              onReviewComplete: () => void;
            } | null,
          ) => {
            if (element) {
              element.onExitReview = () => {
                props.onClose();
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
              question={prompts[id].content.front}
              answer={prompts[id].content.back}
              id={id}
            ></orbit-prompt>
          ))}
        </orbit-reviewarea>

        {/* Completed review overlay */}
        {
          <div
            css={{
              position: "absolute",
              top: shouldShowContinueUpsell ? 128 : 100,
              left: 0,
              bottom: 0,
              right: 0,
              opacity: isReviewComplete ? 1 : 0,
              pointerEvents: isReviewComplete ? "all" : "none",
              transition: "opacity 0.25s 600ms linear",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              css={{
                textAlign: "center",
                fontFamily: "Dr-Medium",
                fontSize: 48,
                lineHeight: "40px",
                letterSpacing: "-0.01em",
                color: "var(--fgPrimary)", // TODO palette
                marginBottom: 156,
              }}
            >
              Review complete
            </div>
            {shouldShowContinueUpsell && (
              <div
                css={{
                  fontFamily: "Dr-Medium",
                  fontSize: 24,
                  lineHeight: "26px",
                  textAlign: "center",
                  letterSpacing: "0.02em",
                  width: 330,
                  marginBottom: 40,
                }}
              >{`${duePromptIDs.length} other ${
                duePromptIDs.length > 1 ? "prompts" : "prompt"
              } you saved on this page ${
                duePromptIDs.length > 1 ? "are" : "is"
              } ready for review.`}</div>
            )}
            {/* TODO: vary colors by context (modal vs inline) */}
            <div
              css={{
                display: "flex",
                flexDirection: "row",
              }}
            >
              <Button
                size="large"
                onClick={props.onClose}
                color={LabelColor.White}
                backgroundColor={
                  shouldShowContinueUpsell ? undefined : "#F73B3B"
                }
              >
                Return to Book
              </Button>
              {shouldShowContinueUpsell && (
                <div
                  css={{
                    marginLeft: 16,
                  }}
                >
                  <Button
                    size="large"
                    onClick={props.onContinueReview}
                    color={LabelColor.White}
                    backgroundColor="#F73B3B"
                  >
                    Review Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        }
      </div>
    </ScrollLock>
  );
}
