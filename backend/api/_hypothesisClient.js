import HypothesisClient from "hypothesis-api-client";

const hypothesisToken = process.env.HYPOTHESIS_TOKEN;
export const hypothesisClient = new HypothesisClient(hypothesisToken);
if (!hypothesisToken) {
  throw new Error("Missing HYPOTHESIS_TOKEN env var");
}

export function promptDataToAnnotationText(promptData) {
  return JSON.stringify({
    id: promptData.id,
    comment: promptData.prompt.content.front,
    annotationType: promptData.prompt.annotationType,
  });
}
