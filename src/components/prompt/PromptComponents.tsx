import { css } from "@emotion/react";
import styled from "@emotion/styled";
import renderMathInElement from "katex/contrib/auto-render";
import { ForwardedRef, forwardRef, useEffect, useState } from "react";
import plus from "../../static/images/Icons/Plus.png";
import starburst_active from "../../static/images/Icons/Starburst-Active.png";
import starburst_editing from "../../static/images/Icons/Starburst-Edit.png";
import startburst_null from "../../static/images/Icons/Starburst-Null.png";

export const ANIMATION_TIME_MSEC = 48.0;

export interface HoverProps {
  isHovered: boolean;
}

export interface AnchorHoverProps {
  isAnchorHovered: boolean;
}

export interface SavedProps {
  isSaved: boolean;
}

export interface EditingProps {
  isEditing: boolean;
}

export interface DueProps {
  isDue: boolean;
}

export interface EditableTextProps {
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface ContextProps {
  context: PromptContext;
}

export enum PromptContext {
  Floating = "floating",
  FloatingCollapsed = "floating_collapsed",
  BulkCollapsed = "bulk_collapsed",
  Bulk = "bulk",
  List = "list",
}

export const isContextFloatingCollapsed = function (context: PromptContext) {
  return context === PromptContext.FloatingCollapsed;
};

export const isContextBulk = function (context: PromptContext) {
  return (
    context === PromptContext.BulkCollapsed || context === PromptContext.Bulk
  );
};

export const isContextCollapsed = function (context: PromptContext) {
  return (
    context === PromptContext.FloatingCollapsed ||
    context === PromptContext.BulkCollapsed
  );
};

export enum CollapsedPromptDirection {
  LTR = "left_to_right",
  RTL = "right_to_left",
}

export interface CollapsedPromptDirectionProps {
  direction: CollapsedPromptDirection;
}

export interface SidedProps {
  side: "front" | "back";
}

const IconBase = styled.div<
  HoverProps & SavedProps & EditingProps & AnchorHoverProps
>((props) => {
  let isStarburst: boolean;
  let backgroundImageURL: string;
  if (props.isEditing || props.isAnchorHovered) {
    isStarburst = true;
    backgroundImageURL = `url(${starburst_editing})`;
  } else if (props.isSaved) {
    isStarburst = true;
    backgroundImageURL = `url(${starburst_active})`;
  } else if (props.isHovered) {
    isStarburst = false;
    backgroundImageURL = `url(${plus})`;
  } else {
    isStarburst = true;
    backgroundImageURL = `url(${startburst_null})`;
  }

  return css`
    width: 24px;
    height: 24px;
    background-image: ${backgroundImageURL};
    // Optical centering corrections:
    margin-top: ${isStarburst ? "-0.5px" : "-2px"};
    margin-left: ${isStarburst ? "0.5px" : "0px"};
    margin-right: ${isStarburst ? "-0.5px" : "0px"};
    margin-bottom: -4px; // HACK: Make the effective laid-out height of the icon not reach below the associated text.
    background-repeat: no-repeat;
    background-size: contain;
    flex: 0 0 auto;
  `;
});

const DueBadgeInner = styled.div`
  height: 7px;
  width: 7px;
  border-radius: 50%;
  background-color: var(--accentPrimary);
`;

const DueBadgeOuter = styled.div`
  position: relative;
  left: 16px;
  top: -2px;
  border-radius: 50%;
  width: 10px;
  height: 10px;
  padding-left: 1.5px;
  padding-top: 1.5px;
  background-color: var(--bgPrimary);
`;

export const Icon = function ({
  isHovered,
  isAnchorHovered,
  isSaved,
  isEditing,
  isDue,
}: HoverProps & SavedProps & EditingProps & DueProps & AnchorHoverProps) {
  return (
    <IconBase
      isHovered={isHovered}
      isSaved={isSaved}
      isEditing={isEditing}
      isAnchorHovered={isAnchorHovered}
    >
      {isDue && (
        <DueBadgeOuter>
          <DueBadgeInner />
        </DueBadgeOuter>
      )}
    </IconBase>
  );
};

export const PromptText = forwardRef(function (
  props: HoverProps &
    SavedProps &
    ContextProps &
    SidedProps &
    EditingProps &
    EditableTextProps & { children: string },
  ref: ForwardedRef<HTMLDivElement>,
) {
  const [localRef, setLocalRef] = useState<HTMLDivElement | null>(null);
  const { children } = props;

  useEffect(() => {
    if (localRef && children) {
      if (localRef.innerText !== children) {
        localRef.innerHTML = children;
      }
      renderMathInElement(localRef, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
      });
    }
  }, [localRef, children]);

  return (
    <div
      placeholder={props.placeholder}
      ref={(r) => {
        setLocalRef(r);
        if (typeof ref === "function") {
          ref(r);
        } else if (ref) {
          ref.current = r;
        }
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      spellCheck={props.isEditing}
      contentEditable={props.isSaved}
      suppressContentEditableWarning
      css={[
        css`
          /* Use a fallback font for sizing purposes */
          font-family: "Dr-Medium", Sans-Serif;
          font-size: 14px;
          line-height: 17px;
          letter-spacing: 0.04em;
          color: var(--fgPrimary);
          opacity: ${props.isHovered ||
          props.isSaved ||
          isContextBulk(props.context) ||
          props.context === PromptContext.List
            ? 1.0
            : 0.696};
          outline: none;
          hyphens: auto;

          ::selection {
            background: var(--editSelection);
          }

          caret-color: var(--accentPrimary);
          ${props.isSaved ? `cursor: text` : null};

          :empty::before {
            content: attr(placeholder);
            color: var(--fgDisabled);
          }

          word-break: break-word;
        `,
        props.side === "back" &&
          css`
            opacity: ${(() => {
              if (props.isSaved) {
                return 1.0;
              } else if (props.isHovered) {
                return 0.7;
              } else if (isContextBulk(props.context)) {
                return 0.4;
              } else {
                return 0.0;
              }
            })()};
            ${props.isSaved
              ? {
                  color: "var(--fgSecondarySmall);",
                }
              : null};

            transition: ${ANIMATION_TIME_MSEC / 1000}s ease-out;
          `,
      ]}
    />
  );
});
