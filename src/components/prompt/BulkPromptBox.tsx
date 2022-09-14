import React, { useEffect, useState } from "react";
import styled from '@emotion/styled'
import { Prompt } from "../../app/promptSlice";
import { Icon } from "./PromptComponents";
import PromptBox from "./PromptBox";

export interface BulkPromptBoxProps {
    // Prompts and ids must be same order
    prompts: Prompt[];
    ids: string[];
    savePrompt: (id: string) => any;
    // A parent can provide a mechanism to keep track of all items saved while the bulk prompt hovers, when the hover exits, the saves are cleared
    addToSaves?: (id: string) => any;
    clearSaves?: () => any;
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

export default function BulkPromptBox({prompts, ids, savePrompt, addToSaves, clearSaves}: BulkPromptBoxProps){
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
      <ButtonContainer 
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)} 
        onClick={() => saveAll()}
      >
          <Icon isHovered={isEnabled()} isSaved={false} isEditing={false}/>
          <ButtonText>{isEnabled() ? `Save ${prompts.length - localSaveSet.size} prompts` : `${prompts.length - localSaveSet.size} prompts available`}</ButtonText>
      </ButtonContainer>
      {isEnabled() &&
          <PromptsContainer
            onMouseEnter={() => setIsBulkPromptHovered(true)}
            onMouseLeave={() => setIsBulkPromptHovered(false)} 
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            {prompts.map((prompt, idx) => {
              return (
                <PromptBox 
                  prompt={prompt}
                  key={ids[idx]}
                  isBulk={true}
                  savePrompt={() => {
                    if(addToSaves) addToSaves(ids[idx]);
                    setLocalSaveSet(new Set(localSaveSet.add(ids[idx])));
                    savePrompt(ids[idx]);
                  }}
                  //TODO: pass in appropriate handlers
                  updatePromptBack={() => null}
                  updatePromptFront={() => null}
                />
              )
            })}
          </PromptsContainer>
      }
    </>
  
  )
}