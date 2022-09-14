import React, { useEffect, useState } from "react";
import styled from '@emotion/styled'
import { Prompt } from "../../app/promptSlice";
import { Icon } from "./PromptComponents";
import PromptBox from "./PromptBox";

export interface BulkPromptBoxProps {
    // Prompts and ids must be same order
    prompts: Prompt[];
    ids: string[];
    saveAll: () => any;
    savePrompt: (id: string) => any;
    // A parent can provide a mechanism to keep track of all items saved while the bulk prompt hovers, when the hover exits, the save queue is cleared
    addToSaveQueue?: (id: string) => any;
    clearSaveQueue?: () => any;
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

export default function BulkPromptBox({prompts, ids, saveAll, savePrompt, addToSaveQueue, clearSaveQueue}: BulkPromptBoxProps){
  const [isButtonHovered, setIsButtonHovered] = useState<boolean>(false);
  const [isBulkPromptHovered, setIsBulkPromptHovered] = useState<boolean>(false);
  const [localSaveQueue, setLocalSaveQueue] = useState<Set<string>>(new Set());

  function isHovered(){
    return isBulkPromptHovered || isButtonHovered;
  }

  useEffect(() => {
    if(!isBulkPromptHovered && !isButtonHovered && localSaveQueue.size > 0 && clearSaveQueue){
      clearSaveQueue();
      setLocalSaveQueue(new Set());
    }
  }, [isBulkPromptHovered, isButtonHovered, localSaveQueue, clearSaveQueue, setLocalSaveQueue])

  return (
    <>
      <ButtonContainer 
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)} 
        onClick={() => saveAll()}
      >
          <Icon isHovered={isHovered()} isSaved={false} isEditing={false}/>
          <ButtonText>{isHovered() ? `Save ${prompts.length - localSaveQueue.size} prompts` : `${prompts.length - localSaveQueue.size} prompts available`}</ButtonText>
      </ButtonContainer>
      {isHovered() &&
          <PromptsContainer
            onMouseEnter={() => setIsBulkPromptHovered(true)}
            onMouseLeave={() => setIsBulkPromptHovered(false)} 
          >
            {prompts.map((prompt, idx) => {
              return (
                <PromptBox 
                  prompt={prompt}
                  key={ids[idx]}
                  isBulk={true}
                  savePrompt={() => {
                    if(addToSaveQueue) addToSaveQueue(ids[idx]);
                    setLocalSaveQueue(new Set(localSaveQueue.add(ids[idx])));
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