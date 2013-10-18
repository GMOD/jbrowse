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
            labelAttr: "label",
            maxLength: 400,
            placeHolder: 'Search tracks',
            searchAttr: "label",
            onChange: function( val ) {
                thisB.browser.getTrackConfig( val )
                    .then( function( t ) {
                               if( t )
                                   thisB.genomeView.showTracks([t]);
                           });
                this.set( 'value','', false );
            }
        },
        domConstruct.create('div',{},trackSelectContainer) );
    this.trackFindBox.focusNode.spellcheck = false;

    this.browser.afterMilestone('initTrackMetadata', function() {
        thisB.trackFindBox.set( 'store', thisB.browser.trackMetaDataStore );
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
    this.browser.getStore('refseqs', function( store ) {
        var max = thisB.browser.getConf('refSeqSelectorMaxSize');
        var refSeqOrder = [];
        store.getReferenceFeatures({ limit: max+1 })
             .forEach( function( refseq ) {
                           refSeqOrder.push( refseq );
                       },
                       function() {
                           var numrefs = Math.min( max, refSeqOrder.length);
                           var options = [];
                           for ( var i = 0; i < numrefs; i++ ) {
                               options.push( { label: refSeqOrder[i].get('name'), value: refSeqOrder[i].get('name') } );
                           }
                           var tooManyMessage = '(first '+numrefs+' ref seqs)';
                           if( refSeqOrder.length > max ) {
                               options.push( { label: tooManyMessage , value: tooManyMessage, disabled: true } );
                           }
                           thisB.refSeqSelectBox = new dijitSelectBox(
                               {
                                   name: 'refseq',
                                   value: thisB.genomeView.ref ? thisB.genomeView.ref.get('name') : null,
                                   options: options,
                                   onChange: lang.hitch(thisB, function( newRefName ) {
                                                            // don't trigger nav if it's the too-many message
                                                            if( newRefName == tooManyMessage ) {
                                                                this.refSeqSelectBox.set('value', this.refSeq.name );
                                                                return;
                                                            }

                                                            // only trigger navigation if actually switching sequences
                                                            if( newRefName != this.ref.get('name') ) {
                                                                this.genomeView.navigateTo(newRefName);
                                                            }
                                                        })
                               }).placeAt( refSeqSelectBoxPlaceHolder );
                       });

            // calculate how big to make the location box:  make it big enough to hold the
            var locLength = thisB.genomeView.getConf('locationBoxLength') || function() {
                // if we have no refseqs, just use 20 chars
                if( ! refSeqOrder.length )
                    return 20;

                // if there are not tons of refseqs, pick the longest-named
                // one.  otherwise just pick the last one
                var ref = refSeqOrder.length < 1000
                    && function() {
                           var longestNamedRef;
                           array.forEach( refSeqOrder, function(ref) {
                               if( ! longestNamedRef
                                   || (longestNamedRef.get('end') - longestNamedRef.get('start')) < (ref.get('end') - ref.get('start')) )
                                   longestNamedRef = ref;
                           });
                           return longestNamedRef;
                       }.call()
                    || refSeqOrder.length && refSeqOrder[ refSeqOrder.length - 1 ].get('name').length
                    || 20;

                var locstring = Util.assembleLocStringWithLength(
                    { ref: ref.get('name'),
                      start: ref.get('end')-1,
                      end: ref.get('end'),
                      length: ref.get('end') - ref.get('start')
                    });

                //console.log( locstring, locstring.length );
                return locstring.length;
            }.call(thisB) || 20;

            thisB.locationBox.domNode.style.width = locLength+'ex';

        });

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
                      thisB.genomeView.zoomOut(undefined,undefined, 1);
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
                      thisB.genomeView.zoomIn(undefined,undefined,1);
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
                var steps = newLevel - thisB.curZoom;
                if( steps > 0 ) {
                    thisB.zoomIn(undefined,undefined,steps);
                } else if( steps < 0 ) {
                    thisB.zoomOut(undefined,undefined,-steps);
                }
            }, 400 );
        }
    }, domConstruct.create('input',{},this.zoomSliderContainer) );

    // update the zoom slider text
    this.zoomSliderText.innerHTML = Util.humanReadableNumber( thisB.getWidth()/thisB.pxPerBp )+'bp';
}

});
});
