/**
 * Rectangle-layout manager that lays out rectangles using bitmaps at
 * resolution that, for efficiency, may be somewhat lower than that of
 * the coordinate system for the rectangles being laid out.  `pitchX`
 * and `pitchY` are the ratios of input scale resolution to internal
 * bitmap resolution.
 */

define(
    ['dojo/_base/declare'],
    function( declare ) {
return declare( null,
{


    /**
     * @param args.pitchX  layout grid pitch in the X direction
     * @param args.pitchY  layout grid pitch in the Y direction
     * @param args.maxHeight  maximum layout height, default Infinity (no max)
     */
    constructor: function( args ) {
        this.pitchX = args.pitchX || 10;
        this.pitchY = args.pitchY || 10;

        this.displayMode = args.displayMode;

        // reduce the pitchY to try and pack the features tighter
        if( this.displayMode == 'compact' ) {
            this.pitchY = Math.round( this.pitchY/4 ) || 1;
            this.pitchX = Math.round( this.pitchX/4 ) || 1;
        }

        this.bitmap = [];
        this.rectangles = {};
        this.maxHeight = Math.ceil( ( args.maxHeight || Infinity ) / this.pitchY );
        this.pTotalHeight = 0; // total height, in units of bitmap squares (px/pitchY)
    },

    /**
     * @returns {Number} top position for the rect, or Null if laying out the rect would exceed maxHeight
     */
    addRect: function( id, left, right, height, data ) {

        // if we have already laid it out, return its layout
        if( id in this.rectangles ) {
            var storedRec = this.rectangles[id];
            if( storedRec.top === null )
                return null;

            // add it to the bitmap again, since that bitmap range may have been discarded
            this._addRectToBitmap( storedRec, data );
            return storedRec.top * this.pitchY;
        }

        var pLeft   = Math.floor( left   / this.pitchX );
        var pRight  = Math.floor( right  / this.pitchX );
        var pHeight = Math.ceil(  height / this.pitchY );

        var midX = Math.floor((pLeft+pRight)/2);
        var rectangle = { id: id, l: pLeft, r: pRight, mX: midX, h: pHeight };
        if( data )
            rectangle.data = data;

        var maxTop = this.maxHeight - pHeight;
        for(var top = 0; top <= maxTop; top++ ){
            if( ! this._collides( rectangle, top ) )
                break;
        }

        if( top > maxTop ) {
            rectangle.top = top = null;
            this.rectangles[id] = rectangle;
            this.pTotalHeight = Math.max( this.pTotalHeight||0, top+pHeight );
            return null;
        }
        else {
            rectangle.top = top;
            this._addRectToBitmap( rectangle, data );
            this.rectangles[id] = rectangle;
            this.pTotalHeight = Math.max( this.pTotalHeight||0, top+pHeight );
            return top * this.pitchY;
        }
    },

    _collides: function( rect, top ) {
        if( this.displayMode == "collapsed" )
            return false;

        var bitmap = this.bitmap;
        //var mY = top + rect.h/2; // Y midpoint: ( top+height  + top ) / 2

        // test the left first, then right, then middle
        var mRow = bitmap[top];
        if( mRow && ( mRow[rect.l] || mRow[rect.r] || mRow[rect.mX]) )
            return true;

        // finally, test exhaustively
        var maxY = top+rect.h;
        for( var y = top; y < maxY; y++ ) {
            var row = bitmap[y];
            if( row ) {
                if( row.allFilled )
                    return true;
                if( row.length > rect.l )
                    for( var x = rect.l; x <= rect.r; x++ )
                        if( row[x] )
                            return true;
            }
        }

        return false;
    },

    /**
     * make a subarray if it does not exist
     * @private
     */
    _autovivify: function( array, subscript ) {
        return array[subscript] ||
            (function() { var a = []; array[subscript] = a; return a; })();
    },

    _addRectToBitmap: function( rect, data ) {
        if( rect.top === null )
            return;

        data = data || true;
        var bitmap = this.bitmap;
        var av = this._autovivify;
        var yEnd = rect.top+rect.h;
        if( rect.r-rect.l > 20000 ) {
            // the rect is very big in relation to the view size, just
            // pretend, for the purposes of layout, that it extends
            // infinitely.  this will cause weird layout if a user
            // scrolls manually for a very, very long time along the
            // genome at the same zoom level.  but most users will not
            // do that.  hopefully.
            for( var y = rect.top; y < yEnd; y++ ) {
                av(bitmap,y).allFilled = data;
            }
        }
        else {
            for( var y = rect.top; y < yEnd; y++ ) {
                var row = av(bitmap,y);
                for( var x = rect.l; x <= rect.r; x++ )
                    row[x] = data;
            }
        }
    },

    /**
     *  Given a range of X coordinates, deletes all data dealing with
     *  the features.
     */
    discardRange: function( left, right ) {
        //console.log( 'discard', left, right );
        var pLeft   = Math.floor( left   / this.pitchX );
        var pRight  = Math.floor( right  / this.pitchX );
        var bitmap = this.bitmap;
        for( var y = 0; y < bitmap.length; ++y ) {
            var row = bitmap[y];
            if( row )
                for( var x = pLeft; x <= pRight; ++x ) {
                    delete row[x];
                }
        }
    },

    hasSeen: function( id ) {
        return !! this.rectangles[id];
    },

    getByCoord: function( x, y ) {
        var pY   = Math.floor( y / this.pitchY );
        var r = this.bitmap[pY];
        if( ! r ) return undefined;
        return r.allFilled || function() {
            var pX   = Math.floor( x / this.pitchX );
            return r[pX];
        }.call(this);
    },

    getByID: function( id ) {
        var r = this.rectangles[id];
        if( r ) {
            return r.data || true;
        }
        return undefined;
    },

    cleanup: function() {
    },

    getTotalHeight: function() {
        return this.pTotalHeight * this.pitchY;
    }
}
);
});