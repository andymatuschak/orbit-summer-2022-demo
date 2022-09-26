import { css } from "@emotion/react";
import React from "react";
import Add from "../static/images/Icons/Plus.png";
import RightArrow from "../static/images/Icons/Right.png";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import { colorsByEnumValue, LabelColor, LabelSmall } from "./Type";

type IconName = "add" | "rightArrow";
export interface ButtonProps {
  children: string;
  onClick: () => void;
  size?: "regular" | "large";
  icon?: IconName;
  backgroundColor?: string;
  color?: LabelColor;
  disabled?: boolean;
  isFloating?: boolean;
  isFlipped?: boolean;
}

const iconsByIconName: Record<IconName, typeof Add> = {
  add: Add,
  rightArrow: RightArrow,
};

const regularButtonStyle = css({
  height: 40,
  paddingTop: 8,
  paddingBottom: 8,
});

const largeButtonStyle = css({
  height: 56,
  paddingTop: 14,
  paddingBottom: 18,
  paddingLeft: 32,
  paddingRight: 32,
});

const floatingButtonStyle = css({
  boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.07), 0px 4px 25px rgba(0, 0, 0, 0.1)",
});
const largeTitleStyle = css({
  fontFamily: "Dr-ExtraBold",
  fontSize: 24,
  lineHeight: "24px",
  letterSpacing: "0.02em",
  color: "var(--accentPrimary)",
});

export default function Button({
  children,
  icon,
  size = "regular",
  backgroundColor = "clear",
  color = LabelColor.AccentPrimary,
  onClick,
  disabled = false,
  isFloating = false,
  isFlipped = false,
}: ButtonProps) {
  const effectiveColor = disabled ? LabelColor.FGDisabled : color;

  function createIcon() {
    if (!icon) {
      return null;
    }
    return (
      <div
        css={{
          width: 24,
          height: 24,
          marginRight: isFlipped ? 0 : 6, // forgive me, gods of the grid--this is what it needs!
          backgroundColor: disabled
            ? "var(--fgDisabled)"
            : "var(--accentPrimary)",
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskImage: `url(${iconsByIconName[icon]})`,
          maskSize: "24px 24px",
          transition: "var(--fadeTransition)",
        }}
      ></div>
    );
  }

  function createText() {
    return size === "regular" ? (
      <div css={{ marginTop: 5, marginRight: isFlipped ? 6 : 0 }}>
        <LabelSmall text={children} color={effectiveColor} />
      </div>
    ) : (
      <div
        css={[largeTitleStyle, { color: colorsByEnumValue[effectiveColor] }, {marginRight: isFlipped ? 6 : 0 }]}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      css={[
        !disabled && hoverAndActiveStyles,
        {
          paddingLeft: icon ? 12 : 16, // the icon has 4px of internal padding
          paddingRight: 16,
          display: "flex",
          flexDirection: "row",
          background: "none",
          border: "none",
          backgroundColor,
          borderRadius: 4,
          cursor: disabled ? "not-allowed" : "pointer",

          "&::before": {
            borderRadius: 4,
          },
        },
        size === "regular" ? regularButtonStyle : largeButtonStyle,
        isFloating ? floatingButtonStyle : null,
      ]}
      disabled={disabled}
    >
      {isFlipped ? (
        <>
          {createText()}
          {createIcon()}
        </>) :
        (<>
          {createIcon()}
          {createText()}
        </>
      )}
    </button>
  );
}
