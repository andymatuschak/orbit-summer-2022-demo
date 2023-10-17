import React, { useEffect, useState } from "react";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import { XOR } from "./common/typeOperations";
import ShortcutKey from "./ShortcutKey";
import { Label, LabelColor, LabelSmall } from "./Type";

export interface MenuItemPropsSubtitle {
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface MenuItemPropsShortcutKey {
  title: string;
  onClick: () => void;
  shortcutKey?: string;
  isEnabled: boolean;
}

// A MenuItem can either have a shortcut key or a subtitle, not both
type MenuItemProps = XOR<MenuItemPropsShortcutKey, MenuItemPropsSubtitle>;

export default function MenuItem({
  disabled,
  onClick,
  shortcutKey,
  isEnabled,
  subtitle,
  title,
}: MenuItemProps) {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    const onShortcutKey = function (e: KeyboardEvent) {
      if (shortcutKey && e.key === shortcutKey.toLowerCase() && isEnabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClick();
      }
    };

    document.addEventListener("keydown", onShortcutKey);
    return () => document.removeEventListener("keydown", onShortcutKey);
  }, [shortcutKey, isEnabled]);

  return (
    <button
      css={[
        !disabled && hoverAndActiveStyles,
        {
          padding: 12,
          height: subtitle ? 56 : 36,
          margin: 0,
          backgroundColor: "var(--bgPrimary)",
          border: "none",
          display: "flex",
          flexDirection: subtitle ? "column" : "row",
          lineHeight: 0,
          cursor: disabled ? "not-allowed" : "pointer",
        },
        shortcutKey && {
          alignItems: "center",
          width: "100%",
          justifyContent: "space-between",
        },
      ]}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Label
        text={title}
        color={disabled ? LabelColor.FGDisabled : LabelColor.AccentPrimary}
      />
      {subtitle && (
        <>
          <div css={{ height: 8 }} />
          <LabelSmall
            text={subtitle}
            color={
              disabled ? LabelColor.FGDisabled : LabelColor.FGSecondaryLarge
            }
          />
        </>
      )}
      {shortcutKey && (
        <ShortcutKey shortcutKey={shortcutKey} hover={isHovered} />
      )}
    </button>
  );
}
