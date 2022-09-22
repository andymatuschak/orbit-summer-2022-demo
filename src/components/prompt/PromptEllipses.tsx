import styled from "@emotion/styled";

const Container = styled.div`
  width: 32px;
  height: 29px;
  background: linear-gradient(
    -90deg,
    #f9f6f1 55.32%,
    #f9f6f1 69.38%,
    rgba(249, 246, 241, 0) 101.06%
  );
`;

const HoverContainer = styled.div`
  width: 15px;
  height: 23px;
  border-radius: 4px;
  position: relative;
  top: 3px;
  left: 8.5px;

  :hover::before {
    position: absolute;
    content: "";
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 4px;
    background-color: var(--hoverLayer);
  }

  :active::before {
    position: absolute;
    content: "";
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 4px;
    background-color: var(--pressedLayer);
  }

  &:hover > div {
    background-color: var(--accentPrimary);
  }
`;

interface DotProps {
  i: number;
}

const Dot = styled.div<DotProps>`
  width: 3px;
  height: 3px;
  background-color: var(--fgSecondarySmall);
  position: relative;
  left: 6px;
  top: ${(props) => 5 + props.i * 2}px;
  border-radius: 50%;
`;

export interface PromptEllipsesProps {
  onClick: () => any;
}

export default function PromptEllipses({ onClick }: PromptEllipsesProps) {
  return (
    <Container>
      <HoverContainer onClick={onClick}>
        <Dot i={0} />
        <Dot i={1} />
        <Dot i={2} />
      </HoverContainer>
    </Container>
  );
}
