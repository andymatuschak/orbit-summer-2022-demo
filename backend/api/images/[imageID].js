import { Storage } from "@google-cloud/storage";

// Set up Google Cloud Storage
const storage = new Storage({
  projectId: process.env["GCLOUD_PROJECT_ID"],
  credentials: {
    private_key: JSON.parse(process.env["GCLOUD_PRIVATE_KEY"]),
    client_email: process.env["GCLOUD_CLIENT_EMAIL"],
  },
});
const bucketName = process.env["GCLOUD_BUCKET_NAME"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }

  const id = req.query["imageID"];
  if (req.method === "GET") {
    // TODO FIX HACK note that we expect the client to provide the extension as part of the id, for GET only. Gross. See formatPromptTextWithAttachments
    const file = storage.bucket(bucketName).file(`${id}`);
    res.writeHead(302, { Location: file.publicUrl() });
    res.end();
  } else if (req.method === "POST") {
    // TODO: some sort of auth so that if I deploy this to the public internet, people can't upload arbitrary data freely
    const contentType = req.headers["content-type"];
    const extension = ((contentType) => {
      switch (contentType) {
        case "image/jpeg":
          return "jpg";
        case "image/png":
          return "png";
        case "image/svg":
          return "svg";
        default:
          return null;
      }
    })(contentType);
    if (!extension) {
      console.error(`Unsupported content type ${contentType}`);
      res.status(400).send();
      return;
    }

    const file = storage.bucket(bucketName).file(`${id}.${extension}`);
    req
      .pipe(
        file.createWriteStream({
          contentType: contentType,
        }),
      )
      .on("error", (err) => {
        console.error(err);
        res.status(500).send();
      })
      .on("finish", () => {
        res.status(200).send(file.publicUrl());
      });
  }
}
