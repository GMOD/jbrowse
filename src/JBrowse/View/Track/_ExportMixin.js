define( [
            'dojo/_base/declare',
            'dojo/_base/lang',

            'JBrowse/Util',
            'JBrowse/Util/DeferredGenerator',
            'JBrowse/has',
            'JBrowse/View/Dialog/TrackExport'
        ],
        function(
            declare,
            lang,

            Util,
            DeferredGenerator,
            has,
            ExportDialog
        ) {

/**
 * Mixin for a track that can export its data.
 * @lends JBrowse.View.Track.ExportMixin
 */
var ExportMixin = declare( null, {

    configSchema: {
        slots: [
            { name: 'noExport', type: 'boolean',
              description: 'if set to true, disable data export for this track',
              defaultValue: false
            },
            { name: 'noExportFiles', type: 'boolean',
              description: 'if set to true, disables data export to on-disk files for this track',
              defaultValue: false
            },
            { name: 'maxExportSpan', type: 'integer',
              description: 'maximum size of region span that can be exported from this track'
            },
            { name: 'maxExportFeatures', type: 'integer',
              description: "Maximum number of features that can be exported from"
                           + " this track.  Note: this is compared against the"
                           + " estimated number of features in a given region,"
                           + " based on the dataset's (possibly approximate) statistics.",
              defaultValue: 5000
            }
        ]
    },

    _canSaveFiles: function() {
        return has('save-generated-files') && ! this.getConf('noExportFiles');
    },

    _canExport: function() {
        if( this.getConf('noExport') )
            return false;

        var visibleRegion = this.genomeView.visibleRegion();
        var highlightedRegion = this.browser.getHighlight();
        var canExportVisibleRegion = this._canExportRegion( visibleRegion );
        var canExportWholeRef = this._canExportRegion( this.refSeq );
        return highlightedRegion && this._canExportRegion( highlightedRegion )
            || this._canExportRegion( visibleRegion )
            || this._canExportRegion( this.refSeq );
    },

    _possibleExportRegions: function() {
        var regions = [
            // the visible region
            { region: this.genomeView.visibleRegion(),
              description: 'Visible region',
              name: 'visible'
            },
            // whole reference sequence
            { region: this.refSeq,
              description: 'Whole reference sequence',
              name: 'wholeref'
            }
        ];

        var highlightedRegion = this.browser.getHighlight();
        if( highlightedRegion )
            regions.unshift( { region: highlightedRegion, description: "Highlighted region", name: "highlight" } );

        return regions;
    },

    exportRegion: function( region, format ) {

        // we can only export from the currently-visible reference
        // sequence right now
        if( region.get('seq_id') != this.refSeq.get('seq_id') ) {
            throw new Error("cannot export data for ref seq "+region.get('seq_id')+", "
                            + "exporting is currently only supported for the "
                            + "currently-visible reference sequence" );
        }

        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            return Util.loadJSClass( 'JBrowse/View/Export/'+format )
                .then(function( exportDriver ) {
                          return new exportDriver(
                                  {
                                      refSeq: thisB.refSeq,
                                      browser: thisB.browser,
                                      store: thisB.store
                                  })
                              .exportRegion(
                                  {
                                      ref: region.get('seq_id'),
                                      start: region.get('start'),
                                      end: region.get('end')
                                  })
                              .forEach( lang.hitch( generator, 'emit' ) );
              });
        });
    },

    _trackMenuOptions: function() {
        var thisB = this;
        var opts = this.inherited(arguments);

        if( ! this.getConf('noExport') )
            // add a "Save track data as" option to the track menu
            opts.push({ label: 'Save track data',
                        iconClass: 'dijitIconSave',
                        disabled: ! this._canExport(),
                        action: function() {
                           var d = new ExportDialog(
                                { track: thisB,
                                  browser: thisB.browser,
                                  className: 'export-dialog',
                                  browser: thisB.browser
                                });
                            d.show();
                        }
                      });

        return opts;
    },

    _canExportRegion: function( region ) {
        //console.log('can generic export?');
        if( ! region ) return false;

        // if we have a maxExportSpan configured for this track, use it.
        if( this.getConf('maxExportSpan') ) {
            return region.get('end') - region.get('start') + 1 <= this.getConf('maxExportSpan');
        }
        else {
            // if we know the store's feature density, then use that with
            // a limit of maxExportFeatures or 5,000 features
            var thisB = this;
            var storeStats = {};
            // will return immediately if the stats are available
            this.store.getRegionStats( this.makeStoreQuery( region ) )
                .then( function( s ) { storeStats = s; } );
            if( storeStats.featureDensity ) {
                return storeStats.featureDensity*(region.get('end') - region.get('start')) <= thisB.getConf('maxExportFeatures');
            }
        }

        // otherwise, i guess we can export
        return true;
    }

});

return ExportMixin;
});
