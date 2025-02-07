import 'babel-polyfill'

require([
  'JBrowse/Browser',
  'JBrowse/Util',
  'JBrowse/QueryParamConfigMapper',
  'dojo/io-query',
  'dojo/json',
  'css!../../css/genome.scss',

  // instruct build/glob-loader.js to insert includes for every bit of JBrowse and plugin code
  //!! glob-loader, please include every JBrowse and plugin module here
], function (Browser, Util, QueryParamConfigMapper, ioQuery, JSON) {
  // the initial configuration of this JBrowse
  // instance

  // NOTE: this initial config is the same as any
  // other JBrowse config in any other file.  this
  // one just sets defaults from URL query params.
  // If you are embedding JBrowse in some other app,
  // you might as well just set this initial config
  // to something like { include: '../my/dynamic/conf.json' },
  // or you could put the entire
  // dynamically-generated JBrowse config here.

  // parse the query vars in the page URL
  var queryParams = ioQuery.queryToObject(window.location.search.slice(1))

  var config = {
    containerID: 'GenomeBrowser',

    dataRoot: queryParams.data,
    queryParams: queryParams,
    location: queryParams.loc,
    forceTracks: queryParams.tracks,
    initialHighlight: queryParams.highlight,
    show_nav: queryParams.nav,
    show_tracklist: queryParams.tracklist,
    show_overview: queryParams.overview,
    show_menu: queryParams.menu,
    show_fullviewlink: queryParams.fullviewlink,
    show_tracklabels: queryParams.tracklabels,
    update_browser_title: queryParams.browsertitle,
    highResolutionMode: queryParams.highres,
    stores: {
      url: { type: 'JBrowse/Store/SeqFeature/FromConfig', features: [] },
    },
    bookmarks: {},
    makeFullViewURL: function (browser) {
      // the URL for the 'Full view' link
      // in embedded mode should be the current
      // view URL, except with 'nav', 'tracklist',
      // and 'overview' parameters forced to 1.

      return browser.makeCurrentViewURL({
        nav: 1,
        tracklist: 1,
        overview: 1,
      })
    },
    electronData:
      queryParams.electronData ||
      (Util.isElectron() &&
        electronRequire('electron').remote.app.getPath('userData')),
  }
  dojo.addOnLoad(() => {
    // see if we can load some configuration from the data-config attribute of our container
    try {
      let elementConfig = document
        .getElementById(config.containerID)
        .getAttribute('data-config')
      if (elementConfig) {
        if (!/^\s*{/.test(elementConfig)) {
          elementConfig = `{${elementConfig}}`
        }
        elementConfig = JSON.parse(elementConfig)
        config = Object.assign({}, config, elementConfig)
      }
    } catch (e) {
      console.error(e)
    }

    //if there is ?addFeatures in the query params,
    //define a store for data from the URL
    if (queryParams.addFeatures) {
      config.stores.url.features = JSON.parse(queryParams.addFeatures)
    }

    // if there is ?addTracks in the query params, add
    // those track configurations to our initial
    // configuration
    if (queryParams.addTracks) {
      config.tracks = JSON.parse(queryParams.addTracks)
    }

    // if there is ?addBookmarks, add those to configuration
    if (queryParams.addBookmarks) {
      config.bookmarks.features = JSON.parse(queryParams.addBookmarks)
    }

    // if there is ?addStores in the query params, add
    // those store configurations to our initial
    // configuration
    if (queryParams.addStores) {
      config.stores = JSON.parse(queryParams.addStores)
    }

    // this handles dot notation versions of addTracks, addBookmarks, and addStores
    // see config doc for details
    QueryParamConfigMapper().handleQueryParams(config, queryParams)

    // create a JBrowse global variable holding the JBrowse instance
    window.JBrowse = new Browser(config)

    window.JBrowse.afterMilestone('loadRefSeqs', function () {
      dojo.destroy(dojo.byId('LoadingScreen'))
    })
  })
})
