import styled from "@emotion/styled";

export interface ShortcutKeyProps {
  shortcutKey: string;
  hover: boolean;
}

export interface HoverProps {
  hover: boolean;
}

const Container = styled.div<HoverProps>`
  position: relative;
  width: 20px;
  height: 20px;
  background: var(--bgSecondary);
  border-radius: 2px;
  ${props => (
    props.hover ? {
      border: "2px solid var(--fgTertiary)"
    } : null
  )};
`;

const Key = styled.span`
  position: absolute;
  width: 12px;
  height: 16px;
  left: calc(50% - 12px/2);
  top: calc(50% - 16px/2 - 1px);

  font-family: 'Dr-ExtraBold';
  font-size: 15px;
  line-height: 17px;

  text-align: center;
  letter-spacing: 0.03em;

  color: var(--fgSecondarySmall);
`

export default function ShortcutKey({ shortcutKey, hover}: ShortcutKeyProps){
  return (
    <Container
      hover={hover}
    >
      <Key>
        {shortcutKey}
      </Key>
    </Container>
  )
}