const url = cjsRequire('url')

import dompurify from 'dompurify'

import packagejson from './package.json'
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/html',
  'dojo/query',
  'dojo/dom-construct',
  'dojo/keys',
  'dojo/Deferred',
  'dojo/DeferredList',
  'dojo/topic',
  'dojo/aspect',
  'dojo/request',
  'dojo/io-query',
  'JBrowse/has',
  'dojo/_base/array',
  'dijit/layout/ContentPane',
  'dijit/layout/BorderContainer',
  'dijit/Dialog',
  'dijit/form/ComboBox',
  'dojo/store/Memory',
  'dijit/form/Button',
  'dijit/form/Select',
  'dijit/form/ToggleButton',
  'dijit/form/DropDownButton',
  'dijit/DropDownMenu',
  'dijit/CheckedMenuItem',
  'dijit/MenuItem',
  'dijit/MenuSeparator',
  'dojox/form/TriStateCheckBox',
  'dojox/html/entities',
  'JBrowse/Util',
  'JBrowse/Store/LazyTrie',
  'JBrowse/Store/Names/LazyTrieDojoData',
  'dojo/store/DataStore',
  'JBrowse/FeatureFiltererMixin',
  'JBrowse/GenomeView',
  'JBrowse/TouchScreenSupport',
  'JBrowse/ConfigManager',
  'JBrowse/View/InfoDialog',
  'JBrowse/View/FileDialog',
  'JBrowse/View/FastaFileDialog',
  'JBrowse/Model/Location',
  'JBrowse/View/LocationChoiceDialog',
  'JBrowse/View/Dialog/SetHighlight',
  'JBrowse/View/Dialog/Preferences',
  'JBrowse/View/Dialog/OpenDirectory',
  'JBrowse/View/Dialog/SetTrackHeight',
  'JBrowse/View/Dialog/QuickHelp',
  'JBrowse/View/StandaloneDatasetList',
  'JBrowse/Store/SeqFeature/ChromSizes',
  'JBrowse/Store/SeqFeature/UnindexedFasta',
  'JBrowse/Store/SeqFeature/IndexedFasta',
  'JBrowse/Store/SeqFeature/BgzipIndexedFasta',
  'JBrowse/Store/SeqFeature/TwoBit',
  'dijit/focus',
  '../lazyload.js', // for dynamic CSS loading

  // extras for webpack
  'dojox/data/CsvStore',
  'dojox/data/JsonRestStore',
], function (
  declare,
  lang,
  on,
  html,
  query,
  domConstruct,
  keys,
  Deferred,
  DeferredList,
  topic,
  aspect,
  request,
  ioQuery,
  has,
  array,
  dijitContentPane,
  dijitBorderContainer,
  dijitDialog,
  dijitComboBox,
  dojoMemoryStore,
  dijitButton,
  dijitSelectBox,
  dijitToggleButton,
  dijitDropDownButton,
  dijitDropDownMenu,
  dijitCheckedMenuItem,
  dijitMenuItem,
  dijitMenuSeparator,
  dojoxTriStateCheckBox,
  dojoxHtmlEntities,
  Util,
  LazyTrie,
  NamesLazyTrieDojoDataStore,
  DojoDataStore,
  FeatureFiltererMixin,
  GenomeView,
  Touch,
  ConfigManager,
  InfoDialog,
  FileDialog,
  FastaFileDialog,
  Location,
  LocationChoiceDialog,
  SetHighlightDialog,
  PreferencesDialog,
  OpenDirectoryDialog,
  SetTrackHeightDialog,
  HelpDialog,
  StandaloneDatasetList,
  ChromSizes,
  UnindexedFasta,
  IndexedFasta,
  BgzipIndexedFasta,
  TwoBit,
  dijitFocus,
  LazyLoad,
) {
  var dojof = Util.dojof

  require.on('error', function (error) {
    let errString =
      error.info && error.info[0] && error.info[0].mid
        ? error.info.map(({ mid }) => mid).join(', ')
        : error
    window.JBrowse.fatalError(`Failed to load resource: ${errString}`)
  })

  /**
   * Construct a new Browser object.
   * @class This class is the main interface between JBrowse and embedders
   * @constructor
   * @param params an object with the following properties:<br>
   * <ul>
   * <li><code>config</code> - list of objects with "url" property that points to a config JSON file</li>
   * <li><code>containerID</code> - ID of the HTML element that contains the browser</li>
   * <li><code>refSeqs</code> - object with "url" property that is the URL to list of reference sequence information items</li>
   * <li><code>browserRoot</code> - (optional) URL prefix for the browser code</li>
   * <li><code>tracks</code> - (optional) comma-delimited string containing initial list of tracks to view</li>
   * <li><code>location</code> - (optional) string describing the initial location</li>
   * <li><code>defaultTracks</code> - (optional) comma-delimited string containing initial list of tracks to view if there are no cookies and no "tracks" parameter</li>
   * <li><code>defaultLocation</code> - (optional) string describing the initial location if there are no cookies and no "location" parameter</li>
   * <li><code>show_nav</code> - (optional) string describing the on/off state of navigation box</li>
   * <li><code>show_tracklist</code> - (optional) string describing the on/off state of track bar</li>
   * <li><code>show_overview</code> - (optional) string describing the on/off state of overview</li>
   * </ul>
   */

  return declare(FeatureFiltererMixin, {
    constructor: function (params) {
      this.globalKeyboardShortcuts = {}

      this.config = params || {}

      // if we're in the unit tests, stop here and don't do any more initialization
      if (this.config.unitTestMode) {
        return
      }

      // hook for externally applied initialization that can be setup in index.html
      if (typeof this.config.initExtra === 'function') {
        this.config.initExtra(this, params)
      }

      this.startTime = new Date()

      // start the initialization process
      var thisB = this

      dojo.addOnLoad(function () {
        if (Util.isElectron() && !thisB.config.dataRoot) {
          dojo.addClass(document.body, 'jbrowse')
          dojo.addClass(document.body, thisB.config.theme || 'tundra')
          thisB.welcomeScreen(document.body)
          return
        }
        thisB.loadConfig().then(function () {
          thisB.container = dojo.byId(thisB.config.containerID)
          thisB.container.onselectstart = function () {
            return false
          }

          // initialize our highlight if one was set in the config
          if (
            thisB.config.initialHighlight &&
            thisB.config.initialHighlight != '/'
          ) {
            thisB.setHighlight(new Location(thisB.config.initialHighlight))
          }

          thisB.initPlugins().then(function () {
            thisB.loadNames()
            thisB.loadUserCSS().then(function () {
              thisB.initTrackMetadata()
              thisB.loadRefSeqs().then(function () {
                // figure out our initial location
                var initialLocString = thisB._initialLocation()
                var initialLoc = Util.parseLocString(initialLocString)
                if (
                  initialLoc &&
                  initialLoc.ref &&
                  thisB.allRefs[initialLoc.ref]
                ) {
                  thisB.refSeq = thisB.allRefs[initialLoc.ref]
                }

                // before we init the view, make sure that our container has nonzero height and width
                thisB.ensureNonzeroContainerDimensions()

                thisB.initView().then(function () {
                  Touch.loadTouch() // init touch device support
                  if (initialLocString) {
                    thisB.navigateTo(initialLocString, true)
                  }

                  // figure out what initial track list we will use:
                  var tracksToShow = []
                  // always add alwaysOnTracks, regardless of any other track params
                  if (thisB.config.alwaysOnTracks) {
                    tracksToShow = tracksToShow.concat(
                      thisB.config.alwaysOnTracks.split(','),
                    )
                  }
                  // add tracks specified in URL track param,
                  //    if no URL track param then add last viewed tracks via tracks cookie
                  //    if no URL param and no tracks cookie, then use defaultTracks
                  if (thisB.config.forceTracks) {
                    tracksToShow = tracksToShow.concat(
                      thisB.config.forceTracks.split(','),
                    )
                  } else if (thisB.cookie('tracks')) {
                    tracksToShow = tracksToShow.concat(
                      thisB.cookie('tracks').split(','),
                    )
                  } else if (thisB.config.defaultTracks) {
                    // In rare cases thisB.config.defaultTracks already contained an array that appeared to
                    // have been split in a previous invocation of this function. Thus, we only try and split
                    // it if it isn't already split.
                    if (!(thisB.config.defaultTracks instanceof Array)) {
                      tracksToShow = tracksToShow.concat(
                        thisB.config.defaultTracks.split(','),
                      )
                    }
                  }
                  // currently, force "DNA" _only_ if no other guides as to what to show?
                  //    or should this be changed to always force DNA to show?
                  if (tracksToShow.length == 0) {
                    tracksToShow.push('DNA')
                  }
                  // eliminate track duplicates (may have specified in both alwaysOnTracks and defaultTracks)
                  tracksToShow = Util.uniq(tracksToShow)
                  thisB.showTracks(tracksToShow)

                  thisB.passMilestone('completely initialized', {
                    success: true,
                  })
                })
                thisB.reportUsageStats()
              })
            })
          })
        })
      })
    },

    _initialLocation: function () {
      var oldLocMap = dojo.fromJson(this.cookie('location')) || {}
      if (this.config.location) {
        return this.config.location
      } else if (oldLocMap[this.refSeq.name]) {
        return oldLocMap[this.refSeq.name].l || oldLocMap[this.refSeq.name]
      } else if (this.config.defaultLocation) {
        return this.config.defaultLocation
      } else {
        return Util.assembleLocString({
          ref: this.refSeq.name,
          start: 0.4 * (this.refSeq.start + this.refSeq.end),
          end: 0.6 * (this.refSeq.start + this.refSeq.end),
        })
      }
    },

    version: function () {
      // when a build is put together, the build system assigns a string
      // to the variable below.
      return packagejson.version
    }.call(),

    /**
     * Get a plugin, if it is present.  Note that, if plugin
     * initialization is not yet complete, it may be a while before the
     * callback is called.
     *
     * Callback is called with one parameter, the desired plugin object,
     * or undefined if it does not exist.
     */
    getPlugin: function (name, callback) {
      this.afterMilestone(
        'initPlugins',
        dojo.hitch(this, function () {
          callback(this.plugins[name])
        }),
      )
    },

    _corePlugins: function () {
      return ['RegexSequenceSearch']
    },

    /**
     * Load and instantiate any plugins defined in the configuration.
     */
    initPlugins: function () {
      return this._milestoneFunction('initPlugins', function (deferred) {
        this.plugins = {}

        var plugins = this.config.plugins || this.config.Plugins || {}

        // coerce plugins to array of objects
        if (!lang.isArray(plugins) && !plugins.name) {
          // plugins like  { Foo: {...}, Bar: {...} }
          plugins = function () {
            var newplugins = []
            for (var pname in plugins) {
              if (
                lang.isObject(plugins[pname]) &&
                !('name' in plugins[pname])
              ) {
                plugins[pname].name = pname
              }
              newplugins.push(plugins[pname])
            }
            return newplugins
          }.call(this)
        }
        if (!lang.isArray(plugins)) {
          plugins = [plugins]
        }

        plugins.unshift.apply(plugins, this._corePlugins())

        // coerce string plugin names to {name: 'Name'}
        plugins = array.map(plugins, function (p) {
          return typeof p == 'object' ? p : { name: p }
        })

        if (!plugins.length) {
          deferred.resolve({ success: true })
          return
        }

        // set default locations for each plugin
        plugins.forEach(p => {
          // find the entry in the dojoConfig for this plugin
          let configEntry = dojoConfig.packages.find(c => c.name === p.name)
          if (configEntry) {
            p.css = configEntry.css
              ? `${configEntry.pluginDir}/${configEntry.css}`
              : false
            p.js = configEntry.location
          } else {
            this.fatalError(
              `plugin ${p.name} not found. You can rebuild JBrowse with a -dev release or github clone with this plugin in the plugin folder`,
            )
          }
        })

        var pluginDeferreds = array.map(plugins, function (p) {
          return new Deferred()
        })

        // fire the "all plugins done" deferred when all of the plugins are done loading
        new DeferredList(pluginDeferreds).then(function () {
          deferred.resolve({ success: true })
        })

        dojo.global.require(
          array.map(plugins, function (p) {
            return `${p.name}/main`
          }),
          dojo.hitch(this, function () {
            array.forEach(
              arguments,
              function (pluginClass, i) {
                var plugin = plugins[i]
                var thisPluginDone = pluginDeferreds[i]
                if (typeof pluginClass == 'string') {
                  console.error(
                    `could not load plugin ${plugin.name}: ${pluginClass}`,
                  )
                } else {
                  // make the plugin's arguments out of
                  // its little obj in 'plugins', and
                  // also anything in the top-level
                  // conf under its plugin name
                  var args = dojo.mixin(dojo.clone(plugins[i]), {
                    config: this.config[plugin.name] || {},
                  })
                  args.browser = this
                  args = dojo.mixin(args, { browser: this })

                  // load its css
                  var cssLoaded
                  if (plugin.css) {
                    cssLoaded = this._loadCSS({
                      url: this.resolveUrl(`${plugin.css}/main.css`),
                    })
                  } else {
                    cssLoaded = new Deferred()
                    cssLoaded.resolve()
                  }
                  cssLoaded.then(function () {
                    thisPluginDone.resolve({
                      success: true,
                    })
                  })

                  // give the plugin access to the CSS
                  // promise so it can know when its
                  // CSS is ready
                  args.cssLoaded = cssLoaded

                  // instantiate the plugin
                  this.plugins[plugin.name] = new pluginClass(args)
                }
              },
              this,
            )
          }),
        )
      })
    },

    /**
     * Resolve a URL relative to the browserRoot.
     */
    resolveUrl: function (url) {
      var browserRoot = this.config.browserRoot || this.config.baseUrl || ''

      return Util.resolveUrl(browserRoot, url)
    },

    welcomeScreen: function (container, error) {
      var thisB = this
      require(['dojo/text!JBrowse/View/Resource/Welcome.html'], function (
        Welcome,
      ) {
        // eslint-disable-next-line xss/no-mixed-html
        container.innerHTML = dompurify.sanitize(Welcome)
        var topPane = dojo.create(
          'div',
          { style: { overflow: 'hidden' } },
          thisB.container,
        )
        dojo.byId('welcome').innerHTML =
          `Welcome! To get started with <i>JBrowse-${
            thisB.version
          }</i>, select a sequence file or an existing data directory`

        on(
          dojo.byId('newOpen'),
          'click',
          dojo.hitch(thisB, 'openFastaElectron'),
        )
        on(dojo.byId('newOpenDirectory'), 'click', function () {
          new OpenDirectoryDialog({
            browser: thisB,
            setCallback: dojo.hitch(thisB, 'openDirectoryElectron'),
          }).show()
        })

        try {
          thisB.loadSessions()
        } catch (e) {
          console.error(e)
        }

        if (error) {
          console.log(error)
          var errors_div = dojo.byId('fatal_error_list')
          dojo.create(
            'div',
            {
              className: 'error',
              // eslint-disable-next-line xss/no-mixed-html
              innerHTML: dompurify.sanitize(error),
            },
            errors_div,
          )
        }

        request(
          thisB.resolveUrl('sample_data/json/volvox/successfully_run'),
        ).then(function () {
          try {
            document.getElementById('volvox_data_placeholder').innerHTML =
              'The example dataset is also available. View <a href="?data=sample_data/json/volvox">Volvox test data here</a>.'
          } catch (e) {}
        })
      })
    },

    /**
     * Make sure the browser container has nonzero container dimensions.  If not,
     * set some hardcoded dimensions and log a warning.
     */
    ensureNonzeroContainerDimensions() {
      const containerWidth = this.container.offsetWidth
      const containerHeight = this.container.offsetHeight
      if (!containerWidth) {
        console.warn(
          `JBrowse container element #${this.config.containerID} has no width, please set one with CSS. Setting fallback width of 640 pixels`,
        )
        this.container.style.width = '640px'
      }
      if (!containerHeight) {
        console.warn(
          `JBrowse container element #${this.config.containerID} has no height, please set one with CSS. Setting fallback height of 480 pixels`,
        )
        this.container.style.height = '480px'
      }
    },

    /**
     * Main error handler.  Displays links to configuration help or a
     * dataset selector in the main window.  Called when the main browser
     * cannot run at all, because of configuration errors or whatever.
     */
    fatalError: function (error) {
      function formatError(error) {
        if (error) {
          if (error.status) {
            error = `${error.status} (${
              error.statusText
            }) when attempting to fetch ${error.url}`
          }
          console.error(error.stack || `${error}`)
          error = `${error}`
          if (!/\.$/.exec(error)) {
            error = `${error}.`
          }

          error = dojoxHtmlEntities.encode(error)
        }
        return dompurify.sanitize(error)
      }

      if (!this.renderedFatalErrors) {
        // if the error is just that there are no ref seqs defined,
        // and there are datasets defined in the conf file, then just
        // show a little HTML list of available datasets
        if (
          /^Could not load reference sequence/.test(error) &&
          this.config.datasets &&
          !this.config.datasets._DEFAULT_EXAMPLES
        ) {
          dojo.empty(this.container)
          new StandaloneDatasetList({
            datasets: this.config.datasets,
          }).placeAt(this.container)
        } else {
          var container = this.container || document.body
          var thisB = this

          dojo.addClass(document.body, this.config.theme || 'tundra') //< tundra dijit theme

          if (!Util.isElectron()) {
            require([
              'dojo/text!JBrowse/View/Resource/Welcome_old.html',
            ], function (Welcome_old) {
              // eslint-disable-next-line xss/no-mixed-html
              container.innerHTML = dompurify.sanitize(Welcome_old)
              if (error) {
                var errors_div = dojo.byId('fatal_error_list')
                dojo.create(
                  'div',
                  {
                    className: 'error',
                    innerHTML: `${formatError(error)}`,
                  },
                  errors_div,
                )
              }
              request(
                thisB.resolveUrl('sample_data/json/volvox/successfully_run'),
              ).then(function () {
                try {
                  dojo.byId('volvox_data_placeholder').innerHTML =
                    'However, it appears you have successfully run <code>./setup.sh</code>, so you can see the <a href="?data=sample_data/json/volvox">Volvox test data here</a>.'
                } catch (e) {}
              })
            })
          } else {
            this.welcomeScreen(container, formatError(error))
          }

          this.renderedFatalErrors = true
        }
      } else {
        var errors_div = dojo.byId('fatal_error_list') || document.body
        dojo.create(
          'div',
          { className: 'error', innerHTML: `${formatError(error)}` },
          errors_div,
        )
      }
    },
    loadSessions: function () {
      var fs = electronRequire('fs')
      var app = electronRequire('electron').remote.app
      var path = `${this.config.electronData}/sessions.json`

      var obj = JSON.parse(fs.readFileSync(path, 'utf8'))
      var table = dojo.create(
        'table',
        {
          id: 'previousSessionsTable',
          style: { overflow: 'hidden', width: '90%' },
        },
        dojo.byId('previousSessions'),
      )
      var thisB = this

      if (!obj.length) {
        var tr = dojo.create('tr', {}, table)
        dojo.create(
          'div',
          { innerHTML: '<ul><li>No sessions yet!</li></ul>' },
          tr,
        )
      }
      array.forEach(obj, function (session) {
        var tr = dojo.create('tr', {}, table)
        var url = `${
          window.location.href.split('?')[0]
        }?data=${Util.replacePath(session.session)}`
        dojo.create(
          'div',
          {
            class: 'dijitIconDelete',
            onclick: function (e) {
              if (
                confirm(
                  "This will simply delete your session from the list, it won't remove any data files. Are you sure you want to continue?",
                )
              ) {
                dojo.empty(table)
                var index = obj.indexOf(session)
                if (index != -1) {
                  obj.splice(index, 1)
                }
                fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf8')
                thisB.loadSessions()
              }
            },
          },
          tr,
        )
        dojo.create(
          'td',
          {
            innerHTML: `<a href="${url}">${session.session}</a>`,
          },
          tr,
        )
      })
    },
    loadRefSeqs: function () {
      var thisB = this
      return this._milestoneFunction('loadRefSeqs', function (deferred) {
        // load our ref seqs
        if (typeof this.config.refSeqs == 'string') {
          // assume this.config.refSeqs is a url if it is string
          this.config.refSeqs = {
            url: this.config.refSeqs,
          }
        }

        if (this.config.refSeqs.storeClass) {
          dojo.global.require([this.config.refSeqs.storeClass], CLASS => {
            const r = new CLASS(
              Object.assign({ browser: this }, this.config.refSeqs),
            )
            r.getRefSeqs(
              function (refSeqs) {
                thisB.addRefseqs(refSeqs)
                deferred.resolve({ success: true })
              },
              function (error) {
                deferred.reject(error)
              },
            )
          })
        } else {
          // check refseq urls
          if (
            this.config.refSeqs.url &&
            this.config.refSeqs.url.match(/.fai$/)
          ) {
            new IndexedFasta({
              browser: this,
              faiUrlTemplate: this.config.refSeqs.url,
            }).getRefSeqs(
              function (refSeqs) {
                thisB.addRefseqs(refSeqs)
                deferred.resolve({ success: true })
              },
              function (error) {
                deferred.reject(error)
              },
            )
            return
          } else if (
            this.config.refSeqs.url &&
            this.config.refSeqs.url.match(/.2bit$/)
          ) {
            new TwoBit({
              browser: this,
              urlTemplate: this.config.refSeqs.url,
            }).getRefSeqs(
              function (refSeqs) {
                thisB.addRefseqs(refSeqs)
                deferred.resolve({ success: true })
              },
              function (error) {
                deferred.reject(error)
              },
            )
          } else if (
            this.config.refSeqs.url &&
            (this.config.refSeqs.url.match(/.fa$/) ||
              this.config.refSeqs.url.match(/.fasta$/))
          ) {
            new UnindexedFasta({
              browser: this,
              urlTemplate: this.config.refSeqs.url,
            }).getRefSeqs(
              function (refSeqs) {
                thisB.addRefseqs(refSeqs)
                deferred.resolve({ success: true })
              },
              function (error) {
                deferred.reject(error)
              },
            )
          } else if (
            this.config.refSeqs.url &&
            this.config.refSeqs.url.match(/.sizes/)
          ) {
            new ChromSizes({
              browser: this,
              urlTemplate: this.config.refSeqs.url,
            }).getRefSeqs(
              function (refSeqs) {
                thisB.addRefseqs(refSeqs)
                deferred.resolve({ success: true })
              },
              function (error) {
                deferred.reject(error)
              },
            )
          } else if ('data' in this.config.refSeqs) {
            this.addRefseqs(this.config.refSeqs.data)
            deferred.resolve({ success: true })
          } else {
            request(this.resolveUrl(this.config.refSeqs.url), {
              handleAs: 'text',
              headers: {
                'X-Requested-With': null,
              },
            }).then(
              function (o) {
                thisB.addRefseqs(dojo.fromJson(o))
                deferred.resolve({ success: true })
              },
              function (e) {
                deferred.reject(
                  `Could not load reference sequence definitions. ${e}`,
                )
              },
            )
          }
        }
      })
    },

    loadUserCSS: function () {
      return this._milestoneFunction('loadUserCSS', function (deferred) {
        if (this.config.css && !lang.isArray(this.config.css)) {
          this.config.css = [this.config.css]
        }

        var css = this.config.css || []
        if (!css.length) {
          deferred.resolve({ success: true })
          return
        }

        var that = this
        var cssDeferreds = array.map(css, function (css) {
          return that._loadCSS(css)
        })

        new DeferredList(cssDeferreds).then(function () {
          deferred.resolve({ success: true })
        })
      })
    },

    _loadCSS: function (css) {
      var deferred = new Deferred()

      if (typeof css == 'object') {
        LazyLoad.css(css.url, function () {
          deferred.resolve(true)
        })
      }
      return deferred
    },

    /**
     * Load our name index.
     */
    loadNames: function () {
      return this._milestoneFunction('loadNames', function (deferred) {
        var conf = dojo.mixin(
          dojo.clone(this.config.names || {}),
          this.config.autocomplete || {},
        )
        if (!conf.url) {
          conf.url = this.config.nameUrl || 'data/names/'
        }

        if (conf.baseUrl) {
          conf.url = Util.resolveUrl(conf.baseUrl, conf.url)
        }

        var type
        if ((type = conf.type)) {
          var thisB = this
          if (type.indexOf('/') == -1) {
            type = `JBrowse/Store/Names/${type}`
          }
          dojo.global.require([type], function (CLASS) {
            thisB.nameStore = new CLASS(dojo.mixin({ browser: thisB }, conf))
            deferred.resolve({ success: true })
          })
        }
        // no name type setting, must be the legacy store
        else {
          // wrap the older LazyTrieDojoDataStore with
          // dojo.store.DataStore to conform with the dojo/store API
          this.nameStore = new DojoDataStore({
            store: new NamesLazyTrieDojoDataStore({
              browser: this,
              namesTrie: new LazyTrie(conf.url, 'lazy-{Chunk}.json'),
              stopPrefixes: conf.stopPrefixes,
              resultLimit: conf.resultLimit || 15,
              tooManyMatchesMessage: conf.tooManyMatchesMessage,
            }),
          })
          deferred.resolve({ success: true })
        }
      })
    },

    /**
     * Compare two reference sequence names, returning -1, 0, or 1
     * depending on the result.  Case insensitive, insensitive to the
     * presence or absence of prefixes like 'chr', 'chrom', 'ctg',
     * 'contig', 'scaffold', etc
     */
    compareReferenceNames: function (a, b) {
      return this.regularizeReferenceName(a).localeCompare(
        this.regularizeReferenceName(b),
      )
    },

    /**
     * Regularize the reference sequence name in a location.
     */
    regularizeLocation: function (location) {
      var ref = this.findReferenceSequence(location.ref || location.objectName)
      if (ref) {
        location.ref = ref.name
      }
      return location
    },

    regularizeReferenceName: function (refname) {
      if (this.config.replaceRefRename) {
        return this.config.replaceRefRename(refname)
      }
      if (this.config.exactReferenceSequenceNames) {
        return refname
      }

      refname = refname.toLowerCase()

      // special case of double regularizing behaving badly
      if (refname.match(/^chrm/)) {
        return 'chrm'
      }

      refname = refname
        .replace(/^chro?m?(osome)?/, 'chr')
        .replace(/^co?n?ti?g/, 'ctg')
        .replace(/^scaff?o?l?d?/, 'scaffold')
        .replace(/^([a-z]*)0+/, '$1')
        .replace(/^(\d+l?r?|x|y)$/, 'chr$1')
        .replace(/^(x?)(ix|iv|v?i{0,3})$/, 'chr$1$2')
        .replace(/^mt?(dna)?$/, 'chrm')
      if (this.config.customRefRename) {
        refname = this.config.customRefRename(refname)
      }

      return refname
    },

    initView: function () {
      var thisObj = this
      return this._milestoneFunction('initView', function (deferred) {
        //set up top nav/overview pane and main GenomeView pane
        dojo.addClass(this.container, 'jbrowse') // browser container has an overall .jbrowse class
        dojo.addClass(document.body, this.config.theme || 'tundra') //< tundra dijit theme

        var topPane = dojo.create(
          'div',
          { style: { overflow: 'hidden' } },
          this.container,
        )

        var about = this.browserMeta()
        var aboutDialog = new InfoDialog({
          title: dompurify.sanitize(`About ${about.title}`),
          content: dompurify.sanitize(about.description),
          className: 'about-dialog',
        })

        // make our top menu bar
        var menuBar = dojo.create('div', {
          className: this.config.show_nav ? 'menuBar' : 'topLink',
        })
        thisObj.menuBar = menuBar
        if (this.config.show_menu) {
          ;(this.config.show_nav ? topPane : this.container).appendChild(
            menuBar,
          )
        }

        var overview = dojo.create(
          'div',
          { className: 'overview', id: 'overview' },
          topPane,
        )
        this.overviewDiv = overview
        // overview=0 hides the overview, but we still need it to exist
        if (!this.config.show_overview) {
          overview.style.cssText = 'display: none'
        }

        if (Util.isElectron() && !this.config.hideGenomeOptions) {
          this.addGlobalMenuItem(
            this.config.classicMenu ? 'file' : 'dataset',
            new dijitMenuItem({
              id: 'menubar_dataset_file',
              label: 'Open sequence file',
              iconClass: 'dijitIconFolderOpen',
              onClick: dojo.hitch(this, 'openFastaElectron'),
            }),
          )
          this.addGlobalMenuItem(
            this.config.classicMenu ? 'file' : 'dataset',
            new dijitMenuItem({
              id: 'menubar_dataset_directory',
              label: 'Open data directory',
              iconClass: 'dijitIconFolderOpen',
              onClick: function () {
                new OpenDirectoryDialog({
                  browser: thisObj,
                  setCallback: dojo.hitch(thisObj, 'openDirectoryElectron'),
                }).show()
              },
            }),
          )
          this.addGlobalMenuItem(
            this.config.classicMenu ? 'file' : 'dataset',
            new dijitMenuItem({
              id: 'menubar_dataset_save',
              label: 'Save session',
              iconClass: 'dijitIconSave',
              onClick: dojo.hitch(this, 'saveData'),
            }),
          )
          this.addGlobalMenuItem(
            this.config.classicMenu ? 'file' : 'dataset',
            new dijitMenuItem({
              id: 'menubar_dataset_home',
              label: 'Return to main menu',
              iconClass: 'dijitIconTask',
              onClick: dojo.hitch(this, function () {
                var container = thisObj.container || document.body
                thisObj.welcomeScreen(container)
              }),
            }),
          )
        } else if (!this.config.hideGenomeOptions) {
          this.addGlobalMenuItem(
            this.config.classicMenu ? 'file' : 'dataset',
            new dijitMenuItem({
              id: 'menubar_dataset_open',
              label: 'Open sequence file',
              iconClass: 'dijitIconFolderOpen',
              onClick: dojo.hitch(this, 'openFasta'),
            }),
          )
        }

        if (this.config.show_nav) {
          this.navbox = this.createNavBox(topPane)

          // make the dataset menu
          if (this.config.classicMenu) {
            if (this.config.datasets && !this.config.dataset_id) {
              console.warn(
                'In JBrowse configuration, datasets specified, but dataset_id not set.  Dataset selector will not be shown.',
              )
            }
            if (this.config.datasets && this.config.dataset_id) {
              this.renderDatasetSelect(menuBar)
            } else {
              this.poweredByLink = dojo.create(
                'a',
                {
                  className: 'powered_by',
                  // eslint-disable-next-line xss/no-mixed-html
                  innerHTML: dompurify.sanitize(this.browserMeta().title),
                  title: 'powered by JBrowse',
                },
                menuBar,
              )
              thisObj.poweredBy_clickHandle = dojo.connect(
                this.poweredByLink,
                'onclick',
                dojo.hitch(aboutDialog, 'show'),
              )
            }
          } else {
            this.renderDatasetSelect(menuBar)
          }

          // make the file menu
          this.addGlobalMenuItem(
            'file',
            new dijitMenuItem({
              id: 'menubar_fileopen',
              label: 'Open track file or URL',
              iconClass: 'dijitIconFolderOpen',
              onClick: dojo.hitch(this, 'openFileDialog'),
            }),
          )

          this.addGlobalMenuItem('file', new dijitMenuSeparator())

          this.fileDialog = new FileDialog({ browser: this })

          this.addGlobalMenuItem(
            'file',
            new dijitMenuItem({
              id: 'menubar_combotrack',
              label: 'Add combination track',
              iconClass: 'dijitIconSample',
              onClick: dojo.hitch(this, 'createCombinationTrack'),
            }),
          )

          this.renderGlobalMenu(
            'file',
            { text: this.config.classicMenu ? 'File' : 'Track' },
            menuBar,
          )

          // make the view menu
          this.addGlobalMenuItem(
            'view',
            new dijitMenuItem({
              id: 'menubar_sethighlight',
              label: 'Set highlight',
              iconClass: 'dijitIconFilter',
              onClick: function () {
                new SetHighlightDialog({
                  browser: thisObj,
                  setCallback: dojo.hitch(thisObj, 'setHighlightAndRedraw'),
                }).show()
              },
            }),
          )
          // make the menu item for clearing the current highlight
          this._highlightClearButton = new dijitMenuItem({
            id: 'menubar_clearhighlight',
            label: 'Clear highlight',
            iconClass: 'dijitIconFilter',
            onClick: dojo.hitch(this, function () {
              var h = this.getHighlight()
              if (h) {
                this.clearHighlight()
                this.view.redrawRegion(h)
              }
            }),
          })
          this._updateHighlightClearButton() //< sets the label and disabled status
          // update it every time the highlight changes
          this.subscribe(
            '/jbrowse/v1/n/globalHighlightChanged',
            dojo.hitch(this, '_updateHighlightClearButton'),
          )

          this.addGlobalMenuItem('view', this._highlightClearButton)

          // add a global menu item for resizing all visible quantitative tracks
          this.addGlobalMenuItem(
            'view',
            new dijitMenuItem({
              label: 'Resize quant. tracks',
              id: 'menubar_settrackheight',
              title: 'Set all visible quantitative tracks to a new height',
              iconClass: 'jbrowseIconVerticalResize',
              onClick: function () {
                new SetTrackHeightDialog({
                  setCallback: function (height) {
                    var tracks = thisObj.view.visibleTracks()
                    array.forEach(tracks, function (track) {
                      // operate only on XYPlot or Density tracks
                      if (!/\b(XYPlot|Density)/.test(track.config.type)) {
                        return
                      }

                      track.trackHeightChanged = true
                      track.updateUserStyles({
                        height: height,
                      })
                    })
                  },
                }).show()
              },
            }),
          )

          if (!this.config.disableSearch) {
            this.addGlobalMenuItem(
              'view',
              new dijitMenuItem({
                label: 'Search features',
                id: 'menubar_search',
                title: 'Search for features',
                onClick: () => {
                  var conf = dojo.mixin(
                    dojo.clone(this.config.names || {}),
                    this.config.autocomplete || {},
                  )

                  var type = conf.dialog || 'JBrowse/View/Dialog/Search'
                  dojo.global.require([type], CLASS => {
                    new CLASS(dojo.mixin({ browser: this }, conf)).show()
                  })
                },
              }),
            )
          }

          if (!this.config.disableReset) {
            this.addGlobalMenuItem(
              'view',
              new dijitMenuItem({
                label: 'Reset to defaults',
                id: 'menubar_reset_button',
                title: 'Reset view and tracks to defaults',

                onClick: () => {
                  // resets zoom and location to default
                  thisObj.navigateToLocation({
                    ref: thisObj.refSeq.name,
                    start: 0.4 * (thisObj.refSeq.start + thisObj.refSeq.end),
                    end: 0.6 * (thisObj.refSeq.start + thisObj.refSeq.end),
                  })

                  // hide all tracks
                  thisObj.publish(
                    '/jbrowse/v1/v/tracks/hide',
                    thisObj.config.tracks,
                  )

                  let tracksToShow = []

                  // the below code mainly follows the code that decides the default tracks in the constructor,
                  // but it's different enough that it doesn't easily make a reusable function. Good idea for future refactor?

                  // always add alwaysOnTracks, regardless of any other track params
                  if (thisObj.config.alwaysOnTracks) {
                    tracksToShow = tracksToShow.concat(
                      thisObj.config.alwaysOnTracks.split(','),
                    )
                  }
                  if (tracksToShow.length == 0) {
                    tracksToShow.push('DNA')
                  }
                  if (thisObj.config.defaultTracks) {
                    // In rare cases thisObj.config.defaultTracks already contained an array that appeared to
                    // have been split in a previous invocation of this function. Thus, we only try and split
                    // it if it isn't already split.
                    if (!(thisObj.config.defaultTracks instanceof Array)) {
                      tracksToShow = tracksToShow.concat(
                        thisObj.config.defaultTracks.split(','),
                      )
                    }
                  }
                  tracksToShow = Util.uniq(tracksToShow)

                  thisObj.showTracks(tracksToShow)
                },
              }),
            )
          }

          this.renderGlobalMenu('view', { text: 'View' }, menuBar)

          // make the options menu
          this.renderGlobalMenu(
            'options',
            { text: 'Options', title: 'configure JBrowse' },
            menuBar,
          )
        }
        function showHelp() {
          new HelpDialog(
            lang.mixin(thisObj.config.quickHelp || {}, {
              browser: thisObj,
            }),
          ).show()
        }
        if (this.config.show_nav) {
          // make the help menu
          this.addGlobalMenuItem(
            'help',
            new dijitMenuItem({
              id: 'menubar_about',
              label: 'About',
              //iconClass: 'dijitIconFolderOpen',
              onClick: dojo.hitch(aboutDialog, 'show'),
            }),
          )

          this.setGlobalKeyboardShortcut('?', showHelp)
          this.addGlobalMenuItem(
            'help',
            new dijitMenuItem({
              id: 'menubar_generalhelp',
              label: 'General',
              iconClass: 'jbrowseIconHelp',
              onClick: showHelp,
            }),
          )

          this.renderGlobalMenu('help', {}, menuBar)

          if (!this.config.classicMenu) {
            let datasetName = lang.getObject(
              `config.datasets.${this.config.dataset_id}.name`,
              false,
              this,
            )
            this.menuBarDatasetName = dojo.create(
              'div',
              {
                className: 'dataset-name',
                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(datasetName),
                title: 'name of current dataset',
                style: {
                  display: datasetName ? 'inline-block' : 'none',
                },
              },
              menuBar,
            )
          }
        }

        if (
          this.config.show_nav &&
          this.config.show_tracklist &&
          this.config.show_overview &&
          !Util.isElectron()
        ) {
          var shareLink = this.makeShareLink()
          if (shareLink) {
            menuBar.appendChild(shareLink)
          }
        } else if (Util.isElectron()) {
          var snapLink = this.makeSnapLink()
          if (snapLink) {
            menuBar.appendChild(snapLink)
          }
        } else {
          if (this.config.show_fullviewlink) {
            menuBar.appendChild(this.makeFullViewLink())
          }
        }

        this.viewElem = document.createElement('div')
        this.viewElem.className = 'dragWindow'
        this.container.appendChild(this.viewElem)

        this.containerWidget = new dijitBorderContainer(
          {
            liveSplitters: false,
            design: 'sidebar',
            gutters: false,
          },
          this.container,
        )
        var contentWidget = new dijitContentPane({ region: 'top' }, topPane)

        // hook up GenomeView
        this.view = this.viewElem.view = new GenomeView({
          browser: this,
          elem: this.viewElem,
          config: this.config.view,
          stripeWidth: 250,
          refSeq: this.refSeq,
        })

        dojo.connect(this.view, 'onFineMove', this, 'onFineMove')
        dojo.connect(this.view, 'onCoarseMove', this, 'onCoarseMove')

        this.browserWidget = new dijitContentPane(
          { region: 'center' },
          this.viewElem,
        )
        dojo.connect(this.browserWidget, 'resize', this, 'onResize')
        dojo.connect(this.browserWidget, 'resize', this.view, 'onResize')

        //connect events to update the URL in the location bar
        function updateLocationBar() {
          var shareURL = thisObj.makeCurrentViewURL()
          if (
            thisObj.config.updateBrowserURL &&
            window.history &&
            window.history.replaceState
          ) {
            window.history.replaceState({}, '', shareURL)
          }
          if (thisObj.config.update_browser_title) {
            document.title = `${
              thisObj.browserMeta().title
            } ${thisObj.view.visibleRegionLocString()}`
          }
        }
        dojo.connect(this, 'onCoarseMove', updateLocationBar)
        this.subscribe('/jbrowse/v1/n/tracks/visibleChanged', updateLocationBar)
        this.subscribe(
          '/jbrowse/v1/n/globalHighlightChanged',
          updateLocationBar,
        )

        //set initial location
        this.afterMilestone(
          'loadRefSeqs',
          dojo.hitch(this, function () {
            this.afterMilestone(
              'initTrackMetadata',
              dojo.hitch(this, function () {
                this.createTrackList().then(
                  dojo.hitch(this, function () {
                    this.containerWidget.startup()
                    this.onResize()

                    // make our global keyboard shortcut handler
                    on(
                      document.body,
                      'keypress',
                      dojo.hitch(this, 'globalKeyHandler'),
                    )

                    // configure our event routing
                    this._initEventRouting()

                    // done with initView
                    deferred.resolve({ success: true })
                  }),
                )
              }),
            )
          }),
        )
      })
    },

    createCombinationTrack: function () {
      if (this._combinationTrackCount === undefined) {
        this._combinationTrackCount = 0
      }
      var d = new Deferred()
      var storeConf = {
        browser: this,
        refSeq: this.refSeq,
        type: 'JBrowse/Store/SeqFeature/Combination',
      }
      var storeName = this.addStoreConfig(undefined, storeConf)
      storeConf.name = storeName
      this.getStore(storeName, function (store) {
        d.resolve(true)
      })
      var thisB = this
      d.promise.then(function () {
        var combTrackConfig = {
          type: 'JBrowse/View/Track/Combination',
          label: `combination_track${thisB._combinationTrackCount++}`,
          key: `Combination Track ${thisB._combinationTrackCount}`,
          metadata: {
            Description:
              'Drag-and-drop interface that creates a track out of combinations of other tracks.',
          },
          store: storeName,
        }
        // send out a message about how the user wants to create the new tracks
        thisB.publish('/jbrowse/v1/v/tracks/new', [combTrackConfig])

        // Open the track immediately
        thisB.publish('/jbrowse/v1/v/tracks/show', [combTrackConfig])
      })
    },

    renderDatasetSelect: function (parent) {
      var thisB = this

      if (this.config.classicMenu) {
        var dsconfig = this.config.datasets || {}
        var datasetChoices = []
        for (var id in dsconfig) {
          if (!/^_/.test(id)) {
            datasetChoices.push(Object.assign({ id: id }, dsconfig[id]))
          }
        }

        const combobox = new dijitComboBox({
          name: 'dataset',
          className: 'dataset_select',
          value: this.config.datasets[this.config.dataset_id].name,
          store: new dojoMemoryStore({
            data: datasetChoices,
          }),
          onChange: dsName => {
            if (!dsName) {
              return false
            }
            const dsID = datasetChoices.find(d => d.name === dsName).id
            const ds = (this.config.datasets || {})[dsID]
            let conf = this.config
            if (ds) {
              let link2Parent = conf.datasetLinkToParentIframe || false
              if (link2Parent) {
                window.parent.location = ds.url
              } else {
                window.location = ds.url
              }
            }
            return false
          },
        })
        combobox.placeAt(parent)
        combobox.focusNode.onclick = function () {
          this.select()
        }
        if (this.config.datasetSelectorWidth) {
          combobox.domNode.style.width = this.config.datasetSelectorWidth
          combobox.focusNode.style.width = this.config.datasetSelectorWidth
        }
      } else {
        let conf = this.config
        if (this.config.datasets && this.config.dataset_id) {
          this.addGlobalMenuItem('dataset', new dijitMenuSeparator())

          for (var id in this.config.datasets) {
            if (!/^_/.test(id)) {
              var dataset = this.config.datasets[id]

              this.addGlobalMenuItem(
                'dataset',
                new dijitMenuItem({
                  id: `menubar_dataset_bookmark_${id}`,
                  label:
                    id == this.config.dataset_id
                      ? `<b>${dataset.name}</b>`
                      : dataset.name,
                  iconClass: 'dijitIconBookmark',
                  onClick: dojo.hitch(dataset, function () {
                    // if datasetLinkToParentIframe=true, link to parent of iframe.
                    let link2Parent = conf.datasetLinkToParentIframe || false
                    if (link2Parent) {
                      window.parent.location = this.url
                    } else {
                      window.location = this.url
                    }
                  }),
                }),
              )
            }
          }
        }
        this.renderGlobalMenu('dataset', { text: 'Genome' }, parent)
      }
    },

    saveSessionDir: function (directory) {
      var fs = electronRequire('fs')
      var path = `${this.config.electronData}/sessions.json`
      var obj = []

      try {
        var obj = JSON.parse(fs.readFileSync(path, 'utf8'))
      } catch (e) {
        console.error(e)
      }

      var dir = Util.replacePath(directory)
      if (
        array.every(obj, function (elt) {
          return elt.session != dir
        })
      ) {
        obj.push({ session: dir })
      }

      fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf8')
    },

    openDirectoryElectron: function (directory) {
      this.saveSessionDir(directory)
      window.location = `?data=${Util.replacePath(directory)}`
    },

    openConfig: function (plugins) {
      if (
        !confirm(
          'If you have opened any new tracks, please save them before continuing. Are you sure you want to continue?',
        )
      ) {
        return
      }
      var fs = electronRequire('fs')

      var dir = this.config.dataRoot
      var trackList = JSON.parse(
        fs.readFileSync(`${dir}/trackList.json`, 'utf8'),
      )

      //remap existing plugins to object form
      trackList.plugins = trackList.plugins || {}
      if (lang.isArray(trackList.plugins)) {
        var temp = {}
        array.forEach(trackList.plugins, function (p) {
          temp[p] = { name: p, location: `${dir}/${p}` }
        })
        trackList.plugins = temp
      }

      // add new plugins
      array.forEach(plugins, function (plugin) {
        var name = plugin.match(/\/(\w+)$/)[1]
        trackList.plugins[name] = { location: plugin, name: name }
      })

      try {
        fs.writeFileSync(
          `${dir}/trackList.json`,
          JSON.stringify(trackList, null, 2),
        )
      } catch (e) {
        console.error('Failed to save trackList.json', e)
      }
      window.location.reload()
    },

    saveData: function () {
      if (
        !confirm(
          'This will overwrite tracks and config data in your data directory. Are you sure you want to continue?',
        )
      ) {
        return
      }

      var fs = electronRequire('fs')
      var dir = this.config.dataRoot

      // use getstore to access the files that were loaded from local files, and create standard configs
      var trackConfs = array.map(
        this.config.tracks,
        function (trackConfig) {
          var temp = lang.clone(trackConfig)
          this.getStore(
            temp.store,
            lang.hitch(this, function (obj) {
              temp.storeClass = obj.config.type
              if (!temp.urlTemplate) {
                lang.mixin(temp, obj.saveStore())

                if (temp.histograms && temp.histograms.store) {
                  this.getStore(temp.histograms.store, function (obj) {
                    lang.mixin(temp.histograms, obj.saveStore())
                  })
                }
              }
              delete temp.store
            }),
          )
          return temp
        },
        this,
      )

      var plugins = array.filter(
        Util.uniq(this.config.plugins),
        function (elt) {
          return elt != 'RegexSequenceSearch'
        },
      )
      var tmp = {}

      if (lang.isArray(this.config.plugins)) {
        array.forEach(this.config.plugins, function (p) {
          tmp[p] = typeof p == 'object' ? p : { name: p }
        })
      } else {
        tmp = this.config.plugins
      }
      var minTrackList = {
        tracks: trackConfs,
        refSeqs: this.config.refSeqs,
        refSeqOrder: this.config.refSeqOrder,
        plugins: tmp,
      }
      try {
        fs.writeFileSync(
          `${Util.unReplacePath(dir)}/trackList.json`,
          JSON.stringify(minTrackList, null, 2),
        )
      } catch (e) {
        alert('Unable to save track data')
        console.error(e)
      }
    },

    openFastaElectron: function () {
      this.fastaFileDialog =
        this.fastaFileDialog || new FastaFileDialog({ browser: this })

      var app = electronRequire('electron').remote.app
      var fs = electronRequire('fs')
      var path = electronRequire('path')

      this.fastaFileDialog.show({
        openCallback: dojo.hitch(this, function (results) {
          var confs = results.trackConfs || []
          if (confs.length) {
            var trackList = {
              tracks: [
                {
                  label: confs[0].label,
                  key: confs[0].key,
                  type: 'SequenceTrack',
                  category: 'Reference sequence',
                  useAsRefSeqStore: true,
                  chunkSize: 20000,
                },
              ],
              refSeqs: fai,
              refSeqOrder: results.refSeqOrder,
            }

            if (
              confs[0].store.bgzfa &&
              confs[0].store.fai &&
              confs[0].store.gzi
            ) {
              var fasta = Util.replacePath(confs[0].store.bgzfa.url)
              var fai = Util.replacePath(confs[0].store.fai.url)
              var gzi = Util.replacePath(confs[0].store.gzi.url)
              trackList.tracks[0].storeClass =
                'JBrowse/Store/SeqFeature/BgzipIndexedFasta'
              trackList.tracks[0].urlTemplate = fasta
              trackList.tracks[0].faiUrlTemplate = fai
              trackList.tracks[0].gziUrlTemplate = gzi
              trackList.refSeqs = {
                faiUrlTemplate: fai,
                storeClass: 'JBrowse/Store/SeqFeature/BgzipIndexedFasta',
                gziUrlTemplate: gzi,
              }
            } else if (confs[0].store.fasta && confs[0].store.fai) {
              var fasta = Util.replacePath(confs[0].store.fasta.url)
              var fai = Util.replacePath(confs[0].store.fai.url)
              trackList.tracks[0].storeClass =
                'JBrowse/Store/SeqFeature/IndexedFasta'
              trackList.tracks[0].urlTemplate = fasta
              trackList.tracks[0].faiUrlTemplate = fai
              trackList.refSeqs = {
                faiUrlTemplate: fai,
                storeClass: 'JBrowse/Store/SeqFeature/IndexedFasta',
              }
            } else if (
              confs[0].store.type == 'JBrowse/Store/SeqFeature/TwoBit'
            ) {
              var f2bit = Util.replacePath(confs[0].store.blob.url)
              trackList.tracks[0].storeClass = 'JBrowse/Store/SeqFeature/TwoBit'
              trackList.tracks[0].urlTemplate = f2bit
              trackList.refSeqs = f2bit
              trackList.refSeqs = {
                urlTemplate: f2bit,
                storeClass: 'JBrowse/Store/SeqFeature/TwoBit',
              }
            } else if (
              confs[0].store.type == 'JBrowse/Store/SeqFeature/ChromSizes'
            ) {
              var sizes = Util.replacePath(confs[0].store.blob.url)
              delete trackList.tracks
              trackList.refSeqs = sizes
              trackList.refSeqs = {
                urlTemplate: sizes,
                storeClass: 'JBrowse/Store/SeqFeature/ChromSizes',
              }
            } else {
              var fasta = Util.replacePath(confs[0].store.fasta.url)
              try {
                var stats = fs.statSync(fasta)
                if (stats.size > 100000000) {
                  alert(
                    'Unindexed file too large. You must have an index file (.fai) for sequence files larger than 100 MB.',
                  )
                  return
                }
              } catch (e) {
                console.error(e)
              }
              trackList.tracks[0].storeClass =
                'JBrowse/Store/SeqFeature/UnindexedFasta'
              trackList.tracks[0].urlTemplate = fasta
              trackList.refSeqs = {
                urlTemplate: fasta,
                storeClass: 'JBrowse/Store/SeqFeature/UnindexedFasta',
              }
            }

            // fix dir to be user data if we are accessing a url for fasta
            var dir = this.config.electronData
            fs.existsSync(dir) || fs.mkdirSync(dir) // make base folder exist first before subdir
            dir += `/${confs[0].label}`

            try {
              fs.existsSync(dir) || fs.mkdirSync(dir)
              fs.writeFileSync(
                `${dir}/trackList.json`,
                JSON.stringify(trackList, null, 2),
              )
              fs.closeSync(fs.openSync(`${dir}/tracks.conf`, 'w'))
              this.saveSessionDir(dir)
              window.location = `${
                window.location.href.split('?')[0]
              }?data=${Util.replacePath(dir)}`
            } catch (e) {
              alert('Failed to save session')
              console.error(e)
            }
          }
        }),
      })
    },

    openFasta: function () {
      this.fastaFileDialog =
        this.fastaFileDialog || new FastaFileDialog({ browser: this })

      this.fastaFileDialog.show({
        openCallback: results => {
          return new Promise((resolve, reject) => {
            const trackConfigs = results.trackConfs || []
            const [conf] = trackConfigs
            if (!conf) {
              return reject('no track configs')
            }
            const storeConf = conf.store
            if (!storeConf) {
              return reject('no store config')
            }

            dojo.global.require([storeConf.type], storeClass => {
              if (
                /\/Unindexed/i.test(storeConf.type) &&
                storeConf.fasta &&
                storeConf.fasta.size > 100000000
              ) {
                alert(
                  'Unindexed file too large. You must have an index file (.fai) for sequence files larger than 100 MB.',
                )
                return reject('sequence file too large')
              }

              const store = new storeClass(
                Object.assign({ browser: this }, storeConf),
              ).getRefSeqs(
                refSeqs => {
                  this.teardown()
                  var newBrowser = new this.constructor({
                    refSeqs: { data: refSeqs },
                    refSeqOrder: results.refSeqOrder,
                    dataRoot: null,
                  })
                  newBrowser.afterMilestone('completely initialized', () => {
                    storeConf.name = 'refseqs' // important to make it the refseq store
                    newBrowser.addStoreConfig(storeConf.name, storeConf)
                    conf.store = 'refseqs'
                    if (
                      storeConf.type !== 'JBrowse/Store/SeqFeature/ChromSizes'
                    ) {
                      newBrowser.publish('/jbrowse/v1/v/tracks/new', [conf])
                    }
                  })
                  resolve()
                },
                error => {
                  this.fatalError(`Error getting refSeq: ${error}`)
                  reject(error)
                },
              )
            })
          })
        },
      })
    },

    /**
     * Get object like { title: "title", description: "description", ... }
     * that contains metadata describing this browser.
     */
    browserMeta: function () {
      var about = this.config.aboutThisBrowser || {}
      about.title = about.title || 'JBrowse'

      var verstring = this.version

      if (about.description) {
        // eslint-disable-next-line xss/no-mixed-html
        about.description +=
          `${
            '<div class="powered_by">' +
            'Powered by <a target="_blank" href="http://jbrowse.org">JBrowse '
          }${verstring}</a>.` + `</div>`
      } else {
        // eslint-disable-next-line xss/no-mixed-html
        about.description =
          `${
            '<div class="default_about">' + '  <img class="logo" src="'
          }${this.resolveUrl('img/JBrowseLogo_small.png')}">` +
          `  <h1>JBrowse ${verstring}</h1>` +
          `  <div class="tagline">A next-generation genome browser<br> built with JavaScript and HTML5.</div>` +
          `  <a class="mainsite" target="_blank" href="http://jbrowse.org">JBrowse website</a>` +
          `  <div class="gmod">JBrowse is a <a target="_blank" href="http://gmod.org">GMOD</a> project.</div>` +
          `  <div class="copyright">${packagejson.copyright}</div>${
            Object.keys(this.plugins).length > 1 &&
            !this.config.noPluginsForAboutBox
              ? `  <div class="loaded-plugins">Loaded plugins<ul class="plugins-list">${array
                  .map(
                    Object.keys(this.plugins),
                    function (elt) {
                      var p = this.plugins[elt]
                      return `<li>${p.url ? `<a href="${p.url}">` : ''}${
                        p.name
                      }${p.url ? '</a>' : ''}${
                        p.author ? ` (${p.author})` : ''
                      }</li>`
                    },
                    this,
                  )
                  .join('')}  </ul></div>`
              : ''
          }</div>`
      }
      return about
    },

    /**
     * Track type registry, used by GUI elements that need to offer
     * options regarding selecting track types.  Can register a track
     * type, and get the data structure describing what track types are
     * known.
     */
    registerTrackType: function (args) {
      var types = this.getTrackTypes()
      var typeName = args.type
      var defaultFor = args.defaultForStoreTypes || []
      var humanLabel = args.label

      // add it to known track types
      types.knownTrackTypes.push(typeName)

      // add its label
      if (args.label) {
        types.trackTypeLabels[typeName] = args.label
      }

      // uniqify knownTrackTypes
      var seen = {}
      types.knownTrackTypes = array.filter(
        types.knownTrackTypes,
        function (type) {
          var s = seen[type]
          seen[type] = true
          return !s
        },
      )

      // set it as default for the indicated types, if any
      array.forEach(defaultFor, function (storeName) {
        types.trackTypeDefaults[storeName] = typeName
      })

      // store the whole structure in this object
      this._knownTrackTypes = types
    },
    getTrackTypes: function () {
      // create the default types if necessary
      if (!this._knownTrackTypes) {
        this._knownTrackTypes = {
          // map of store type -> default track type to use for the store
          trackTypeDefaults: {
            'JBrowse/Store/SeqFeature/BAM': 'JBrowse/View/Track/Alignments2',
            'JBrowse/Store/SeqFeature/CRAM': 'JBrowse/View/Track/Alignments2',
            'JBrowse/Store/SeqFeature/NCList':
              'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Store/SeqFeature/BigWig':
              'JBrowse/View/Track/Wiggle/XYPlot',
            'JBrowse/Store/SeqFeature/VCFTabix':
              'JBrowse/View/Track/CanvasVariants',
            'JBrowse/Store/SeqFeature/VCFTribble':
              'JBrowse/View/Track/CanvasVariants',
            'JBrowse/Store/SeqFeature/GFF3':
              'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Store/SeqFeature/BigBed':
              'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Store/SeqFeature/GFF3Tabix':
              'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Store/SeqFeature/BED': 'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Store/SeqFeature/BEDTabix':
              'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Store/SeqFeature/GTF': 'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Store/SeqFeature/StaticChunked':
              'JBrowse/View/Track/Sequence',
            'JBrowse/Store/SeqFeature/UnindexedFasta':
              'JBrowse/View/Track/Sequence',
            'JBrowse/Store/SeqFeature/IndexedFasta':
              'JBrowse/View/Track/Sequence',
            'JBrowse/Store/SeqFeature/BgzipIndexedFasta':
              'JBrowse/View/Track/Sequence',
            'JBrowse/Store/SeqFeature/TwoBit': 'JBrowse/View/Track/Sequence',
          },

          knownTrackTypes: [
            'JBrowse/View/Track/Alignments',
            'JBrowse/View/Track/Alignments2',
            'JBrowse/View/Track/FeatureCoverage',
            'JBrowse/View/Track/SNPCoverage',
            'JBrowse/View/Track/HTMLFeatures',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/HTMLVariants',
            'JBrowse/View/Track/CanvasVariants',
            'JBrowse/View/Track/Wiggle/XYPlot',
            'JBrowse/View/Track/Wiggle/Density',
            'JBrowse/View/Track/Sequence',
          ],

          trackTypeLabels: {},
        }
      }

      return this._knownTrackTypes
    },

    openFileDialog: function () {
      this.fileDialog.show({
        openCallback: dojo.hitch(this, function (results) {
          var confs = results.trackConfs || []
          if (confs.length) {
            // tuck away each of the store configurations in
            // our store configuration, and replace them with
            // their names.
            array.forEach(
              confs,
              function (conf) {
                // do it for conf.store
                var storeConf = conf.store
                if (storeConf && typeof storeConf == 'object') {
                  delete conf.store
                  var name = this.addStoreConfig(storeConf.name, storeConf)
                  conf.store = name
                }

                // do it for conf.histograms.store, if it exists
                storeConf = conf.histograms && conf.histograms.store
                if (storeConf && typeof storeConf == 'object') {
                  delete conf.histograms.store
                  var name = this.addStoreConfig(storeConf.name, storeConf)
                  conf.histograms.store = name
                }
              },
              this,
            )

            // send out a message about how the user wants to create the new tracks
            this.publish('/jbrowse/v1/v/tracks/new', confs)

            // if requested, send out another message that the user wants to show them
            if (results.trackDisposition == 'openImmediately') {
              this.publish('/jbrowse/v1/v/tracks/show', confs)
            }
          }
        }),
      })
    },

    addTracks: function (confs) {
      // just register the track configurations right now
      this._addTrackConfigs(confs)
    },
    replaceTracks: function (confs) {
      // just add-or-replace the track configurations
      this._replaceTrackConfigs(confs)
    },
    deleteTracks: function (confs) {
      // de-register the track configurations
      this._deleteTrackConfigs(confs)
    },

    renderGlobalMenu: function (menuName, args, parent) {
      this.afterMilestone(
        'initView',
        function () {
          var menu = this.makeGlobalMenu(menuName)
          if (menu) {
            args = dojo.mixin(
              {
                className: menuName,
                innerHTML: `<span class="icon"></span> ${
                  args.text || Util.ucFirst(menuName)
                }`,
                dropDown: menu,
                id: `dropdownbutton_${menuName}`,
              },
              args || {},
            )

            var menuButton = new dijitDropDownButton(args)
            dojo.addClass(menuButton.domNode, 'menu')
            parent.appendChild(menuButton.domNode)
          }
        },
        this,
      )
    },

    makeGlobalMenu: function (menuName) {
      var items = (this._globalMenuItems || {})[menuName] || []
      if (!items.length) {
        return null
      }

      var menu = new dijitDropDownMenu({
        id: `dropdownmenu_${menuName}`,
        leftClickToOpen: true,
      })
      dojo.forEach(items, function (item) {
        menu.addChild(item)
      })
      dojo.addClass(menu.domNode, 'jbrowse globalMenu')
      dojo.addClass(menu.domNode, menuName)
      menu.startup()
      return menu
    },

    addGlobalMenuItem: function (menuName, item) {
      if (!this._globalMenuItems) {
        this._globalMenuItems = {}
      }
      if (!this._globalMenuItems[menuName]) {
        this._globalMenuItems[menuName] = []
      }
      this._globalMenuItems[menuName].push(item)
    },

    /**
     * Initialize our message routing, subscribing to messages, forwarding
     * them around, and so forth.
     *
     * "v" (view)
     *   Requests from the user.  These go only to the browser, which is
     *   the central point forx deciding what to do about them.  This is
     *   usually just forwarding the command as one or more "c" messages.
     *
     * "c" (command)
     *   Commands from authority, like the Browser object.  These cause
     *   things to actually happen in the UI: things to be shown or
     *   hidden, actions taken, and so forth.
     *
     * "n" (notification)
     *   Notification that something just happened.
     *
     * @private
     */
    _initEventRouting: function () {
      var that = this

      that.subscribe('/jbrowse/v1/v/store/new', function (storeConfigs) {
        array.forEach(storeConfigs, function (storeConfig) {
          storeConfig = lang.mixin({}, storeConfig)
          var name = storeConfig.name
          delete storeConfig.name
          that.addStoreConfig(name, storeConfig)
        })
      })

      that.subscribe('/jbrowse/v1/v/tracks/hide', function (trackConfigs) {
        that.publish('/jbrowse/v1/c/tracks/hide', trackConfigs)
      })
      that.subscribe('/jbrowse/v1/v/tracks/show', function (trackConfigs) {
        that.addRecentlyUsedTracks(
          dojo.map(trackConfigs, function (c) {
            return c.label
          }),
        )
        that.publish('/jbrowse/v1/c/tracks/show', trackConfigs)
      })

      that.subscribe('/jbrowse/v1/v/tracks/new', function (trackConfigs) {
        that.addTracks(trackConfigs)
        that.publish('/jbrowse/v1/c/tracks/new', trackConfigs)
        that.publish('/jbrowse/v1/n/tracks/new', trackConfigs)
      })
      that.subscribe('/jbrowse/v1/v/tracks/replace', function (trackConfigs) {
        that.replaceTracks(trackConfigs)
        that.publish('/jbrowse/v1/c/tracks/replace', trackConfigs)
        that.publish('/jbrowse/v1/n/tracks/replace', trackConfigs)
      })
      that.subscribe('/jbrowse/v1/v/tracks/delete', function (trackConfigs) {
        that.deleteTracks(trackConfigs)
        that.publish('/jbrowse/v1/c/tracks/delete', trackConfigs)
        that.publish('/jbrowse/v1/n/tracks/delete', trackConfigs)
      })

      that.subscribe('/jbrowse/v1/v/tracks/pin', function (trackNames) {
        that.publish('/jbrowse/v1/c/tracks/pin', trackNames)
        that.publish('/jbrowse/v1/n/tracks/pin', trackNames)
      })

      that.subscribe('/jbrowse/v1/v/tracks/unpin', function (trackNames) {
        that.publish('/jbrowse/v1/c/tracks/unpin', trackNames)
        that.publish('/jbrowse/v1/n/tracks/unpin', trackNames)
      })
    },

    /**
     * Reports some anonymous usage statistics about this browsing
     * instance.  Currently reports the number of tracks in the instance
     * and their type (feature, wiggle, etc), and the number of reference
     * sequences and their average length.
     */
    reportUsageStats: function () {
      if (this.config.suppressUsageStatistics) {
        return
      }

      var stats = this._calculateClientStats()
      this._reportGoogleUsageStats(stats)
      this._reportCustomUsageStats(stats)
    },

    // phones home to google analytics
    _reportGoogleUsageStats: function (stats) {
      // jbrowse.org account always
      var jbrowseUser = 'UA-7115575-2'
      var accounts = [jbrowseUser]

      // add any custom Google Analytics accounts from config (comma-separated
      // or array)
      if (this.config.googleAnalytics) {
        var userAccounts = this.config.googleAnalytics.accounts
        if (accounts && !lang.isArray(userAccounts)) {
          userAccounts = userAccounts.replace(/^\s*|\s*$/, '').split(/\s*,\s*/)
        }
        accounts.push.apply(accounts, userAccounts)
      }

      var analyticsScript =
        "(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){ "
      analyticsScript +=
        '(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o), '
      analyticsScript +=
        'm=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) '
      analyticsScript +=
        "})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');"

      // set up users
      accounts.forEach(function (user, trackerNum) {
        // if we're adding jbrowse.org user, also include new dimension
        // references (replacing ga.js custom variables)
        if (user == jbrowseUser) {
          analyticsScript += `ga('create', '${user}', 'auto', 'jbrowseTracker');`
        } else {
          analyticsScript += `ga('create', '${user}', 'auto', 'customTracker${
            trackerNum
          }');`
        }
      })

      // send pageviews and custom variables
      accounts.forEach(function (user, viewerNum) {
        if (user == jbrowseUser) {
          var gaData = {}
          var googleDimensions =
            'tracks-count refSeqs-count refSeqs-avgLen ver loadTime electron plugins'

          googleDimensions.split(/\s+/).forEach(function (key, index) {
            gaData[`dimension${index + 1}`] = stats[key]
          })

          gaData.metric1 = Math.round(stats.loadTime * 1000)

          analyticsScript += `ga('jbrowseTracker.send', 'pageview',${JSON.stringify(
            gaData,
          )});`
        } else {
          analyticsScript += `ga('customTracker${viewerNum}.send', 'pageview');`
        }
      })

      var analyticsScriptNode = document.createElement('script')
      // this is NOT dompurify'd but a quick audit did not reveal alarm
      // eslint-disable-next-line xss/no-mixed-html
      analyticsScriptNode.innerHTML = analyticsScript

      document.getElementsByTagName('head')[0].appendChild(analyticsScriptNode)
    },

    // phones home to custom analytics at jbrowse.org
    _reportCustomUsageStats: function (stats) {
      var protocol = 'https'

      // overridable protocol
      if (
        typeof this.config.clientReport != 'undefined' &&
        typeof this.config.clientReport.protocol != 'undefined'
      ) {
        protocol = this.config.clientReport.protocol
      }

      // phone home with a GET request made by a script tag
      var clientReport = `${
        protocol
      }://jbrowse.org/analytics/clientReport?${dojo.objectToQuery(stats)}`

      dojo.create(
        'img',
        {
          style: {
            display: 'none',
          },
          src: clientReport,
        },
        document.body,
      )
    },

    /**
     * Get a store object from the store registry, loading its code and
     * instantiating it if necessary.
     */
    getStore: function (storeName, callback) {
      if (!callback) {
        throw 'invalid arguments'
      }

      var storeCache = this._storeCache || {}
      this._storeCache = storeCache

      var storeRecord = storeCache[storeName]
      if (storeRecord) {
        storeRecord.refCount++
        callback(storeRecord.store)
        return
      }

      var conf = this.config.stores[storeName]
      if (!conf) {
        console.warn(`store '${storeName}' not found`)
        callback(null)
        return
      }

      var storeClassName = conf.type
      if (!storeClassName) {
        console.warn(`store ${storeName} has no type defined`)
        callback(null)
        return
      }

      dojo.global.require(
        [storeClassName],
        dojo.hitch(this, function (storeClass) {
          var storeArgs = {}
          dojo.mixin(storeArgs, conf)
          dojo.mixin(storeArgs, {
            config: conf,
            browser: this,
            refSeq: this.refSeq,
          })

          var store = new storeClass(storeArgs)

          var cache =
            typeof storeArgs.storeCache === 'undefined' ||
            storeArgs.storeCache !== false

          if (cache) {
            this._storeCache[storeName] = {
              refCount: 1,
              store: store,
            }
          }

          callback(store)
          // release the callback because apparently require
          // doesn't release this function
          callback = undefined

          //if (cache)
          //    delete store;
        }),
      )
    },

    /**
     * Add a store configuration to the browser.  If name is falsy, will
     * autogenerate one.
     * @private
     */
    uniqCounter: 0,
    addStoreConfig: function (/**String*/ name, /**Object*/ storeConfig) {
      name = name || `addStore${this.uniqCounter++}`

      if (!this.config.stores) {
        this.config.stores = {}
      }
      if (!this._storeCache) {
        this._storeCache = {}
      }

      if (this.config.stores[name] || this._storeCache[name]) {
        throw `store ${name} already exists!`
      }

      this.config.stores[name] = storeConfig
      return name
    },

    clearStores: function () {
      this._storeCache = {}
    },

    /**
     * Notifies the browser that the given named store is no longer being
     * used by the calling component.  Decrements the store's reference
     * count, and if the store's reference count reaches zero, the store
     * object will be discarded, to be recreated again later if needed.
     */
    // not actually being used yet
    releaseStore: function (storeName) {
      var storeRecord = this._storeCache[storeName]
      if (storeRecord && !--storeRecord.refCount) {
        delete this._storeCache[storeName]
      }
    },

    _calculateClientStats: function () {
      var scn = screen || window.screen

      // make a flat (i.e. non-nested) object for the stats, so that it
      // encodes compactly in the query string
      var date = new Date()
      var stats = {
        ver: this.version || 'dev',
        'refSeqs-count': this.refSeqOrder.length,
        'refSeqs-avgLen': !this.refSeqOrder.length
          ? null
          : dojof.reduce(
              dojo.map(
                this.refSeqOrder,
                function (name) {
                  var ref = this.allRefs[name]
                  if (!ref) {
                    return 0
                  }
                  return ref.end - ref.start
                },
                this,
              ),
              '+',
            ),
        'tracks-count': this.config.tracks.length,
        plugins: dojof.keys(this.plugins).sort().join(','),

        // screen geometry
        'scn-h': scn ? scn.height : null,
        'scn-w': scn ? scn.width : null,
        // window geometry
        'win-h': document.body.offsetHeight,
        'win-w': document.body.offsetWidth,
        // container geometry
        'el-h': this.container.offsetHeight,
        'el-w': this.container.offsetWidth,

        // time param to prevent caching
        t: date.getTime() / 1000,
        electron: Util.isElectron(),

        // also get local time zone offset
        tzoffset: date.getTimezoneOffset(),

        loadTime: (date.getTime() - this.startTime) / 1000,
      }

      // count the number and types of tracks
      dojo.forEach(this.config.tracks, function (trackConfig) {
        var typeKey = `track-types-${trackConfig.type}` || 'null'
        stats[typeKey] = (stats[typeKey] || 0) + 1
      })

      return stats
    },

    publish: function () {
      if (this.config.logMessages) {
        console.log(arguments)
      }

      return topic.publish.apply(topic, arguments)
    },

    subscribe: function () {
      this._uniqueSubscriptionId = this._uniqueSubscriptionId || 0
      this._subscription = this._subscription || {}
      var uniqId = ++this._uniqueSubscriptionId
      var unsubber = topic.subscribe.apply(topic, arguments)
      var thisB = this
      this._subscription[uniqId] = unsubber
      return (function (id) {
        return {
          remove: function () {
            delete thisB._subscription[id]
            unsubber.remove()
          },
        }
      })(uniqId)
    },

    onResize: function () {
      if (this.navbox) {
        this.view.locationTrapHeight = dojo.marginBox(this.navbox).h
      }
    },

    /**
     * Get the list of the most recently used tracks, stored for this user
     * in a cookie.
     * @returns {Array[Object]} as <code>[{ time: (integer), label: (track label)}]</code>
     */
    getRecentlyUsedTracks: function () {
      return dojo.fromJson(this.cookie('recentTracks') || '[]')
    },

    /**
     * Add the given list of tracks as being recently used.
     * @param trackLabels {Array[String]} array of track labels to add
     */
    addRecentlyUsedTracks: function (trackLabels) {
      var seen = {}
      var newRecent = Util.uniq(
        dojo
          .map(
            trackLabels,
            function (label) {
              return {
                label: label,
                time: Math.round(new Date() / 1000), // secs since epoch
              }
            },
            this,
          )
          .concat(dojo.fromJson(this.cookie('recentTracks')) || []),
        function (entry) {
          return entry.label
        },
      )
        // limit by default to 20 recent tracks
        .slice(0, this.config.maxRecentTracks || 10)

      // set the recentTracks cookie, good for one year
      this.cookie('recentTracks', newRecent, { expires: 365 })

      return newRecent
    },

    /**
     * Run a function that will eventually resolve the named Deferred
     * (milestone).
     * @param {String} name the name of the Deferred
     */
    _milestoneFunction: function (/**String*/ name, func) {
      var thisB = this
      var args = Array.prototype.slice.call(arguments, 2)

      var d = thisB._getDeferred(name)
      args.unshift(d)
      try {
        func.apply(thisB, args)
      } catch (e) {
        console.error(e, e.stack)
        d.reject(e)
      }

      return d
    },

    /**
     * Fetch or create a named Deferred, which is how milestones are implemented.
     */
    _getDeferred: function (name) {
      if (!this._deferred) {
        this._deferred = {}
      }
      return (
        this._deferred[name] ||
        (this._deferred[name] = function () {
          var d = new Deferred()
          d.then(null, lang.hitch(this, 'fatalError'))
          return d
        }.call(this))
      )
    },
    /**
     * Attach a callback to a milestone.
     */
    afterMilestone: function (name, func, ctx) {
      return this._getDeferred(name).then(function () {
        try {
          func.call(ctx || this)
        } catch (e) {
          console.error(e instanceof Error ? e : String(e), e.stack)
        }
      })
    },
    /**
     * Indicate that we've reached a milestone in the initalization
     * process.  Will run all the callbacks associated with that
     * milestone.
     */
    passMilestone: function (name, result) {
      return this._getDeferred(name).resolve(result)
    },
    /**
     * Return true if we have reached the named milestone, false otherwise.
     */
    reachedMilestone: function (name) {
      return this._getDeferred(name).isResolved()
    },

    /**
     *  Load our configuration file(s) based on the parameters the
     *  constructor was passed.  Does not return until all files are
     *  loaded and merged in.
     *  @returns nothing meaningful
     */
    loadConfig: function () {
      return this._milestoneFunction('loadConfig', function (deferred) {
        // check the config.dataRoot parameter before loading, unless allowCrossSiteDataRoot is on.
        // this prevents an XSS attack served from a malicious server that has CORS enabled. thanks to @cmdcolin
        // for noticing this.
        if (
          this.config.dataRoot &&
          this.config.dataRoot !== 'data' &&
          !this.config.allowCrossOriginDataRoot
        ) {
          const parsedDataRoot = url.parse(
            url.resolve(window.location.href, this.config.dataRoot),
          )
          if (parsedDataRoot.host) {
            const currentParsed = url.parse(window.location.href)
            if (
              !Util.isElectron() &&
              (parsedDataRoot.host !== currentParsed.host ||
                parsedDataRoot.protocol !== currentParsed.protocol)
            ) {
              throw new Error(
                'Invalid JBrowse dataRoot setting. For security, absolute URLs are not allowed. Set `allowCrossOriginDataRoot` to true to disable this security check.',
              )
            }
          }
        }

        var c = new ConfigManager({
          bootConfig: this.config,
          defaults: this._configDefaults(),
          browser: this,
        })
        c.getFinalConfig().then(
          dojo.hitch(this, function (finishedConfig) {
            this.config = finishedConfig

            //apply document.domain from a loaded conf file
            if (this.config.documentDomain) {
              document.domain = this.config.documentDomain
            }

            // pass the tracks configurations through
            // addTrackConfigs so that it will be indexed and such
            var tracks = finishedConfig.tracks || []
            delete finishedConfig.tracks
            this._addTrackConfigs(tracks)

            // coerce some config keys to boolean
            ;[
              'show_tracklist',
              'show_nav',
              'show_overview',
              'show_menu',
              'show_fullviewlink',
              'show_tracklabels',
              'update_browser_title',
            ].forEach(v => {
              this.config[v] = Util.coerceBoolean(this.config[v])
            })

            // set empty tracks array if we have none
            if (!this.config.tracks) {
              this.config.tracks = []
            }

            deferred.resolve({ success: true })
          }),
          deferred.reject,
        )
      })
    },

    /**
     * Add new track configurations.
     * @private
     */
    _addTrackConfigs: function (/**Array*/ configs) {
      if (!this.config.tracks) {
        this.config.tracks = []
      }
      if (!this.trackConfigsByName) {
        this.trackConfigsByName = {}
      }

      array.forEach(
        configs,
        function (conf) {
          // if( this.trackConfigsByName[ conf.label ] ) {
          //     console.warn("track with label "+conf.label+" already exists, skipping");
          //     return;
          // }

          this.trackConfigsByName[conf.label] = conf
          this.config.tracks.push(conf)
        },
        this,
      )

      return configs
    },
    /**
     * Replace existing track configurations.
     * @private
     */
    _replaceTrackConfigs: function (/**Array*/ newConfigs) {
      if (!this.trackConfigsByName) {
        this.trackConfigsByName = {}
      }

      array.forEach(
        newConfigs,
        function (conf) {
          if (!this.trackConfigsByName[conf.label]) {
            console.warn(
              `track with label ${
                conf.label
              } does not exist yet.  creating a new one.`,
            )
          }

          this.trackConfigsByName[conf.label] = dojo.mixin(
            this.trackConfigsByName[conf.label] || {},
            conf,
          )
        },
        this,
      )
    },
    /**
     * Delete existing track configs.
     * @private
     */
    _deleteTrackConfigs: function (configsToDelete) {
      // remove from this.config.tracks
      this.config.tracks = array.filter(
        this.config.tracks || [],
        function (conf) {
          return !array.some(configsToDelete, function (toDelete) {
            return toDelete.label == conf.label
          })
        },
      )

      // remove from trackConfigsByName
      array.forEach(
        configsToDelete,
        function (toDelete) {
          if (!this.trackConfigsByName[toDelete.label]) {
            console.warn(
              `track ${toDelete.label} does not exist, cannot delete`,
            )
            return
          }

          delete this.trackConfigsByName[toDelete.label]
        },
        this,
      )
    },

    _configDefaults: function () {
      return {
        tracks: [],

        containerID: 'GenomeBrowser',
        dataRoot: 'data',
        show_tracklist: true,
        show_nav: true,
        show_menu: true,
        show_overview: true,
        show_fullviewlink: true,
        update_browser_title: true,
        updateBrowserURL: true,

        refSeqs: '{dataRoot}/seq/refSeqs.json',
        include: ['jbrowse.conf', 'jbrowse_conf.json'],
        nameUrl: '{dataRoot}/names/root.json',

        datasets: {
          _DEFAULT_EXAMPLES: true,
          volvox: {
            url: '?data=sample_data/json/volvox',
            name: 'Volvox Example',
          },
          modencode: {
            url: '?data=sample_data/json/modencode',
            name: 'MODEncode Example',
          },
          yeast: {
            url: '?data=sample_data/json/yeast',
            name: 'Yeast Example',
          },
        },

        highlightSearchedRegions: false,
        highResolutionMode: 'auto',
      }
    },

    /**
     * get the numerical ID number of the given reference sequence name.  required for CRAM files, which
     * only operate on reference sequence ID numbers.
     * @param {string} refSeqName
     */
    getRefSeqNumber(refSeqName) {
      return this.allRefs[refSeqName].id
    },

    /**
     * get a reference sequence by its numerical id number. used mostly by CRAM stores.
     * @param {number} id
     */
    getRefSeqById(id) {
      return this.refSeqsById[id]
    },

    /**
     * @param refSeqs {Array} array of refseq records to add to the browser
     */
    addRefseqs: function (refSeqs) {
      if (!this.allRefs) {
        this.allRefs = {}
      }

      refSeqs.forEach((r, id) => {
        // save the original index of the reference for
        // use with CRAM and other numerical-refseq-id stores
        r.id = id
        this.allRefs[r.name] = r
      })

      this.refSeqsById = refSeqs

      // generate refSeqOrder
      this.refSeqOrder = function () {
        var order
        if (!this.config.refSeqOrder) {
          order = refSeqs
        } else {
          // if refSeqOrder 'by_list' and config parameter refSeqOrderList exists,
          // split that into an array as an override to default refSeqs.json order
          if (
            this.config.refSeqOrder == 'by_list' &&
            this.config.refSeqOrderList
          ) {
            if (lang.isArray(this.config.refSeqOrderList)) {
              return this.config.refSeqOrderList
            } else if (typeof this.config.refSeqOrderList === 'string') {
              return this.config.refSeqOrderList.split(/\s*,\s*/)
            }
          }
          order = refSeqs.slice(0)
          order.sort(
            this.config.refSeqOrder == 'length' ||
              this.config.refSeqOrder == 'length ascending'
              ? function (a, b) {
                  return a.length - b.length
                }
              : this.config.refSeqOrder == 'length descending'
                ? function (a, b) {
                    return b.length - a.length
                  }
                : this.config.refSeqOrder == 'name descending'
                  ? function (a, b) {
                      return b.name.localeCompare(a.name)
                    }
                  : function (a, b) {
                      return a.name.localeCompare(b.name)
                    },
          )
        }
        return array.map(order, function (r) {
          return r.name
        })
      }.call(this)

      var refCookie = this.cookie('refseq')
      this.refSeq =
        this.refSeq ||
        this.allRefs[refCookie] ||
        this.allRefs[this.refSeqOrder[0]]
    },

    /**
     * Get the refseq object { name, start, end, .. } with the given name,
     * or the currently shown ref seq if no name is given.
     */
    getRefSeq: function (name) {
      if (typeof name != 'string') {
        return this.refSeq || undefined
      }

      return this.allRefs[name]
    },

    /**
     * @private
     */
    onFineMove: function (startbp, endbp) {
      if (this.locationTrap) {
        var length = this.view.ref.end - this.view.ref.start
        var trapLeft = Math.round(
          ((startbp - this.view.ref.start) / length) * this.view.overviewBox.w +
            this.view.overviewBox.l,
        )
        var trapRight = Math.round(
          ((endbp - this.view.ref.start) / length) * this.view.overviewBox.w +
            this.view.overviewBox.l,
        )
        dojo.style(this.locationTrap, {
          width: `${trapRight - trapLeft}px`,
          borderBottomWidth: `${this.view.locationTrapHeight}px`,
          borderLeftWidth: `${trapLeft}px`,
          borderRightWidth: `${this.view.overviewBox.w - trapRight}px`,
        })
      }
    },

    /**
     * Asynchronously initialize our track metadata.
     */
    initTrackMetadata: function (callback) {
      var thisB = this
      return this._milestoneFunction('initTrackMetadata', function (deferred) {
        var metaDataSourceClasses = dojo.map(
          (this.config.trackMetadata || {}).sources || [],
          function (sourceDef) {
            var url = sourceDef.relativeUrl
              ? Util.resolveUrl(
                  `${thisB.config.dataRoot}/`,
                  sourceDef.relativeUrl,
                )
              : sourceDef.url || 'trackMeta.csv'
            var type =
              sourceDef.type ||
              (/\.csv$/i.test(url)
                ? 'csv'
                : /\.js(on)?$/i.test(url)
                  ? 'json'
                  : 'csv')
            var storeClass =
              sourceDef['class'] ||
              {
                csv: 'dojox/data/CsvStore',
                json: 'dojox/data/JsonRestStore',
              }[type]
            if (!storeClass) {
              console.error(
                `No store class found for type '${
                  type
                }', cannot load track metadata from URL ${url}`,
              )
              return null
            }
            return { class_: storeClass, url: url }
          },
        )

        dojo.global.require(
          Array.prototype.concat.apply(
            ['JBrowse/Store/TrackMetaData'],
            dojo.map(metaDataSourceClasses, function (c) {
              return c.class_
            }),
          ),
          dojo.hitch(this, function (MetaDataStore) {
            var mdStores = []
            for (var i = 1; i < arguments.length; i++) {
              mdStores.push(
                new arguments[i]({
                  url: metaDataSourceClasses[i - 1].url,
                }),
              )
            }

            this.trackMetaDataStore = new MetaDataStore(
              dojo.mixin(dojo.clone(this.config.trackMetadata || {}), {
                trackConfigs: this.config.tracks,
                browser: this,
                metadataStores: mdStores,
              }),
            )

            deferred.resolve({ success: true })
          }),
        )
      })
    },

    /**
     * Asynchronously create the track list.
     * @private
     */
    createTrackList: function () {
      return this._milestoneFunction('createTrack', function (deferred) {
        // find the tracklist class to use
        var tl_class = !this.config.show_tracklist
          ? 'Null'
          : (this.config.trackSelector || {}).type
            ? this.config.trackSelector.type
            : 'Hierarchical'
        if (!/\//.test(tl_class)) {
          tl_class = `JBrowse/View/TrackList/${tl_class}`
        }

        // load all the classes we need
        dojo.global.require(
          [tl_class],
          dojo.hitch(this, function (trackListClass) {
            // instantiate the tracklist and the track metadata object
            this.trackListView = new trackListClass(
              dojo.mixin(dojo.clone(this.config.trackSelector) || {}, {
                trackConfigs: this.config.tracks,
                browser: this,
                trackMetaData: this.trackMetaDataStore,
              }),
            )

            // bind the 't' key as a global keyboard shortcut
            this.setGlobalKeyboardShortcut('t', this.trackListView, 'toggle')

            // listen for track-visibility-changing messages from
            // views and update our tracks cookie
            this.subscribe(
              '/jbrowse/v1/n/tracks/visibleChanged',
              dojo.hitch(this, function () {
                this.cookie('tracks', this.view.visibleTrackNames().join(','), {
                  expires: 60,
                })
              }),
            )

            deferred.resolve({ success: true })
          }),
        )
      })
    },

    /**
     * @private
     */

    onVisibleTracksChanged: function () {},

    /**
     * Like <code>navigateToLocation()</code>, except it attempts to display the given
     * location with a little bit of flanking sequence to each side, if
     * possible.
     */
    showRegion: function (location) {
      var flank = Math.round((location.end - location.start) * 0.2)
      //go to location, with some flanking region
      this.navigateToLocation({
        ref: location.ref,
        start: location.start - flank,
        end: location.end + flank,
      })

      // if the location has a track associated with it, show it
      if (location.tracks) {
        this.showTracks(
          array.map(location.tracks, function (t) {
            return (t && (t.label || t.name)) || t
          }),
        )
      }
    },

    /**
     * navigate to a given location
     * @example
     * gb=dojo.byId("GenomeBrowser").genomeBrowser
     * gb.navigateTo("ctgA:100..200")
     * gb.navigateTo("f14")
     * @param loc can be either:<br>
     * &lt;chromosome&gt;:&lt;start&gt; .. &lt;end&gt;<br>
     * &lt;start&gt; .. &lt;end&gt;<br>
     * &lt;center base&gt;<br>
     * &lt;feature name/ID&gt;
     */

    navigateTo: function (loc, initial) {
      var thisB = this
      this.afterMilestone('initView', function () {
        // lastly, try to search our feature names for it
        var ret = thisB.searchNames(loc).then(function (found) {
          if (found) {
            return
          }

          // First check if loc is the name of a ref seq before attempting to parse the locstring for basepair location info
          var ref = thisB.findReferenceSequence(loc)

          if (ref) {
            thisB.navigateToLocation({ ref: ref.name })
            return
          }

          // Not a known ref seq name - now lets parse the loc string
          // if it's a foo:123..456 location, go there
          var location = typeof loc == 'string' ? Util.parseLocString(loc) : loc
          // only call navigateToLocation() directly if location has start and end, otherwise try and fill in start/end from 'location' cookie
          if (location && 'start' in location && 'end' in location) {
            location.initial = initial
            thisB.navigateToLocation(location)
            return
          }

          new InfoDialog({
            title: 'Not found',
            content: `Not found: <span class="locString">${dompurify.sanitize(
              loc,
            )}</span>`,
            className: 'notfound-dialog',
          }).show()
          if (!thisB.view.pxPerBp) {
            thisB.navigateToLocation(thisB.refSeq)
          }
        })
      })
    },

    findReferenceSequence: function (name) {
      for (var n in this.allRefs) {
        if (!this.compareReferenceNames(n, name)) {
          return this.allRefs[n]
        }
      }
      return null
    },

    // given an object like { ref: 'foo', start: 2, end: 100 }, set the
    // browser's view to that location.  any of ref, start, or end may be
    // missing, in which case the function will try set the view to
    // something that seems intelligent
    navigateToLocation: function (location) {
      this.afterMilestone(
        'initView',
        dojo.hitch(this, function () {
          // regularize the ref seq name we were passed
          var ref = location.ref
            ? this.findReferenceSequence(location.ref.name || location.ref)
            : this.refSeq
          if (location.initial && !ref) {
            new InfoDialog({
              title: 'Not found',
              content: `Not found: <span class="locString">${Util.assembleLocString(
                location,
                false,
              )}</span>`,
              className: 'notfound-dialog',
            }).show()
            ref = this.refSeq
          }
          if (!ref) {
            return
          }
          location.ref = ref.name

          if (
            'ref' in location &&
            !('start' in location && 'end' in location)
          ) {
            // see if we have a stored location for this ref seq in a
            // cookie, and go there if we do
            var oldLoc
            try {
              oldLoc = Util.parseLocString(
                dojo.fromJson(this.cookie('location'))[location.ref].l,
              )
              oldLoc.ref = location.ref // force the refseq name; older cookies don't have it
            } catch (x) {}
            if (oldLoc) {
              location = oldLoc
            } else {
              // if we don't have a previous location, just go to
              // the middle 80% of that refseq,
              // based on range that can be viewed (start to end)
              // rather than total length, in case start != 0 || end != length
              // this.navigateToLocation({ref: ref.name, start: ref.end*0.1, end: ref.end*0.9 });
              var visibleLength = ref.end - ref.start
              location.start = ref.start + visibleLength * 0.1
              location.end = ref.start + visibleLength * 0.9
            }
          }

          // clamp the start and end to the size of the ref seq
          location.start = Math.max(0, location.start || 0)
          location.end = Math.max(
            location.start,
            Math.min(ref.end, location.end || ref.end),
          )

          // if it's the same sequence, just go there
          if (location.ref == this.refSeq.name) {
            this.view.setLocation(this.refSeq, location.start, location.end)
            this._updateLocationCookies(location)
          }
          // if different, we need to poke some other things before going there
          else {
            // record names of open tracks and re-open on new refseq
            var curTracks = this.view.visibleTrackNames()

            this.refSeq = this.allRefs[location.ref]
            this.clearStores()

            this.view.setLocation(this.refSeq, location.start, location.end)
            this._updateLocationCookies(location)

            this.showTracks(curTracks)
          }
        }),
      )
    },

    /**
     * Given a string name, search for matching feature names and set the
     * view location to any that match.
     */
    searchNames: function (/**String*/ loc) {
      return this._getDeferred('loadNames').then(() => {
        return this.nameStore.query({ name: loc }).then(
          nameMatches => {
            // if we have no matches, pop up a dialog saying so, and
            // do nothing more
            if (!nameMatches.length) {
              return false
            }

            var goingTo

            //first check for exact case match
            for (var i = 0; i < nameMatches.length; i++) {
              if (nameMatches[i].name == loc) {
                goingTo = nameMatches[i]
              }
            }
            //if no exact case match, try a case-insentitive match
            if (!goingTo) {
              for (i = 0; i < nameMatches.length; i++) {
                if (nameMatches[i].name.toLowerCase() == loc.toLowerCase()) {
                  goingTo = nameMatches[i]
                }
              }
            }
            //else just pick a match
            if (!goingTo) {
              goingTo = nameMatches[0]
            }

            // if it has one location, go to it
            if (goingTo.location) {
              //go to location, with some flanking region
              this.showRegionAfterSearch(goingTo.location)
            }
            // otherwise, pop up a dialog with a list of the locations to choose from
            else if (goingTo.multipleLocations) {
              if (!this.view.pxPerBp) {
                this.navigateToLocation(this.refSeq)
              }
              new LocationChoiceDialog({
                browser: this,
                locationChoices: goingTo.multipleLocations,
                title: `Choose ${goingTo.name} location`,
                prompt: `"${
                  goingTo.name
                }" is found in multiple locations.  Please choose a location to view.`,
              }).show()
            }
            return true
          },
          function (e) {
            console.error(e)
            new InfoDialog({
              title: 'Error',
              content: 'Error reading from name store.',
            }).show()
            return false
          },
        )
      })
    },

    /**
     * load and display the given tracks
     * @example
     * gb=dojo.byId("GenomeBrowser").genomeBrowser
     * gb.showTracks(["DNA","gene","mRNA","noncodingRNA"])
     * @param trackNameList {Array|String} array or comma-separated string
     * of track names, each of which should correspond to the "label"
     * element of the track information
     */

    showTracks: function (trackNames) {
      this.afterMilestone(
        'initView',
        dojo.hitch(this, function () {
          if (typeof trackNames == 'string') {
            trackNames = trackNames.split(',')
          }

          if (!trackNames) {
            return
          }

          var trackConfs = dojo.filter(
            dojo.map(
              trackNames,
              function (n) {
                return this.trackConfigsByName[n]
              },
              this,
            ),
            function (c) {
              return c
            }, // filter out confs that are missing
          )

          // publish some events with the tracks to instruct the views to show them.
          this.publish('/jbrowse/v1/c/tracks/show', trackConfs)
          this.publish('/jbrowse/v1/n/tracks/visibleChanged')
        }),
      )
    },

    /**
     * Create a global keyboard shortcut.
     * @param keychar the character of the key that is typed
     * @param [...] additional arguments passed to dojo.hitch for making the handler
     */
    setGlobalKeyboardShortcut: function (keychar) {
      // warn if redefining
      if (this.globalKeyboardShortcuts[keychar]) {
        console.warn(
          `WARNING: JBrowse global keyboard shortcut '${keychar}' redefined`,
        )
      }

      // make the wrapped handler func
      var func = dojo.hitch.apply(
        dojo,
        Array.prototype.slice.call(arguments, 1),
      )

      // remember it
      this.globalKeyboardShortcuts[keychar] = func
    },

    /**
     * Key event handler that implements all global keyboard shortcuts.
     */
    globalKeyHandler: function (evt) {
      // if some digit widget is focused, don't process any global keyboard shortcuts
      if (dijitFocus.curNode) {
        return
      }

      var shortcut =
        this.globalKeyboardShortcuts[
          evt.keyChar || String.fromCharCode(evt.charCode || evt.keyCode)
        ]
      if (shortcut) {
        shortcut.call(this)
        evt.stopPropagation()
      }
    },
    makeSnapLink: function () {
      var browser = this
      var shareURL = '#'
      var dataRoot = this.config.dataRoot

      // make the share link
      var button = new dijitButton({
        className: 'share',
        innerHTML: 'Screenshot',
        title: 'share this view',
        onClick: function () {
          var fs = electronRequire('fs')
          var remote = electronRequire('electron').remote
          remote.dialog.showSaveDialog(
            { defaultPath: '*/screenshot.png' },
            fileName => {
              if (fileName) {
                remote
                  .getCurrentWindow()
                  .capturePage(img => fs.writeFileSync(fileName, img.toPNG()))
              }
            },
          )
        },
      })

      return button.domNode
    },

    makeShareLink: function () {
      // don't make the link if we were explicitly configured not to
      if ('share_link' in this.config && !this.config.share_link) {
        return null
      }

      var browser = this
      var shareURL = '#'

      // make the share link
      var button = new dijitButton({
        className: 'share',
        innerHTML: '<span class="icon"></span> Share',
        title: 'share this view',
        onClick: function () {
          URLinput.value = shareURL
          previewLink.href = shareURL

          sharePane.show()
          URLinput.focus()
          URLinput.select()
          copyReminder.style.display = 'block'

          return false
        },
      })

      // make the 'share' popup
      var container = dojo.create('div', {
        innerHTML: 'Paste this link in <b>email</b> or <b>IM</b>',
      })
      var copyReminder = dojo.create('div', {
        className: 'copyReminder',
        innerHTML: 'Press CTRL-C to copy',
      })
      var URLinput = dojo.create('input', {
        type: 'text',
        value: shareURL,
        size: 50,
        readonly: 'readonly',
        onclick: function () {
          this.select()
          copyReminder.style.display = 'block'
        },
        onblur: function () {
          copyReminder.style.display = 'none'
        },
      })
      var previewLink = dojo.create(
        'a',
        {
          innerHTML: 'Preview',
          target: '_blank',
          href: shareURL,
          style: { display: 'block', float: 'right' },
        },
        container,
      )
      var sharePane = new dijitDialog({
        className: 'sharePane',
        title: 'Share this view',
        draggable: false,
        content: [container, URLinput, copyReminder],
        autofocus: false,
      })

      // connect moving and track-changing events to update it
      var updateShareURL = function () {
        shareURL = browser.makeCurrentViewURL()
      }
      dojo.connect(this, 'onCoarseMove', updateShareURL)
      this.subscribe('/jbrowse/v1/n/tracks/visibleChanged', updateShareURL)
      this.subscribe('/jbrowse/v1/n/globalHighlightChanged', updateShareURL)

      return button.domNode
    },

    /**
     * Return a string URL that encodes the complete viewing state of the
     * browser.  Currently just data dir, visible tracks, and visible
     * region.
     * @param {Object} overrides optional key-value object containing
     *                           components of the query string to override
     */
    makeCurrentViewURL: function (overrides) {
      var t = typeof this.config.shareURL

      if (t == 'function') {
        return this.config.shareURL.call(this, this)
      } else if (t == 'string') {
        return this.config.shareURL
      }

      return ''.concat(
        window.location.protocol,
        '//',
        window.location.host,
        window.location.pathname,
        '?',
        dojo.objectToQuery(
          dojo.mixin(
            dojo.mixin({}, this.config.queryParams || {}),
            dojo.mixin(
              {
                loc: this.view.visibleRegionLocString(),
                tracks: this.view.visibleTrackNames().join(','),
                highlight: (this.getHighlight() || '').toString(),
              },
              overrides || {},
            ),
          ),
        ),
      )
    },

    makeFullViewLink: function () {
      var thisB = this
      // make the link
      var link = dojo.create('a', {
        className: 'topLink',
        href: window.location.href,
        target: '_blank',
        title: 'View in full-screen browser',
        innerHTML: 'Full-screen view',
      })

      var makeURL = this.config.makeFullViewURL || this.makeCurrentViewURL

      // update it when the view is moved or tracks are changed
      var update_link = function () {
        link.href = makeURL.call(thisB, thisB)
      }
      dojo.connect(this, 'onCoarseMove', update_link)
      this.subscribe('/jbrowse/v1/n/tracks/visibleChanged', update_link)
      this.subscribe('/jbrowse/v1/n/globalHighlightChanged', update_link)

      return link
    },

    /**
     * @private
     */

    onCoarseMove: function (startbp, endbp) {
      var currRegion = {
        start: startbp,
        end: endbp,
        ref: this.refSeq.name,
      }
      var searchVal = '' // the feature that was typed into the search field

      // update the location box with our current location (in this case locationBox is the legacy search box)
      if (this.locationBox) {
        //this.searchVal = searchVal;
        var searchVal = this.locationBox.get('value')
        if (searchVal.length) {
          searchVal = ` "${searchVal}"`
        }
        var locationVal = Util.assembleLocStringWithLength(currRegion)

        this.locationBox.set(
          'value',
          locationVal,
          false, //< don't fire any onchange handlers
        )
        this.locationBox.set('placeholder', 'search features, IDs')
        this.goButton.set('disabled', true)
      }
      // update the id=location-box if it exists
      var node = dojo.byId('location-info')
      if (node) {
        var location = Util.assembleLocStringWithLength(currRegion)
        html.set(node, location + searchVal)
        this.locationBox.set('value', '', false)
      }

      // also update the refseq selection dropdown if present
      this._updateRefSeqSelectBox()

      if (this.reachedMilestone('completely initialized')) {
        this._updateLocationCookies(currRegion)
      }

      // send out a message notifying of the move
      this.publish('/jbrowse/v1/n/navigate', currRegion)
    },

    _updateRefSeqSelectBox: function () {
      if (this.refSeqSelectBox) {
        // if none of the options in the select box match this
        // reference sequence, add another one to the end for it
        if (
          !array.some(
            this.refSeqSelectBox.getOptions(),
            function (option) {
              return option.value == this.refSeq.name
            },
            this,
          )
        ) {
          this.refSeqSelectBox.set(
            'options',
            this.refSeqSelectBox.getOptions().concat({
              label: this.refSeq.name,
              value: this.refSeq.name,
            }),
          )
        }

        // set its value to the current ref seq
        this.refSeqSelectBox.set('value', this.refSeq.name, false)
      }
    },

    /**
     * update the location and refseq cookies
     */
    _updateLocationCookies: function (location) {
      var locString =
        typeof location == 'string'
          ? location
          : Util.assembleLocString(location, false)
      var oldLocMap = dojo.fromJson(this.cookie('location')) || {
        _version: 1,
      }
      if (!oldLocMap['_version']) {
        oldLocMap = this._migrateLocMap(oldLocMap)
      }
      oldLocMap[this.refSeq.name] = {
        l: locString,
        t: Math.round(new Date().getTime() / 1000) - 1340211510,
      }
      oldLocMap = this._limitLocMap(
        oldLocMap,
        this.config.maxSavedLocations || 10,
      )
      this.cookie('location', dojo.toJson(oldLocMap), { expires: 60 })
      this.cookie('refseq', this.refSeq.name)
    },

    /**
     * Migrate an old location map cookie to the new format that includes timestamps.
     * @private
     */
    _migrateLocMap: function (locMap) {
      var newLoc = { _version: 1 }
      for (var loc in locMap) {
        newLoc[loc] = { l: locMap[loc], t: 0 }
      }
      return newLoc
    },

    /**
     * Limit the size of the saved location map, removing the least recently used.
     * @private
     */
    _limitLocMap: function (locMap, maxEntries) {
      // don't do anything if the loc map has fewer than the max
      var locRefs = dojof.keys(locMap)
      if (locRefs.length <= maxEntries) {
        return locMap
      }

      // otherwise, calculate the least recently used that we need to
      // get rid of to be under the size limit
      locMap = dojo.clone(locMap)
      var deleteLocs = locRefs
        .sort(function (a, b) {
          return locMap[b].t - locMap[a].t
        })
        .slice(maxEntries - 1)

      // and delete them from the locmap
      dojo.forEach(deleteLocs, function (locRef) {
        delete locMap[locRef]
      })

      return locMap
    },

    /**
     * Wrapper for dojo.cookie that namespaces our cookie names by
     * prefixing them with this.config.containerID.
     *
     * Has one additional bit of smarts: if an object or array is passed
     * instead of a string to set as the cookie contents, will serialize
     * it with dojo.toJson before storing.
     *
     * @param [...] same as dojo.cookie
     * @returns the new value of the cookie, same as dojo.cookie
     */
    cookie: function (keyWithoutId, value) {
      keyWithoutId = `${this.config.containerID}-${keyWithoutId}`
      var keyWithId = `${keyWithoutId}-${this.config.dataset_id || ''}`
      if (typeof value == 'object') {
        value = dojo.toJson(value)
      }

      var sizeLimit = this.config.cookieSizeLimit || 1200
      if (value != null && value.length > sizeLimit) {
        console.warn(
          `not setting cookie '${keyWithId}', value too big (${
            value.length
          } > ${sizeLimit})`,
        )
        return localStorage.getItem(keyWithId)
      } else if (value != null) {
        try {
          return localStorage.setItem(keyWithId, value)
        } catch (e) {}
      }

      return localStorage.getItem(keyWithId) || dojo.cookie(keyWithoutId)
    },
    /**
     * @private
     */

    createNavBox: function (parent) {
      var thisB = this
      var align = 'center'
      var navbox = dojo.create(
        'div',
        {
          id: 'navbox',
          style: { 'text-align': align },
        },
        parent,
      )

      // container adds a white backdrop to the locationTrap.
      var locationTrapContainer = dojo.create(
        'div',
        { className: 'locationTrapContainer' },
        navbox,
      )

      this.locationTrap = dojo.create(
        'div',
        { className: 'locationTrap' },
        locationTrapContainer,
      )

      var four_nbsp = String.fromCharCode(160)
      four_nbsp = four_nbsp + four_nbsp + four_nbsp + four_nbsp
      navbox.appendChild(document.createTextNode(four_nbsp))

      var moveLeft = document.createElement('img')
      moveLeft.src = this.resolveUrl('img/Empty.png')
      moveLeft.id = 'moveLeft'
      moveLeft.className = 'icon nav'
      navbox.appendChild(moveLeft)
      dojo.connect(moveLeft, 'click', this, function (event) {
        dojo.stopEvent(event)
        this.view.slide(0.9)
      })

      var moveRight = document.createElement('img')
      //moveRight.type = "image";
      moveRight.src = this.resolveUrl('img/Empty.png')
      moveRight.id = 'moveRight'
      moveRight.className = 'icon nav'
      navbox.appendChild(moveRight)
      dojo.connect(moveRight, 'click', this, function (event) {
        dojo.stopEvent(event)
        this.view.slide(-0.9)
      })

      navbox.appendChild(document.createTextNode(four_nbsp))

      var bigZoomOut = document.createElement('img')
      //bigZoomOut.type = "image";
      bigZoomOut.src = this.resolveUrl('img/Empty.png')
      bigZoomOut.id = 'bigZoomOut'
      bigZoomOut.className = 'icon nav'
      navbox.appendChild(bigZoomOut)
      dojo.connect(bigZoomOut, 'click', this, function (event) {
        dojo.stopEvent(event)
        this.view.zoomOut(undefined, undefined, 2)
      })

      var zoomOut = document.createElement('img')
      //zoomOut.type = "image";
      zoomOut.src = this.resolveUrl('img/Empty.png')
      zoomOut.id = 'zoomOut'
      zoomOut.className = 'icon nav'
      navbox.appendChild(zoomOut)
      dojo.connect(zoomOut, 'click', this, function (event) {
        dojo.stopEvent(event)
        this.view.zoomOut()
      })

      var zoomIn = document.createElement('img')
      //zoomIn.type = "image";
      zoomIn.src = this.resolveUrl('img/Empty.png')
      zoomIn.id = 'zoomIn'
      zoomIn.className = 'icon nav'
      navbox.appendChild(zoomIn)
      dojo.connect(zoomIn, 'click', this, function (event) {
        dojo.stopEvent(event)
        this.view.zoomIn()
      })

      var bigZoomIn = document.createElement('img')
      //bigZoomIn.type = "image";
      bigZoomIn.src = this.resolveUrl('img/Empty.png')
      bigZoomIn.id = 'bigZoomIn'
      bigZoomIn.className = 'icon nav'
      navbox.appendChild(bigZoomIn)
      dojo.connect(bigZoomIn, 'click', this, function (event) {
        dojo.stopEvent(event)
        this.view.zoomIn(undefined, undefined, 2)
      })

      navbox.appendChild(document.createTextNode(four_nbsp))

      // default search box is location box
      var locationMode = ''
      var locationWidth = '40ex'
      if (this.config.locationBox === 'separate') {
        // separate location box
        locationMode = 'separate-location-box'
        locationWidth = '25ex'
      }

      var searchbox = dojo.create(
        'span',
        {
          id: 'search-box',
          class: locationMode,
        },
        navbox,
      )

      // if we have fewer than 30 ref seqs, or `refSeqDropdown: true` is
      // set in the config, then put in a dropdown box for selecting
      // reference sequences
      var refSeqSelectBoxPlaceHolder = dojo.create(
        'span',
        { id: 'search-refseq' },
        searchbox,
      )

      // make the location search box
      this.locationBox = new dijitComboBox(
        {
          id: 'location',
          name: 'location',
          style: { width: locationWidth },
          maxLength: 400,
          searchAttr: 'name',
          title: 'Enter a chromosomal position, symbol or ID to search',
        },
        dojo.create('input', {}, searchbox),
      )

      this.afterMilestone(
        'loadNames',
        dojo.hitch(this, function () {
          if (this.nameStore) {
            this.locationBox.set('store', this.nameStore)
          }
        }),
      )

      this.locationBox.focusNode.spellcheck = false
      dojo.query('div.dijitArrowButton', this.locationBox.domNode).orphan()
      dojo.connect(
        this.locationBox.focusNode,
        'keydown',
        this,
        function (event) {
          if (event.keyCode == keys.ESCAPE) {
            this.locationBox.set('value', '')
          } else if (event.keyCode == keys.ENTER) {
            this.locationBox.closeDropDown(false)
            this.navigateTo(this.locationBox.get('value'))
            this.goButton.set('disabled', true)
            dojo.stopEvent(event)
          } else {
            this.goButton.set('disabled', false)
          }
        },
      )
      dojo.connect(navbox, 'onselectstart', function (evt) {
        evt.stopPropagation()
        return true
      })

      // monkey-patch the combobox code to make a few modifications
      ;(function () {
        var PatchedDropDownClass = dojo.declare(
          this.locationBox.dropDownClass,
          {
            // add a moreMatches class to our hacked-in "more options" option
            _createOption: function (item) {
              var option = this.inherited(arguments)
              if (item.hitLimit) {
                dojo.addClass(option, 'moreMatches')
              }
              return option
            },
            // prevent the "more matches" option from being clicked
            onClick: function (node) {
              if (dojo.hasClass(node, 'moreMatches')) {
                return null
              }

              var ret = this.inherited(arguments)
              thisB.navigateTo(thisB.locationBox.get('value'))
              return ret
            },
          },
        )
        this.locationBox.dropDownClass = PatchedDropDownClass
      }).call(this)

      // make the 'Go' button
      this.goButton = new dijitButton(
        {
          label: 'Go',
          onClick: dojo.hitch(this, function (event) {
            this.navigateTo(this.locationBox.get('value'))
            this.goButton.set('disabled', true)
            dojo.stopEvent(event)
          }),
          id: 'search-go-btn',
        },
        dojo.create('button', {}, searchbox),
      )

      this.highlightButtonPreviousState = false

      // create location box
      // if in config "locationBox": "separate", then the search box will be the location box.
      if (this.config.locationBox === 'separate') {
        // eslint-disable-next-line xss/no-mixed-html
        this.locationInfoBox = domConstruct.place(
          "<div id='location-info'>location</div>",
          // eslint-disable-next-line xss/no-mixed-html
          navbox,
        )
      }

      // make the highligher button
      this.highlightButton = new dojoxTriStateCheckBox(
        {
          //label: 'Highlight',
          title: 'Highlight a Region',
          id: 'highlight-btn',
          states: [false, true, 'mixed'],
          onChange: function () {
            if (this.get('checked') == true) {
              thisB.view._rubberStop()
              thisB.view.behaviorManager.swapBehaviors(
                'normalMouse',
                'highlightingMouse',
              )
            } else if (this.get('checked') == false) {
              var h = thisB.getHighlight()
              if (h) {
                thisB.clearHighlight()
                thisB.view.redrawRegion(h)
              }
            } else {
              // mixed
              // Uncheck since user is cycling three-state instead
              // of programmatically landing in mixed state
              if (thisB.highlightButtonPreviousState != true) {
                thisB.highlightButton.set('checked', false)
              } else {
                thisB.highlightButtonPreviousState = false
              }
              thisB.view._rubberStop()
              thisB.view.behaviorManager.swapBehaviors(
                'highlightingMouse',
                'normalMouse',
              )
            }
          },
        },
        dojo.create('button', { id: 'highlight-btn' }, navbox),
      )

      this.subscribe('/jbrowse/v1/n/globalHighlightChanged', function () {
        thisB.highlightButton.set('checked', false)
      })

      this.afterMilestone(
        'loadRefSeqs',
        dojo.hitch(this, function () {
          // make the refseq selection dropdown
          if (this.refSeqOrder && this.refSeqOrder.length) {
            var max = this.config.refSeqSelectorMaxSize || 30
            var numrefs = Math.min(max, this.refSeqOrder.length)
            var options = []
            for (var i = 0; i < numrefs; i++) {
              options.push({
                label: this.refSeqOrder[i],
                value: this.refSeqOrder[i],
              })
            }
            var tooManyMessage = `(first ${numrefs} ref seqs)`
            if (this.refSeqOrder.length > max) {
              options.push({
                label: tooManyMessage,
                value: tooManyMessage,
                disabled: true,
              })
            }
            this.refSeqSelectBox = new dijitSelectBox({
              name: 'refseq',
              value: this.refSeq ? this.refSeq.name : null,
              options: options,
              onChange: dojo.hitch(this, function (newRefName) {
                // don't trigger nav if it's the too-many message
                if (newRefName == tooManyMessage) {
                  this.refSeqSelectBox.set('value', this.refSeq.name)
                  return
                }

                // only trigger navigation if actually switching sequences
                if (newRefName != this.refSeq.name) {
                  this.navigateToLocation({
                    ref: newRefName,
                  })
                }
              }),
            }).placeAt(refSeqSelectBoxPlaceHolder)
          }

          // calculate how big to make the location box:  make it big enough to hold the
          var locLength =
            this.config.locationBoxLength ||
            function () {
              // if we have no refseqs, just use 20 chars
              if (!this.refSeqOrder.length) {
                return 20
              }

              // if there are not tons of refseqs, pick the longest-named
              // one.  otherwise just pick the last one
              var ref =
                (this.refSeqOrder.length < 1000 &&
                  function () {
                    var longestNamedRef
                    array.forEach(
                      this.refSeqOrder,
                      function (name) {
                        var ref = this.allRefs[name]
                        if (!ref.length) {
                          ref.length = ref.end - ref.start + 1
                        }
                        if (
                          !longestNamedRef ||
                          longestNamedRef.length < ref.length
                        ) {
                          longestNamedRef = ref
                        }
                      },
                      this,
                    )
                    return longestNamedRef
                  }.call(this)) ||
                (this.refSeqOrder.length &&
                  this.allRefs[
                    this.refSeqOrder[this.refSeqOrder.length - 1]
                  ]) ||
                20

              var locstring = Util.assembleLocStringWithLength({
                ref: ref.name,
                start: ref.end - 1,
                end: ref.end,
                length: ref.length,
              })
              //console.log( locstring, locstring.length );
              return locstring.length
            }.call(this) ||
            20

          this.locationBox.domNode.style.width = `${locLength}ex`
        }),
      )

      return navbox
    },
    /**
     * Return the current highlight region, or null if none.
     */
    getHighlight: function () {
      return this._highlight || null
    },

    getBookmarks: function () {
      if (this.config.bookmarkService) {
        return request(
          `${this.config.bookmarkService}?${ioQuery.objectToQuery({
            sequence: this.refSeq.name,
            organism: this.config.dataset_id,
          })}`,
          {
            handleAs: 'json',
          },
        )
      } else {
        return this.config.bookmarks
      }
    },

    /**
     * Set a new highlight.  Returns the new highlight.
     */
    setHighlight: function (newHighlight) {
      if (newHighlight && newHighlight instanceof Location) {
        this._highlight = newHighlight
      } else if (newHighlight) {
        this._highlight = new Location(newHighlight)
      }

      this.publish('/jbrowse/v1/n/globalHighlightChanged', [this._highlight])

      return this.getHighlight()
    },

    _updateHighlightClearButton: function () {
      var isHighlightSet = !!this._highlight
      if (this._highlightClearButton) {
        this._highlightClearButton.set('disabled', !isHighlightSet)
        //this._highlightClearButton.set( 'label', 'Clear highlight' + ( this._highlight ? ' - ' + this._highlight : '' ));
      }
      if (this.highlightButton) {
        this.highlightButton.set('checked', isHighlightSet ? 'mixed' : false)
        this.highlightButtonPreviousState = isHighlightSet
      }
    },

    clearHighlight: function () {
      if (this._highlight) {
        delete this._highlight
        this.publish('/jbrowse/v1/n/globalHighlightChanged', [])
      }
    },

    setHighlightAndRedraw: function (location) {
      location = this.regularizeLocation(location)

      var oldHighlight = this.getHighlight()
      if (oldHighlight) {
        this.view.hideRegion(oldHighlight)
      }
      this.view.hideRegion(location)
      this.setHighlight(location)
      this.view.showVisibleBlocks(false)
    },

    /**
     * Shows a region that has been searched for someplace else in the UI.
     * Highlights it if this.config.highlightSearchedRegions is true.
     */
    showRegionAfterSearch: function (location) {
      location = this.regularizeLocation(location)

      if (this.config.highlightSearchedRegions) {
        var oldHighlight = this.getHighlight()
        if (oldHighlight) {
          this.view.hideRegion(oldHighlight)
        }
        this.view.hideRegion(location)
        this.setHighlight(location)
      }
      this.showRegion(location)
    },
    showRegionWithHighlight: function () {
      // backcompat
      return this.showRegionAfterSearch.apply(this, arguments)
    },

    /**
     * Tear it all down: remove all subscriptions, destroy widgets and DOM
     */
    teardown: function () {
      for (var id in this._subscription) {
        this._subscription[id].remove()
      }

      if (this.containerWidget) {
        this.containerWidget.destroyRecursive(true)
      }

      while (this.container && this.container.firstChild) {
        this.container.removeChild(this.container.firstChild)
      }
    },
  })
})

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
