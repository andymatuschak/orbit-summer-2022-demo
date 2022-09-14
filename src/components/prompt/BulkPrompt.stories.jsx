import React from "react";
import { css } from "@emotion/react";
import { PromptSelectorType } from "../../app/promptSlice";
import BulkPromptBox from "./BulkPromptBox";

export default {
  component: BulkPromptBox,
};

const Template = (args) => <BulkPromptBox {...args} />;

const prompt1 = { 
    content: {
        front: "What is a test?",
        back: "A procedure intended to establish the quality, performance, or reliability of something, especially before it is taken into widespread use."
    },
  selectors: [{type: PromptSelectorType.TextPositionSelector, start:0, end: 100}],
  isByAuthor: true,
  isSaved: false,
};

const prompt2 = { 
    content: {
        front: "What is the answer to life?",
        back: "With a high degree of confidence I can say it is 42. If you disagree, I propose you embark on a quest for your own meaning! Surely you wil see, 42 is the answer."
    },
  selectors: [{type: PromptSelectorType.TextPositionSelector, start:0, end: 100}],
  isByAuthor: true,
  isSaved: false,
};

export const Primary = Template.bind({});
Primary.args = {
  prompts: [
        prompt1,
        prompt2,
  ],
  ids: [
    "1",
    "2",
  ],
  saveAll: () => null,
  savePrompt: (id) => null,
};
