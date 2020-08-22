module.exports = {
  mode: "production",
  entry: "./src/assets/js/app.js",
  output: {
    path: `${__dirname}/dist`,
    filename: "bundle.min.js",
  },
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.(woff|woff2)$/,
        loaders: ["url-loader"],
      },
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: ["babel-loader", "eslint-loader"],
      },
    ],
  },
  resolve: {
    extensions: ["*", ".js"],
  },
};
