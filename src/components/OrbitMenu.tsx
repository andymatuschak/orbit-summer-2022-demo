import React, { useState } from "react";
import X from "../static/images/Icons/X.png";
import Starburst from "../static/images/Starburst-48.png";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";

function OrbitMenuButton({
  onClick,
  menuIsOpen,
}: {
  onClick: () => void;
  menuIsOpen: boolean;
}) {
  return (
    <button
      onClick={onClick}
      css={[
        hoverAndActiveStyles,
        {
          width: 48,
          height: 48,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",

          "&::before": {
            borderRadius: menuIsOpen ? "0 0 50% 0" : "50%",
            transition: "border-radius 0.25s var(--expoTiming)",
          },
        },
      ]}
    >
      <div
        css={[
          {
            position: "absolute",
            top: 1, // optical centering needs a nudge
            left: 0,
            width: 48,
            height: 48,
            backgroundColor: "var(--accentPrimary)",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskImage: `url(${Starburst})`,
            maskSize: "48px 48px",
            transition: "var(--fadeTransition)",
          },
          { opacity: menuIsOpen ? 0 : 1 },
        ]}
      ></div>

      <div
        css={[
          {
            position: "absolute",
            top: 12,
            left: 12,
            width: 24,
            height: 24,
            backgroundColor: "var(--accentPrimary)",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskImage: `url(${X})`,
            maskSize: "24px 24px",
            transition: "var(--fadeTransition)",
          },
          { opacity: menuIsOpen ? 1 : 0 },
        ]}
      ></div>
    </button>
  );
}

function OrbitMenuBackground({ menuIsOpen }: { menuIsOpen: boolean }) {
  return (
    <div
      css={{
        position: "absolute",
        // Position as an "outer" border.
        bottom: -3,
        right: -3,
        // TODO get open metrics from laid-out menu container
        width: menuIsOpen ? 300 : 48,
        height: menuIsOpen ? 400 : 48,
        backgroundColor: "var(--bgSecondary)",
        borderColor: "var(--fgTertiary)",
        borderWidth: 3,
        borderRadius: menuIsOpen ? "0 0 27px 0" : 27, // 27 = 48 (width) / 2 + 3 (border)
        borderStyle: "solid",
        boxShadow:
          "0px 7px 20px 6px rgba(77, 51, 8, 0.09), 0px 4px 8px 3px rgba(77, 51, 8, 0.11), 0px 1px 3px rgba(77, 51, 8, 0.1)",

        transition: `width 0.3s var(--expoTiming), height 0.3s var(--expoTiming), border-radius 0.3s var(--expoTiming)`,
      }}
    ></div>
  );
}

export function OrbitMenu() {
  const [isOpen, setOpen] = useState(false);

  return (
    <div
      css={{
        position: "fixed",
        right: 48,
        bottom: 40,
      }}
    >
      <OrbitMenuBackground menuIsOpen={isOpen} />
      <OrbitMenuButton onClick={() => setOpen((o) => !o)} menuIsOpen={isOpen} />
    </div>
  );
}
