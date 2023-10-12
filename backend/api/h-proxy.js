import {
  hypothesisClient,
  promptDataToAnnotationText,
} from "./_hypothesisClient.js";

const userCreatedAnnotationTag = "orbit-prototype-user-created";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
  } else if (req.method === "GET") {
    const { uri, groupID } = req.query;
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
    console.log(`GET /h-proxy`);
    console.debug({ uri, groupID });
    hypothesisClient.searchAnnotations(
      {
        uri,
        group: groupID,
        tag: userCreatedAnnotationTag,
        limit: 5000,
      },
      (error, annotations) => {
        if (error) {
          console.error(error);
          res.status(500).end();
        } else {
          console.log("Success.");
          console.debug(annotations);
          const orbitIDsToHypothesisIDs = Object.fromEntries(
            annotations.map((annotation) => {
              const orbitID = JSON.parse(annotation.text).id;
              return [orbitID, annotation.id];
            }),
          );
          console.debug(orbitIDsToHypothesisIDs);
          res.status(200).send(orbitIDsToHypothesisIDs);
        }
      },
    );
  } else if (req.method === "POST") {
    let bodyJSON = "";
    req.on("data", (chunk) => {
      bodyJSON += chunk.toString();
    });
    req.on("end", () => {
      const body = JSON.parse(bodyJSON);
      console.log("POST /h-proxy");
      console.debug(body);
      const { metadata, uri, groupID, data } = body;
      hypothesisClient.createNewAnnotation(
        {
          uri,
          group: groupID,
          document: {
            title: [metadata.title],
            link: metadata.link,
          },
          text: promptDataToAnnotationText(data),
          target: [{ selector: data.prompt.selectors }],
          tags: [userCreatedAnnotationTag],
        },
        (error, responseData) => {
          if (error) {
            console.error(error);
            res.status(500).end();
          } else {
            console.log("Success.");
            console.debug(responseData);
            res.status(200).send(responseData.id);
          }
        },
      );
    });
  } else {
    res.status(405).end();
  }
}
