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
  isContextBulk,
  isContextCollapsed,
  isContextFloatingCollapsed,
  PromptContext,
  PromptText,
  SavedProps,
} from "./PromptComponents";
import PromptEllipses from "./PromptEllipses";
import CollapsedPromptIcon from "./CollapsedPromptIcon";

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
  // !UGLY!...In collapse mode we want to forcibly hide the back for measurement purposes...
  forceHideBack?: boolean;
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
  padding: 8px
    ${({ context, direction }) =>
      context === PromptContext.BulkCollapsed &&
      direction === CollapsedPromptDirection.RTL
        ? "13px"
        : "8px"}
    10px
    ${({ context, direction }) =>
      direction === CollapsedPromptDirection.RTL &&
      (isContextFloatingCollapsed(context) ||
        context === PromptContext.BulkCollapsed)
        ? "13px"
        : "9px"};
  gap: 8px;
  cursor: ${(props) => (!props.isSaved ? "pointer" : "auto")};
  position: relative;
  border-left: ${(props) => {
    if (
      (isContextBulk(props.context) || props.context === PromptContext.List) &&
      !props.isHovered &&
      !props.isSaved
    ) {
      return "3px solid var(--fgTertiary)";
    } else if (
      (props.isHovered && !props.isSaved) ||
      (props.isAnchorHovered && !isContextFloatingCollapsed(props.context))
    ) {
      return "3px solid var(--accentPrimary)";
    } else if (
      props.isSaved &&
      !props.isEditing &&
      !isContextFloatingCollapsed(props.context)
    ) {
      return "3px solid var(--accentSecondary)";
    } else if (props.isSaved && props.isEditing) {
      return "3px solid var(--accentPrimary)";
    } else if (
      isContextFloatingCollapsed(props.context) &&
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
        (isContextFloatingCollapsed(props.context) && props.isEditing)) &&
      (!props.isSaved || isContextFloatingCollapsed(props.context)) &&
      !isContextBulk(props.context)
    ) {
      return "0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)";
    }
  }};
  background: ${(props) => {
    if (
      props.isSaved &&
      props.isAnchorHovered &&
      !isContextFloatingCollapsed(props.context)
    ) {
      return "var(--selectionHover)";
    } else if (props.isSaved && !isContextFloatingCollapsed(props.context)) {
      return "var(--bgPrimary)";
    } else if (
      props.isHovered &&
      !props.isSaved &&
      !isContextBulk(props.context)
    ) {
      return "var(--bgContent)";
    } else if (props.context === PromptContext.List) {
      return "var(--bgPrimary)";
    } else if (
      isContextFloatingCollapsed(props.context) &&
      props.isSaved &&
      (props.isHovered || props.isEditing)
    ) {
      return "var(--bgPrimary)";
    }
  }};

  /* Bulk hover state */
  ${(props) =>
    isContextBulk(props.context) && !props.isSaved
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
    isContextFloatingCollapsed(props.context) &&
    props.direction === CollapsedPromptDirection.RTL
      ? "left: -284px;"
      : null}
  ${(props) =>
    isContextFloatingCollapsed(props.context) &&
    !props.isHovered &&
    !props.isEditing
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
    forceHideBack = false,
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
  const [contextMenuRightLayout, setContextMenuRightLayout] =
    useState<boolean>(true);
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const isSaved = prompt.isSaved;

  const containerRef = useRef<HTMLDivElement | null>(null);
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
      // Replace rendered LaTeX markup with raw text.
      el.innerHTML = editingFront ? prompt.content.front : prompt.content.back;
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const endEditing = function (editingFront: boolean) {
    if (editingFront && promptFrontRef.current?.innerText) {
      updatePromptFront(promptFrontRef.current.innerText);
    } else if (!editingFront && promptBackRef.current?.innerText) {
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

  function createInlineIcon() {
    return (
      (!isContextFloatingCollapsed(context) ||
        ((isHovered || isEditing) &&
          collapsedDirection === CollapsedPromptDirection.LTR)) && (
        <Icon
          isHovered={isHovered}
          isAnchorHovered={isAnchorHovered}
          isSaved={isSaved}
          isEditing={isEditing}
          isDue={prompt.isDue}
        />
      )
    );
  }

  function createPromptText() {
    return (
      (!isContextFloatingCollapsed(context) ||
        (isContextFloatingCollapsed(context) && (isHovered || isEditing))) && (
        <PromptContainer>
          <PromptText
            side="front"
            isHovered={isHovered}
            isSaved={isSaved}
            isEditing={isEditing}
            context={context}
            onFocus={() => startEditing(true)}
            onBlur={() => endEditing(true)}
            ref={promptFrontRef}
            placeholder="Type a prompt here."
          >
            {prompt.content.front}
          </PromptText>
          {!forceHideBack &&
            (showPromptBack ||
              isContextBulk(context) ||
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
                onBlur={() => endEditing(false)}
                ref={promptBackRef}
                placeholder="Type a response here."
              >
                {prompt.content.back}
              </PromptText>
            ))}
        </PromptContainer>
      )
    );
  }

  function determineContextLayout() {
    if (containerRef.current) {
      const bb = containerRef.current.getBoundingClientRect();
      const x = bb.right + window.scrollX + 254;
      if (x >= window.innerWidth) {
        setContextMenuRightLayout(false);
      } else {
        setContextMenuRightLayout(true);
      }
    }
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
      ref={(handle) => {
        if (typeof ref === "function") {
          ref(handle);
        } else if (ref) {
          ref.current = handle;
        }
        containerRef.current = handle;
      }}
    >
      {/* Create the icon and text (both front and back) */}
      {context === PromptContext.BulkCollapsed &&
      collapsedDirection === CollapsedPromptDirection.RTL ? (
        <>
          {createPromptText()}
          {createInlineIcon()}
        </>
      ) : (
        <>
          {createInlineIcon()}
          {createPromptText()}
        </>
      )}
      {/* This icon is used in the collapsed state as the trigger icon for showing full prompt */}
      {isContextFloatingCollapsed(context) &&
        ((!isHovered &&
          !isEditing &&
          collapsedDirection === CollapsedPromptDirection.LTR) ||
          collapsedDirection === CollapsedPromptDirection.RTL) && (
          <div
            css={css`
              left: ${(() => {
                if (
                  collapsedDirection === CollapsedPromptDirection.RTL &&
                  !isHovered &&
                  !isEditing
                ) {
                  return 276;
                } else if (!isHovered && !isEditing) {
                  return -4;
                }
              })()}px;
              position: relative;
              ${(() => {
                if (
                  collapsedDirection === CollapsedPromptDirection.RTL &&
                  (isHovered || isEditing)
                ) {
                  return "margin-left: auto";
                }
              })()}
            `}
          >
            <CollapsedPromptIcon
              isSaved={isSaved}
              isHovered={isHovered}
              isEditing={isEditing}
              isDue={prompt.isDue}
              isAnchorHovered={isAnchorHovered}
            />
          </div>
        )}
      {/* ------ ellipses menu  ------- */}
      {prompt.isSaved && (isHovered || isEditing) && !isContextBulk(context) && (
        <div
          css={css`
            position: absolute;
            top: ${isContextCollapsed(context) &&
            collapsedDirection === CollapsedPromptDirection.RTL
              ? "calc(100% - 32px)"
              : "3px"};
            right: ${isContextCollapsed(context) &&
            collapsedDirection === CollapsedPromptDirection.RTL
              ? 8
              : 1}px;
          `}
        >
          <PromptEllipses
            onClick={() => {
              determineContextLayout();
              setContextMenuOpen(true);
            }}
          />
        </div>
      )}
      {/* ----- context menu ------ */}
      {contextMenuOpen && (
        <div
          css={css`
            position: absolute;
            top: ${isContextCollapsed(context) &&
            collapsedDirection === CollapsedPromptDirection.RTL
              ? "calc(100% - 32px)"
              : "0px"};
            left: calc(100% - ${!contextMenuRightLayout ? "295px" : "0px"});
            display: flex;
            flex-direction: row;
            z-index: ${zIndices.orbitMenu + 100};
          `}
          onMouseLeave={() => setContextMenuOpen(false)}
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
