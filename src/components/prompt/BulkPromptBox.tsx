import React, { useEffect, useState } from "react";
import styled from '@emotion/styled'
import { Prompt, updatePromptBack, updatePromptFront } from "../../app/promptSlice";
import { Icon } from "./PromptComponents";
import PromptBox from "./PromptBox";
import Button from "../Button";
import { HighlightFunc } from "./AnchorHighlights";

export interface BulkPromptBoxProps {
    // Prompts and ids must be same order
    prompts: Prompt[];
    ids: string[];
    savePrompt: (id: string) => any;
    updatePromptFront: (id: string, newPrompt: string) => any;
    updatePromptBack: (id: string, newPrompt: string) => any;
    // A parent can provide a mechanism to keep track of all items saved while the bulk prompt hovers, when the hover exits, the saves are cleared
    addToSaves?: (id: string) => any;
    clearSaves?: () => any;
    highlightFunc?: HighlightFunc;
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
  border-color:  var(--fgTertiary);
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

export default function BulkPromptBox({prompts, ids, savePrompt, addToSaves, clearSaves, highlightFunc, updatePromptBack, updatePromptFront}: BulkPromptBoxProps){
  const [isButtonHovered, setIsButtonHovered] = useState<boolean>(false);
  const [isBulkPromptHovered, setIsBulkPromptHovered] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [localSaveSet, setLocalSaveSet] = useState<Set<string>>(new Set());

  function isEnabled(){
    return isBulkPromptHovered || isButtonHovered || isFocused;
  }

  function saveAll(){
    ids.forEach((id) => {
      savePrompt(id);
    });
  }

  useEffect(() => {
    if(!isBulkPromptHovered && !isButtonHovered && !isFocused && localSaveSet.size > 0 && clearSaves){
      clearSaves();
      setLocalSaveSet(new Set());
    }
  }, [isBulkPromptHovered, isButtonHovered, isFocused, localSaveSet, clearSaves, setLocalSaveSet])

  return (
    <>
      <div 
        onMouseEnter={() => {
          setIsButtonHovered(true);
          if(highlightFunc) {
            ids.forEach((id) => highlightFunc(id, true));
          }
        }}
        onMouseLeave={() => {
          setIsButtonHovered(false);
          if(highlightFunc) {
            ids.forEach((id) => highlightFunc(id, false));
          }
        }}
      >
        {
          !isEnabled() ? 
            <ButtonContainer>
              <Icon isHovered={false} isSaved={false} isEditing={false}/>
              <ButtonText>{`${prompts.length - localSaveSet.size} prompts available`}</ButtonText>
            </ButtonContainer> 
            : 
            <Button
              onClick={() => saveAll()}
              children={`Save ${prompts.length - localSaveSet.size} prompts`}
              icon={"add"}
            />
        }
          
      </div>
      {isEnabled() &&
          <PromptsContainer
            onMouseEnter={() => setIsBulkPromptHovered(true)}
            onMouseLeave={() => setIsBulkPromptHovered(false)} 
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            {prompts.map((prompt, idx) => {
              const id = ids[idx];
              return (
                <PromptBox 
                  prompt={prompt}
                  key={id}
                  isBulk={true}
                  savePrompt={() => {
                    if(addToSaves) addToSaves(id);
                    setLocalSaveSet(new Set(localSaveSet.add((id))));
                    savePrompt(id);
                  }}
                  updatePromptBack={(newPrompt: string) => updatePromptBack(id, newPrompt)}
                  updatePromptFront={(newPrompt: string) => updatePromptFront(id, newPrompt)}
                  onMouseEnter={() => highlightFunc && !prompt.isSaved ? highlightFunc(id, true) : null}
                  onMouseLeave={() =>  highlightFunc && !prompt.isSaved ? highlightFunc(id, false) : null}
                  onEditStart={() => highlightFunc ? highlightFunc(id, true) : null}
                  onEditEnd={() =>  highlightFunc ? highlightFunc(id, false) : null}
                />
              )
            })}
          </PromptsContainer>
      }
    </>
  
  )
}