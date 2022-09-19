import React, { useLayoutEffect, useState, useRef, useCallback } from "react";
import styled from "@emotion/styled";
import { Prompt, PromptId } from "../../app/promptSlice";
import Button from "../Button";
import PromptBox from "./PromptBox";
import { Icon, PromptContext } from "./PromptComponents";

export interface BulkPromptBoxProps {
  // Prompts and ids must be same order
  prompts: Prompt[];
  ids: PromptId[];
  savePrompt: (id: PromptId) => any;
  updatePromptFront: (id: PromptId, newPrompt: string) => any;
  updatePromptBack: (id: PromptId, newPrompt: string) => any;
  // A parent can provide a mechanism to keep track of all items saved while the bulk prompt hovers, when the hover exits, the saves are cleared
  addToSaves?: (id: PromptId) => any;
  clearSaves?: () => any;
  saves?: Set<PromptId>;
  setHoverPrompt?: (id: PromptId | undefined) => any;
  setEditPrompt?: (id: PromptId | undefined) => any;
  setTops?: (id: PromptId, top: number) => any;
}

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 332px;
  padding: 8px 8px 10px 12px;
  gap: 8px;
  cursor: pointer;
`;

const PromptsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: var(--bgPrimary);
  border-color: var(--fgTertiary);
  border-style: solid;
  width: 332px;
  border-width: 3px 3px 3px 0px;
  box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 4px 15px rgba(0, 0, 0, 0.1);
`;

const ButtonText = styled.div`
  font-family: "Dr-Medium";
  font-size: 14px;
  line-height: 17px;
  letter-spacing: 0.04em;
  color: var(--fgPrimary);
  opacity: 0.696;
`;

export default function BulkPromptBox({
  prompts,
  ids,
  savePrompt,
  addToSaves,
  saves,
  clearSaves,
  updatePromptBack,
  updatePromptFront,
  setHoverPrompt,
  setEditPrompt,
  setTops,
}: BulkPromptBoxProps) {
  const [isButtonHovered, setIsButtonHovered] = useState<boolean>(false);
  const [isBulkPromptHovered, setIsBulkPromptHovered] =
    useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const prevIsFocused = useRef<boolean>(false);

  const isEnabled = useCallback(() => {
    return isBulkPromptHovered || isButtonHovered || isFocused;
  }, [isBulkPromptHovered, isButtonHovered, isFocused]);

  function saveAll() {
    ids.forEach((id) => {
      savePrompt(id);
    });
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

  return (
    <div
      onMouseEnter={() => {
        setIsBulkPromptHovered(true);
      }}
      onMouseLeave={() => {
        setIsBulkPromptHovered(false);
        if (!isFocused && clearSaves) {
          clearSaves();
        }
      }}
    >
      <div
        onMouseEnter={() => {
          setIsButtonHovered(true);
          if (setHoverPrompt) setHoverPrompt(ids[0]);
        }}
        onMouseLeave={() => {
          setIsButtonHovered(false);
          if (setHoverPrompt) setHoverPrompt(undefined);
        }}
        css={{ display: "flex", flexDirection: "column" }}
      >
        {!isEnabled() ? (
          <ButtonContainer>
            <Icon isHovered={false} isSaved={false} isEditing={false} />
            <ButtonText>{`${
              prompts.length - (saves?.size ?? 0)
            } prompts available`}</ButtonText>
          </ButtonContainer>
        ) : (
          <Button
            onClick={() => saveAll()}
            children={`Save ${prompts.length - (saves?.size ?? 0)} prompts`}
            icon={"add"}
          />
        )}
      </div>
      {(isEnabled() || (saves && saves.size > 0)) && (
        <PromptsContainer
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {prompts.map((prompt, idx) => {
            const id = ids[idx];
            return (
              <PromptBox
                prompt={prompt}
                key={id}
                context={PromptContext.Bulk}
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
                onMouseEnter={() =>
                  setHoverPrompt ? setHoverPrompt(id) : null
                }
                onMouseLeave={() =>
                  setHoverPrompt ? setHoverPrompt(undefined) : null
                }
                onEditStart={() => (setEditPrompt ? setEditPrompt(id) : null)}
                onEditEnd={() =>
                  setEditPrompt ? setEditPrompt(undefined) : null
                }
                ref={(el) => {
                  if (setTops && el) {
                    const rect = el.getBoundingClientRect();
                    const top = window.scrollY + rect.top;
                    setTops(id, top);
                  }
                }}
              />
            );
          })}
        </PromptsContainer>
      )}
    </div>
  );
}
