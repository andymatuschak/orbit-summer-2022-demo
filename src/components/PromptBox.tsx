import React, { useState } from "react";
import styled from '@emotion/styled'
import { Prompt } from "../app/promptSlice";
import startburst_null from '../static/images/Icons/Starburst-Null.png';
import starburst_active from '../static/images/Icons/Starburst-Active.png'
import plus from '../static/images/Icons/Plus.png';

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

const Icon = styled.div<HoverProps & SavedProps>`
  width: 24px;
  height: 24px;
  background-image: ${props => {
    if (props.isSaved) {
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
`;

const PromptBack = styled(PromptText)`
  opacity: ${props=> (props.isSaved ? 1.0 : 0.7)};
  ${props => (props.isSaved ? 
    {
      'color': 'var(--fgSecondarySmall);'
    } 
    : null
  )};
`;

const PromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 8px;
`;

const Container = styled.div<HoverProps & SavedProps>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 332px;
  padding: ${props => ((props.isHovered || props.isSaved) ? '8px 8px 10px 9px' : '8px 8px 4px 12px')};
  gap: 8px;
  cursor: pointer;
  position: relative;

  :active::before {
    position: absolute;
    content: '';
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--pressedLayer);
  };

  ${props =>  (props.isHovered ? {
    'background': ' var(--bgContent);',
    'borderLeft': '3px solid var(--accentPrimary)',
    'boxShadow': '0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)'} : null
  )};

  ${props =>  (props.isSaved ? {
    'background': ' var(--bgPrimary);',
    'borderLeft': '3px solid var(--accentSecondary)',
    'boxShadow': '0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)'} : null
  )};
`;

export default function PromptBox({
    prompt, 
    savePrompt,
}: PromptProps) {
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const isSaved = prompt.isSaved;

    return (
      <Container isHovered={isHovered} isSaved={isSaved} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={() => savePrompt()}>
        <Icon isHovered={isHovered} isSaved={isSaved}/>
        <PromptContainer>
          <PromptText isHovered={isHovered} isSaved={isSaved}>
            {prompt.content.front}
          </PromptText>
          {(isHovered || isSaved) && 
            <PromptBack isHovered={isHovered} isSaved={isSaved}>
              {prompt.content.back}
            </PromptBack>
          }
        </PromptContainer>
      </Container>
  );
}