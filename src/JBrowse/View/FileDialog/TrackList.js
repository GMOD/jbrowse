define(['dojo/_base/declare',
        'dojo/_base/array',
        'dojo/dom-construct',
        'JBrowse/Util',
        'dijit/form/TextBox',
        'dijit/form/Select',
        'dijit/form/Button',
        './TrackList/BAMDriver',
        'JBrowse/View/TrackConfigEditor'
       ],
       function(declare, array, dom, Util, TextBox, Select, Button, BAMDriver, TrackConfigEditor ) {

var uniqCounter = 0;

return declare( null, {

constructor: function( args ) {
    this.fileDialog = args.dialog;
    this.domNode = dom.create('div', { className: 'trackList', innerHTML: 'track list!' });
    this.types = [ BAMDriver ];

    this._updateDisplay();
},


getTrackConfigurations: function() {
    return Util.dojof.values( this.trackConfs || {} );
},

update: function( resources ) {
    this.storeConfs = {};
    this.trackConfs = {};

    this._makeStoreConfs( resources );

    // make some track configurations from the store configurations
    this._makeTrackConfs();

    this._updateDisplay();
},

_makeStoreConfs: function( resources ) {
    // when called, rebuild the store and track configurations that we are going to add
    this.storeConfs = this.storeConfs || {};

    // anneal the given resources into a set of data store
    // configurations by offering each file to each type driver in
    // turn until no more are being accepted
    var lastLength = 0;
    while( resources.length && resources.length != lastLength ) {
        resources = array.filter( resources, function( resource ) {
            return ! array.some( this.types, function( typeDriver ) {
               return typeDriver.tryResource( this.storeConfs, resource );
            },this);
        },this);

        lastLength = resources.length;
    }

    array.forEach( this.types, function( typeDriver ) {
        typeDriver.finalizeConfiguration( this.storeConfs );
    },this);

    if( resources.length )
        console.warn( "not all resources could be used", resources );
},

storeTypeToTrackType: {
        'JBrowse/Store/SeqFeature/BAM'        : 'JBrowse/View/Track/Alignments',
        'JBrowse/Store/SeqFeature/NCList'     : 'JBrowse/View/Track/HTMLFeatures',
        'JBrowse/Store/SeqFeature/BigWig'     : 'JBrowse/View/Track/Wiggle/XYPlot',
        'JBrowse/Store/Sequence/StaticChunked': 'JBrowse/View/Track/Sequence'
},

knownTrackTypes: [
    'JBrowse/View/Track/Alignments',
    'JBrowse/View/Track/FeatureCoverage',
    'JBrowse/View/Track/HTMLFeatures',
    'JBrowse/View/Track/Wiggle/XYPlot',
    'JBrowse/View/Track/Wiggle/Density',
    'JBrowse/View/Track/Sequence'
],

_makeTrackConfs: function() {
    var typeMap = this.storeTypeToTrackType;

    for( var n in this.storeConfs ) {
        var store = this.storeConfs[n];
        var trackType = typeMap[store.type] || 'JBrowse/View/Track/HTMLFeatures';

        this.trackConfs = this.trackConfs || {};

        this.trackConfs[ n ] =  {
                store: this.storeConfs[n],
                label: n,
                key: n.replace(/_\d+$/,'').replace(/_/g,' '),
                type: trackType
        };
    }
},


_updateDisplay: function() {
    var that = this;

    // clear it
    dom.empty( this.domNode );

    dom.create('h3', { innerHTML: 'New Tracks' }, this.domNode );

    if( ! Util.dojof.keys( this.trackConfs||{} ).length ) {
        dom.create('div', { className: 'emptyMessage',
                            innerHTML: 'No tracks can be created from the current files and URLs.'
                          },this.domNode);
    } else {
        var table = dom.create('table', { innerHTML: '<tr class="head"><th>Name</th><th>Display</th><th></th></tr>'}, this.domNode );
        for( var n in this.trackConfs ) {
            var t = this.trackConfs[n];
            var r = dom.create('tr', {}, table );
            new TextBox({
                value: t.key,
                onChange: function() { t.key = this.get('value'); }
            }).placeAt( dom.create('td',{ className: 'name' }, r ) );
            new Select({
                    options: array.map( this.knownTrackTypes || [], function( t ) {
                                            var l = t.replace('JBrowse/View/Track/','').replace('/', ' ');
                                            return { label: l, value: t };
                                        }),
                    value: t.type,
                    onChange: function() {
                        t.type = this.get('value');
                    }
            }).placeAt( dom.create('td',{ className: 'type' }, r ) );

            new Button({
               className: 'edit',
               title: 'edit configuration',
               innerHTML: 'Edit Configuration',
               onClick: function() {
                   new TrackConfigEditor( t )
                     .show( function( result) {
                                dojo.mixin( t, result.conf );
                                that._updateDisplay();
                     });
               }
            }).placeAt( dom.create('td', { className: 'edit' }, r ) );
        }
    }
}

});
});

