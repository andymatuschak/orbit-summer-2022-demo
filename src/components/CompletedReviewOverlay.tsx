import React from "react";
import { useAppSelector } from "../app/store";
import Button from "./Button";
import { LabelColor } from "./Type";

export function CompletedReviewOverlay({
  mode,
  isReviewComplete,
  onClose,
  onContinueReview,
}: {
  mode: "list" | "user";
  isReviewComplete: boolean;
  onClose: () => void;
  onContinueReview: () => void;
}) {
  const duePromptCount = useAppSelector(
    (state) =>
      Object.keys(state.prompts).filter((id) => state.prompts[id].isDue).length,
  );

  const shouldShowContinueUpsell = mode === "list" && duePromptCount > 0;

  return (
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
        >{`${duePromptCount} other ${
          duePromptCount > 1 ? "prompts" : "prompt"
        } you saved on this page ${
          duePromptCount > 1 ? "are" : "is"
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
          onClick={onClose}
          color={LabelColor.White}
          backgroundColor={shouldShowContinueUpsell ? undefined : "#F73B3B"}
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
              onClick={onContinueReview}
              color={LabelColor.White}
              backgroundColor="#F73B3B"
            >
              Review Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
