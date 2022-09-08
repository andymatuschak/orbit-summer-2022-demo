import { PropsOf } from "@emotion/react";
import React from "react";
import WithBaselineGrid from "./BaselineGrid";
import MenuItem from "./MenuItem";

export default {
  component: MenuItem,
};

export const Primary = (args: PropsOf<typeof MenuItem>) => (
  <WithBaselineGrid>
    <MenuItem {...args} />
  </WithBaselineGrid>
);
Primary.args = {
  title: "Menu item",
};
