const path = require('path')
const gulp = require('gulp')
const vinylPaths = require('vinyl-paths')
const del = require('del')

const {
  currentDir,
  sourcePath,
  targetPath,
  assetsPath
} = require('~/build/paths')

const handleWatchError = require('~/build/gulp/handle-watch-error')

const cssFromSass = require('./css-from-sass')

const buildSourcePath = path.relative(currentDir, sourcePath)
const buildTargetPath = path.relative(currentDir, targetPath)
const buildAssetsPath = path.relative(currentDir, assetsPath)

const cssClean = () =>
  gulp.src(`${buildTargetPath}/stylesheets/*`, { read: false })
    .pipe(vinylPaths((paths) => del(paths, { force: true })))

const css = gulp.series(cssFromSass)

const cssWatch = () =>
  gulp.watch(
    [
      `${buildSourcePath}/sass/**/*`,
      `${buildAssetsPath}/fonts/**/*`,
      `${buildAssetsPath}/images/**/*`
    ],
    {
      name: 'css-watch',
      cwd: currentDir
    },
    gulp.series(cssClean, css)
  )
    .on('error', handleWatchError)

module.exports = {
  cssClean,
  css,
  cssWatch
}
