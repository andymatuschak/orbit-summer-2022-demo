import React, {
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import styled from "@emotion/styled";
import { Prompt, PromptID } from "../../app/promptSlice";
import { viewportToRoot } from "../../util/viewportToRoot";
import Button from "../Button";
import PromptBox from "./PromptBox";
import {
  CollapsedPromptDirection,
  Icon,
  PromptContext,
} from "./PromptComponents";
import { css } from "@emotion/react";
import { AnimatePresence, motion } from "framer-motion";
import CollapsedPromptIcon from "./CollapsedPromptIcon";

export interface BulkPromptBoxProps {
  // Prompts and ids must be same order
  prompts: Prompt[];
  ids: PromptID[];
  collapsedDirection?: CollapsedPromptDirection;
  savePrompt: (id: PromptID) => any;
  updatePromptFront: (id: PromptID, newPrompt: string) => any;
  updatePromptBack: (id: PromptID, newPrompt: string) => any;
  // A parent can provide a mechanism to keep track of all items saved while the bulk prompt hovers, when the hover exits, the saves are cleared
  addToSaves?: (id: PromptID) => any;
  clearSaves?: () => any;
  saves?: Set<PromptID>;
  setHoverPrompts?: (ids: PromptID[] | undefined) => any;
  setEditPrompt?: (id: PromptID | undefined) => any;
  setTops?: (id: PromptID, top: number) => any;
}

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  height: 40px;
  padding: 8px 8px 10px 12px;
  gap: 8px;
  cursor: pointer;
`;

interface ContainerProps {
  isEnabled: boolean;
}

const PromptsContainer = styled(motion.div, {
  shouldForwardProp: (prop) => prop !== "isEnabled",
})<ContainerProps>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: var(--bgPrimary);
  border-color: var(--fgTertiary);
  border-style: solid;
  width: 332px;
  border-width: 3px 3px 3px 0px;
  box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 4px 15px rgba(0, 0, 0, 0.1);
  pointer-events: ${(props) => (props.isEnabled ? "auto" : "none")};
  position: relative;
`;

const ButtonText = styled.div`
  font-family: "Dr-Medium";
  font-size: 14px;
  line-height: 17px;
  letter-spacing: 0.04em;
  color: var(--fgPrimary);
  opacity: 0.696;
`;

// HACK - add some buffer for dropped frames due to react rerender the whole tree
// TODO - shorten this time once we decouple hoverprompt / edit prompt rerendering the whole tree
const TRANSITION = { duration: 0.175, ease: "easeOut" };

export default function BulkPromptBox({
  prompts,
  ids,
  savePrompt,
  addToSaves,
  saves,
  clearSaves,
  updatePromptBack,
  updatePromptFront,
  setHoverPrompts,
  setEditPrompt,
  setTops,
  collapsedDirection,
}: BulkPromptBoxProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isButtonHovered, setIsButtonHovered] = useState<boolean>(false);
  const [isBulkPromptHovered, setIsBulkPromptHovered] =
    useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const prevIsFocused = useRef<boolean>(false);

  // State for layout above/below button
  const [layoutOffset, setLayoutOffset] = useState<number>(0);
  const buttonRef = useRef<HTMLDivElement>(null);
  const promptsContainerRef = useRef<HTMLDivElement>(null);

  const isEnabled = useCallback(() => {
    return isBulkPromptHovered || isButtonHovered || isFocused;
  }, [isBulkPromptHovered, isButtonHovered, isFocused]);

  function saveAll() {
    ids.forEach((id) => {
      savePrompt(id);
    });
  }

  function determineLayout() {
    if (buttonRef.current && promptsContainerRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      const btnTop = btnRect.top;
      const btnBottom = btnRect.bottom;
      const topAvailableSpace = btnTop;
      const bottomAvailableSpace = window.innerHeight - btnBottom;
      if (bottomAvailableSpace >= topAvailableSpace) {
        setLayoutOffset(0);
      } else {
        const promptsRect = promptsContainerRef.current.getBoundingClientRect();
        setLayoutOffset(promptsRect.height);
      }
    }
  }

  useLayoutEffect(() => {
    if (
      prevIsFocused.current &&
      !isFocused &&
      !isEnabled() &&
      saves &&
      saves.size > 0 &&
      clearSaves
    ) {
      clearSaves();
    }
    prevIsFocused.current = isFocused;
  }, [isFocused, isEnabled, saves, clearSaves]);

  useEffect(() => {
    if (!isEnabled()) {
      setIsOpen(false);
    }
  }, [isEnabled]);

  function createPrompts() {
    return prompts.map((prompt, idx) => {
      const id = ids[idx];
      return (
        <PromptBox
          prompt={prompt}
          key={id}
          context={
            collapsedDirection
              ? PromptContext.BulkCollapsed
              : PromptContext.Bulk
          }
          collapsedDirection={collapsedDirection}
          savePrompt={() => {
            if (addToSaves) addToSaves(id);
            savePrompt(id);
          }}
          updatePromptBack={(newPrompt: string) =>
            updatePromptBack(id, newPrompt)
          }
          updatePromptFront={(newPrompt: string) =>
            updatePromptFront(id, newPrompt)
          }
          onMouseEnter={() => (setHoverPrompts ? setHoverPrompts([id]) : null)}
          onEditStart={() => (setEditPrompt ? setEditPrompt(id) : null)}
          onEditEnd={() => (setEditPrompt ? setEditPrompt(undefined) : null)}
          ref={(el) => {
            if (setTops && el) {
              const rect = el.getBoundingClientRect();
              const top = viewportToRoot().y + rect.top;
              setTops(id, top);
            }
          }}
        />
      );
    });
  }

  function createPromptsContainer() {
    return (
      <PromptsContainer
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        isEnabled={isOpen}
        ref={promptsContainerRef}
        initial={{
          opacity: 0.0,
        }}
        animate={{
          opacity: isOpen ? 1.0 : 0.0,
        }}
        exit={{
          opacity: 0.0,
        }}
        transition={TRANSITION}
      >
        {createPrompts()}
      </PromptsContainer>
    );
  }

  function createUnhoveredButton() {
    if (collapsedDirection) {
      return (
        <div
          css={css`
            position: relative;
            left: ${collapsedDirection === CollapsedPromptDirection.RTL
              ? "276px"
              : "-4px"};
          `}
        >
          <ButtonContainer>
            <CollapsedPromptIcon
              isSaved={false}
              isDue={false}
              isAnchorHovered={false}
              isEditing={false}
              isHovered={false}
            />
          </ButtonContainer>
        </div>
      );
    }

    return (
      <ButtonContainer>
        {ids.map((id, idx) => (
          <div
            css={css`
              margin-right: ${idx === ids.length - 1 ? "0px" : "-12px"};
            `}
            key={id}
          >
            <Icon
              isHovered={false}
              isAnchorHovered={false}
              isSaved={false}
              isEditing={false}
              isDue={false}
            />
          </div>
        ))}
        <ButtonText>{`${
          prompts.length - (saves?.size ?? 0)
        } prompts available`}</ButtonText>
      </ButtonContainer>
    );
  }

  function createHoveredButton() {
    if (collapsedDirection) {
      return (
        <div
          css={css`
            width: 160px;
          `}
        >
          <Button
            onClick={() => saveAll()}
            children={`Save ${prompts.length - (saves?.size ?? 0)} prompts`}
            icon={"add"}
            backgroundColor={"white"}
            isFloating={true}
            isFlipped={collapsedDirection === CollapsedPromptDirection.RTL}
          />
        </div>
      );
    }

    return (
      <Button
        onClick={() => saveAll()}
        children={`Save ${prompts.length - (saves?.size ?? 0)} prompts`}
        icon={"add"}
      />
    );
  }

  return (
    <div
      css={css`
        pointer-events: ${isOpen ? "auto" : "none"};
        top: ${-layoutOffset - 12}px;
        position: relative;
        left: ${collapsedDirection === CollapsedPromptDirection.RTL
          ? -280
          : 0}px;
      `}
      onMouseEnter={() => {
        setIsBulkPromptHovered(true);
        if (setHoverPrompts) setHoverPrompts(ids);
      }}
      onMouseLeave={() => {
        setIsBulkPromptHovered(false);
        if (!isFocused) {
          setIsOpen(false);
        }
        if (!isFocused && clearSaves) {
          clearSaves();
        }
        if (setHoverPrompts) setHoverPrompts(undefined);
      }}
    >
      <>
        {/* --- Top layout prompts container + 12px spacer ---- */}
        {layoutOffset !== 0 && createPromptsContainer()}
        <div
          css={css`
            width: ${collapsedDirection ? "160px" : "100%"};
            height: 12px;
          `}
        />
      </>
      {/* --- N-prompts available icon when unhovered + button to save all when hovered ---- */}
      <div
        onMouseEnter={() => {
          setIsButtonHovered(true);
          setIsOpen(true);
          determineLayout();
          if (setHoverPrompts) setHoverPrompts(ids);
        }}
        onMouseLeave={() => {
          setIsButtonHovered(false);
        }}
        css={css`
          display: flex;
          flex-direction: column;
          pointer-events: all;
          position: relative;
          top: ${isOpen ? "-2px" : "0px"};
          width: ${(() => {
            if (!isOpen && collapsedDirection) {
              return "32px";
            } else if (collapsedDirection) {
              return "160px";
            } else {
              return "auto";
            }
          })()};
          ${(() => {
            return collapsedDirection === CollapsedPromptDirection.RTL && isOpen
              ? { marginLeft: "auto" }
              : null;
          })()}
        `}
        ref={buttonRef}
      >
        {!isOpen ? createUnhoveredButton() : createHoveredButton()}
      </div>
      {/* ---- Bottom layout prompts container + spacer ---- */}
      <div
        css={css`
          width: ${collapsedDirection ? "160px" : "100%"};
          height: 6px;
        `}
      />
      <AnimatePresence>
        <div key={"bottom"}>
          {layoutOffset === 0 && createPromptsContainer()}
        </div>
      </AnimatePresence>
    </div>
  );
}
