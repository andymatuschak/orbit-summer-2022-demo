import AnkiExport from "@steve2955/anki-apkg-export";
import fetch from "node-fetch";

async function convertData(incomingData, host) {
  const siteName = incomingData.siteName;
  const apkg = new AnkiExport(siteName);

  for (const [pathname, prompts] of Object.entries(incomingData.prompts)) {
    for (const prompt of Object.values(prompts)) {
      if (!prompt.isSaved) {
        continue;
      }
      const imageURL = getAttachmentURL(
        prompt.content.back,
        incomingData.baseURI,
      );
      if (imageURL) {
        const response = await fetch(imageURL);
        const filename = imageURL.split("/").pop();
        apkg.addMedia(filename, await response.arrayBuffer());
        prompt.content.back = `<img src="${filename}" />`;
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

// HACK: copy/pasta from inlineReviewModuleSlice.ts--sorry! This file can't see that one...
// HACK: The embedded iframe (which uses the "real" Orbit bits) can't access local URLs. So we convert relative URLs of these images back to absolute paths on the original publication servers.
function getAttachmentURL(text, baseURI) {
  const imageMatch = text.match(/<img src="(.+?)".+$/);
  if (imageMatch) {
    const resolved = new URL(imageMatch[1], baseURI).pathname;
    const inDomainSubpath = resolved.split("/").slice(2).join("/");
    if (resolved.startsWith("/shape-up")) {
      return `https://basecamp.com/${inDomainSubpath}`;
    } else if (resolved.startsWith("/ims")) {
      return `https://openintro-ims.netlify.app/${inDomainSubpath}`;
    } else {
      throw new Error("Unsupported image URL");
    }
  } else {
    return null;
  }
}
