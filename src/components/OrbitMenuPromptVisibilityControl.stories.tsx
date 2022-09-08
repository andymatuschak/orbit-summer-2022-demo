import React, { useState } from "react";
import {
  OrbitMenuPromptVisibilityControl,
  PromptVisibilitySetting,
} from "./OrbitMenuPromptVisibilityControl";

export default {
  component: OrbitMenuPromptVisibilityControl,
};

export const Primary = () => {
  const [value, setValue] = useState<PromptVisibilitySetting>(
    PromptVisibilitySetting.All,
  );
  return <OrbitMenuPromptVisibilityControl value={value} onChange={setValue} />;
};
