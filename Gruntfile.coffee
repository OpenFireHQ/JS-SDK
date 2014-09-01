module.exports = (grunt) ->

  # Require all grunt plugins at once
  require('load-grunt-tasks')(grunt)
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-http-server')

  ###
  # tasks
  ###
  grunt.registerTask 'lint',    [ 'coffeelint' ]
  grunt.registerTask 'test',    [ 'mochacov:spec', 'lint' ]
  grunt.registerTask 'cov',     [ 'mochacov:cov' ]
  grunt.registerTask 'default', [ 'test' ]
  grunt.registerTask 'build',   [ 'test', 'clean', 'coffee:dist', 'uglify:dist' ]

  ###
  # config
  ###
  grunt.initConfig

    # Tests and coverage tests
    # When running cov you will need to pipe your output
    mochacov :
      travis :
        options : coveralls : serviceName : 'travis-ci'
      spec :
        options : reporter : 'spec'
      cov  :
        options : reporter : 'html-cov'
      options :
        compilers : [ 'coffee:coffee-script/register' ]
        files     : [ 'test/**/*.spec.coffee' ]
        require   : [ 'should' ]
        growl     : true
        ui        : 'tdd'
        bail      : true # Fail fast

    # Lint our coffee files
    # Linting is unobtrusive. If linting errors happen then they wont break the process
    coffeelint:
      options:
        force: true # Display lint errors as warnings. Do not break.
        configFile: 'coffeelint.json'
      files: [ 'test/**/*.coffee', 'src/**/*.coffee' ]

    'http-server': {

        'dev': {

            # the server root directory
            root: './',

            port: 8282,

            host: "127.0.0.1",

            showDir : true,
            autoIndex: true,
            defaultExt: "html",

            runInBackground:false

        }

    }


    # Watch for file changes.
    watch:
      lib:
        files : [ '**/*.coffee' ]
        tasks : [ 'test', 'clean', 'coffee:dist', 'uglify:dist' ]
        options : nospawn : true

    # Clear the contents of a directory
    clean: ['dist']

    # Bump the version and build the tags
    bump:
      options:
        files  : [ 'package.json' ]
        commit : false
        push   : false

    # Deal with coffeescript concatenation and compiling
    coffee:
      options: join: true
      dist:
        files:
          'dist/coffee_concat.js' : 'src/**/*.coffee'

    uglify: {
      dist: {
        options: {
          compress: off
          beautify: on
          mangle: off
        },
        files: {
          'dist/openfire.js': ['src/**/*.js', 'dist/coffee_concat.js']
        }
      }
    }
