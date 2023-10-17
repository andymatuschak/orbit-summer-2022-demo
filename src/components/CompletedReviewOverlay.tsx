import React from "react";
import { useAppSelector } from "../app/store";
import Button from "./Button";
import { LabelColor } from "./Type";

export function CompletedReviewOverlay({
  context,
  isVisible,
  onClose,
}: {
  context: "inline" | "modal";
  isVisible: boolean;
  onClose: () => void;
}) {
  const duePromptCount = useAppSelector(
    (state) =>
      Object.keys(state.prompts).filter((id) => state.prompts[id].isDue).length,
  );

  return (
    <div
      css={{
        position: "absolute",
        top: context === "modal" ? 100 : "calc(50% + 125px)",
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
              context === "modal" ? "#F73B3B" : "var(--bgSecondary)"
            }
          >
            {context === "modal" ? "Return to Book" : "Review Later"}
          </Button>
        </div>
      )}
    </div>
  );
}
