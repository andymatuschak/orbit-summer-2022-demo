import "./storybook.css";
import "../src/static/styles/index.css";
import WithBaselineGrid from "../src/components/BaselineGrid";
import React from "react";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

export const globalTypes = {
  showBaselineGrid: {
    name: "Baseline grid",
    description: "Enable to show a 4px baseline grid",
    defaultValue: true,
    toolbar: {
      icon: "listunordered",
      // Array of plain string values or MenuItem shape (see below)
      items: [
        { value: false, title: "Baseline grid disabled" },
        { value: true, title: "Baseline grid enabled" },
      ],
      // Property that specifies if the name of the item will be displayed
      showName: true,
      // Change title based on selected value
      // dynamicTitle: true,
    },
  },
};

export const withBaselineGrid = (Story, context) => (
  <WithBaselineGrid enabled={context.globals.showBaselineGrid}>
    <Story {...context} />
  </WithBaselineGrid>
);

export const decorators = [withBaselineGrid];
