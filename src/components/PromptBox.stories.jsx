import React from "react";
import { PromptSelectorType } from "../app/promptSlice";
import PromptBox from "./PromptBox";

export default {
  component: PromptBox,
};

const Template = (args) => <PromptBox {...args} />;

const samplePrompt = { 
    content: {
        front: "What is a test?",
        back: "A procedure intended to establish the quality, performance, or reliability of something, especially before it is taken into widespread use."
    },
  selectors: [{type: PromptSelectorType.TextPositionSelector, start:0, end: 100}],
  isByAuthor: true,
  isSaved: false
};

export const Primary = Template.bind({});
Primary.args = {
    prompt: samplePrompt,
    savePrompt: () => null
};