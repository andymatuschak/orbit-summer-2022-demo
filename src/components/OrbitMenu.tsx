import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "../app/store";
import X from "../static/images/Icons/X.png";
import Logo from "../static/images/Logo.png";
import Starburst from "../static/images/Starburst-48.png";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import MenuItem from "./MenuItem";
import {
  OrbitMenuPromptVisibilityControl,
  PromptVisibilitySetting,
} from "./OrbitMenuPromptVisibilityControl";
import { Label, LabelColor, labelSmallStyle } from "./Type";

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
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 48,
          height: 48,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",

          // Dodge the bottom chrome border when the menu is open.
          clipPath: menuIsOpen ? "inset(3px 0 0 0)" : undefined,

          "&::before": {
            borderRadius: menuIsOpen ? "0 0 50% 0" : "50%",
            transition: "border-radius 1s var(--expoTiming)",
          },
        },
      ]}
    >
      {/* Logo glyph */}
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

      {/* Close button */}
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

function OrbitMenuBackground({
  menuIsOpen,
  contentsSize,
}: {
  menuIsOpen: boolean;
  contentsSize: [number, number];
}) {
  return (
    <div
      css={{
        position: "absolute",
        // Position as an "outer" border.
        bottom: -3,
        right: -3,
        width: (menuIsOpen ? contentsSize[0] : 48) + 3 * 2,
        height: (menuIsOpen ? contentsSize[1] : 48) + 3 * 2,
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

function OrbitMenuLogo() {
  return (
    <div
      css={{
        backgroundColor: "var(--fgSecondaryLarge)",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskImage: `url(${Logo})`,
        maskSize: "61px 32px",
        width: 61,
        height: 32,
      }}
    ></div>
  );
}

function PromptVisibilityMenuItem() {
  // TODO: Move to store
  const [value, setValue] = useState<PromptVisibilitySetting>(
    PromptVisibilitySetting.All,
  );
  return (
    <div
      css={{
        display: "flex",
        flexDirection: "column",
        padding: "12px 12px 8px 12px",
      }}
    >
      <Label text="Show floating prompts:" color={LabelColor.FGPrimary} />
      <div css={{ height: 8 }} />
      <OrbitMenuPromptVisibilityControl value={value} onChange={setValue} />
    </div>
  );
}

// TODO implement all callers
function unimplemented() {
  alert("UNIMPLEMENTED");
}

export interface OrbitMenuProps {
  onStartReview: () => void;
}
export function OrbitMenu(props: OrbitMenuProps) {
  const [isOpen, setOpen] = useState(false);
  const duePromptCount = useAppSelector(
    ({ prompts }) =>
      Object.keys(prompts).filter((id) => prompts[id].isDue).length,
  );
  const anyPromptsSaved = useAppSelector(
    ({ prompts }) =>
      Object.keys(prompts).filter((id) => prompts[id].isSaved).length > 0,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [contentsSize, setContentsSize] = useState<[number, number] | null>(
    null,
  );
  const calculateLayout = useCallback((node: HTMLDivElement | null) => {
    // NOTE: this strategy assumes the menu contents do not change size after initial layout
    if (node) {
      const rect = node.getBoundingClientRect();
      setContentsSize([rect.width, rect.height]);
    } else {
      setContentsSize(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      function onClick(event: MouseEvent) {
        if (
          event.target instanceof Element &&
          !containerRef.current!.contains(event.target)
        ) {
          setOpen(false);
          document.removeEventListener("click", onClick);
        }
      }

      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef}>
      {contentsSize && (
        <OrbitMenuBackground menuIsOpen={isOpen} contentsSize={contentsSize} />
      )}
      <div
        ref={calculateLayout}
        css={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bgPrimary)",
          padding: 4,
          clipPath:
            isOpen || !contentsSize
              ? "inset(0 0 0 0 round 0 0 24px 0)"
              : `inset(${contentsSize[1] - 48}px 0 0 ${
                  contentsSize[0] - 48
                }px round 24px)`,
          pointerEvents: isOpen ? "all" : "none",
          // Bit of a hack: while we're still sizing the contents, make them invisible. And use a transition to make their transition back to visibility occur after the clip animation would complete.
          opacity: contentsSize ? 1 : 0,
          transition:
            "clip-path 0.3s var(--expoTiming), opacity 0s 0.3s linear",
        }}
      >
        <PromptVisibilityMenuItem />
        <MenuItem
          title="Export as Anki Deck"
          onClick={unimplemented}
          disabled={!anyPromptsSaved}
        />
        {/* TODO add pending review prompt count */}
        <MenuItem
          title="Start Review"
          onClick={() => {
            props.onStartReview();
            setOpen(false);
          }}
          disabled={duePromptCount === 0}
        />

        {/* Bottom bar */}
        <div
          css={{
            backgroundColor: "var(--bgSecondary)",
            borderTopWidth: 3,
            borderTopColor: "var(--fgTertiary)",
            borderTopStyle: "solid",
            height: 48,
            margin: -4,
            marginTop: 4,
            opacity: isOpen ? 1 : 0,
            transition: "var(--fadeTransition)",
            padding: 8,
            paddingTop: 8 - 3,
          }}
        >
          <OrbitMenuLogo />
        </div>
      </div>
      <OrbitMenuButton onClick={() => setOpen((o) => !o)} menuIsOpen={isOpen} />
      {duePromptCount > 0 && (
        <DueCount count={duePromptCount} menuIsOpen={isOpen} />
      )}
    </div>
  );
}

function DueCount({
  count,
  menuIsOpen,
}: {
  count: number;
  menuIsOpen: boolean;
}) {
  return (
    <div
      css={{
        position: "absolute",
        width: 20,
        height: 20,
        bottom: 30,
        right: -10,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        paddingBottom: 3,
        backgroundColor: "var(--accentPrimary)",
        filter:
          "drop-shadow(0px 3px 5px rgba(0, 0, 0, 0.15)) drop-shadow(0px 1px 3px rgba(77, 51, 8, 0.4))",
        opacity: menuIsOpen ? 0 : 1,
        transition: "var(--fadeTransition)",
        transitionDuration: "83ms",
      }}
    >
      <div
        css={[
          labelSmallStyle,
          {
            color: "white",
            textAlign: "center",
            flexGrow: 1,
          },
        ]}
      >
        {count}
      </div>
    </div>
  );
}
