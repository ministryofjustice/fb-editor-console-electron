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
} = require('~/src/paths')

const handleWatchError = require('./handle-watch-error')

const cssFromSass = require('./build/css-from-sass')

const buildSourcePath = path.relative(currentDir, sourcePath)
const buildTargetPath = path.relative(currentDir, targetPath)
const buildAssetsPath = path.relative(currentDir, assetsPath)

const buildFontsClean = () =>
  gulp.src(`${buildTargetPath}/fonts/*`, {read: false})
    .pipe(vinylPaths((paths) => del(paths, {force: true})))

const buildFonts = () =>
  gulp.src([`${buildSourcePath}/fonts/**/*.*`, `${buildAssetsPath}/fonts/**/*.*`])
    .pipe(gulp.dest(`${buildTargetPath}/fonts`))
    .pipe(debug({title: 'Fonts'}))

const buildFontsWatch = () =>
  gulp.watch([`${buildSourcePath}/fonts/**/*.*`, `${buildAssetsPath}/fonts/**/*`], {name: 'build-fonts-watch', cwd: currentDir}, gulp.series(buildFontsClean, buildFonts))
    .on('error', handleWatchError)

const buildImagesClean = () =>
  gulp.src(`${buildTargetPath}/images/*`, {read: false})
    .pipe(vinylPaths((paths) => del(paths, {force: true})))

const buildImages = () =>
  gulp.src([`${buildSourcePath}/images/**/*.*`, `${buildAssetsPath}/images/**/*.*`])
    .pipe(gulp.dest(`${buildTargetPath}/images`))
    .pipe(debug({title: 'Images'}))

const buildImagesWatch = () =>
  gulp.watch([`${buildSourcePath}/images/**/*.*`, `${buildAssetsPath}/images/**/*`], {name: 'build-images-watch', cwd: currentDir}, gulp.series(buildImagesClean, buildImages))
    .on('error', handleWatchError)

const buildCssClean = () =>
  gulp.src(`${buildTargetPath}/stylesheets/*`, {read: false})
    .pipe(vinylPaths((paths) => del(paths, {force: true})))

const buildCss = gulp.series(cssFromSass) // , cssForHello)

const buildCssWatch = () =>
  gulp.watch(
    [
      `${buildSourcePath}/sass/**/*`,
      `${buildAssetsPath}/fonts/**/*`,
      `${buildAssetsPath}/images/**/*`
    ],
    {
      name: 'build-css-watch',
      cwd: currentDir
    },
    gulp.series(buildCssClean, buildCss)
  )
    .on('error', handleWatchError)

module.exports = {
  buildFontsClean,
  buildFonts,
  buildFontsWatch,
  buildImagesClean,
  buildImages,
  buildImagesWatch,
  buildCssClean,
  buildCss,
  buildCssWatch
}
