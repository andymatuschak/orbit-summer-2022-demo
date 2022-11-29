const path = require("path");
const { override, addBabelPreset } = require("customize-cra");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const overrides = override(
  addBabelPreset("@emotion/babel-preset-css-prop"),
);

module.exports = (webpackConfig, env, args) => {
  webpackConfig = overrides(webpackConfig, env, args);

  // HACK: make Webpack willing to resolve Node-style resolutions (i.e. without extensions) in packages
  webpackConfig.module.rules[1].oneOf[4].resolve = { fullySpecified: false };

  webpackConfig.optimization.splitChunks = {
    cacheGroups: {
      styles: {
        name: "styles",
        type: "css/mini-extract",
        chunks: "all",
        enforce: true,
      },
    },
  }

  webpackConfig.entry = "./src/index.tsx"
  webpackConfig.output.filename = "orbit-proxy-embed.js";
  webpackConfig.output.clean = true

  webpackConfig.plugins = [
    ...webpackConfig.plugins,
    new MiniCssExtractPlugin({
      filename: "orbit-[name].css",
    }),
  ];

  return webpackConfig;
};
