const hash = cjsRequire('object-hash')

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/json',
  'dojo/request',

  'JBrowse/Util',
  'JBrowse/Digest/Crc32',
], function (
  declare,
  lang,
  array,
  json,
  request,

  Util,
  digest,
) {
  var dojof = Util.dojof

  return declare(
    'JBrowse.ConfigAdaptor.JB_json_v1',
    null,

    /**
     * @lends JBrowse.ConfigAdaptor.JB_json_v1.prototype
     */
    {
      /**
       * Configuration adaptor for JBrowse JSON version 1 configuration
       * files (formerly known as trackList.json files).
       * @constructs
       */
      constructor: function () {},

      /**
       * Load the configuration file from a URL.
       *
       * @param args.config.url {String} URL for fetching the config file.
       */
      load: function (/**Object*/ args) {
        var that = this
        if (args.config.url) {
          var url = Util.resolveUrl(
            args.baseUrl || window.location.href,
            args.config.url,
          )
          return request(
            url + (args.config.cacheBuster ? '?v=' + Math.random() : ''),
            {
              handleAs: 'text',
              headers: { 'X-Requested-With': null },
            },
          ).then(function (o) {
            o = that.parse_conf(o, args) || {}
            o.sourceUrl = url
            o = that.regularize_conf(o, args)
            return o
          })
        } else if (args.config.data) {
          return Util.resolved(this.regularize_conf(args.config.data, args))
        }
      },

      /**
       * In this adaptor, just evals the conf text to parse the JSON, but
       * other conf adaptors might want to inherit and override this.
       * @param {String} conf_text the configuration text
       * @param {Object} load_args the arguments that were passed to <code>load()</code>
       * @returns {Object} the parsed JSON
       */
      parse_conf: function (conf_text, load_args) {
        try {
          return json.fromJson(conf_text)
        } catch (e) {
          throw (
            e +
            ' when parsing ' +
            (load_args.config.url || 'configuration') +
            '.'
          )
        }
      },

      /**
       * Applies defaults and any other necessary tweaks to the loaded JSON
       * configuration.  Called by <code>load()</code> on the JSON
       * configuration before it calls the <code>onSuccess</code> callback.
       * @param {Object} o the object containing the configuration, which it
       *                   modifies in-place
       * @param {Object} load_args the arguments that were passed to <code>load()</code>
       * @returns the same object it was passed
       */
      regularize_conf: function (o, load_args) {
        // if tracks is not an array, convert it to one
        if (o.tracks && !lang.isArray(o.tracks)) {
          // if it's a single track config, wrap it in an arrayref
          if (o.tracks.label) {
            o.tracks = [o.tracks]
          }
          // otherwise, coerce it to an array
          else {
            var tracks = []
            for (var label in o.tracks) {
              if (!('label' in o.tracks[label])) {
                o.tracks[label].label = label
              }
              tracks.push(o.tracks[label])
            }
            o.tracks = tracks
          }
        }

        // regularize trackMetadata.sources
        var meta = o.trackMetadata
        if (meta && meta.sources) {
          // if it's a single source config, wrap it in an arrayref
          if (meta.sources.url || typeof meta.sources == 'string') {
            meta.sources = [meta.sources]
          }

          if (!lang.isArray(meta.sources)) {
            var sources = []
            for (var name in meta.sources) {
              if (!('name' in meta.sources)) {
                meta.sources[name].name = name
              }
              sources.push(meta.sources[name])
            }
            meta.sources = sources
          }

          // coerce any string source defs to be URLs, and try to detect their types
          array.forEach(meta.sources, function (sourceDef, i) {
            if (typeof sourceDef == 'string') {
              meta.sources[i] = { url: sourceDef }
              var typeMatch = sourceDef.match(/\.(\w+)$/)
              if (typeMatch) {
                meta.sources[i].type = typeMatch[1].toLowerCase()
              }
            }
          })
        }

        o.sourceUrl = o.sourceUrl || load_args.config.url
        o.baseUrl = o.baseUrl || Util.resolveUrl(o.sourceUrl, '.')
        if (o.baseUrl.length && !/\/$/.test(o.baseUrl)) {
          o.baseUrl += '/'
        }

        if (o.sourceUrl) {
          // set a default baseUrl in each of the track and store
          // confs, and the names conf, if needed
          var addBase = []
            .concat(o.tracks || [])
            .concat(dojof.values(o.stores || {}))
          if (o.names) {
            addBase.push(o.names)
          }

          array.forEach(
            addBase,
            function (t) {
              if (!t.baseUrl) {
                t.baseUrl = o.baseUrl || '/'
              }
            },
            this,
          )

          //resolve the refSeqs and nameUrl if present
          if (o.refSeqs && typeof o.refSeqs == 'string') {
            o.refSeqs = Util.resolveUrl(o.sourceUrl, o.refSeqs)
          }
          if (o.nameUrl) {
            o.nameUrl = Util.resolveUrl(o.sourceUrl, o.nameUrl)
          }
        }

        o = this.regularizeTrackConfigs(o)

        return o
      },
      regularizeTrackConfigs: function (conf) {
        conf.stores = conf.stores || {}

        array.forEach(
          conf.tracks || [],
          function (trackConfig) {
            // if there is a `config` subpart,
            // just copy its keys in to the
            // top-level config
            if (trackConfig.config) {
              var c = trackConfig.config
              delete trackConfig.config
              for (var prop in c) {
                if (!(prop in trackConfig) && c.hasOwnProperty(prop)) {
                  trackConfig[prop] = c[prop]
                }
              }
            }

            // skip if it's a new-style track def
            if (trackConfig.store) {
              return
            }

            var trackClassName = this._regularizeClass(
              'JBrowse/View/Track',
              {
                FeatureTrack: 'JBrowse/View/Track/HTMLFeatures',
                ImageTrack: 'JBrowse/View/Track/FixedImage',
                'ImageTrack.Wiggle': 'JBrowse/View/Track/FixedImage/Wiggle',
                SequenceTrack: 'JBrowse/View/Track/Sequence',
              }[trackConfig.type] || trackConfig.type,
            )
            trackConfig.type = trackClassName

            this._synthesizeTrackStoreConfig(conf, trackConfig)

            if (trackConfig.histograms) {
              if (!trackConfig.histograms.baseUrl) {
                trackConfig.histograms.baseUrl = trackConfig.baseUrl
              }
              this._synthesizeTrackStoreConfig(conf, trackConfig.histograms)
            }
          },
          this,
        )

        return conf
      },

      _synthesizeTrackStoreConfig: function (mainconf, trackConfig) {
        // figure out what data store class to use with the track,
        // applying some defaults if it is not explicit in the
        // configuration
        var urlTemplate = trackConfig.urlTemplate
        var storeClass = this._regularizeClass(
          'JBrowse/Store',
          trackConfig.storeClass
            ? trackConfig.storeClass
            : /\/FixedImage/.test(trackConfig.type)
              ? 'JBrowse/Store/TiledImage/Fixed' +
                (trackConfig.backendVersion == 0 ? '_v0' : '')
              : /\.jsonz?$/i.test(urlTemplate)
                ? 'JBrowse/Store/SeqFeature/NCList' +
                  (trackConfig.backendVersion == 0 ? '_v0' : '')
                : /\.bam$/i.test(urlTemplate)
                  ? 'JBrowse/Store/SeqFeature/BAM'
                  : /\.cram$/i.test(urlTemplate)
                    ? 'JBrowse/Store/SeqFeature/CRAM'
                    : /\.gff3?$/i.test(urlTemplate)
                      ? 'JBrowse/Store/SeqFeature/GFF3'
                      : /\.bed$/i.test(urlTemplate)
                        ? 'JBrowse/Store/SeqFeature/BED'
                        : /\.vcf.gz$/i.test(urlTemplate)
                          ? 'JBrowse/Store/SeqFeature/VCFTabix'
                          : /\.gff3?.gz$/i.test(urlTemplate)
                            ? 'JBrowse/Store/SeqFeature/GFF3Tabix'
                            : /\.bed.gz$/i.test(urlTemplate)
                              ? 'JBrowse/Store/SeqFeature/BEDTabix'
                              : /\.(bw|bigwig)$/i.test(urlTemplate)
                                ? 'JBrowse/Store/SeqFeature/BigWig'
                                : /\.(bb|bigbed)$/i.test(urlTemplate)
                                  ? 'JBrowse/Store/SeqFeature/BigBed'
                                  : /\.(fa|fasta)$/i.test(urlTemplate)
                                    ? 'JBrowse/Store/SeqFeature/IndexedFasta'
                                    : /\.(fa|fasta)\.gz$/i.test(urlTemplate)
                                      ? 'JBrowse/Store/SeqFeature/BgzipIndexedFasta'
                                      : /\.2bit$/i.test(urlTemplate)
                                        ? 'JBrowse/Store/SeqFeature/TwoBit'
                                        : /\/Sequence$/.test(trackConfig.type)
                                          ? 'JBrowse/Store/Sequence/StaticChunked'
                                          : null,
        )

        if (!storeClass) {
          console.warn(
            "Unable to determine an appropriate data store to use with track '" +
              trackConfig.label +
              "', please explicitly specify a " +
              'storeClass in the configuration.',
          )
          return
        }

        // synthesize a separate store conf
        var storeConf = lang.mixin({}, trackConfig)
        lang.mixin(storeConf, {
          type: storeClass,
        })

        // if this is the first sequence store we see, and we
        // have no refseqs store defined explicitly, make this the refseqs store.
        if (
          (storeClass == 'JBrowse/Store/Sequence/StaticChunked' ||
            storeClass == 'JBrowse/Store/Sequence/IndexedFasta' ||
            storeClass == 'JBrowse/Store/SeqFeature/IndexedFasta' ||
            storeClass == 'JBrowse/Store/SeqFeature/BgzipIndexedFasta' ||
            storeClass == 'JBrowse/Store/SeqFeature/TwoBit' ||
            storeClass == 'JBrowse/Store/Sequence/TwoBit' ||
            trackConfig.useAsRefSeqStore) &&
          !mainconf.stores['refseqs']
        ) {
          storeConf.name = 'refseqs'
        } else {
          storeConf.name = 'store' + hash(storeConf)
        }
        // record it
        mainconf.stores[storeConf.name] = storeConf

        // connect it to the track conf
        trackConfig.store = storeConf.name
      },

      _regularizeClass: function (root, class_) {
        if (!class_) {
          return null
        }

        // prefix the class names with JBrowse/* if they contain no slashes
        if (!/\//.test(class_)) {
          class_ = root + '/' + class_
        }
        class_ = class_.replace(/^\//)
        return class_
      },
    },
  )
})
