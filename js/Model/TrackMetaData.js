dojo.require('dojo.data.ItemFileWriteStore');

dojo.declare( 'JBrowse.Model.TrackMetaData', dojo.data.ItemFileWriteStore,
/**
 * @lends JBrowse.Model.TrackMetaData.prototype
 */
{
    /**
     * @constructs
     * @param args.trackConfigs {Array} array of track configuration
     */
    constructor: function( args ) {
        dojo.data.ItemFileWriteStore.call( this, {data: {
               identifier: 'label',
               items: dojo.map( args.trackConfigs, function(c){
                   var item = {};
                   dojo.forEach( ['key','label','type'], function(k) {item[k] = c[k];} );
                   return item;
               })
           }});
    }
});
