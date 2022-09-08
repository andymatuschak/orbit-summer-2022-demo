import { ComponentStory } from "@storybook/react";
import React from "react";
import MenuItem from "./MenuItem";

export default {
  component: MenuItem,
};

const Template: ComponentStory<typeof MenuItem> = (args) => (
  <MenuItem {...args} />
);
Template.args = {
  title: "Menu item",
  onClick: () => alert("Clicked"),
};

export const Primary = Template.bind({});
Primary.args = {
  ...Template.args,
};

export const WithSubtitle = Template.bind({});
WithSubtitle.args = {
  ...Template.args,
  subtitle: "This is a subtitle",
};
