/**
 * Default view class for showing the metadata associated with a track.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-construct',

           'JBrowse/Util',
           'JBrowse/View/Dialog/Info',
           'JBrowse/View/DetailsMixin'
       ],
       function(
           declare,
           lang,
           array,
           dom,

           Util,
           InfoDialog,
           DetailsMixin
       ) {
return declare(
    'JBrowse/View/TrackDetails/Default',
    [ InfoDialog, DetailsMixin ],
    {

buildRendering: function() {
    this.inherited( arguments );
    this._update();

    this.watch( 'track', lang.hitch( this, '_update' ) );
},

_update: function() {
    this.set( 'title', 'About this track: '+this.get('track').getConf('name') );
    this.set( 'content', this.makeDetailsContent() );
},

/**
 * @returns {Object} DOM element containing a rendering of the
 *                   detailed metadata about this track
 */
makeDetailsContent: function( additional ) {
    var details = dom.create('div', { className: 'detail' });
    var fmt = lang.hitch(this, 'renderDetailField', details );
    var track = this.get('track');
    fmt( 'Name', track.getConf('name') );
    track.getMetadata().then( function( m ) {
        var metadata = lang.mixin( {}, m, additional );
        delete metadata.key;
        delete metadata.label;
        if( typeof metadata.conf == 'object' )
            delete metadata.conf;

        var md_keys = [];
        for( var k in metadata )
            md_keys.push(k);
        // TODO: maybe do some intelligent sorting of the keys here?
        array.forEach( md_keys, function(key) {
                          fmt( Util.ucFirst(key), metadata[key] );
                      });
    });

    return details;
}

});
});