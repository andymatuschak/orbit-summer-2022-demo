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
Template.args = {
  onClick: () => {
    alert("Clicked");
  },
};

export const TextOnly = Template.bind({});
TextOnly.args = {
  ...Template.args,
  children: "Text-only Button",
};

export const Large = Template.bind({});
Large.args = {
  ...Template.args,
  children: "Large Text Button",
  size: "large",
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  ...Template.args,
  children: "Button with icon",
  icon: "add",
};
