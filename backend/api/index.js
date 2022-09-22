import path from "path";
import AnkiExport from "@steve2955/anki-apkg-export";
import fetch from "node-fetch";

async function convertData(incomingData, host) {
  const apkg = new AnkiExport("Shape Up");
  console.log(incomingData);

  const siteName = incomingData.siteName;
  for (const [pathname, prompts] of Object.entries(incomingData.prompts)) {
    for (const prompt of Object.values(prompts)) {
      if (!prompt.isSaved) {
        continue;
      }
      const imageMatch = prompt.content.back.match(/<img src="(.+?)".+$/);

      // HACK for Shape Up images
      // TODO use urls in inline review slice file
      if (imageMatch) {
        const basename = path.parse(imageMatch[1]).base;
        const url = imageMatch[1].replace("../../", "https://basecamp.com/");
        const response = await fetch(url);
        apkg.addMedia(basename, await response.arrayBuffer());
        prompt.content.back = prompt.content.back.replace(
          imageMatch[1],
          basename,
        );
      }

      let sourceString;
      if (pathname.startsWith("/shape-up")) {
        // HACK:
        const chapterNumber = pathname.match(
          /\/shape-up\/shapeup\/[0-9.]+-chapter-(\d\d)(\/.*)?$/,
        )[1];
        sourceString = `Shape Up: Chapter ${Number.parseInt(chapterNumber)}`;
      } else {
        sourceString = siteName;
      }
      apkg.addCard(
        prompt.content.front,
        `${prompt.content.back}<br /><br />(${sourceString})`,
      );
    }
  }
  const ankiData = await apkg.save();
  return { data: ankiData, filename: `${siteName}.apkg` };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.body) {
    const result = await convertData(req.body, req.headers.host);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.status(200).send(result.data);
  } else {
    res.status(201).send();
  }
}
