import { css } from "@emotion/react";
import React from "react";
import Add from "../static/images/Icons/Plus.png";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import { colorsByEnumValue, Label, LabelColor, LabelSmall } from "./Type";

type IconName = "add";
export interface ButtonProps {
  children: string;
  onClick: () => void;
  size?: "regular" | "large";
  icon?: IconName;
  backgroundColor?: string;
  color?: LabelColor;
}

const iconsByIconName: Record<IconName, typeof Add> = {
  add: Add,
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
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      css={[
        hoverAndActiveStyles,
        {
          paddingLeft: icon ? 12 : 16, // the icon has 4px of internal padding
          paddingRight: 16,
          display: "flex",
          flexDirection: "row",
          background: "none",
          border: "none",
          backgroundColor,
          borderRadius: 4,
          cursor: "pointer",

          "&::before": {
            borderRadius: 4,
          },
          width: '100%',
        },
        size === "regular" ? regularButtonStyle : largeButtonStyle,
      ]}
    >
      {icon && (
        <div
          css={{
            width: 24,
            height: 24,
            marginRight: 6, // forgive me, gods of the grid--this is what it needs!
            backgroundColor: "var(--accentPrimary)",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskImage: `url(${iconsByIconName[icon]})`,
            maskSize: "24px 24px",
            transition: "var(--fadeTransition)",
          }}
        ></div>
      )}
      {size === "regular" ? (
        <div css={{ marginTop: 5 }}>
          <LabelSmall text={children} color={color} />
        </div>
      ) : (
        <div css={[largeTitleStyle, { color: colorsByEnumValue[color] }]}>
          {children}
        </div>
      )}
    </button>
  );
}
