const path = require('path')
const gulp = require('gulp')
const sass = require('gulp-sass')
const debug = require('gulp-debug')
const rename = require('gulp-rename')
const postCss = require('gulp-postcss')
const normalize = require('postcss-normalize')
const scss = require('postcss-scss')
const autoprefixer = require('autoprefixer')
const nano = require('cssnano')
const cleanCss = require('gulp-clean-css')
const cssPurge = require('gulp-css-purge')
const sourcemaps = require('gulp-sourcemaps')

const {
  version
} = require('~/package')

const {
  currentDir,
  sourcePath,
  targetPath
} = require('~/build/paths')

const buildSourcePath = path.relative(currentDir, sourcePath)
const buildTargetPath = path.relative(currentDir, targetPath)

const getTransformForSass = () => (
  sass({
    outputStyle: 'nested',
    includePaths: [
      'node_modules'
    ]
  }).on('error', sass.logError)
)

const getTransformForPostCss = () => (
  postCss([
    normalize(),
    autoprefixer(),
    nano()
  ], { syntax: scss })
)

const getTransformForCleanCss = () => (
  cleanCss({
    format: 'beautify',
    compatibility: 'ie9',
    specialComments: 0
  })
)

const getTransformForCssPurge = () => (
  cssPurge({
    trim: false, // we have chosen to beautify not minify in cleanCSS, so let's not minify here
    trim_last_semicolon: true, // cleanCSS does this for us; cssPurge puts it back (unless we prevent it, here)
    shorten: false, // 'true' kills some inline `<svg />` elements
    format: false,
    verbose: false
  })
)

const cssFromSass = () => (
  gulp.src([`${buildSourcePath}/sass/**/*.*`, `!${buildSourcePath}/sass/**/_*.*`])
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(rename((filePath) => { filePath.basename += `-${version}` }))
    .pipe(getTransformForSass())
    .pipe(getTransformForPostCss())
    .pipe(getTransformForCleanCss())
    .pipe(getTransformForCssPurge())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${buildTargetPath}/stylesheets`))
    .pipe(debug({ title: 'CSS' }))
)

module.exports = cssFromSass
