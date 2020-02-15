const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const {
  EnvironmentPlugin
} = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')

const {
  sourcePath,
  targetPath
} = require('./build/paths')

const buildSourcePath = path.join(sourcePath, 'js/app.js')
const buildTargetPath = path.join(targetPath, 'javascripts')

const { version } = require('./package')

module.exports = () => ({
  mode: 'production',
  entry: {
    app: buildSourcePath
  },
  output: {
    path: buildTargetPath,
    filename: `[name]-${version}.js`
  },
  stats: {
    colors: true
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        use: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  },
  plugins: [
    new CleanWebpackPlugin({
      verbose: false,
      cleanOnceBeforeBuildPatterns: [
        buildTargetPath.concat('/*.js'),
        buildTargetPath.concat('/*.js.map')
      ]
    }),
    new EnvironmentPlugin({ NODE_ENV: 'production' })
  ]
})
