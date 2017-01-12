var path = require('path');

module.exports = {
  entry: './test/build/index.js',
  output: {
    path: __dirname + "/build",
    filename: "coverage.js",
    devtoolModuleFilenameTemplate: '[resource-path]'
  },
  bail: true,
  devtool: 'source-map',
  module: {
    noParse: [/xterm\.js/],  // Xterm ships a UMD module
    loaders: [
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.md$/, loader: 'raw-loader'},
      { test: /\.html$/, loader: 'file-loader?name=[name].[ext]' },
      { test: /\.ipynb$/, loader: 'json-loader' },
      { test: /\.json$/, loader: 'json-loader' },
    ],
    preLoaders: [
      // instrument only testing sources with Istanbul
      {
        test: /\.js$/,
        include: path.resolve('lib/'),
        loader: 'istanbul-instrumenter'
      }
    ]
  }
}
