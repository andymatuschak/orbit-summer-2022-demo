import { m } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import { useAuthorSaveDataFeature } from "../hooks/useAuthorSaveDataFeature";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App, { PromptListSpec } from "./App";

type Script = {
  rawAttrs: string;
  childNode: string;
};

type ProxyData = {
  full: string;
  scripts: Script[];
  head: string;
  body: string;
};

const SRC_REGEXP = new RegExp(/src="([^"]*)"/);

function dynamicallyAddScript(content: string) {
  var script = document.createElement("script");
  script.innerHTML = content;

  document.head.appendChild(script);
}

function dynamicallyLoadScript(url: string) {
  var script = document.createElement("script"); // create a script DOM node
  script.src = url; // set its src to the provided URL

  document.head.appendChild(script); // add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
}

export default () => {
  const [flush, setFlush] = useState(false);

  const [data, setData] = useState<ProxyData>();
  useEffect(() => {
    const test = new Function('console.log("===== HELLO FROM SCRIPT")');
    test();
    const getData = async () => {
      const data: ProxyData = await fetch(
        "/api/proxy/https://basecamp.com/shapeup/1.2-chapter-03",
      )
        .then((o) => o.json())
        .catch((e) => {
          return {};
        });
      console.log("return!", data.scripts);
      setData(data);
    };
    getData();
  }, []);

  useEffect(() => {
    if (data?.scripts) {
      for (const script of data.scripts) {
        const { rawAttrs, childNode } = script;
        if (childNode) {
          //   const fn = new Function(childNode);
          //   fn();
          dynamicallyAddScript(childNode);
        }
        if (rawAttrs) {
          console.log(rawAttrs);
          const match = rawAttrs.match(SRC_REGEXP);
          if (match) {
            console.log("match", match);
            fetch(match[1])
              .then((o) => o.text())
              .then((o) => {
                console.log("script src:", o);
                const fn = new Function(o);
                fn();
              })
              .catch((e) => console.warn(e));
            dynamicallyLoadScript(match[1]);
          }
        }
        setFlush(true);
      }
    }
  }, [data]);

  useEffect(() => {
    if (flush) setFlush(false);
  }, [flush]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        border: "1px solid black",
        padding: 2,
      }}
    >
      {/* {!data && <h1>Invalid URL</h1>}
      {!flush && data && (
        <div dangerouslySetInnerHTML={{ __html: data.full }} />
      )} */}
      <div>Orbit!</div>
    </div>
  );
};
