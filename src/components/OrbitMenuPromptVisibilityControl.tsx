import { css } from "@emotion/react";
import React from "react";
import { hoverAndActiveStyles } from "./common/hoverAndActiveStyles";
import { LabelColor, LabelSmall } from "./Type";

interface SegmentProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
}
function Segment(props: SegmentProps) {
  return (
    <button
      onClick={props.onClick}
      css={[
        {
          border: "none",
          background: props.isActive ? "var(--bgPrimary)" : "none",
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: 4,
          paddingBottom: 6,
          margin: 0,
          flexGrow: 1,
          pointer: "cursor",
        },
        !props.isActive && hoverAndActiveStyles,
      ]}
    >
      <LabelSmall
        text={props.title}
        color={props.isActive ? LabelColor.AccentPrimary : LabelColor.FGPrimary}
      />
    </button>
  );
}

export enum PromptVisibilitySetting {
  None = "None",
  Saved = "Saved",
  All = "All",
}

export interface OrbitMenuPromptVisibilityControlProps {
  value: PromptVisibilitySetting;
  onChange: (newValue: PromptVisibilitySetting) => void;
}

export function OrbitMenuPromptVisibilityControl({
  value,
  onChange,
}: OrbitMenuPromptVisibilityControlProps) {
  function localSegment(setting: PromptVisibilitySetting) {
    return (
      <Segment
        title={setting}
        isActive={value === setting}
        onClick={() => onChange(setting)}
      ></Segment>
    );
  }

  const separatorStyle = css({
    width: 2,
    backgroundColor: "var(--fgTertiary)",
  });

  return (
    <div
      css={{
        display: "flex",
        flexDirection: "row",
        padding: 3,
        backgroundColor: "var(--bgSecondary)",
      }}
    >
      {localSegment(PromptVisibilitySetting.None)}
      <div
        css={[
          separatorStyle,
          { opacity: value === PromptVisibilitySetting.All ? 1 : 0 },
        ]}
      />
      {localSegment(PromptVisibilitySetting.Saved)}
      <div
        css={[
          separatorStyle,
          { opacity: value === PromptVisibilitySetting.None ? 1 : 0 },
        ]}
      />
      {localSegment(PromptVisibilitySetting.All)}
    </div>
  );
}
