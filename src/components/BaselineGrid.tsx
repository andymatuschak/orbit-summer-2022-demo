import * as React from "react";
import { ReactNode } from "react";
import BaselineGrid from "../static/images/BaselineGrid.svg";

// Wrap components with this to debug grid layout.

export default function WithBaselineGrid({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div css={{ position: "relative" }}>
      {enabled && (
        <div
          css={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundImage: `url(${BaselineGrid})`,
            backgroundSize: "4px 4px",
            opacity: 0.5,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        ></div>
      )}
      {children}
    </div>
  );
}
