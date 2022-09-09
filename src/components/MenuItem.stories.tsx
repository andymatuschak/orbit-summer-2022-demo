import { ComponentStory } from "@storybook/react";
import React from "react";
import MenuItem from "./MenuItem";

export default {
  component: MenuItem,
};

const Template: ComponentStory<typeof MenuItem> = (args) => (
  <MenuItem {...args} />
);

const args = {
  title: "Menu item",
  onClick: () => alert("Clicked"),
};

export const Primary = Template.bind({});
Primary.args = {
  ...args,
};

export const WithSubtitle = Template.bind({});
WithSubtitle.args = {
  ...args,
  subtitle: "This is a subtitle",
};

export const WithKey = Template.bind({});
WithKey.args = {
  ...args,
  shortcutKey: "N"
};
