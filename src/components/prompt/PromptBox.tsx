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
import {
  ANIMATION_TIME_MSEC,
  ContextProps,
  EditingProps,
  HoverProps,
  Icon,
  PromptContext,
  PromptText,
  SavedProps,
} from "./PromptComponents";

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
  savePrompt: () => any;
  updatePromptFront: (newPrompt: string) => any;
  updatePromptBack: (newPrompt: string) => any;
  onMouseEnter?: (event: React.MouseEvent) => any;
  onMouseLeave?: () => any;
  onEditStart?: () => any;
  onEditEnd?: () => any;
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

const CollapsedIconContainer = styled.div<SavedProps & HoverProps>`
  margin-left: auto;
  pointer-events: all;
  min-width: 32px;
  height: 32px;
  position: relative;
  top: -6px;
  left: 5px;
`;

const CollapsedIconBackground = styled.div<SavedProps & HoverProps>`
  background-color: ${(props) =>
    props.isSaved && !props.isHovered ? "var(--bgSecondary)" : null};
  border-radius: 50%;
  width: 100%;
  height: 100%;
`;

const Container = styled.div<
  HoverProps & SavedProps & EditingProps & ContextProps
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
    } else if (props.isHovered && !props.isSaved) {
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
      props.isHovered &&
      (!props.isSaved || props.context === PromptContext.Collapsed) &&
      props.context !== PromptContext.Bulk
    ) {
      return "0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)";
    }
  }};
  background: ${(props) => {
    if (props.isSaved && props.context !== PromptContext.Collapsed) {
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
    props.context === PromptContext.Collapsed ? "left: -288px;" : null}
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
    forceHover,
    savePrompt,
    updatePromptFront,
    updatePromptBack,
    onMouseEnter,
    onMouseLeave,
    onEditStart,
    onEditEnd,
  }: PromptProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const [isHovered, setIsHovered] = useState<boolean>(forceHover ?? false);
  const [isEditing, setIsEditing] = useState<boolean>(isNew ?? false);
  const hidePromptBackTimeout = useRef<number | undefined>();
  const [showPromptBack, setShowPromptBack] = useState<boolean>(false);
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

  return (
    <Container
      isHovered={isHovered}
      isSaved={isSaved}
      isEditing={isEditing}
      context={context}
      onMouseEnter={(event) => {
        setIsHovered(true);
        if (onMouseEnter) onMouseEnter(event);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave();
      }}
      onClick={() => savePrompt()}
      ref={ref}
    >
      {context !== PromptContext.Collapsed && (
        <Icon
          isHovered={isHovered}
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
      {context === PromptContext.Collapsed && (
        <CollapsedIconContainer isSaved={isSaved} isHovered={isHovered}>
          <CollapsedIconBackground isSaved={isSaved} isHovered={isHovered} />
          <div
            css={css`
              position: relative;
              top: -26px;
              left: 3px;
            `}
          >
            <Icon
              isHovered={isHovered}
              isSaved={isSaved}
              isEditing={isEditing}
              isDue={prompt.isDue}
            />
          </div>
        </CollapsedIconContainer>
      )}
    </Container>
  );
});

export default PromptBox;