define( [
            'dojo/_base/array',
            'dojo/aspect',
            'dojo/has',
            'JBrowse/Util',
            'dijit/form/Button',
            'dijit/form/RadioButton',
            'dijit/Dialog'
        ],
        function( array, aspect, has, Util, dijitButton, dijitRadioButton, dijitDialog ) {
/**
 * Mixin for a track that can export its data.
 * @lends JBrowse.View.Track.ExportMixin
 */

return {

    _canExport: function() {
        if( this.config.noExport )
            return false;

        var visibleRegion = this.browser.view.visibleRegion();
        var wholeRefSeqRegion = { ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end };
        var canExportVisibleRegion = this._canExportRegion( visibleRegion );
        var canExportWholeRef = this._canExportRegion( wholeRefSeqRegion );
        return canExportVisibleRegion || canExportWholeRef;
    },

    _possibleExportRegions: function() {
        return [
            // the visible region
            (function() {
                 var r = dojo.clone( this.browser.view.visibleRegion() );
                 r.description = 'Visible region';
                 r.name = 'visible';
                 return r;
             }.call(this)),
            // whole reference sequence
            { ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end, description: 'Whole reference sequence', name: 'wholeref' }
        ];
    },

    _exportDialogContent: function() {
        // note that the `this` for this content function is not the track, it's the menu-rendering context
        var possibleRegions = this.track._possibleExportRegions();

        // for each region, calculate its length and determine whether we can export it
        array.forEach( possibleRegions, function( region ) {
            region.length = Math.round( region.end - region.start + 1 );
            region.canExport = this._canExportRegion( region );
        },this.track);

        var form = dojo.create('form', { onSubmit: function() { return false; } });
        form.innerHTML = ''
            + ' <fieldset class="region">'
            + '   <legend>Region to save</legend>'
            + function() {
                    var regions = '';
                    var checked = 0;
                    array.forEach( possibleRegions, function(r) {
                       var locstring = Util.assembleLocString(r);
                       regions += ' <input '+( r.canExport ? checked++ ? '' : ' checked="checked"' : ' disabled="disabled"' )
                               + '     type="radio" data-dojo-type="dijit.form.RadioButton" name="region" id="region_'+r.name+'"'
                               + '     value="'+locstring+'" />'
                               + '   <label '+( r.canExport ? '' : ' class="ghosted"')+' for="region_'+r.name+'">'+r.description+' - <span class="locString">'
                               +         locstring+'</span> ('+Util.humanReadableNumber(r.length)+(r.canExport ? 'b' : 'b, too large')+')</label>'
                               + '   <br>';
                   });
                   return regions;

              }.call(this)
            + ' </fieldset>'
            + ' '
            + ' <fieldset class="format">'
            + '   <legend>Format</legend>'
            + function() {
                   var fmts = '';
                   var checked = 0;
                   array.forEach( this.track._exportFormats(), function(fmt) {
                       fmts += ' <input type="radio" '+ (checked++?'':'checked="checked" ')
                               +'      data-dojo-type="dijit.form.RadioButton" name="format" id="format'+fmt+'" value="'+fmt+'" />'
                               + '   <label for="format'+fmt+'">'+fmt+'</label>'
                               + '   <br>';
                   });
                   return fmts;
              }.call(this)
            + ' </fieldset>';

        var actionBar = dojo.create( 'div', {
            className: 'dijitDialogPaneActionBar'
        });

        // note that the `this` for this content function is not the track, it's the menu-rendering context
        var dialog = this.dialog;

        new dijitButton({ iconClass: 'dijitIconDelete', onClick: dojo.hitch(dialog,'hide'), label: 'Cancel' })
            .placeAt( actionBar );
        var viewButton = new dijitButton({ iconClass: 'dijitIconTask',
                          label: 'View',
                          disabled: ! array.some(possibleRegions,function(r) { return r.canExport; }),
                          onClick: dojo.hitch( this.track, function() {
                            viewButton.set('disabled',true);
                            viewButton.set('iconClass','jbrowseIconBusy');

                            var region = this._readRadio( form.elements.region );
                            var format = this._readRadio( form.elements.format );
                            this.exportRegion( region, format, function(output) {
                                dialog.hide();
                                var text = dojo.create('textarea', {
                                                           rows: 30,
                                                           wrap: 'soft',
                                                           cols: 80,
                                                           readonly: true
                                                       });
                                text.value = output;
                                var exportView = new dijitDialog({
                                    className: 'export-view-dialog',
                                    title: format + ' export - <span class="locString">'+ region+'</span>',
                                    content: text
                                });
                                aspect.after( exportView, 'hide', function() {
                                    text.parentNode.removeChild( text ); // manually unhook and free the (possibly huge) text area
                                    text = null;
                                    exportView.destroyRecursive();
                                });
                                exportView.show();
                            });
                          })})
            .placeAt( actionBar );

        // don't show a download button if the user is using IE older
        // than 10, cause it won't work.
        if( ! (has('ie') < 10) ) {
            var dlButton = new dijitButton({ iconClass: 'dijitIconSave',
                              label: 'Download',
                              disabled: ! array.some(possibleRegions,function(r) { return r.canExport; }),
                              onClick: dojo.hitch( this.track, function() {
                                var format = this._readRadio( form.elements.format );
                                var region = this._readRadio( form.elements.region );
                                dlButton.set('disabled',true);
                                dlButton.set('iconClass','jbrowseIconBusy');
                                this.exportRegion( region, format, function( output ) {
                                    dialog.hide();
                                    window.location.href="data:application/x-"+format.toLowerCase()+","+escape(output);
                                });
                              })})
                .placeAt( actionBar );
        }

        return [ form, actionBar ];
    },

    // cross-platform function for (portably) reading the value of a radio control. sigh. *rolls eyes*
    _readRadio: function( r ) {
        if( r.length ) {
            for( var i = 0; i<r.length; i++ ) {
                if( r[i].checked )
                    return r[i].value;
            }
        }
        return r.value;
    },

    exportRegion: function( region, format, callback ) {
        // parse the locstring if necessary
        if( typeof region == 'string' )
            region = Util.parseLocString( region );

        // we can only export from the currently-visible reference
        // sequence right now
        if( region.ref != this.refSeq.name ) {
            console.error("cannot export data for ref seq "+region.ref+", "
                          + "exporting is currently only supported for the "
                          + "currently-visible reference sequence" );
            return;
        }

        require( ['JBrowse/View/Export/'+format], dojo.hitch(this,function( exportDriver ) {
            new exportDriver({
                refSeq: this.refSeq,
                track: this,
                store: this.store
            }).exportRegion( region, callback );
        }));
    },

    _trackMenuOptions: function() {
        var opts = this.inherited(arguments);

        if( ! this.config.noExport )
            // add a "Save track data as" option to the track menu
            opts.push({ label: 'Save track data',
                        iconClass: 'dijitIconSave',
                        disabled: ! this._canExport(),
                        action: 'contentDialog',
                        content: this._exportDialogContent,
                        dialog: { id: 'exportDialog', className: 'export-dialog' }
                      });

        return opts;
    },

    _canExportRegion: function( l ) {
        //console.log('can generic export?');
        if( ! l ) return false;

        // if we have a maxExportSpan configured for this track, use it.
        if( typeof this.config.maxExportSpan == 'number' || typeof this.config.maxExportSpan == 'string' ) {
            return l.end - l.start + 1 <= this.config.maxExportSpan;
        }
        else {
            // if we know the store's feature density, then use that with
            // a limit of maxExportFeatures or 5,000 features
            var storeStats = this.store.getGlobalStats();
            if( storeStats.featureDensity )
                return storeStats.featureDensity*(l.end - l.start) <= ( this.config.maxExportFeatures || 5000 );
        }

        // otherwise, i guess we can export
        return true;
    }

};
});
