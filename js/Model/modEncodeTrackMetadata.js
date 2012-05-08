dojo.declare( 'JBrowse.Model.modEncodeTrackMetadata', null,

/**
 * @lends JBrowse.Model.modEncodeTrackMetadata.prototype
 */
{
    /**
     * Track metadata datasource that understands the format of the
     * modencode.js track metadata JSON currently (May 2012) used at
     * data.modencode.org.
     * @constructor
     * @param args.url {String} URL to fetch the metadata JSON from
     */
    constructor: function( args ) {
        this.url = args.url;
    },

    // dojo.data.api.Read support
    getValue: function( i, attr, defaultValue ) {
        var v = i[attr];
        return typeof v == 'undefined' ? defaultValue : v;
    },
    getValues: function( i, attr ) {
        var a = [ i[attr] ];
        return typeof a[0] == 'undefined' ? [] : a;
    },

    getAttributes: function(item)  {
        return dojof.keys( item );
    },

    hasAttribute: function(item,attr) {
        return item.hasOwnProperty(attr);
    },

    containsValue: function(item, attribute, value) {
        return item[attribute] == value;
    },

    isItem: function(item) {
        return typeof item == 'object' && typeof item.label == 'string';
    },

    isItemLoaded: function() {
        return true;
    },

    loadItem: function( args ) {
    },

    // used by the dojo.data.util.simpleFetch mixin to implement fetch()
    _fetchItems: function( keywordArgs, findCallback, errorCallback ) {
        dojo.xhrGet({
            url: this.url,
            handleAs: 'json',
            load: dojo.hitch(this, function( data ) {
                var items = data.items||[];
                dojo.forEach( items, function(i) {
                    if( Array.isArray( i.Tracks ) )
                        i.Tracks = i.Tracks.join(',');
                });
                findCallback( data.items||[], keywordArgs );
            }),
            error: function(e) { errorCallback(e,keywordArgs); }
        });
    },

    getFeatures: function() {
        return {
	    'dojo.data.api.Read': true,
	    'dojo.data.api.Identity': true
	};
    },
    close: function() {},

    getLabel: function(i) {
        return this.getIdentity(i);
    },
    getLabelAttributes: function(i) {
        return this.getIdentityAttributes();
    },

    // dojo.data.api.Identity support
    getIdentityAttributes: function() {
        return ['label'];
    },
    getIdentity: function(i) {
        return this.getValue(i, 'label', undefined);
    },
    fetchItemByIdentity: function(id) {
        return this.identIndex[id];
    }
});
dojo.require('dojo.data.util.simpleFetch');
dojo.extend( JBrowse.Model.modEncodeTrackMetadata, dojo.data.util.simpleFetch );
