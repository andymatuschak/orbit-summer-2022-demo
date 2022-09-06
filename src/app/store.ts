import { Prompt } from "./promptSlice";

// TODO: move to redux, etc...
export type Store = {
  prompts: { [id: string]: Prompt };
};
