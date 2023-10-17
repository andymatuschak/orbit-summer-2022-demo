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
        // assure that we see the original annotation before we see the curation comment on it
        sort: "created",
        order: "asc",
      },
      (error, annotations) => {
        if (error) {
          console.error(error);
          res.status(500).end();
          return;
        }

        const promptIDsByAnnotationID = {};
        const annotationIDsByCuratedAnnotationURLs = {};
        for (const a of annotations) {
          if (!a.references && a.tags.includes(userCreatedAnnotationTag)) {
            const data = JSON.parse(a.text);
            const type = data.annotationType;
            if (type === "forReview") {
              promptIDsByAnnotationID[a.id] = data.id;
            }
          } else if (
            a.references?.length === 1 &&
            promptIDsByAnnotationID[a.references[0]]
          ) {
            const referencedID = a.references[0];
            if (promptIDsByAnnotationID[referencedID]) {
              for (const url of a.text.split("\n")) {
                annotationIDsByCuratedAnnotationURLs[url] = a.references[0];
              }
            }
          }
        }

        console.log(
          "Resolved user annotations for review",
          promptIDsByAnnotationID,
          annotationIDsByCuratedAnnotationURLs,
        );

        hypothesisClient.searchAnnotations(
          {
            uri,
            group: curatedGroupID,
            limit: 5000,
          },
          (error, curatedGroupAnnotations) => {
            const curatedAnnotations = curatedGroupAnnotations.filter(
              (annotation) =>
                !annotation.references &&
                !annotation.tags.includes(userCreatedAnnotationTag),
            );
            console.debug("Curated annotations:", curatedAnnotations);
            const output = [];
            for (const curatedAnnotation of curatedAnnotations) {
              const url = curatedAnnotation.links.html;
              const userAnnotationID =
                annotationIDsByCuratedAnnotationURLs[url];
              if (userAnnotationID) {
                output.push({
                  promptID:
                    promptIDsByAnnotationID[
                      annotationIDsByCuratedAnnotationURLs[url]
                    ],
                  promptText: curatedAnnotation.text,
                });
              }
            }
            console.debug("Selected prompts for review", output);
            res.status(200).send(output);
          },
        );
      },
    );
  } else {
    res.status(405).end();
  }
}
