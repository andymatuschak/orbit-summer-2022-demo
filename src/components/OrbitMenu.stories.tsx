import { ComponentStory } from "@storybook/react";
import React from "react";
import WithBaselineGrid from "./BaselineGrid";
import { OrbitMenu } from "./OrbitMenu";

export default {
  component: OrbitMenu,
};

export const Primary: ComponentStory<typeof OrbitMenu> = (_, { globals }) => (
  <div
    css={{
      position: "fixed",
      right: 48,
      bottom: 40,
    }}
  >
    <WithBaselineGrid enabled={globals.showBaselineGrid}>
      <OrbitMenu
        onStartReview={() => {
          return;
        }}
      />
    </WithBaselineGrid>
  </div>
);
