import {
  hypothesisClient,
  promptDataToAnnotationText,
  userCreatedAnnotationTag,
} from "./_hypothesisClient.js";

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
          res.status(200).send(annotations);
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
          tags: [
            userCreatedAnnotationTag,
            ...(data.prompt.curationID ? ["orbit-prototype-from-curated"] : []),
          ],
        },
        (error, responseData) => {
          if (error) {
            console.error(error);
            res.status(500).end();
            return;
          }
          console.log("Success.");
          console.debug(responseData);

          const newHypothesisID = responseData.id;
          function sendResponseData() {
            res.status(200).send(newHypothesisID);
          }
          if (data.prompt.curationID) {
            hypothesisClient.createNewAnnotation(
              {
                uri,
                group: groupID,
                document: {
                  title: [metadata.title],
                  link: metadata.link,
                },
                text: `https://hypothes.is/a/${data.prompt.curationID}`, // HACK
                tags: ["orbit-prototype-from-curated"],
                references: [newHypothesisID],
              },
              (error, commentResponseData) => {
                if (error) {
                  console.error(
                    "Error posting comment to associate new annotation with its curated ID",
                    error,
                  );
                  res.status(500).end();
                } else {
                  console.log(
                    "Wrote comment associating new annotation with its curated ID.",
                  );
                  console.debug(commentResponseData);
                  sendResponseData();
                }
              },
            );
          } else {
            sendResponseData();
          }
        },
      );
    });
  } else {
    res.status(405).end();
  }
}
