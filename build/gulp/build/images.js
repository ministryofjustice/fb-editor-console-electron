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

const imagesClean = () =>
  gulp.src(`${buildTargetPath}/images/*`, { read: false })
    .pipe(vinylPaths((paths) => del(paths, { force: true })))

const images = () =>
  gulp.src([`${buildSourcePath}/images/**/*.*`, `${buildAssetsPath}/images/**/*.*`])
    .pipe(gulp.dest(`${buildTargetPath}/images`))
    .pipe(debug({ title: 'Images' }))

const imagesWatch = () =>
  gulp.watch(
    [
      `${buildSourcePath}/images/**/*.*`,
      `${buildAssetsPath}/images/**/*`
    ],
    {
      name: 'images-watch',
      cwd: currentDir
    },
    gulp.series(imagesClean, images)
  )
    .on('error', handleWatchError)

module.exports = {
  imagesClean,
  images,
  imagesWatch
}
