define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/dom-construct',
           'dojo/on',

           'dijit/Dialog',
           'dijit/form/TextBox',
           'dijit/form/Button',
           'dijit/form/RadioButton',

           'JBrowse/Util',
           'JBrowse/Model/Resource',
           './TrackExportPreview'
       ],
       function(
           declare,
           array,
           lang,
           domConstruct,
           on,

           Dialog,
           dijitTextBox,
           dijitButton,
           dijitRadioButton,

           Util,
           ResourceBase,
           ExportPreviewDialog
       ){

return declare( Dialog, {

  title: 'Export track data',

  show: function() {
      this.set( 'content', this._exportDialogContent() );
      this.inherited(arguments);
  },

  _exportDialogContent: function() {
      var thisB = this;
      var track = this.track;

      var possibleRegions = track._possibleExportRegions();

      // for each region, calculate its length and determine whether we can export it
      array.forEach( possibleRegions, function( r ) {
                         r.canExport = track._canExportRegion( r.region );
                     }, this );

      function setFilenameValue() {
          var region = thisB._readRadio(form.elements.region);
          var format = nameToExtension[ thisB._readRadio(form.elements.format) ];
          form.elements.filename.value =
              ((track.key || track.label) + "-" + region)
              .replace(/[^ .a-zA-Z0-9_-]/g,'-')
              + "." + format;
      };

      var form = domConstruct.create('form', { onSubmit: function() { return false; } });
      var regionFieldset = domConstruct.create('fieldset', {className: "region"}, form );
      domConstruct.create('legend', {innerHTML: "Region to save"}, regionFieldset);

      var checked = 0;
      array.forEach( possibleRegions, function(rec) {
                         var r = rec.region;
                         var length = r.get('end') - r.get('start');
                         var locstring = Util.assembleLocString(r);
                         var regionButton = new dijitRadioButton(
                             { name: "region",
                               value: locstring, checked: rec.canExport && !(checked++) ? "checked" : ""
                             });
                         regionFieldset.appendChild(regionButton.domNode);
                         var regionButtonLabel = domConstruct.create(
                             "label",
                             {
                                 "for": regionButton.id,
                                 innerHTML: rec.description+' -'
                                     + ' <span class="locString">'+ locstring+'</span>'
                                     + ' ('+Util.humanReadableNumber(length)
                                          + ( rec.canExport ? 'b' : 'b, too large' )
                                       +')'
                             },
                             regionFieldset
                         );
                         if(!rec.canExport) {
                             regionButton.domNode.disabled = "disabled";
                             regionButtonLabel.className = "ghosted";
                         }

                         on(regionButton, "click", setFilenameValue);

                         domConstruct.create('br',{},regionFieldset);
                     });


      var formatFieldset = domConstruct.create("fieldset", {className: "format"}, form);
      domConstruct.create("legend", {innerHTML: "Format"}, formatFieldset);

      checked = 0;
      var nameToExtension = {};
      array.forEach( track._exportFormats(), function(fmt) {
                         if( ! fmt.name ) {
                             fmt = { name: fmt, label: fmt };
                         }
                         if( ! fmt.fileExt) {
                             fmt.fileExt = fmt.name || fmt;
                         }
                         nameToExtension[fmt.name] = fmt.fileExt;
                         var formatButtonLabel = domConstruct.create(
                             "label", { innerHTML: fmt.label }, formatFieldset
                         );

                         var formatButton = new dijitRadioButton(
                             { name: "format", value: fmt.name, checked: checked++?"":"checked"}
                         );

                         formatButtonLabel.insertBefore( formatButton.domNode, formatButtonLabel.firstChild );

                         on( formatButton, "click", setFilenameValue );
                         domConstruct.create( "br", {}, formatFieldset );
                     },this);


      var filenameFieldset = domConstruct.create("fieldset", {className: "filename"}, form);
      domConstruct.create("legend", {innerHTML: "Filename"}, filenameFieldset);
      domConstruct.create("input", {type: "text", name: "filename", style: {width: "100%"}}, filenameFieldset);

      setFilenameValue();

      this.destinationChooser = {
          browser: this.browser,
          getResource: function() {
              return new ResourceBase(
                  { transport: this.browser.getTransport('File'),
                    resource: 'file://'+form.elements.filename.value
                  });
          }
      };

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

                    var destinationResource = thisB.destinationChooser.getResource();
                    destinationResource.writeAll(
                        track.exportRegion( region, format )
                    ).then( lang.hitch( thisB, 'hide' ) );
                }
              }
          ).placeAt( actionBar );
      }

      return [ form, actionBar ];
  },

  // cross-platform function for (portably) reading the value of a
  // radio control. sigh. *rolls eyes*
  _readRadio: function( r ) {
      if( r.length ) {
          for( var i = 0; i<r.length; i++ ) {
              if( r[i].checked )
                  return r[i].value;
          }
      }
      return r.value;
  },

  hide: function() {
      this.inherited(arguments);
      window.setTimeout( lang.hitch( this, 'destroyRecursive' ), 2000 );
  }

});
});