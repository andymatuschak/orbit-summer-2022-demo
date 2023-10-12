import React from "react";
import styled from "@emotion/styled";
import MenuItem from "./MenuItem";
export interface ContextualMenuItemProps {
  title: string;
  onClick: () => void;
  shortcutKey: string;
  isEnabled: boolean;
}

function ContextualMenuItem({
  title,
  onClick,
  shortcutKey,
  isEnabled,
}: ContextualMenuItemProps) {
  return (
    <MenuItem
      title={title}
      onClick={onClick}
      shortcutKey={shortcutKey}
      isEnabled={isEnabled}
    />
  );
}

const ContextMenuContainer = styled.div`
  width: 254px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px;
  background: var(--bgPrimary);
  border: 3px solid var(--fgTertiary);
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.07);
`;

export interface ContextualMenuProps {
  items: ContextualMenuItemProps[];
}

export default function ContextualMenu({ items }: ContextualMenuProps) {
  return (
    <ContextMenuContainer>
      {items.map((item, i) => (
        <ContextualMenuItem {...item} key={i} />
      ))}
    </ContextMenuContainer>
  );
}
