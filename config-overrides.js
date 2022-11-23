const { override, addBabelPreset } = require("customize-cra");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const multipleEntry = require("react-app-rewire-multiple-entry")([
  {
    entry: "src/index.tsx",
    template: `public/proxy.html`,
    outPath: `/proxy.html`,
  },
]);
const overrides = override(
  addBabelPreset("@emotion/babel-preset-css-prop"),
  multipleEntry.addMultiEntry,
);

/* Hypothes.is prompts are resolved based on article DOM structure; we don't want any minification interfering with that. */
module.exports = (webpackConfig, env, args) => {
  webpackConfig = overrides(webpackConfig, env, args);

  // HACK: make Webpack willing to resolve Node-style resolutions (i.e. without extensions) in packages
  webpackConfig.module.rules[1].oneOf[4].resolve = { fullySpecified: false };

  // HACK: Add HTML5 doctype to documents which don't have it (Notion exports!)
  // webpackConfig.module.rules.push({
  //   test: /\.html$/i,
  //   loader: "html-loader",
  //   options: {
  //     sources: false,
  //     minimize: false,
  //     preprocessor: (content) => {
  //       if (!content.startsWith("<!DOCTYPE html>")) {
  //         return `<!DOCTYPE html>\n${content}`;
  //       } else {
  //         return content;
  //       }
  //     },
  //   },
  // });

  for (const plugin of webpackConfig.plugins) {
    if (plugin.constructor.name === "HtmlWebpackPlugin") {
      plugin.userOptions.minify = false;
    }
  }
  webpackConfig.optimization.minimize = false;
  webpackConfig.optimization.minimizer = [];

  webpackConfig.mode = "development";
  webpackConfig.entry = { main: "./src/index.tsx" };
  webpackConfig.output.path = path.resolve(
    __dirname,
    "../orbit-proxy-server/public",
  );

  // TODO: optimize chunking
  // webpackConfig.optimization.runtimeChunk = "single";
  webpackConfig.output.filename = "orbit-proxy-embed.js";
  // webpackConfig.output.chunkFilename = "[name]-orbit-proxy-embed.chunk.js";
  webpackConfig.plugins = [
    ...webpackConfig.plugins,
    new MiniCssExtractPlugin({
      filename: "orbit-proxy-embed.css",
      chunkFilename: "orbit-proxy-embed.chunk.css",
    }),
  ];

  return webpackConfig;
};
