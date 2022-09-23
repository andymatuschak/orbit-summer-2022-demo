import { css } from "@emotion/react";
import styled from "@emotion/styled";
import React, {
  ForwardedRef,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { Prompt } from "../../app/promptSlice";
import zIndices from "../common/zIndices";
import ContextualMenu from "../ContextualMenu";
import {
  AnchorHoverProps,
  ANIMATION_TIME_MSEC,
  CollapsedPromptDirection,
  CollapsedPromptDirectionProps,
  ContextProps,
  EditingProps,
  HoverProps,
  Icon,
  PromptContext,
  PromptText,
  SavedProps,
} from "./PromptComponents";
import PromptEllipses from "./PromptEllipses";

// HACKy regex for seeing if prompt is image
const IMAGE_REGEX = /<img.+src="(.+)".+>/;

function getPromptImageSrc(promptContent: string): string | undefined {
  const res = promptContent.match(IMAGE_REGEX);
  if (res && res.length > 0) {
    return res[1];
  }
}

export interface PromptProps {
  prompt: Prompt;
  isNew?: boolean;
  forceHover?: boolean;
  clearNew?: () => any;
  context: PromptContext;
  collapsedDirection?: CollapsedPromptDirection;
  savePrompt: () => any;
  unsavePrompt?: () => any;
  jumpToSrcLocation?: () => any;
  updatePromptFront: (newPrompt: string) => any;
  updatePromptBack: (newPrompt: string) => any;
  onMouseEnter?: (event: React.MouseEvent) => any;
  onMouseLeave?: () => any;
  onEditStart?: () => any;
  onEditEnd?: () => any;
  isAnchorHovered?: boolean;
}

const PromptImage = styled.img`
  width: 50%;
  border-radius: 0px;
`;

const PromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 8px;
`;

const CollapsedIconContainer = styled.div<
  SavedProps & HoverProps & CollapsedPromptDirectionProps
>`
  margin-left: auto;
  pointer-events: all;
  min-width: 32px;
  height: 32px;
  position: relative;
  top: -6px;
  left: ${(props) =>
    props.direction === CollapsedPromptDirection.LTR ? -280 : 0}px;
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

const Container = styled.div<
  HoverProps &
    SavedProps &
    EditingProps &
    ContextProps &
    AnchorHoverProps &
    CollapsedPromptDirectionProps
>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 8px 8px 10px
    ${({ context }) => (context === PromptContext.Collapsed ? "13px" : "9px")};
  gap: 8px;
  cursor: ${(props) => (!props.isSaved ? "pointer" : "auto")};
  position: relative;
  border-left: ${(props) => {
    if (
      (props.context === PromptContext.Bulk ||
        props.context === PromptContext.List) &&
      !props.isHovered &&
      !props.isSaved
    ) {
      return "3px solid var(--fgTertiary)";
    } else if (
      (props.isHovered && !props.isSaved) ||
      (props.isAnchorHovered && props.context !== PromptContext.Collapsed)
    ) {
      return "3px solid var(--accentPrimary)";
    } else if (
      props.isSaved &&
      !props.isEditing &&
      props.context !== PromptContext.Collapsed
    ) {
      return "3px solid var(--accentSecondary)";
    } else if (props.isSaved && props.isEditing) {
      return "3px solid var(--accentPrimary)";
    } else if (
      props.context === PromptContext.Collapsed &&
      props.isSaved &&
      props.isHovered
    ) {
      return "3px solid var(--accentSecondary)";
    } else {
      return "3px solid transparent";
    }
  }};
  box-shadow: ${(props) => {
    if (
      (props.isHovered ||
        (props.context === PromptContext.Collapsed && props.isEditing)) &&
      (!props.isSaved || props.context === PromptContext.Collapsed) &&
      props.context !== PromptContext.Bulk
    ) {
      return "0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)";
    }
  }};
  background: ${(props) => {
    if (
      props.isSaved &&
      props.isAnchorHovered &&
      props.context !== PromptContext.Collapsed
    ) {
      return "var(--selectionHover)";
    } else if (props.isSaved && props.context !== PromptContext.Collapsed) {
      return "var(--bgPrimary)";
    } else if (
      props.isHovered &&
      !props.isSaved &&
      props.context !== PromptContext.Bulk
    ) {
      return "var(--bgContent)";
    } else if (props.context === PromptContext.List) {
      return "var(--bgPrimary)";
    } else if (
      props.context === PromptContext.Collapsed &&
      props.isSaved &&
      (props.isHovered || props.isEditing)
    ) {
      return "var(--bgPrimary)";
    }
  }};

  /* Bulk hover state */
  ${(props) =>
    props.context === PromptContext.Bulk && !props.isSaved
      ? `
    :hover::before {
      position: absolute;
      content: '';
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--hoverLayer);
    };`
      : null}

  /* Pressed state */
  ${(props) =>
    !props.isSaved
      ? `
    :active::before {
      position: absolute;
      content: '';
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--pressedLayer);
    };`
      : null}

  transition: ${ANIMATION_TIME_MSEC / 1000}s ease-out;

  /* Collapsed specific handling */
  ${(props) =>
    props.context === PromptContext.Collapsed &&
    props.direction === CollapsedPromptDirection.RTL
      ? "left: -284px;"
      : null}
  ${(props) =>
    props.context === PromptContext.Collapsed && !props.isHovered
      ? "pointer-events: none;"
      : null}
`;

const PromptBox = forwardRef(function (
  {
    prompt,
    isNew,
    clearNew,
    context,
    collapsedDirection = CollapsedPromptDirection.RTL,
    forceHover,
    savePrompt,
    unsavePrompt,
    jumpToSrcLocation,
    updatePromptFront,
    updatePromptBack,
    onMouseEnter,
    onMouseLeave,
    onEditStart,
    onEditEnd,
    isAnchorHovered = false,
  }: PromptProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const [_isHovered, setIsHovered] = useState<boolean>(false);
  const isHovered = forceHover || _isHovered;
  const [isEditing, setIsEditing] = useState<boolean>(isNew ?? false);
  const hidePromptBackTimeout = useRef<number | undefined>();
  const [showPromptBack, setShowPromptBack] = useState<boolean>(false);
  const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const isSaved = prompt.isSaved;

  const promptFrontRef = useRef<HTMLDivElement | null>(null);
  const promptBackRef = useRef<HTMLDivElement | null>(null);

  // We hide the prompt back only after the animation for unhover'ing is done. This way the container doesn't instantly resize and cause animation to glitch
  useEffect(() => {
    if (!isHovered && !isSaved) {
      hidePromptBackTimeout.current = window.setTimeout(() => {
        setShowPromptBack(false);
      }, ANIMATION_TIME_MSEC);
    } else if (isHovered || isSaved) {
      clearTimeout(hidePromptBackTimeout.current);
      hidePromptBackTimeout.current = undefined;
      setShowPromptBack(true);
    }
  }, [isHovered, isSaved, setShowPromptBack]);

  const startEditing = function (editingFront: boolean) {
    setIsEditing(true);
    if (onEditStart) onEditStart();

    // Select all text in prompt
    const el = editingFront ? promptFrontRef.current : promptBackRef.current;
    const sel = window.getSelection();
    const range = document.createRange();
    if (el && sel && range) {
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const endEditing = function () {
    if (promptFrontRef.current?.innerText) {
      updatePromptFront(promptFrontRef.current.innerText);
    }
    if (promptBackRef.current?.innerText) {
      updatePromptBack(promptBackRef.current.innerText);
    }
    setIsEditing(false);
    savePrompt();
    setContextMenuOpen(false);
    if (clearNew) clearNew();
    if (onEditEnd) onEditEnd();
  };

  // Focus if new
  useEffect(() => {
    if (isNew && promptFrontRef.current) {
      promptFrontRef.current.focus({ preventScroll: true });
      if (onEditStart) onEditStart();
    }
  }, [isNew, promptFrontRef, onEditStart]);

  // Check if image
  useEffect(() => {
    setImageSrc(getPromptImageSrc(prompt.content.back));
  }, [prompt]);

  // Set up context menu items
  const contextMenuItems = [
    {
      title: prompt.isByAuthor ? "Unsave Prompt" : "Delete Prompt",
      onClick: () => {
        setContextMenuOpen(false);
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave();
        if (unsavePrompt) unsavePrompt();
      },
      shortcutKey: prompt.isByAuthor ? "U" : "D",
      isEnabled: contextMenuOpen,
    },
  ];

  if (context === PromptContext.List) {
    contextMenuItems.push({
      title: "Jump to Source Location",
      onClick: () => {
        if (jumpToSrcLocation) jumpToSrcLocation();
      },
      shortcutKey: "J",
      isEnabled: contextMenuOpen,
    });
  }

  return (
    <Container
      isHovered={isHovered}
      isAnchorHovered={isAnchorHovered}
      isSaved={isSaved}
      isEditing={isEditing}
      context={context}
      direction={collapsedDirection}
      onMouseEnter={(event) => {
        setIsHovered(true);
        if (onMouseEnter) onMouseEnter(event);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave();
        if (!isEditing) setContextMenuOpen(false);
      }}
      onClick={() => (!isSaved ? savePrompt() : null)}
      ref={ref}
    >
      {(context !== PromptContext.Collapsed ||
        ((isHovered || isEditing) &&
          collapsedDirection === CollapsedPromptDirection.LTR)) && (
        <Icon
          isHovered={isHovered}
          isAnchorHovered={isAnchorHovered}
          isSaved={isSaved}
          isEditing={isEditing}
          isDue={prompt.isDue}
        />
      )}
      {(context !== PromptContext.Collapsed ||
        (context === PromptContext.Collapsed && (isHovered || isEditing))) && (
        <PromptContainer>
          <PromptText
            side="front"
            isHovered={isHovered}
            isSaved={isSaved}
            isEditing={isEditing}
            context={context}
            onFocus={() => startEditing(true)}
            onBlur={() => endEditing()}
            ref={promptFrontRef}
            placeholder="Type a prompt here."
          >
            {prompt.content.front}
          </PromptText>
          {(showPromptBack ||
            context === PromptContext.Bulk ||
            forceHover ||
            isSaved) &&
            (imageSrc ? (
              <PromptImage src={imageSrc} />
            ) : (
              <PromptText
                side="back"
                isHovered={isHovered}
                isSaved={isSaved}
                context={context}
                isEditing={isEditing}
                onFocus={() => startEditing(false)}
                onBlur={() => endEditing()}
                ref={promptBackRef}
                placeholder="Type a response here."
              >
                {prompt.content.back}
              </PromptText>
            ))}
        </PromptContainer>
      )}
      {/* This icon is used in the collapsed state as the trigger icon for showing full prompt */}
      {context === PromptContext.Collapsed && !isHovered && (
        <CollapsedIconContainer
          isSaved={isSaved}
          isHovered={isHovered}
          direction={collapsedDirection}
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
              isDue={prompt.isDue}
            />
          </div>
        </CollapsedIconContainer>
      )}
      {/* ------ ellipses menu  ------- */}
      {prompt.isSaved &&
        (isHovered || isEditing) &&
        context !== PromptContext.Collapsed && (
          <div
            css={css`
              position: absolute;
              top: 3px;
              right: 1px;
            `}
          >
            <PromptEllipses onClick={() => setContextMenuOpen(true)} />
          </div>
        )}
      {/* ----- context menu ------ */}
      {contextMenuOpen && (
        <div
          css={css`
            position: absolute;
            top: 0px;
            left: calc(100% + 0px);
            display: flex;
            flex-direction: row;
            z-index: ${zIndices.orbitMenu + 100};
          `}
        >
          <div
            css={css`
              width: 6px;
            `}
          />
          <ContextualMenu items={contextMenuItems} />
        </div>
      )}
    </Container>
  );
});

export default PromptBox;
