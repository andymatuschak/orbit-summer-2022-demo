import React, { ComponentProps } from "react";
import { Label, LabelSmall } from "./Type";

export default {
  component: Label,
};

export const Primary = (args: ComponentProps<typeof Label>) => (
  <div>
    <div css={{ padding: 24, backgroundColor: "rgba(255,0,0,0.25)" }}>
      <Label {...args} text={`Label: ${args.text}`} />
    </div>
    <div css={{ padding: 24, backgroundColor: "rgba(255,0,0,0.25)" }}>
      <LabelSmall {...args} text={`Label Small: ${args.text}`} />
    </div>
  </div>
);
Primary.args = {
  text: "Some test text",
  showBaselineGrid: true,
};
