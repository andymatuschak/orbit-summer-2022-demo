import path from "path";

// TODO: I naively copied this from the Spring demo. It'll need to be updated for the data structures we use in the Summer prototype.

async function convertData(incomingData, host) {
  const AnkiExport = await import("@steve2955/anki-apkg-export");
  const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
  const apkg = new AnkiExport.default("Shape Up");
  console.log(incomingData);
  for (const [pathname, { prompts }] of Object.entries(incomingData)) {
    // HACK Copy pasta:
    const chapterNumber = pathname.match(
      /\/shape-up\/shapeup\/[0-9.]+-chapter-(\d\d)(\/.*)?$/
    )[1];

    for (const prompt of Object.values(prompts)) {
      if (!prompt.isAdded) {
        continue;
      }
      const imageMatch = prompt.back.match(/<img src="(.+?)".+$/);

      // HACK for Shape Up images
      if (imageMatch) {
        const basename = path.parse(imageMatch[1]).base;
        const url = imageMatch[1].replace("../../", "https://basecamp.com/");
        const response = await fetch(url);
        apkg.addMedia(basename, await response.arrayBuffer());
        prompt.back = prompt.back.replace(imageMatch[1], basename);
      }
      apkg.addCard(prompt.front, `${prompt.back}<br /><br />(<a href="${host}/${pathname}">Shape Up: Chapter ${Number.parseInt(chapterNumber)}</a>)`);
    }
  }
  const ankiData = await apkg.save();
  return { data: ankiData, filename: "Shape Up.apkg" };
}

export default async function handler(req, res) {
  const result = await convertData(req.body, req.headers.host);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.filename}"`
  );
  res.status(200).send(result.data);
}
