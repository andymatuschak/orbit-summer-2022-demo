import React, { useState } from "react";
import styled from '@emotion/styled'
import { Prompt } from "../app/promptSlice";
import startburst_null from '../static/images/Icons/Starburst-Null.png';
import Plus from '../static/images/Icons/Plus.png';

export interface PromptProps {
    prompt: Prompt
}

interface HoverProps {
  isHovered: boolean
}

const Icon = styled.div<HoverProps>`
  width: 24px;
  height: 24px;
  background-image: ${props => (props.isHovered ? 'url('+Plus+')' : 'url('+startburst_null+')')};
  background-repeat: no-repeat;
  background-size: contain;
  flex: 0 0 auto;
`;

const PromptText = styled.div<HoverProps>`
  font-family: "Dr-Medium";
  font-size: 14px;
  line-height: 17px;
  letter-spacing: 0.04em;
  color: var(--fgPrimary);
  opacity: ${props => (props.isHovered ? 1.0 : 0.87)};
`;

const PromptBack = styled(PromptText)`
  opacity: 0.7;
`;

const PromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0px;
  gap: 8px;
`;

const Container = styled.div<HoverProps>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 332px;
  padding: 8px 8px 4px 12px;
  gap: 8px;
  cursor: pointer;

  ${props =>  (props.isHovered ? {
    'background': ' var(--bgContent);',
    'border-left': '3px solid var(--accentPrimary)',
    'box-shadow': '0px 1px 3px rgba(0, 0, 0, 0.07), 0px 5px 10px rgba(0, 0, 0, 0.08)'} : null
  )};
`;

export default function PromptBox({
    prompt, 
}: PromptProps) {
    const [isHovered, setIsHovered] = useState<boolean>(false);

    return (
      <Container isHovered={isHovered} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <Icon isHovered={isHovered}/>
        <PromptContainer>
          <PromptText isHovered={isHovered}>
            {prompt.content.front}
          </PromptText>
          {isHovered && 
            <PromptBack isHovered={isHovered}>
              {prompt.content.back}
            </PromptBack>
          }
        </PromptContainer>
      </Container>
  );
}