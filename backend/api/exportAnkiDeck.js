import AnkiExport from "@steve2955/anki-apkg-export";
import { parse as uuidParse, v5 as uuidV5 } from "uuid";
import fetch from "node-fetch";

export async function prepareAnkiDeck(incomingData) {
  const sourceLabel = incomingData.sourceLabel;
  const deckName = incomingData.deckName;
  const apkg = new AnkiExport(deckName, {
    css: `
  .card {
 font-family: system-ui;
 font-size: 17px;
 text-align: left;
 line-height: 1.3;

 color: black;
background-color: white;
width: calc(100% - 40px);
max-width: 400px;
margin-left: auto;
margin-right: auto;
}

hr {
margin-top: 1.5em;
margin-bottom: 1.5em;
opacity: 50%;
}

.extra {
font-size: 90%;
opacity: 65%;
margin-top: 3em;
}
  `,
  });

  for (const [pathname, prompts] of Object.entries(incomingData.prompts)) {
    for (const prompt of Object.values(prompts)) {
      if (!prompt.isSaved) {
        continue;
      }

      let front = await resolveAttachments(
        prompt.content.front,
        incomingData.baseURI,
        apkg,
      );
      let back = await resolveAttachments(
        prompt.content.back,
        incomingData.baseURI,
        apkg,
      );

      let sourceString;
      if (pathname.startsWith("/shape-up")) {
        // HACK:
        const chapterNumber = pathname.match(
          /\/shape-up\/shapeup\/[0-9.]+-chapter-(\d\d)(\/.*)?$/,
        )[1];
        sourceString = `Shape Up: Chapter ${Number.parseInt(chapterNumber)}`;
      } else {
        const url = urls[pathname];
        if (url) {
          sourceString = `<a style="color:inherit" href="${url}">${sourceLabel}</a>`;
        } else {
          sourceString = `<a style="color:inherit" href="${incomingData.baseURI}">${sourceLabel}</a>`;
        }
      }

      function orbitToAnki(text) {
        return text.replace(/\$(.+?)\$/g, "\\($1\\)");
      }

      function prepareBack(text) {
        const ps = text.split("\n\n");
        return orbitToAnki(
          [ps[0], ...ps.slice(1).map((s) => `<p class="extra">${s}</p>`)].join(
            "\n",
          ),
        );
      }

      apkg.addCard(
        orbitToAnki(front),
        `${prepareBack(back)}
<br /><br />
<span style="font-size: 80%; opacity: 60%">(${sourceString})</span>`,
      );
    }
  }
  const ankiData = await apkg.save();
  return { data: ankiData, filename: `${sourceLabel}.apkg` };
}

const urls = {};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.body) {
    const result = await prepareAnkiDeck(req.body);
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
async function resolveAttachments(text, baseURI, apkg) {
  let urls = [];
  const resolvedText = text.replace(/<img src="(.+?)"/, (_, url) => {
    const resolvedURL = new URL(url, baseURI).href;
    urls.push(resolvedURL);
    return `<img src="${attachmentIDForURL(resolvedURL)}"`;
  });
  for (const url of urls) {
    console.log(`Fetching image at ${url}`);
    const response = await fetch(url);
    apkg.addMedia(attachmentIDForURL(url), await response.arrayBuffer());
  }
  return resolvedText;
}

//copy pasta from generateOrbitIDForString
let _orbitPrototypeNamespaceUUID = null;

function attachmentIDForURL(url) {
  if (!_orbitPrototypeNamespaceUUID) {
    _orbitPrototypeNamespaceUUID = uuidParse(
      "432a94d7-56d3-4d17-adbd-685c97b5c67a",
    );
  }
  const extension = url.match(/\.(\w{1,})$/)[1];
  return `${uuidV5(url, _orbitPrototypeNamespaceUUID)}.${extension}`;
}
