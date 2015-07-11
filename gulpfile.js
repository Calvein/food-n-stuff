var gulp = require('gulp')
var gutil = require('gulp-util')
var duration = require('gulp-duration')
var source = require('vinyl-source-stream')
var streamify = require('gulp-streamify')
var http = require('http')
var connect = require('connect')
var serveStatic = require('serve-static')
var lr = require('tiny-lr')
var growl = require('growl')

// Script
var watchify = require('watchify')
var browserify = require('browserify')
var babelify = require('babelify')
var uglify = require('gulp-uglify')
// Template
var jade = require('gulp-jade')
// Style
var stylus = require('gulp-stylus')


var port = 8080
var portLr = 35729
var env = gutil.env.prod ? 'prod' : 'dev'
function handleError(err) {
    gutil.log(err)
    growl('Check your terminal.', { title: 'Gulp error' })
}

/* Files */
var scriptFile = './src/index.js'
var jadeFile = './src/index.jade'
var stylusFile = './src/index.styl'
// For watch
var stylusFiles = [
    stylusFile
  , './src/app/**/*.styl'
]

/* Compile functions */
// Watchify bundle
var bundle = null
function scriptCompile(cb) {
    if (!bundle) {
        bundle = watchify(browserify(scriptFile, {
            debug: env !== 'prod'
            // Required for watchify
          , cache: {}
          , packageCache: {}
          , fullPaths: true
        }))
        .transform(babelify.configure({
            jsxPragma: 'element'
        }))
        .on('update', function() {
            scriptCompile(function() {
                triggerLr('all')
            })
        })
    }

    var stream = bundle.bundle()
        .on('error', handleError)
        .pipe(source('app.js'))
        .pipe(duration('Reloading app'))

    if (env !== 'dev')
        stream = stream.pipe(streamify(uglify()))

    stream.pipe(gulp.dest('./'))
        .on('end', cb || function() {})
}

function templateCompile(cb) {
    var locals = {
        env: env
      , portLr: portLr
    }

    gulp.src(jadeFile)
        .pipe(jade({
            locals: locals
        }))
        .on('error', handleError)
        .pipe(duration('Reloading template'))
        .pipe(gulp.dest('./'))
        .on('end', cb || function() {})
}

function styleCompile(cb) {
    gulp.src(stylusFile)
        .pipe(stylus({ sourcemap: { inline: true }}))
        .on('error', handleError)
        .pipe(duration('Reloading style'))
        .pipe(gulp.dest('./'))
        .on('end', cb || function() {})
}

function triggerLr(type) {
    var query = ''
    if (type === 'all') query = '?files=index.html'
    if (type === 'css') query = '?files=index.css'

    http.get('http://127.0.0.1:' + portLr + '/changed' + query)
}

/* Tasks functions */
function build() {
    scriptCompile(done)
    templateCompile(done)
    styleCompile(done)

    var i = 0
    function done() {
        if (++i < 3) return
        if (env === 'prod') {
            process.exit()
        } else {
            gutil.log('Your app is ready')
        }
    }
}

function serve() {
    var app = connect()
        .use(serveStatic('./'))

    http.createServer(app)
        .listen(port, function(err) {
            gutil.log('Serving app on port', gutil.colors.yellow(port))
        })
}

function watch() {
    // Watch Jade
    gulp.watch(jadeFile, function() {
        templateCompile(function() {
            triggerLr('all')
        })
    })

    // Watch Stylus
    gulp.watch(stylusFiles, function() {
        styleCompile(function() {
            triggerLr('css')
        })
    })

    lr().listen(portLr, function(err) {
        gutil.log('Livereload on port', gutil.colors.yellow(portLr))
    })
}


/* Tasks */
gulp.task('build', function() {
    build()
})

gulp.task('serve', function() {
    watch()
    serve()
})

gulp.task('default', ['build', 'serve'])