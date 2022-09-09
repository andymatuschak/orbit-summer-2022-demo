import React, { useState } from "react";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import { XOR } from "./common/typeOperations";
import ShortcutKey from "./ShortcutKey";
import { Label, LabelColor, LabelSmall } from "./Type";

export interface MenuItemPropsSubtitle {
  title: string;
  subtitle?: string;
  onClick: () => void;
}

export interface MenuItemPropsShortcutKey {
  title: string;
  onClick: () => void;
  shortcutKey?: string;
}

// A MenuItem can either have a shortcut key or a subtitle, not both
type MenuItemProps = XOR<MenuItemPropsShortcutKey, MenuItemPropsSubtitle>;

export default function MenuItem(props: MenuItemProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  
  return (
    <button
      css={[
        hoverAndActiveStyles,
        {
          padding: 12,
          margin: 0,
          backgroundColor: "var(--bgPrimary)",
          border: "none",
          display: "flex",
          flexDirection: props.subtitle ? "column" : "row",
          lineHeight: 0,
          cursor: "pointer",
        },
        props.shortcutKey && {
          alignItems: "center",
          width: "100%",
          justifyContent: "space-between",
        },
      ]}
      onClick={props.onClick}
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
    >
      <Label text={props.title} color={LabelColor.AccentPrimary} />
      {props.subtitle && (
        <>
          <div css={{ height: 8 }} />
          <LabelSmall
            text={props.subtitle}
            color={LabelColor.FGSecondaryLarge}
          />
        </>
      )}
      {props.shortcutKey && (
        <ShortcutKey shortcutKey={props.shortcutKey} hover={isHovered}/>
      )}
    </button>
  );
}
