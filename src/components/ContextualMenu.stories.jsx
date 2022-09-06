import React from "react";
import ContextualMenu from "./ContextualMenu";

export default {
  component: ContextualMenu,
};

const Template = (args) => <ContextualMenu {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  items: [
    {
      title: "Add 2 prompts",
      onClick: () => alert("click"),
    },
    {
      title: "Test 2",
    },
  ],
};
