import https from "https";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }

  const url = req.query["url"];
  https
    .get(url, (response) => {
      if (response.headers["content-type"] === "application/pdf") {
        res.setHeader("Content-Type", "application/pdf");
        response.pipe(res);
      } else {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.write("Invalid content type, expecting a PDF file");
        res.end();
      }
    })
    .on("error", (error) => {
      console.error(`Couldn't fetch PDF at ${url}: ${error}`);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.write("Failed to fetch PDF content");
      res.end();
    });
}
