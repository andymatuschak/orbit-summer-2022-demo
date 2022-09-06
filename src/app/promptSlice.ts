export interface Prompt {
  content: {
    front: string;
    back: string;
  };
  selectors: PromptSelector[];
  isByAuthor: boolean;
  isSaved: boolean;
}

// i.e. following Hypothes.is's selector format, as specified in src/vendor/hypothesis-annotator
// annoyingly, this is distinct from the W3 Annotation format which hypothes.is helped define: https://www.w3.org/TR/annotation-model
export type PromptSelector =
  | RangeSelector
  | TextPositionSelector
  | TextQuoteSelector;

export enum PromptSelectorType {
  RangeSelector = "RangeSelector",
  TextPositionSelector = "TextPositionSelector",
  TextQuoteSelector = "TextQuoteSelector",
}

export interface RangeSelector {
  type: PromptSelectorType.RangeSelector;
  startOffset: number;
  endOffset: number;
  startContainer: string; // i.e. an XPath string
  endContainer: string; // i.e. an XPath string
}

// specifies an index range within the innerText of the page
export interface TextPositionSelector {
  type: PromptSelectorType.TextPositionSelector;
  start: number;
  end: number;
}

export interface TextQuoteSelector {
  type: PromptSelectorType.TextQuoteSelector;
  exact: string;
  prefix: string;
  suffix: string;
}
