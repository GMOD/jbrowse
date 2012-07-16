define( ['dojo/_base/declare',
         'JBrowse/View/Track/Canvas'
        ],
        function( declare,  CanvasTrack ) {
return declare( CanvasTrack,
/**
 * @lends JBrowse.View.Track.Wiggle.prototype
 */
{
    constructor: function( args ) {
        this.inherited( arguments );
        this.store = args.store;
        this.store.whenReady( this, 'loadSuccess' );
    },

    load: function() {
    },

    loadSuccess: function(o,url) {
        this.empty = this.store.empty || false;
        this.setLoaded();
    },

    _getView: function(scale) {
        if( !this._viewCache || this._viewCache.scale != scale ) {
            this._viewCache = {
                scale: scale,
                view: this.store.getView(1/scale)
            };
        }
        return this._viewCache.view;
    },

    renderCanvases: function( scale, leftBase, rightBase, callback ) {
        var width = ( rightBase - leftBase + 1 ) * scale;
        var trackHeight = 100;
        var globalMax = 1000;
        var fillStyle = (this.config.style||{}).fillStyle || '#00f';
        this._getView( scale )
            .readWigData( this.refSeq.name, leftBase, rightBase, function( features ) {
                var c = dojo.create(
                    'canvas',
                    { height: trackHeight,
                      width: width,
                      innerHTML: 'Canvas-based tracks not supported by this browser'
                    }
                );
                var context = c && c.getContext && c.getContext('2d');
                if( context ) {
                    //context.fillText(features.length+' spans', 10,10);
                    context.fillStyle = fillStyle;
                    //console.log( 'filling '+leftBase+'-'+rightBase);
                    dojo.forEach(features, function(f) {
                        //console.log( f.get('start')+'-'+f.get('end')+':'+f.get('score') );
                        var rectLeft  = ( f.get('start') - leftBase ) * scale;
                        var rectRight = ( f.get('end')   - leftBase ) * scale;
                        var height = f.get('score')/globalMax * trackHeight;
                        context.fillRect( rectLeft, trackHeight-height, rectRight-rectLeft+1, height );
                    }, this );
                }

                if( ! callback ) {
                    console.error('null callback?');
                }
                else {
                    callback( [c] );
                }
            });
    }
});
});
