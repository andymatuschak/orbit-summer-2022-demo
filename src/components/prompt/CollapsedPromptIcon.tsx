import { css } from "@emotion/react";
import styled from "@emotion/styled";
import {
  AnchorHoverProps,
  EditingProps,
  HoverProps,
  Icon,
  SavedProps,
} from "./PromptComponents";

const CollapsedIconContainer = styled.div<
  SavedProps & HoverProps
>`
  pointer-events: all;
  min-width: 32px;
  height: 32px;
  position: relative;
  top: -6px;
`;

const CollapsedIconBackground = styled.div<
  SavedProps & HoverProps & EditingProps & AnchorHoverProps
>`
  background-color: ${(props) => {
    if (props.isAnchorHovered) {
      return "var(--selectionHover)";
    } else if (props.isSaved && !props.isHovered && !props.isEditing) {
      return "var(--bgSecondary)";
    } else {
      return null;
    }
  }};
  border-radius: 50%;
  width: 100%;
  height: 100%;
`;

export interface CollapsedPromptIconProps {
  isSaved: boolean;
  isHovered: boolean;
  isEditing: boolean;
  isAnchorHovered: boolean;
  isDue: boolean;
}

export default function CollapsedPromptIcon({
  isSaved,
  isHovered,
  isAnchorHovered,
  isDue,
  isEditing,
}: CollapsedPromptIconProps) {
  return (
    <CollapsedIconContainer
      isSaved={isSaved}
      isHovered={isHovered}
    >
      <CollapsedIconBackground
        isSaved={isSaved}
        isAnchorHovered={isAnchorHovered}
        isHovered={isHovered}
        isEditing={isEditing}
      />
      <div
        css={css`
          position: relative;
          top: -26px;
          left: 4px;
        `}
      >
        <Icon
          isHovered={isHovered}
          isAnchorHovered={isAnchorHovered}
          isSaved={isSaved}
          isEditing={isEditing}
          isDue={isDue}
        />
      </div>
    </CollapsedIconContainer>
  );
}
