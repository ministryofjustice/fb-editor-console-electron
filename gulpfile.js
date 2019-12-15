require('@ministryofjustice/module-alias/register')

const gulp = require('gulp')

const {
  buildFontsClean,
  buildFonts,
  buildFontsWatch,
  buildImagesClean,
  buildImages,
  buildImagesWatch,
  buildCssClean,
  buildCss,
  buildCssWatch
} = require('~/src/gulp')

gulp
  .task('build:fonts:clean', buildFontsClean)

gulp
  .task('build:fonts', gulp.series('build:fonts:clean', buildFonts))

gulp
  .task('build:fonts:watch', gulp.series('build:fonts', buildFontsWatch))

gulp
  .task('build:images:clean', buildImagesClean)

gulp
  .task('build:images', gulp.series('build:images:clean', buildImages))

gulp
  .task('build:images:watch', gulp.series('build:images', buildImagesWatch))

gulp
  .task('build:css:clean', buildCssClean)

gulp
  .task('build:css', gulp.series('build:css:clean', buildCss))

gulp
  .task('build:css:watch', gulp.series('build:css', buildCssWatch))

gulp
  .task('build:clean', gulp.series('build:fonts:clean', 'build:images:clean', 'build:css:clean'))

gulp
  .task('build', gulp.series('build:fonts', 'build:images', 'build:css'))

gulp
  .task('build:watch', gulp.parallel('build:fonts:watch', 'build:images:watch', 'build:css:watch'))
