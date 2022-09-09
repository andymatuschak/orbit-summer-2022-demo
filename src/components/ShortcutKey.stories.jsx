import React from "react";
import ShortcutKey from "./ShortcutKey";

export default {
  component: ShortcutKey,
};

const Template = (args) => <ShortcutKey {...args} />;

export const N = Template.bind({});
N.args = {
    shortcutKey: "N",
};

export const S = Template.bind({});
S.args = {
    shortcutKey: "S",
};

