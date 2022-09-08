import { css } from "@emotion/react";
import React from "react";
import Starburst from "../static/images/Starburst-48.png";

// Adds an overlay to an interactive element to indicate hover/active states.
// (necessary because these states are expressed as additive colors)
const hoverAndActiveStyles = css({
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

function OrbitMenuButton() {
  return (
    <button
      css={[
        hoverAndActiveStyles,
        {
          backgroundColor: "var(--bgSecondary)",
          borderColor: "var(--fgTertiary)",
          // i.e. a 48px width with a 3px border
          width: 54,
          height: 54,
          borderRadius: "50%",
          borderWidth: 3,
          borderStyle: "solid",
          padding: 0,
          boxShadow:
            "0px 7px 20px 6px rgba(77, 51, 8, 0.09), 0px 4px 8px 3px rgba(77, 51, 8, 0.11), 0px 1px 3px rgba(77, 51, 8, 0.1)",
          cursor: "pointer",

          "&::before": {
            borderRadius: 24,
          },
        },
      ]}
    >
      <div
        css={{
          position: "absolute",
          top: 1, // optical centering needs a nudge
          left: 0,
          backgroundColor: "var(--accentPrimary)",
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskImage: `url(${Starburst})`,
          maskSize: "48px 48px",
          width: 48,
          height: 48,
        }}
      ></div>
    </button>
  );
}

export function OrbitMenu() {
  return (
    <div
      css={{
        position: "fixed",
        right: 48,
        bottom: 40,
      }}
    >
      <OrbitMenuButton />
    </div>
  );
}
