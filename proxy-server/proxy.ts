import express, { Express, Request, Response } from "express";
import fetch from "node-fetch";
import { parse } from "node-html-parser";
import { PROMPT_LIST_EMBED_PATHS } from "./constants";

const port = process.env.PORT || 3001;
const BASE_URL = (process.env.BASE_URL || "http://localhost:") + port;
const USE_LOCAL_REACT_APP = process.env.USE_LOCAL_REACT_APP;
const EMBED_PREFIX = USE_LOCAL_REACT_APP ? "http://localhost:3000" : "";

// test

const PROXY_PREFIX = "proxy";
const PROXY_ROUTE = "html";
const ASSET_PROXY_ROUTE = "asset";

// ====[TODO] in .env and supplied to app build
const REACT_APP_FILE_NAME = "orbit-proxy-embed.js";
const REACT_APP_STYLES_FILE_NAME = "orbit-styles.css";
const ORBIT_WEB_COMPONENT_FILE_NAME = "orbit-web-component.js";
const REACT_APP_ROOT_ID = "proxy-root";

const scripts = `
      <script defer src="${EMBED_PREFIX}/${REACT_APP_FILE_NAME}"></script>
      <script type="module" src="${EMBED_PREFIX}/${ORBIT_WEB_COMPONENT_FILE_NAME}"></script>
      <link href="${EMBED_PREFIX}/${REACT_APP_STYLES_FILE_NAME}" rel="stylesheet">
    `;

const appDiv = `<div id="${REACT_APP_ROOT_ID}"></div>`;

type ResponseData = any;

const app: Express = express();

const relativeCssURLPattern = new RegExp(/url\(\//, "g");
const cssURLPattern = new RegExp(/url\(/, "g");

const convertCssURLS = (css: string, proxiedURL: string) =>
  css
    .replace(relativeCssURLPattern, ` url(${proxiedURL}/`)
    .replace(
      cssURLPattern,
      ` url(${BASE_URL}/${PROXY_PREFIX}/${ASSET_PROXY_ROUTE}/`,
    );

const convertURLsOnHTMLPage = (html: string, proxiedURL: string) => {
  const parsedHTML = parse(html);

  const anchorTags = parsedHTML.querySelectorAll("a");
  for (const anchorTag of anchorTags) {
    // always convert relative urls to absolute
    if (anchorTag.attributes.href?.charAt(0) === "/") {
      anchorTag.setAttribute(
        "href",
        `${proxiedURL}${anchorTag.attributes.href}`,
      );
    }
    anchorTag.setAttribute(
      "href",
      `${BASE_URL}/${PROXY_PREFIX}/${PROXY_ROUTE}/${anchorTag.attributes.href}`,
    );
  }

  const scriptTags = parsedHTML.querySelectorAll("script");
  for (const scriptTag of scriptTags.filter((o) => o.attributes.src)) {
    if (scriptTag.attributes.src?.charAt(0) === "/") {
      scriptTag.setAttribute("src", `${proxiedURL}${scriptTag.attributes.src}`);
    }
    scriptTag.setAttribute(
      "src",
      `${BASE_URL}/${PROXY_PREFIX}/${ASSET_PROXY_ROUTE}/${scriptTag.attributes.src}`,
    );
  }

  const imgTags = parsedHTML.querySelectorAll("img");
  for (const imgTag of imgTags) {
    if (imgTag.attributes.src?.charAt(0) === "/") {
      imgTag.setAttribute("src", `${proxiedURL}${imgTag.attributes.src}`);
    }
    imgTag.setAttribute(
      "src",
      `${BASE_URL}/${PROXY_PREFIX}/${ASSET_PROXY_ROUTE}/${imgTag.attributes.src}`,
    );
  }

  const linkTags = parsedHTML.querySelectorAll("link");
  for (const linkTag of linkTags.filter(
    (o) => o.attributes.rel === "stylesheet",
  )) {
    if (linkTag.attributes.href?.charAt(0) === "/") {
      linkTag.setAttribute("href", `${proxiedURL}${linkTag.attributes.href}`);
    }
    linkTag.setAttribute(
      "href",
      `${BASE_URL}/${PROXY_PREFIX}/${ASSET_PROXY_ROUTE}/${linkTag.attributes.href}`,
    );
  }

  return parsedHTML;
};

app.get(`/${PROXY_ROUTE}/*`, async (req: Request, res: Response) => {
  const reqURL = req.params[0];
  if (!reqURL)
    return res
      .status(400)
      .json({ message: "A valid url is required for proxy" });

  try {
    const searchParams = new URLSearchParams(
      req.query as Record<string, string>,
    );
    const urlResponse = await fetch(reqURL + "?" + searchParams);
    const contentType = urlResponse.headers.get("Content-Type");
    if (contentType && contentType.indexOf("text/html") < 0)
      return res.status(302).json({ message: "Unsupported proxy content" });

    const data: ResponseData = await urlResponse.text();
    const url = new URL(reqURL);
    const convertedParsedHTML = convertURLsOnHTMLPage(data, url.origin);
    const promptLists = PROMPT_LIST_EMBED_PATHS[reqURL];

    if (promptLists) {
      promptLists.forEach(({ before, cssSelector, promptListID }) => {
        const node = convertedParsedHTML.querySelector(cssSelector);
        if (node) {
          node.insertAdjacentHTML(
            before ? "beforebegin" : "afterend",
            `<div id="${promptListID}" />`,
          );
        }
      });
    }

    let finalHTML = convertedParsedHTML.toString();
    finalHTML += scripts;
    finalHTML += appDiv;

    return res.status(200).send(finalHTML);
  } catch (e) {
    return res.status(500).json({ message: "Error: " + e });
  }
});

app.get(`/${ASSET_PROXY_ROUTE}/*`, async (req: Request, res: Response) => {
  const reqURL = req.params[0];
  if (!reqURL)
    return res
      .status(400)
      .json({ message: "A valid url is required for asset proxy" });

  try {
    const searchParams = new URLSearchParams(
      req.query as Record<string, string>,
    );
    const urlResponse = await fetch(reqURL + "?" + searchParams);
    const contentType = urlResponse.headers.get("Content-Type");
    if (!contentType)
      return res.status(400).json({ message: "Unsupported mime type" });

    let data: ResponseData;

    if (contentType.indexOf("text") >= 0) {
      data = await urlResponse.text();
      const url = new URL(reqURL);
      const convertedParsedHTML = convertURLsOnHTMLPage(data, url.origin);
      data = convertCssURLS(convertedParsedHTML.toString(), url.origin);
    } else {
      data = await urlResponse.buffer();
    }

    res.setHeader("content-type", contentType);
    return res.status(200).send(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Error: " + e });
  }
});

export default app;
