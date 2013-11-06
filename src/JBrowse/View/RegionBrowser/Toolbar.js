define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/event',
           'dojo/query',
           'dojo/dom-construct',
           'dojo/on',
           'dojo/keys',

	   "dijit/_WidgetBase",
	   "dijit/_Container",

           'dijit/form/ComboBox',
           'dijit/form/Button',
           'dijit/form/Select',
           'dijit/form/HorizontalSlider',

           'JBrowse/Util'

       ],
       function(
           declare,
           lang,
           dojoEvent,
           query,
           domConstruct,
           on,
           keys,

           _WidgetBase,
           _Container,

           dijitComboBox,
           dijitButton,
           dijitSelectBox,
           dijitSlider,

           Util
       ) {

return declare([ _WidgetBase, _Container ], {

baseClass: 'topBar',
region: 'top',

buildRendering: function() {
    var thisB = this;

    this.domNode = domConstruct.create('table', { className: this.baseClass }, this.domNode );
    var tableLayout = domConstruct.create('tr',{}, this.domNode );

    var viewLabelContainer = domConstruct.create('td',  { className: 'viewLabelLayout' }, tableLayout );
    this.viewLabel = domConstruct.create('span',  { className: 'viewLabel', innerHTML: this.genomeView.getConf('name') }, viewLabelContainer );

    var trackSelectContainer = domConstruct.create(
        'div',
        { className: 'controlGroup trackSelect' },
        domConstruct.create('td', { className: 'trackSelectLayout' }, tableLayout )
    );
    this.trackFindBox = new dijitComboBox(
        {
            labelAttr: "name",
            maxLength: 400,
            placeHolder: 'Search tracks',
            searchAttr: "name",
            store: this.browser.get('trackMetaDataStore'),
            onChange: function( val ) {
                thisB.browser.getTrack( val )
                    .then( function( t ) {
                               if( t )
                                   thisB.genomeView.showTracks([t]);
                           });
                this.set( 'value','', false );
            }
        },
        domConstruct.create('div',{},trackSelectContainer) );
    this.trackFindBox.focusNode.spellcheck = false;

    this.browser.watch( 'trackMetadataStore', function( name, oldstore, newstore ) {
        thisB.trackFindBox.set( 'store', newstore );
    });

    this.trackFindBox._buttonNode.innerHTML = 'Tracks'+this.trackFindBox._buttonNode.innerHTML;

    // make the search controls
    this.searchControlsContainer = domConstruct.create(
            'div', {
                className: 'controlGroup searchControls'
            }, domConstruct.create('td', { className: 'searchControlsLayout'}, tableLayout ) );

    // if we have fewer than 30 ref seqs, or `refSeqDropdown: true` is
    // set in the config, then put in a dropdown box for selecting
    // reference sequences
    var refSeqSelectBoxPlaceHolder = domConstruct.create('span', {}, this.searchControlsContainer );

    // make the location box
    this.locationBox = new dijitComboBox(
        {
            name: "location",
            maxLength: 400,
            searchAttr: "name"
        },
        domConstruct.create('div',{},this.searchControlsContainer) );

    this.browser.afterMilestone( 'loadNames', lang.hitch(this, function() {
        if( this.browser.nameStore )
            this.locationBox.set( 'store', this.browser.nameStore );
    }));

    this.locationBox.focusNode.spellcheck = false;
    query('div.dijitArrowButton', this.locationBox.domNode ).orphan();
    on( this.locationBox.focusNode, "keydown", function(event) {
                      if (event.keyCode == keys.ENTER) {
                          thisB.locationBox.closeDropDown(false);
                          thisB.genomeView.navigateTo( thisB.locationBox.get('value') );
                          thisB.goButton.set('disabled',true);
                          dojoEvent.stop(event);
                      } else {
                          thisB.goButton.set('disabled', false);
                      }
                  });
    on( this.locationBox.domNode, 'selectstart', function(evt) { evt.stopPropagation(); return true; });
    // monkey-patch the combobox code to make a few modifications
    (function(){

         // add a moreMatches class to our hacked-in "more options" option
         var dropDownProto = eval(this.locationBox.dropDownClass).prototype;
         var oldCreateOption = dropDownProto._createOption;
         dropDownProto._createOption = function( item ) {
             var option = oldCreateOption.apply( this, arguments );
             if( item.hitLimit )
                 domClass.add( option, 'moreMatches');
             return option;
         };

         // prevent the "more matches" option from being clicked
         var oldSetValue = dropDownProto._setValueAttr;
         dropDownProto._setValueAttr = function( value ) {
             if( value.target && value.target.item && value.target.item.hitLimit )
                 return null;
             return oldSetValue.apply( this, arguments );
         };
    }).call(this);

    // make the 'Go' button'
    this.goButton = new dijitButton(
        {
            onClick: lang.hitch( this, function(event) {
                this.genomeView.navigateTo(this.locationBox.get('value'));
                this.goButton.set('disabled',true);
                dojoEvent.stop(event);
            })
        }, domConstruct.create('button',{},this.searchControlsContainer));

    // make the refseq selection dropdown
    this.genomeView.watchConf('referenceSetPath', function(name,oldPath,newPath) {
        thisB.genomeView.getReferenceSet(newPath)
             .then( function( refset ) {
                        var max = thisB.genomeView.getConf('refSeqSelectorMaxSize');
                        var refSeqOrder = [];
                        refset.getReferenceSequences({ limit: max+1 })
                            .forEach( function( refseq ) {
                                          refSeqOrder.push( refseq );
                                      },
                                      function() {
                                          var numrefs = Math.min( max, refSeqOrder.length);
                                          var options = [];
                                          for ( var i = 0; i < numrefs; i++ ) {
                                              var ref = refSeqOrder[i];
                                              options.push({ label: ref.get('name') || ref.id(), value: ref.toString() } );
                                          }
                                          var tooManyMessage = '(first '+numrefs+' ref seqs)';
                                          if( refSeqOrder.length > max ) {
                                              options.push( { label: tooManyMessage , value: tooManyMessage, disabled: true } );
                                          }

                                          if( thisB.refSeqSelectBox )
                                              thisB.refSeqSelectBox.destroyRecursive();

                                          thisB.refSeqSelectBox = new dijitSelectBox(
                                              {
                                                  name: 'refseq',
                                                  value: thisB.genomeView.ref ? thisB.genomeView.ref.get('name') : null,
                                                  options: options,
                                                  onChange: function( newRefName ) {
                                                      thisB.genomeView.setConf( 'location', newRefName );
                                                  }
                                              }).placeAt( refSeqSelectBoxPlaceHolder );
                                      });
                    });
    });

    thisB.locationBox.domNode.style.width = '20ex';

    // zoom controls
    var zoomControlsContainer = domConstruct.create(
        'div',
        { className: 'controlGroup zoomControls' },
        domConstruct.create('td', { className: 'zoomControlsLayout' }, tableLayout )
    );
    var zoomOut = domConstruct.create('span', {
                                          className: "icon nav zoomOut"
                                      }, zoomControlsContainer );
    this.own( on( zoomOut, "click",
                  function(event) {
                      dojoEvent.stop(event);
                      if( thisB.zoomSlider )
                          thisB.zoomSlider.set( 'value', Math.max( 0, thisB.zoomSlider.get('value')-1 ) );
                      thisB.genomeView.zoom(2);
                  }));
    this.zoomSliderContainer =
        domConstruct.create('span', {
                        className: 'nav zoomSliderContainer'
                    }, zoomControlsContainer );
    this.zoomSliderText =
        domConstruct.create('div', {
                        className: 'zoomSliderText'
                    }, this.zoomSliderContainer );
    var zoomIn = domConstruct.create('span', {
                                          className: "icon nav zoomIn"
                                      }, zoomControlsContainer );
    this.own( on( zoomIn, "click",
                  function(event) {
                      dojoEvent.stop(event);
                      if( thisB.zoomSlider )
                          thisB.zoomSlider.set( 'value', Math.min( thisB.genomeView.zoomLevels.length-1, thisB.zoomSlider.get('value')+1 ) );
                      thisB.genomeView.zoom(0.5);
                  }));

    // pan controls
    var panControlsContainer = domConstruct.create(
        'div',
        { className: 'controlGroup panControls' },
        domConstruct.create('td', { className: 'panControlsLayout' }, tableLayout )
    );
    var panLeft = domConstruct.create('span', {
                                          className: "icon nav panLeft"
                                      }, panControlsContainer );
    this.own( on( panLeft, "click",
                  function(event) {
                      dojoEvent.stop(event);
                      thisB.genomeView.slide(0.6);
                  }));

    domConstruct.create('span', {
                            className: "panSeparator"
                        }, panControlsContainer );

    var panRight = domConstruct.create('span', {
                                          className: "icon nav panRight"
                                      }, panControlsContainer );
    this.own( on( panRight, "click",
                  function(event) {
                      dojoEvent.stop(event);
                      thisB.genomeView.slide(-0.6);
                  }));

},

/**
 * Updates/re-creates the zoom controls based on the current window
 * width, zoom level, etc.
 */
_updateZoomControls: function() {

    // destroy the zoom slider if present
    if( this.zoomSlider ) {
        this.zoomSlider.destroyRecursive();
        domConstruct.destroy( this.zoomSlider.domNode );
    }

    // re-create the zoom slider
    var sliderTimeout;
    var thisB = this;
    this.zoomSlider = new dijitSlider({
        name: "slider",
        value: this.curZoom,
        minimum: 0,
        maximum: this.zoomLevels.length - 1,
        intermediateChanges: true,
        showButtons: false,
        discreteValues: this.zoomLevels.length,
        onChange: function( newLevel ){
            thisB.zoomSliderText.innerHTML = ''; //< sidesteps a bug in some Chromes
            thisB.zoomSliderText.innerHTML = Util.humanReadableNumber( thisB.getWidth()/thisB.zoomLevels[newLevel] )+'bp';

            if( sliderTimeout )
                window.clearTimeout( sliderTimeout );
            sliderTimeout = window.setTimeout( function() {
                if( steps > 0 ) {
                    thisB.zoom(undefined,undefined,steps);
                } else if( steps < 0 ) {
                    thisB.zoom(undefined,undefined,-steps);
                }
            }, 400 );
        }
    }, domConstruct.create('input',{},this.zoomSliderContainer) );

    // update the zoom slider text
    this.zoomSliderText.innerHTML = Util.humanReadableNumber( thisB.getWidth()/thisB.pxPerBp )+'bp';
}

});
});
