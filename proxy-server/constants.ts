
export const PROMPT_LIST_EMBED_PATHS: {
  [k: string]: {
    before: boolean;
    cssSelector: string;
    promptListID: string;
  }[];
} = {
  "https://basecamp.com/shapeup/1.1-chapter-02": [
    {
      before: true,
      cssSelector:
        "html body main#main.wb div.content nav.pagination.hidden-print",
      // should match prompts.promptList
      // TODO: should be stored in the same place!
      promptListID: "promptList",
    },
  ],
  "https://basecamp.com/shapeup/1.2-chapter-03": [
    {
      before: true,
      cssSelector: ".pagination",
      promptListID: "promptList",
    },
  ],
  "https://bounded-regret.ghost.io/more-is-different-for-ai": [
{
      before: true,
      cssSelector: ".post-content > p:nth-child(14)",
      promptListID: "promptList",
    }
  ]
  
};