import styled from '@emotion/styled'

import startburst_null from '../../static/images/Icons/Starburst-Null.png';
import starburst_active from '../../static/images/Icons/Starburst-Active.png'
import starburst_editing from '../../static/images/Icons/Starburst-Edit.png';
import plus from '../../static/images/Icons/Plus.png';

export const ANIMATION_TIME_MSEC = 48.0;

export interface HoverProps {
    isHovered: boolean
  }
  
export interface SavedProps {
    isSaved: boolean
}

export interface EditingProps {
    isEditing: boolean;
}

export interface BulkProps {
    isBulk: boolean;
}
  
export const Icon = styled.div<HoverProps & SavedProps & EditingProps>`
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

export const PromptText = styled.div<HoverProps & SavedProps & BulkProps>`
  font-family: "Dr-Medium";
  font-size: 14px;
  line-height: 17px;
  letter-spacing: 0.04em;
  color: var(--fgPrimary);
  opacity: ${props => ((props.isHovered || props.isSaved || props.isBulk) ? 1.0 : 0.696)};
  outline: none;

  ::selection {
    background: var(--editSelection);
  }

  caret-color: var(--accentPrimary);
  ${props => props.isSaved ? `cursor: text` : null};

  :empty::before {
    content: attr(placeholder);
    color: var(--fgDisabled);
  }
`;

export const PromptBack = styled(PromptText)`
  opacity: ${props => {
    if(props.isSaved){
      return 1.0;
    } else if(props.isHovered) {
      return 0.7;
    } else if(props.isBulk) {
      return 0.4;
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
`