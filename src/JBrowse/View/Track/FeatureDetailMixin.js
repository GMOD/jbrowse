/**
 * Mixin with methods for parsing making default feature detail dialogs.
 */
define([
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/aspect',
            'dojo/dom-construct',
            'JBrowse/Util',
            'JBrowse/View/FASTA'
        ],
        function(
            declare,
            array,
            lang,
            aspect,
            domConstruct,
            Util,
            FASTAView
        ) {

return declare(null,{

    constructor: function() {

        // clean up the eventHandlers at destruction time if possible
        if( typeof this.destroy == 'function' ) {
            aspect.before( this, 'destroy', function() {
                delete this.eventHandlers;
            });
        }
    },

    _setupEventHandlers: function() {
        // make a default click event handler
        var eventConf = dojo.clone( this.config.events || {} );
        if( ! eventConf.click ) {
            eventConf.click = (this.config.style||{}).linkTemplate
                    ? { action: "newWindow", url: this.config.style.linkTemplate }
                    : { action: "contentDialog",
                        title: '{type} {name}',
                        content: dojo.hitch( this, 'defaultFeatureDetail' ) };
        }

        // process the configuration to set up our event handlers
        this.eventHandlers = (function() {
            var handlers = dojo.clone( eventConf );
            // find conf vars that set events, like `onClick`
            for( var key in this.config ) {
                var handlerName = key.replace(/^on(?=[A-Z])/, '');
                if( handlerName != key )
                    handlers[ handlerName.toLowerCase() ] = this.config[key];
            }
            // interpret handlers that are just strings to be URLs that should be opened
            for( key in handlers ) {
                if( typeof handlers[key] == 'string' )
                    handlers[key] = { url: handlers[key] };
            }
            return handlers;
        }).call(this);
        this.eventHandlers.click = this._makeClickHandler( this.eventHandlers.click );
    },

    /**
     * Make a default feature detail page for the given feature.
     * @returns {HTMLElement} feature detail page HTML
     */
    defaultFeatureDetail: function( /** JBrowse.Track */ track, /** Object */ f, /** HTMLElement */ featDiv, /** HTMLElement */ container ) {
        container = container || dojo.create('div', { className: 'detail feature-detail feature-detail-'+track.name.replace(/\s+/g,'_').toLowerCase(), innerHTML: '' } );

        this._renderCoreDetails( track, f, featDiv, container );

        this._renderAdditionalTagsDetail( track, f, featDiv, container );

        this._renderUnderlyingReferenceSequence( track, f, featDiv, container );

        this._renderSubfeaturesDetail( track, f, featDiv, container );

        return container;
    },

    _renderCoreDetails: function( track, f, featDiv, container ) {
        var coreDetails = dojo.create('div', { className: 'core' }, container );
        var fmt = dojo.hitch( this, 'renderDetailField', coreDetails );
        coreDetails.innerHTML += '<h2 class="sectiontitle">Primary Data</h2>';

        fmt( 'Name', this.getConfForFeature( 'style.label', f ) );
        fmt( 'Type', f.get('type') );
        fmt( 'Score', f.get('score') );
        fmt( 'Description', this._getDescription ? this._getDescription( f ) : (f.get('note') || f.get('description') ));
        fmt(
            'Position',
            Util.assembleLocString({ start: f.get('start'),
                                     end: f.get('end'),
                                     ref: this.refSeq.name,
                                     strand: f.get('strand')
                                   })
        );
        fmt( 'Length', Util.addCommas(f.get('end')-f.get('start'))+' bp' );
    },

    // render any subfeatures this feature has
    _renderSubfeaturesDetail: function( track, f, featDiv, container ) {
        var subfeatures = f.get('subfeatures');
        if( subfeatures && subfeatures.length ) {
            this._subfeaturesDetail( track, subfeatures, container );
        }
    },

    _isReservedTag: function( t ) {
        return {name:1,start:1,end:1,strand:1,note:1,subfeatures:1,type:1,score:1}[t.toLowerCase()];
    },

    // render any additional tags as just key/value
    _renderAdditionalTagsDetail: function( track, f, featDiv, container ) {
        var additionalTags = array.filter( f.tags(), function(t) {
            return ! this._isReservedTag( t );
        },this);

        if( additionalTags.length ) {
            var atElement = domConstruct.create(
                'div',
                { className: 'additional',
                  innerHTML: '<h2 class="sectiontitle">Attributes</h2>'
                },
                container );
            array.forEach( additionalTags.sort(), function(t) {
                this.renderDetailField( container, t, f.get(t) );
            }, this );
        }
    },

    // get the description string for a feature, based on the setting
    // of this.config.description
    getFeatureDescription: function( feature ) {
        var dConf = this.config.style.description || this.config.description;

        if( ! dConf )
            return null;

        // if the description is a function, just call it
        if( typeof dConf == 'function' ) {
            return dConf.call( this, feature );
        }
        // otherwise try to parse it as a field list
        else {

            // parse our description varname conf if necessary
            var fields = this.descriptionFields || function() {
                var f = dConf;
                if( f ) {
                    if( lang.isArray( f ) ) {
                        f = f.join(',');
                    }
                    else if( typeof f != 'string' ) {
                        console.warn( 'invalid `description` setting ('+f+') for "'+this.name+'" track, falling back to "note,description"' );
                        f = 'note,description';
                    }
                    f = f.toLowerCase().split(/\s*\,\s*/);
                }
                else {
                    f = [];
                }
                this.descriptionFields = f;
                return f;
            }.call(this);

            // return the value of the first field that contains something
            for( var i=0; i<fields.length; i++ ) {
                var d = feature.get( fields[i] );
                if( d )
                    return d;
            }
            return null;
        }
    },

    _renderUnderlyingReferenceSequence: function( track, f, featDiv, container ) {

        // render the sequence underlying this feature if possible
        var field_container = dojo.create('div', { className: 'field_container feature_sequence' }, container );
        dojo.create( 'h2', { className: 'field feature_sequence', innerHTML: 'Region sequence', title: 'reference sequence underlying this '+(f.get('type') || 'feature') }, field_container );
        var valueContainerID = 'feature_sequence'+this._uniqID();
        var valueContainer = dojo.create(
            'div', {
                id: valueContainerID,
                innerHTML: '<div style="height: 12em">Loading...</div>',
                className: 'value feature_sequence'
            }, field_container);
        track.browser.getStore('refseqs', dojo.hitch(this,function( refSeqStore ) {
            valueContainer = dojo.byId(valueContainerID) || valueContainer;
            if( refSeqStore ) {
                refSeqStore.getFeatures(
                    { ref: this.refSeq.name, start: f.get('start'), end: f.get('end')},
                    // feature callback
                    dojo.hitch( this, function( feature ) {
                        var seq = feature.get('seq');
                        valueContainer = dojo.byId(valueContainerID) || valueContainer;
                        valueContainer.innerHTML = '';
                        // the HTML is rewritten by the dojo dialog
                        // parser, but this callback may be called either
                        // before or after that happens.  if the fetch by
                        // ID fails, we have come back before the parse.
                        var textArea = new FASTAView({ width: 62, htmlMaxRows: 10 })
                                           .renderHTML(
                                               { ref:   this.refSeq.name,
                                                 start: f.get('start'),
                                                 end:   f.get('end'),
                                                 strand: f.get('strand'),
                                                 type: f.get('type')
                                               },
                                               f.get('strand') == -1 ? Util.revcom(seq) : seq,
                                               valueContainer
                                           );
                  }),
                  // end callback
                  function() {},
                  // error callback
                  dojo.hitch( this, function() {
                      valueContainer = dojo.byId(valueContainerID) || valueContainer;
                      valueContainer.innerHTML = '<span class="ghosted">reference sequence not available</span>';
                  })
                );
            } else {
                valueContainer.innerHTML = '<span class="ghosted">reference sequence not available</span>';
            }
        }));
    },

    _uniqID: function() {
        this._idCounter = this._idCounter || 0;
        return this._idCounter++;
    },

    _subfeaturesDetail: function( track, subfeatures, container ) {
            var field_container = dojo.create('div', { className: 'field_container subfeatures' }, container );
            dojo.create( 'h2', { className: 'field subfeatures', innerHTML: 'Subfeatures' }, field_container );
            var subfeaturesContainer = dojo.create( 'div', { className: 'value subfeatures' }, field_container );
            array.forEach( subfeatures || [], function( subfeature ) {
                    this.defaultFeatureDetail(
                        track,
                        subfeature,
                        null,
                        dojo.create('div', {
                                        className: 'detail feature-detail subfeature-detail feature-detail-'+track.name+' subfeature-detail-'+track.name,
                                        innerHTML: ''
                                    }, subfeaturesContainer )
                    );
            },this);
    }

});
});