import { css } from "@emotion/react";
import styled from "@emotion/styled";
import renderMathInElement from "katex/contrib/auto-render";
import { ComponentProps, forwardRef, PropsWithChildren } from "react";

import startburst_null from "../../static/images/Icons/Starburst-Null.png";
import starburst_active from "../../static/images/Icons/Starburst-Active.png";
import starburst_editing from "../../static/images/Icons/Starburst-Edit.png";
import plus from "../../static/images/Icons/Plus.png";

export const ANIMATION_TIME_MSEC = 48.0;

export interface HoverProps {
  isHovered: boolean;
}

export interface SavedProps {
  isSaved: boolean;
}

export interface EditingProps {
  isEditing: boolean;
}

export interface BulkProps {
  isBulk: boolean;
}

export interface SidedProps {
  side: "front" | "back";
}

export interface HiddenProps {
  isHidden: boolean;
}

export const Icon = styled.div<HoverProps & SavedProps & EditingProps>`
  width: 24px;
  height: 24px;
  background-image: ${(props) => {
    if (props.isEditing) {
      return `url(${starburst_editing})`;
    } else if (props.isSaved) {
      return `url(${starburst_active})`;
    } else if (props.isHovered) {
      return `url(${plus})`;
    } else {
      return `url(${startburst_null})`;
    }
  }};
  background-repeat: no-repeat;
  background-size: contain;
  flex: 0 0 auto;
`;

export const PromptText = forwardRef(function (
  props: HoverProps &
    SavedProps &
    BulkProps &
    SidedProps &
    React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    >,
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <div
      ref={ref}
      {...props}
      css={[
        css`
          /* Use a fallback font for sizing purposes */
          font-family: "Dr-Medium", Sans-Serif;
          font-size: 14px;
          line-height: 17px;
          letter-spacing: 0.04em;
          color: var(--fgPrimary);
          opacity: ${props.isHovered || props.isSaved || props.isBulk
            ? 1.0
            : 0.696};
          outline: none;

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
              } else if (props.isBulk) {
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
    >
      {props.children}
    </div>
  );
});
