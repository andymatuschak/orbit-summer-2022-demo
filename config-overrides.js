const { override, addBabelPreset } = require("customize-cra");

/* Generate a Reactified index.html for each page of the books we're augmenting. */
const shapeUpChapters = ["1.1-chapter-02", "1.2-chapter-03"];
const IMSChapters = ["foundations-randomization"];
const multipleEntry = require("react-app-rewire-multiple-entry")([
  ...shapeUpChapters.map((c) => ({
    entry: "src/index.tsx",
    template: `public/shape-up/shapeup/${c}/index.html`,
    outPath: `/shape-up/shapeup/${c}/index.html`,
  })),
  ...IMSChapters.map((c) => ({
    entry: "src/index.tsx",
    template: `public/ims/${c}.html`,
    outPath: `/ims/${c}.html`,
  })),
]);
const overrides = override(
  addBabelPreset("@emotion/babel-preset-css-prop"),
  multipleEntry.addMultiEntry,
);

/* Hypothes.is prompts are resolved based on article DOM structure; we don't want any minification interfering with that. */
module.exports = (webpackConfig, env, args) => {
  webpackConfig = overrides(webpackConfig, env, args);
  for (const plugin of webpackConfig.plugins) {
    if (plugin.constructor.name === "HtmlWebpackPlugin") {
      plugin.userOptions.minify = false;
    }
  }
  webpackConfig.optimization.minimize = false;
  return webpackConfig;
};
