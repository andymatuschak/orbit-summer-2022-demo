import {
  hypothesisClient,
  userCreatedAnnotationTag,
} from "./_hypothesisClient.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
  } else if (req.method === "GET") {
    const { uri, groupID, curatedGroupID } = req.query;
    if (!uri) {
      console.error("Missing uri query parameter");
      res.status(400).end();
      return;
    }
    if (!groupID) {
      console.error("Missing groupID query parameter");
      res.status(400).end();
      return;
    }
    if (!curatedGroupID) {
      console.error("Missing curatedGroupID query parameter");
      res.status(400).end();
      return;
    }
    console.log(`GET /getMissedAnnotations`);
    console.debug({ uri, groupID, curatedGroupID });
    hypothesisClient.searchAnnotations(
      {
        uri,
        group: groupID,
        limit: 5000,
      },
      (error, annotations) => {
        if (error) {
          console.error(error);
          res.status(500).end();
          return;
        }

        hypothesisClient.searchAnnotations(
          {
            uri,
            group: curatedGroupID,
            limit: 5000,
          },
          (error, curatedGroupAnnotations) => {
            console.log("Got all annotations.");
            console.debug(annotations);
            console.debug(curatedGroupAnnotations);

            const curatedAnnotations = curatedGroupAnnotations.filter(
              (annotation) =>
                !annotation.references &&
                !annotation.tags.includes(userCreatedAnnotationTag),
            );
            console.debug("Curated annotations:", curatedAnnotations);
            const curatedAnnotationsByURL = Object.fromEntries(
              curatedAnnotations.map((a) => [a.links.html, a]),
            );

            const curatedMappings = annotations.filter(
              (annotation) => annotation.references,
            );
            const coveredCuratedAnnotationsURLs = curatedMappings.flatMap((a) =>
              a.text.split("\n"),
            );
            const missedCuratedAnnotationURLs = [
              ...Object.keys(curatedAnnotationsByURL),
            ].filter((url) => !coveredCuratedAnnotationsURLs.includes(url));
            console.debug(
              "Missed curated annotations:",
              missedCuratedAnnotationURLs,
            );
            res.status(200).send(
              missedCuratedAnnotationURLs.map((url) => ({
                id: curatedAnnotationsByURL[url].id,
                selectors: curatedAnnotationsByURL[url].target[0].selector,
              })),
            );
          },
        );
      },
    );
  } else {
    res.status(405).end();
  }
}
