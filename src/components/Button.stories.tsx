import { ComponentStory } from "@storybook/react";
import React from "react";
import Button from "./Button";

export default {
  component: Button,
  argTypes: {
    children: {
      control: {
        type: "text",
      },
    },
  },
};

const Template: ComponentStory<typeof Button> = (args) => (
  <Button {...args}>{args.children}</Button>
);
Template.args = {};

export const TextOnly = Template.bind({});
TextOnly.args = {
  children: "Text-only Button",
};

export const Large = Template.bind({});
Large.args = {
  children: "Large Text Button",
  size: "large",
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  children: "Button with icon",
  icon: "add",
};
