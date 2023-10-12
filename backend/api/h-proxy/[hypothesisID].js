import {
  hypothesisClient,
  promptDataToAnnotationText,
} from "../_hypothesisClient.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, PATCH, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
  } else if (req.method === "DELETE") {
    const hypothesisID = req.query["hypothesisID"];
    if (!hypothesisID) {
      console.error("Missing hypothesisID query parameter");
      res.status(400).end();
      return;
    }
    console.log(`DELETE /h-proxy/${hypothesisID}`);
    hypothesisClient.deleteAnnotation(hypothesisID, (error) => {
      if (error) {
        console.error(error);
        res.status(500).end();
      } else {
        console.debug("Deleted.");
        res.status(200).end();
      }
    });
  } else if (req.method === "PATCH") {
    const hypothesisID = req.query["hypothesisID"];
    if (!hypothesisID) {
      console.error("Missing hypothesisID query parameter");
      res.status(400).end();
      return;
    }

    let dataJSON = "";
    req.on("data", (chunk) => {
      dataJSON += chunk.toString();
    });
    req.on("end", () => {
      const data = JSON.parse(dataJSON);
      console.log(`PATCH /h-proxy/${hypothesisID}`);
      console.debug(data);
      hypothesisClient.updateAnnotation(
        hypothesisID,
        {
          text: promptDataToAnnotationText(data),
        },
        (error) => {
          if (error) {
            console.error(error);
            res.status(500).end();
          } else {
            console.log("Success.");
            res.status(200).end();
          }
        },
      );
    });
  } else {
    res.status(405).end();
  }
}
