define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/dom-construct',
           'dojo/window',
           'dojo/on',

           'dijit/form/Button',
           'dijit/form/RadioButton',

           'JBrowse/View/Dialog',
           'JBrowse/View/Dialog/Error',
           'JBrowse/Util',
           'JBrowse/MediaTypes',
           'JBrowse/View/SendTo'
       ],
       function(
           declare,
           array,
           lang,
           domConstruct,
           dojoWindow,
           on,

           dijitButton,
           dijitRadioButton,

           Dialog,
           ErrorDialog,
           Util,
           MediaTypes,
           SendTo
       ){

return declare( Dialog, {

  title: 'Save track data',

  show: function() {
      this.set( 'content', this._exportDialogContent() );
      this.inherited(arguments);
  },

  _update: function() {
      var format = this._readRadio( this.form.elements.format );
      var regionLocString = this._readRadio( this.form.elements.region );

      this.sendTo.updateControls(
          {
              mediaType: MediaTypes.getTypeRecords([format])[0],
              region: regionLocString,
              basename: this.track.getConf('label') + '-' + regionLocString
          });

      this._fillPreview();
  },

  _exportDialogContent: function() {
      var thisB = this;
      var track = this.track;

      var possibleRegions = track._possibleExportRegions();

      // for each region, calculate its length and determine whether we can export it
      array.forEach( possibleRegions, function( r ) {
                         r.canExport = track._canExportRegion( r.region );
                     }, this );


      var form = this.form = domConstruct.create('form', { onSubmit: function() { return false; } });
      var regionFieldset = domConstruct.create('fieldset', {className: "region"}, form );
      domConstruct.create('legend', {innerHTML: "Region to save"}, regionFieldset);

      var checked = 0;
      array.forEach( possibleRegions, function(rec) {
                         var r = rec.region;
                         var length = r.get('end') - r.get('start');
                         var locstring = Util.assembleLocString(r);
                         var regionButton = new dijitRadioButton(
                             { name: "region",
                               value: locstring,
                               checked: rec.canExport && !(checked++)
                             });
                         regionFieldset.appendChild(regionButton.domNode);
                         var regionButtonLabel = domConstruct.create(
                             "label",
                             {
                                 "for": regionButton.id,
                                 innerHTML: rec.description+' -'
                                     + ' <span class="locString">'+ locstring+'</span>'
                                     + ' ('+Util.humanReadableNumber(length)
                                          + ( rec.canExport ? 'bp' : 'bp, too large' )
                                       +')'
                             },
                             regionFieldset
                         );
                         if(!rec.canExport) {
                             regionButton.domNode.disabled = "disabled";
                             regionButtonLabel.className = "ghosted";
                         }

                         on(regionButton, "click", lang.hitch( thisB, '_update' ) );

                         domConstruct.create('br',{},regionFieldset);
                     });


      var formatFieldset = domConstruct.create("fieldset", {className: "format"}, form);
      domConstruct.create("legend", {innerHTML: "Format"}, formatFieldset);

      checked = 0;
      array.forEach( track._exportFormats(), function(fmt) {
                         var formatButtonLabel = domConstruct.create(
                             "label", { innerHTML: fmt.name }, formatFieldset
                         );

                         var formatButton = new dijitRadioButton(
                             { name: "format", value: fmt.name, checked: checked++?"":"checked"}
                         );

                         formatButtonLabel.insertBefore( formatButton.domNode, formatButtonLabel.firstChild );

                         on( formatButton, "click", lang.hitch( thisB, '_update' ) );
                         domConstruct.create( "br", {}, formatFieldset );
                     },this);

      var previewFieldset = domConstruct.create("fieldset", {className: "preview"}, form);
      this.previewTitle = domConstruct.create("legend", {innerHTML: "Preview"}, previewFieldset );
      this.previewText = domConstruct.create(
          'textarea', {
              rows: Math.round( dojoWindow.getBox().h / 12 * 0.25 ),
              wrap: 'off',
              cols: 80,
              style: "maxWidth: 90em; overflow: scroll;"
                  + " overflow-y: scroll; overflow-x: scroll;"
                  + " overflow:-moz-scrollbars-vertical;",
              readonly: true
          }, previewFieldset );

      var sendToFieldset = domConstruct.create('fieldset', { className: 'send-to'}, form );
      domConstruct.create("legend", {innerHTML: "Send To"}, sendToFieldset );
      var sendTo = this.sendTo = new SendTo({
                                  browser: this.browser,
                                  form: this,
                                  name: 'sendTo'
                              }).placeAt( sendToFieldset );

      this._update();

      var actionBar = domConstruct.create( 'div', {
                                      className: 'dijitDialogPaneActionBar'
                                  });

      // note that the `this` for this content function is not the track, it's the menu-rendering context
      new dijitButton({ iconClass: 'dijitIconDelete', onClick: lang.hitch(this,'hide'), label: 'Cancel' })
          .placeAt( actionBar );

      // don't show a download button if we for some reason can't save files
      if( track._canSaveFiles() ) {
          var dlButton = new dijitButton(
              { iconClass: 'dijitIconSave',
                label: 'Save',
                disabled: ! array.some( possibleRegions, function(r) { return r.canExport; } ),
                onClick: function() {
                    var format = thisB._readRadio( form.elements.format );
                    var region = Util.parseLocString( thisB._readRadio( form.elements.region ) );
                    var filename = form.elements.filename.value.replace(/[^ .a-zA-Z0-9_-]/g,'-');
                    dlButton.set( 'disabled', true );
                    dlButton.set( 'iconClass', 'jbrowseIconBusy' );

                    var destinationResource = thisB.sendTo.getResource();
                    destinationResource.writeAll(
                        track.exportRegion( region, format )
                    ).then( lang.hitch( thisB, 'hide' ),
                            function(e) {
                                new ErrorDialog({ browser: thisB.browser, error: e }).show();
                                thisB.hide();
                            }
                          );
                }
              }
          ).placeAt( actionBar );
      }

      return [ form, actionBar ];
  },

  _fillPreview: function() {
      var region = Util.parseLocString( this._readRadio( this.form.elements.region ) );
      var format = this._readRadio( this.form.elements.format);

      var exportStream = this.track.exportRegion( region, format );
      var output = '';
      var text = this.previewText;
      var title = this.previewTitle;
      var sizeLimit = 10000;
      exportStream
          .forEach( function( chunk ) {
                        output += chunk;
                        if( output.length >= sizeLimit )
                            exportStream.cancel( 'preview size limit reached' );
                    },
                    function() {
                        text.value = output;
                        title.innerHTML = 'Preview';
                    },
                    function(error) {
                        if( error != 'preview size limit reached' )
                            console.error( error.stack || ''+error );
                        else {
                            title.innerHTML = 'Preview (first '+Util.humanReadableNumber(output.length)+'b)';
                            text.value = output;
                        }
                    });
  },

  // cross-platform function for (portably) reading the value of a
  // radio control. sigh. *rolls eyes*
  _readRadio: function( r ) {
      if( r.length ) {
          for( var i = 0; i<r.length; i++ ) {
              if( r[i].checked )
                  return r[i].value;
          }

          return r[0].value;
      }
      return r.value;
  },

  hide: function() {
      this.inherited(arguments);
      window.setTimeout( lang.hitch( this, 'destroyRecursive' ), 2000 );
  }

});
});