module.exports = (grunt) ->

  # Require all grunt plugins at once
  require('load-grunt-tasks')(grunt)
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-http-server')

  ###
  # tasks
  ###
  grunt.registerTask 'lint',             [ 'coffeelint' ]

  grunt.registerTask 'test-browser',     [ 'coffee:specDist-browser', 'jasmine:spec-browser', 'lint' ]
  grunt.registerTask 'test-node',        [ 'coffee:specDist-node', 'lint' ]
  grunt.registerTask 'test',             [ 'test-node', 'test-browser' ]
  grunt.registerTask 'cov',              [ 'mochacov:cov' ]
  grunt.registerTask 'default',          [ 'test' ]
  grunt.registerTask 'server',           [ 'test', 'clean', 'coffee:dist', 'uglify:dev', 'http-server:dev' ]

  grunt.registerTask 'build-browser',    [ 'coffee:dist-browser', 'uglify:dist-browser', 'test-browser' ]
  grunt.registerTask 'build-node',       [ 'coffee:dist-node', 'uglify:dist-node', 'copy:main-node', 'test-node' ]

  grunt.registerTask 'build-dev-node',   [ 'coffee:dist-node', 'uglify:dev-node', 'copy:main-node', 'test-node' ]
  grunt.registerTask 'build-dev-browser',[ 'coffee:dist-browser', 'uglify:dev-browser', 'test-browser' ]

  grunt.registerTask 'build',            [ 'clean', 'build-browser', 'build-node', 'test' ]
  grunt.registerTask 'build-dev',        [ 'clean', 'build-dev-browser', 'build-dev-node', 'test' ]

  ###
  # config
  ###
  grunt.initConfig

    copy:
      "main-node":
        files: [
          {expand: true, flatten: true, src: ['dist/openfire-node.js'], dest: 'openfire-client/', filter: 'isFile'},
        ]

    jasmine: {
      "spec-browser": {
        src: 'dist/openfire.js',
        options: {
          specs: 'dist/spec-browser.js',
          helpers: 'spec/*Helper.js'
        }
      }
    }

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

            runInBackground:yes

        }

    }

    # Watch for file changes.
    watch:
      lib:
        files : [ '**/*.coffee' ]
        tasks : [ 'clean', 'coffee:dist', 'uglify:dev' ]
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

      "specDist-browser":
        files:
          'dist/spec-browser.js' : 'spec/browser_js_only/*.coffee'

      "specDist-node":
        files:
          'dist/spec-node.js' : 'spec/node_only/*.coffee'

      "dist-browser":
        files:
          'dist/coffee_concat.js' : ['src/*.coffee', 'src/queues/*.coffee', 'src/browser_js_only/*.coffee']

      "dist-node":
        files:
          'dist/coffee_concat.js' : ['src/other/node_header.coffee', 'src/*.coffee', 'src/queues/*.coffee', 'src/node_only/*.coffee']

    uglify: {
      "dev-browser": {
        options: {
          compress: {
            global_defs: {
              "DEBUG": true
            },
            dead_code: false
          }
          beautify: on
          mangle: off
        },
        files: {
          'dist/openfire.js': ['dist/coffee_concat.js', 'src/browser_js_only/*.js']
        }
      }
      "dist-browser": {
        options: {
          compress: {
            global_defs: {
              "DEBUG": false
            },
            dead_code: true
          }
          mangle: on
        },
        files: {
          'dist/openfire.js': ['dist/coffee_concat.js', 'src/browser_js_only/*.js']
        }
      }
      "dev-node": {
        options: {
          compress: {
            global_defs: {
              "DEBUG": true
            },
            dead_code: false
          }
          beautify: on
          mangle: off
        },
        files: {
          'dist/openfire-node.js': ['dist/coffee_concat.js', 'src/node_only/*.js']
        }
      }
      "dist-node": {
        options: {
          compress: {
            global_defs: {
              "DEBUG": false
            },
            dead_code: true
          }
          mangle: on
        },
        files: {
          'dist/openfire-node.js': ['dist/coffee_concat.js', 'src/node_only/*.js']
        }
      }
    }
