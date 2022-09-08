import { PropsOf } from "@emotion/react";
import React from "react";
import WithBaselineGrid from "./BaselineGrid";
import { Label, LabelSmall } from "./Type";

export default {
  component: Label,
};

export const Primary = (args: PropsOf<typeof Label>) => (
  <WithBaselineGrid>
    <div css={{ padding: 24, backgroundColor: "rgba(255,0,0,0.25)" }}>
      <Label {...args} text={`Label: ${args.text}`} />
    </div>
    <div css={{ padding: 24, backgroundColor: "rgba(255,0,0,0.25)" }}>
      <LabelSmall {...args} text={`Label Small: ${args.text}`} />
    </div>
  </WithBaselineGrid>
);
Primary.args = {
  text: "Some test text",
};
