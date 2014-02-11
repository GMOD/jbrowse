/**
 * Store that shows features defined in its `features` configuration
 * key, like:
 *   "features": [ { "seq_id": "ctgA", "start":1, "end":20 },
 *                 ...
 *               ]
 */

define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',

            'JBrowse/Util',
            'JBrowse/Util/DeferredGenerator',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/SimpleFeature'
        ],
        function(
            declare,
            lang,
            array,

            Util,
            DeferredGenerator,
            SeqFeatureStore,
            SimpleFeature
        ) {

return declare( 'JBrowse/Store/SeqFeature/FromConfig', SeqFeatureStore,
{
    constructor: function( args ) {
        this.features = this._makeFeatures( this.getConf('features') );
    },

    configSchema: {
        slots: [
            { name: 'features', type: 'multi-object', defaultValue: [] }
        ]
    },

    _makeFeatures: function( fdata ) {
        var features = {};
        for( var i=0; i<fdata.length; i++ ) {
            var f = this._makeFeature( fdata[i] );
            var refName = this.browser.regularizeReferenceName( f.get('seq_id') );
            ( features[refName] || ( features[refName] = [] )).push( f );
        }
        return features;
    },

    _parseNumbers: function( data ) {
        array.forEach(['start','end','strand'], function( field ) {
            if( field in data )
                data[field] = parseInt( data[field] );
        });
        if( 'score' in data )
            data.score = parseFloat( data.score );
        if( 'subfeatures' in data )
            for( var i=0; i<data.subfeatures.length; i++ )
                this._parseNumbers( data.subfeatures[i] );
    },

    _makeFeature: function( data, parent ) {
        this._parseNumbers( data );
        return new SimpleFeature( { data: data, parent: parent } );
    },

    getFeatures: function( query ) {
        var start = query.start;
        var end = query.end;
        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            var refs = query.ref ? ( lang.isArray( query.ref ) ? query.ref : [query.ref] )
                                 : Util.dojof.keys( thisB.features );
            array.forEach( refs, function( ref ) {
                var features = thisB.features[ thisB.browser.regularizeReferenceName( ref ) ];
                if( ! features ) return;
                for( var id in features ) {
                    var f = features[id];
                    if(! ( f.get('end') < start || f.get('start') > end ) )
                        generator.emit( f );
                }
            });
            generator.resolve();
        });

    }
});
});