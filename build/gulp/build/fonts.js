const path = require('path')
const gulp = require('gulp')
const debug = require('gulp-debug')
const vinylPaths = require('vinyl-paths')
const del = require('del')

const {
  currentDir,
  sourcePath,
  targetPath,
  assetsPath
} = require('~/build/paths')

const handleWatchError = require('~/build/gulp/handle-watch-error')

const buildSourcePath = path.relative(currentDir, sourcePath)
const buildTargetPath = path.relative(currentDir, targetPath)
const buildAssetsPath = path.relative(currentDir, assetsPath)

const fontsClean = () =>
  gulp.src(`${buildTargetPath}/fonts/*`, { read: false })
    .pipe(vinylPaths((paths) => del(paths, { force: true })))

const fonts = () =>
  gulp.src([`${buildSourcePath}/fonts/**/*.*`, `${buildAssetsPath}/fonts/**/*.*`])
    .pipe(gulp.dest(`${buildTargetPath}/fonts`))
    .pipe(debug({ title: 'Fonts' }))

const fontsWatch = () =>
  gulp.watch(
    [
      `${buildSourcePath}/fonts/**/*.*`,
      `${buildAssetsPath}/fonts/**/*`
    ],
    {
      name: 'fonts-watch',
      cwd: currentDir
    },
    gulp.series(fontsClean, fonts)
  )
    .on('error', handleWatchError)

module.exports = {
  fontsClean,
  fonts,
  fontsWatch
}
