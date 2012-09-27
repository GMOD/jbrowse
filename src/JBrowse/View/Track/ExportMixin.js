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
        var visibleRegionStr = this.browser.visibleRegion();
        var wholeRefSeqStr = Util.assembleLocString({ ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end });
        var canExportVisibleRegion = this._canExportRegion( visibleRegionStr );
        var canExportWholeRef = this._canExportRegion( wholeRefSeqStr );
        return canExportVisibleRegion || canExportWholeRef;
    },

    _exportDialogContent: function() {
        // note that the `this` for this content function is not the track, it's the menu-rendering context
        var visibleRegionStr = this.browser.visibleRegion();
        var wholeRefSeqStr = Util.assembleLocString({ ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end });
        var canExportVisibleRegion = this.track._canExportRegion( visibleRegionStr );
        var canExportWholeRef = this.track._canExportRegion( wholeRefSeqStr );

        var form = dojo.create('form', { onSubmit: function() { return false; } });
        form.innerHTML = ''
            + ' <fieldset class="region">'
            + '   <legend>Region to save</legend>'
            + '   <input '+( canExportVisibleRegion ? '' : ' disabled="disabled"' )
            +'      type="radio" data-dojo-type="dijit.form.RadioButton" name="region" id="regionVisible" value="'+visibleRegionStr+'" />'
            + '   <label '+( canExportVisibleRegion ? '' : ' class="ghosted"')+' for="regionVisible">Visible region - <span class="locString">'
            +       visibleRegionStr+(canExportVisibleRegion ? '' : ' (too large, please zoom in)')+'</span></label>'
            + '   <br>'
            + '   <input '+( canExportWholeRef ? '' : ' disabled="disabled"' )+' type="radio" data-dojo-type="dijit.form.RadioButton" name="region" id="regionRefSeq" value="'+wholeRefSeqStr+'" />'
            + '   <label '+( canExportWholeRef ? '' : ' class="ghosted" ' )+' for="regionRefSeq">Whole reference sequence - <span class="locString">'+wholeRefSeqStr+(canExportWholeRef ? '' : ' (too large)')+'</span></label>'
            + '   <br>'
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
        new dijitButton({ iconClass: 'dijitIconTask',
                          label: 'View',
                          disabled: !(canExportVisibleRegion || canExportWholeRef ),
                          onClick: dojo.hitch( this.track, function() {
                            var region = form.elements.region.value;
                            var format = form.elements.format.value;
                            this.exportRegion( region, format, function(output) {
                                dialog.hide();
                                var text = dojo.create('textarea', {
                                                           rows: 30,
                                                           wrap: 'soft',
                                                           cols: 80,
                                                           readonly: true,
                                                           innerHTML: output
                                                       });
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
            new dijitButton({ iconClass: 'dijitIconSave',
                              label: 'Download',
                              disabled: !(canExportVisibleRegion || canExportWholeRef ),
                              onClick: dojo.hitch( this.track, function() {
                                var format = form.elements.format.value;
                                this.exportRegion( form.elements.region.value, form.elements.format.value, function( output ) {
                                    dialog.hide();
                                    window.location.href="data:application/x-"+format.toLowerCase()+","+escape(output);
                                });
                              })})
                .placeAt( actionBar );
        }

        return [ form, actionBar ];
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
    }

};
});
