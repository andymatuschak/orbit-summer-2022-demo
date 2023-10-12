import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { generateUniqueID } from "@withorbit/core";
import React, {
  ClipboardEvent,
  ForwardedRef,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { uploadImage } from "../../app/orbitSyncMiddleware";
import { Prompt } from "../../app/promptSlice";
import zIndices from "../common/zIndices";
import ContextualMenu from "../ContextualMenu";
import CollapsedPromptIcon from "./CollapsedPromptIcon";
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
  promptPlaintextToHTML,
  PromptText,
  SavedProps,
} from "./PromptComponents";
import PromptEllipses from "./PromptEllipses";

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
  isViewingAsSource?: boolean;
}

const PromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0;
  gap: 8px;
`;

const Container = styled.div<
  HoverProps &
    SavedProps &
    EditingProps &
    ContextProps &
    AnchorHoverProps &
    CollapsedPromptDirectionProps & { isViewingAsSource: boolean }
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
  cursor: ${(props) => (!props.isSaved ? "pointer" : "text")};
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
    } else if (props.context === PromptContext.Floating) {
      return "3px solid var(--fgTertiary)";
    }
  }};
  border: ${(props) => {
    if (props.isViewingAsSource && !isContextFloatingCollapsed(props.context)) {
      return "3px solid var(--accentPrimary)";
    } else {
      return undefined;
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
    if (props.isSaved && !isContextFloatingCollapsed(props.context)) {
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
    } else if (props.context === PromptContext.Floating) {
      return "var(--bgContent)";
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
    isViewingAsSource = false,
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
  };

  const endEditing = function (editingFront: boolean) {
    if (
      editingFront &&
      (promptFrontRef.current!.innerText || prompt.content.front)
    ) {
      updatePromptFront(promptFrontRef.current!.innerText.trimEnd());
    } else if (!editingFront && promptBackRef.current!.innerText) {
      updatePromptBack(promptBackRef.current!.innerText);
    }
    setIsEditing(false);
    savePrompt();
    setContextMenuOpen(false);

    setTimeout(() => {
      const activeElement = document.activeElement;
      if (
        activeElement !== promptFrontRef.current &&
        activeElement !== promptBackRef.current
      ) {
        if (onEditEnd) onEditEnd();
        if (clearNew) clearNew();
      }
    }, 0); // HACK onblur is fired when moving between fields, before any field data is stored
  };

  async function onPaste(
    event: ClipboardEvent<HTMLDivElement>,
    editingFront: boolean,
  ) {
    const items = event.clipboardData?.items || [];
    const imageItem = Array.from(items).find((item) =>
      item.type.startsWith("image"),
    );
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    const target = event.currentTarget;
    event.preventDefault();
    const contents = await file.arrayBuffer();
    const id = generateUniqueID();
    const url = await uploadImage(id, contents, file.type);

    if (url) {
      target.blur();
      const imageTag = `<img src="${url}" data-attachmentID="${id}" />`;
      if (editingFront) {
        updatePromptFront((promptFrontRef.current?.innerText ?? "") + imageTag);
      } else {
        updatePromptBack((promptBackRef.current?.innerText ?? "") + imageTag);
      }
    }
  }

  // Focus if new
  const focusEligible = useRef(false);
  useEffect(() => {
    if (isNew) {
      focusEligible.current = true;
    }
  }, [isNew]);
  useEffect(() => {
    if (isNew && focusEligible.current && promptFrontRef.current) {
      promptFrontRef.current.focus({ preventScroll: true });
      focusEligible.current = false;
      if (onEditStart) onEditStart();
    }
  }, [isNew, promptFrontRef, onEditStart]);

  // Set up context menu items
  const contextMenuItems = [
    {
      title: "Remove Highlight",
      onClick: () => {
        setContextMenuOpen(false);
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave();
        if (unsavePrompt) unsavePrompt();
      },
      shortcutKey: "R",
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
            onPaste={(e) => onPaste(e, true)}
            ref={promptFrontRef}
            placeholder="Type a prompt here."
          >
            {prompt.content.front}
          </PromptText>
          {!forceHideBack &&
            (showPromptBack ||
              isContextBulk(context) ||
              forceHover ||
              isSaved) && (
              <PromptText
                side="back"
                isHovered={isHovered}
                isSaved={isSaved}
                context={context}
                isEditing={isEditing}
                onFocus={() => startEditing(false)}
                onBlur={() => endEditing(false)}
                onPaste={(e) => onPaste(e, false)}
                ref={promptBackRef}
                placeholder="Type a response here."
              >
                {prompt.content.back}
              </PromptText>
            )}
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

  if (!isNew && prompt.content.front === "" && prompt.content.back === "") {
    return null;
  }

  return (
    <Container
      isHovered={isHovered}
      isAnchorHovered={isAnchorHovered}
      isSaved={isSaved}
      isEditing={isEditing}
      isViewingAsSource={isViewingAsSource}
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
          <div style={{ width: 4 }} />
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
      {false /*HACK */ &&
        prompt.isSaved &&
        (isHovered || isEditing) &&
        !isContextBulk(context) && (
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
