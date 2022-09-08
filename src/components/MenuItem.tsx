import React from "react";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import { Label, LabelColor, LabelSmall } from "./Type";

export interface MenuItemProps {
  title: string;
  subtitle?: string;
  // TODO: shortcut key for highlight menu
}

export default function MenuItem(props: MenuItemProps) {
  return (
    <button
      css={[
        hoverAndActiveStyles,
        {
          padding: 12,
          backgroundColor: "var(--bgPrimary)",
          border: "none",
          display: "flex",
          flexDirection: "column",
          lineHeight: 0,
          cursor: "pointer",
        },
      ]}
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
    </button>
  );
}
