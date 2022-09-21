import React from "react";
import { useAppSelector } from "../app/store";
import Button from "./Button";
import { LabelColor } from "./Type";

export function CompletedReviewOverlay({
  mode,
  context,
  isVisible,
  onClose,
  onContinueReview,
}: {
  mode: "list" | "user";
  context: "inline" | "modal";
  isVisible: boolean;
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
        top: shouldShowContinueUpsell
          ? context === "modal"
            ? 128
            : 164
          : context === "modal"
          ? 100
          : "calc(50% + 125px)",
        left: 0,
        bottom: 0,
        right: 0,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "all" : "none",
        transition: isVisible
          ? "opacity 0.25s 600ms linear"
          : "opacity 0.25s linear",
        display: "flex",
        flexDirection: "column",
        justifyContent: context === "modal" ? "center" : "flex-start",
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
          color: "var(--fgPrimary)",
          marginBottom: context === "modal" ? 156 : 96,
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
      {(context === "modal" || duePromptCount > 0) && (
        <div
          css={{
            display: "flex",
            flexDirection: "row",
          }}
        >
          <Button
            size="large"
            onClick={onClose}
            color={
              context === "modal" ? LabelColor.White : LabelColor.AccentPrimary
            }
            backgroundColor={
              shouldShowContinueUpsell
                ? undefined
                : context === "modal"
                ? "#F73B3B"
                : "var(--bgSecondary)"
            }
          >
            {context === "modal" ? "Return to Book" : "Review Later"}
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
                color={
                  context === "modal"
                    ? LabelColor.White
                    : LabelColor.AccentPrimary
                }
                backgroundColor={
                  context === "modal" ? "#F73B3B" : "var(--bgSecondary)"
                }
              >
                Review Now
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
