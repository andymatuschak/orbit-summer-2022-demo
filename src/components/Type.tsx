import React from "react";

export enum LabelColor {
  AccentPrimary,
  FGPrimary,
}
const colorVarsByEnumValue = {
  [LabelColor.AccentPrimary]: "--accentPrimary",
  [LabelColor.FGPrimary]: "--fgPrimary",
};

interface TypeProps {
  text: string;
  color?: LabelColor;
}

/* I'm using components instead of simple CSS for our UI type styles because the web's unorthodox "half-leading" type layout results in space added *above* type. This makes it very difficult to lay text out on a consistent grid baseline. e.g. for the Label type style (17px/12px), half-leading shifts the glyph baselines down 1px below the 12px bounding box. */

export function Label(props: TypeProps) {
  return (
    <div
      css={{
        fontFamily: "Dr-ExtraBold",
        fontSize: 17,
        lineHeight: "12px",
        letterSpacing: "0.01em",
        color: `var(${
          colorVarsByEnumValue[props.color ?? LabelColor.FGPrimary]
        })`,

        // Manual adjustment for the web's non-standard leading behavior.
        marginTop: -1,
        paddingBottom: 1,
      }}
    >
      {props.text}
    </div>
  );
}

export function LabelSmall(props: TypeProps) {
  return (
    <div
      css={{
        fontFamily: "Dr-ExtraBold",
        fontSize: 15,
        lineHeight: "12px",
        letterSpacing: "0.02em",
      }}
    >
      {props.text}
    </div>
  );
}
