import React, { useEffect, useRef, useState } from "react";
import styled from '@emotion/styled'
import { Prompt } from "../app/promptSlice";
import startburst_null from '../static/images/Icons/Starburst-Null.png';
import starburst_active from '../static/images/Icons/Starburst-Active.png'
import starburst_editing from '../static/images/Icons/Starburst-Edit.png';
import plus from '../static/images/Icons/Plus.png';

const ANIMATION_TIME_MSEC = 48.0;

export interface PromptProps {
    prompt: Prompt
    savePrompt: () => any;
}

interface HoverProps {
  isHovered: boolean
}

interface SavedProps {
  isSaved: boolean
}
interface EditingProps {
  isEditing: boolean;
}

const Icon = styled.div<HoverProps & SavedProps & EditingProps>`
  width: 24px;
  height: 24px;
  background-image: ${props => {
    if (props.isEditing) {
      return `url(${starburst_editing})`;
    } else if (props.isSaved) {
      return `url(${starburst_active})`;
    } else if (props.isHovered) {
      return `url(${plus})`;
    } else {
      return `url(${startburst_null})`;
    }
  }};
  background-repeat: no-repeat;
  background-size: contain;
  flex: 0 0 auto;
`;

const PromptText = styled.div<HoverProps & SavedProps>`
  font-family: "Dr-Medium";
  font-size: 14px;
  line-height: 17px;
  letter-spacing: 0.04em;
  color: var(--fgPrimary);
  opacity: ${props => ((props.isHovered || props.isSaved) ? 1.0 : 0.87)};
  outline: none;

  ::selection {
    background: var(--editSelection);
  }

  caret-color: var(--accentPrimary);
`;

const PromptBack = styled(PromptText)`
  opacity: ${props=> {
    if(props.isSaved){
      return 1.0;
    } else if(props.isHovered) {
      return 0.7;
    } else {
      return 0.0;
    }
  }};
  ${props => (props.isSaved ? 
    {
      'color': 'var(--fgSecondarySmall);'
    } 
    : null
  )};

  transition: ${ANIMATION_TIME_MSEC / 1000}s ease-out;
`;

const PromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 8px;
`;

const Container = styled.div<HoverProps & SavedProps & EditingProps>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 332px;
  padding: 8px 8px 10px 9px;
  gap: 8px;
  cursor: pointer;
  position: relative;
  border-left: 3px solid transparent;

  ${props => !props.isSaved ? `
    :active::before {
      position: absolute;
      content: '';
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--pressedLayer);
    };` : null
  }

  ${props => (props.isHovered ? {
    'background': 'var(--bgContent);',
    'borderLeft': '3px solid var(--accentPrimary);',
    'boxShadow': '0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)'} : null
  )};

  ${props =>  (props.isSaved ? {
    'background': 'var(--bgPrimary);',
    'borderLeft': `3px solid var(${props.isEditing ? "--accentPrimary" : "--accentSecondary"});`,
    'boxShadow': '0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)'} : null
  )};

  transition: ${ANIMATION_TIME_MSEC / 1000}s ease-out;
`;

export default function PromptBox({
    prompt, 
    savePrompt,
}: PromptProps) {
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isEditingFront, setIsEditingFront] = useState<boolean>(false);
    const hidePromptBackTimeout = useRef<number | undefined>();
    const [showPromptBack, setShowPromptBack] = useState<boolean>(false);
    const isSaved = prompt.isSaved;

    const promptFrontRef = useRef<HTMLDivElement | null>(null);
    const promptBackRef = useRef<HTMLDivElement | null>(null);

    // We hide the prompt back only after the animation for unhover'ing is done. This way the container doesn't instantly resize and cause animation to glitch
    useEffect(() => {
      if(!isHovered && !isSaved){
        hidePromptBackTimeout.current = window.setTimeout(() => {
          setShowPromptBack(false);
        }, ANIMATION_TIME_MSEC);
      } else if(isHovered || isSaved){
        clearTimeout(hidePromptBackTimeout.current);
        hidePromptBackTimeout.current = undefined;
        setShowPromptBack(true);
      }
    }, [isHovered, isSaved, setShowPromptBack]);

    const startEditing = function(editingFront: boolean){
      setIsEditing(true);
      setIsEditingFront(editingFront);

      // Select all text in prompt
      const el = editingFront ? promptFrontRef.current : promptBackRef.current;
      const sel = window.getSelection();
      const range = document.createRange();
      if (el && sel && range) {
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    const endEditing = function(){
      setIsEditing(false);
      savePrompt();
    };

    return (
      <Container 
        isHovered={isHovered} 
        isSaved={isSaved} 
        isEditing={isEditing}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)} 
        onClick={() => savePrompt()}
      >
        <Icon isHovered={isHovered} isSaved={isSaved} isEditing={isEditing}/>
        <PromptContainer>
          <PromptText 
            isHovered={isHovered} 
            isSaved={isSaved}
            contentEditable={isSaved} 
            onFocus={() => startEditing(true)}
            onBlur={() => endEditing()}
            suppressContentEditableWarning
            ref={promptFrontRef}
          >
            {prompt.content.front}
          </PromptText>
          {showPromptBack && 
            <PromptBack 
              isHovered={isHovered} 
              isSaved={isSaved}
              contentEditable={isSaved} 
              onFocus={() => startEditing(false)}
              onBlur={() => endEditing()}
              suppressContentEditableWarning
              ref={promptBackRef}
            >
              {prompt.content.back}
            </PromptBack>
          }
        </PromptContainer>
      </Container>
  );
}