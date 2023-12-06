import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadAnkiDeck,
  fetchReviewPromptsAndStartReview,
} from "../app/hypothesisMiddleware";
import { AnnotationType } from "../app/promptSlice";
import { useAppDispatch, useAppSelector } from "../app/store";
import X from "../static/images/Icons/X.png";
import Logo from "../static/images/Logo.png";
import Starburst from "../static/images/Starburst-48.png";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import MenuItem from "./MenuItem";

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
          pointerEvents: "all",

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

export function OrbitMenu() {
  const dispatch = useAppDispatch();

  const [isOpen, setOpen] = useState(false);
  const forReviewPromptCount = useAppSelector(
    ({ prompts }) =>
      Object.keys(prompts).filter(
        (id) => prompts[id].annotationType === AnnotationType.ForReview,
      ).length,
  );
  const anyPromptsSaved = useAppSelector(
    ({ prompts }) =>
      Object.keys(prompts).filter((id) => prompts[id].isSaved).length > 0,
  );
  const userEmail = useAppSelector(({ auth }) =>
    auth.status === "signedIn" ? auth.user.emailAddress : null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interiorRef = useRef<HTMLDivElement | null>(null);

  const [contentsSize, setContentsSize] = useState<[number, number] | null>(
    null,
  );
  const calculateLayout = useCallback(() => {
    // NOTE: this strategy assumes the menu contents do not change size after initial layout
    if (interiorRef.current) {
      const rect = interiorRef.current.getBoundingClientRect();
      setContentsSize([rect.width, rect.height]);
    } else {
      setContentsSize(null);
    }
  }, []);
  // When the user signs in/out, recalculate.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    userEmail;
    setTimeout(() => {
      calculateLayout();
    }, 100); // HACK--not sure why this is necessary.
  }, [calculateLayout, userEmail]);

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
        ref={useCallback(
          (node: HTMLDivElement) => {
            interiorRef.current = node;
            calculateLayout();
          },
          [calculateLayout],
        )}
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
        {/*<PromptVisibilityMenuItem />*/}
        <MenuItem
          title="Export Anki Deck"
          onClick={() => dispatch(downloadAnkiDeck("anki"))}
          disabled={!anyPromptsSaved}
        />
        <MenuItem
          title="Export Mnemosyne Deck"
          onClick={() => dispatch(downloadAnkiDeck("mnemosyne"))}
          disabled={!anyPromptsSaved}
        />
        <MenuItem
          title="Start Review"
          subtitle={userEmail ?? undefined}
          onClick={() => {
            dispatch(fetchReviewPromptsAndStartReview());
            setOpen(false);
          }}
          disabled={forReviewPromptCount === 0}
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
    </div>
  );
}
