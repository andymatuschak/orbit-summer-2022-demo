import { css } from "@emotion/react";

// Adds an overlay to an interactive element to indicate hover/active states.
// (necessary because these states are expressed as additive colors)
export const hoverAndActiveStyles = css({
  display: "block",
  position: "relative",

  "&:hover::before": {
    position: "absolute",
    content: '""',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--hoverLayer)",
  },

  "&:active::before": {
    position: "absolute",
    content: '""',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--pressedLayer)",
  },
});
