const { override, addBabelPreset, addBabelPlugin } = require("customize-cra");

/* Generate a Reactified index.html for each page of the books we're augmenting. */
const shapeUpChapters = ["1.1-chapter-02", "1.2-chapter-03"];
const IMSChapters = ["foundations-mathematical"];
const BRChapters = [
  "more-is-different-for-ai",
  "future-ml-systems-will-be-qualitatively-different",
  "thought-experiments-provide-a-third-anchor",
];
const DAChapters = ["Motivation"];
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
  ...BRChapters.map((c) => ({
    entry: "src/index.tsx",
    template: `public/sh/br/${c}/index.html`,
    outPath: `/sh/${c}/index.html`,
  })),
  ...DAChapters.map((c) => ({
    entry: "src/index.tsx",
    template: `public/sh/da/${c}.html`,
    outPath: `/sh/da/${c}.html`,
  })),
]);
const overrides = override(
  addBabelPreset("@emotion/babel-preset-css-prop"),
  // addBabelPlugin("babel-plugin-add-import-extension"),
  multipleEntry.addMultiEntry,
);

/* Hypothes.is prompts are resolved based on article DOM structure; we don't want any minification interfering with that. */
module.exports = (webpackConfig, env, args) => {
  webpackConfig = overrides(webpackConfig, env, args);

  // HACK: make Webpack willing to resolve Node-style resolutions (i.e. without extensions) in packages
  webpackConfig.module.rules[1].oneOf[4].resolve = { fullySpecified: false };
  // console.dir(webpackConfig.module.rules[1].oneOf);
  // process.exit(0);

  for (const plugin of webpackConfig.plugins) {
    if (plugin.constructor.name === "HtmlWebpackPlugin") {
      plugin.userOptions.minify = false;
    }
  }
  webpackConfig.optimization.minimize = false;
  webpackConfig.optimization.minimizer = [];
  return webpackConfig;
};
