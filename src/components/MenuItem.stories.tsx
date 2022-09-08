import { ComponentStory } from "@storybook/react";
import React from "react";
import MenuItem from "./MenuItem";

export default {
  component: MenuItem,
};

const Template: ComponentStory<typeof MenuItem> = (args) => (
  <MenuItem {...args} />
);

export const Primary = Template.bind({});
Primary.args = {
  title: "Menu item",
};

export const WithSubtitle = Template.bind({});
WithSubtitle.args = {
  title: "Menu item",
  subtitle: "This is a subtitle",
};
