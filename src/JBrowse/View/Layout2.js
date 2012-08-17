define(
    ['dojo/_base/declare'],
    function( declare ) {
return declare( null,
{
    constructor: function( args ) {
        this.pitchX = args.pitchX || 10;
        this.pitchY = args.pitchY || 5;
        this.bitmap = [];
        this.rectangles = {};
    },

    /**
     * @returns {Number} top position for the rect
     */
    addRect: function(id, left, right, height) {
        // assumptions:
        //  - most of the rectangles being laid out will be
        //    nearly the same size
        if( this.rectangles[id] )
            return this.rectangles[id].top * this.pitchY;

        var pLeft  = Math.floor( left / this.pitchX );
        var pRight = Math.ceil( right / this.pitchX );
        var pHeight = Math.ceil( height / this.pitchY );

        var midX = Math.floor((pLeft+pRight)/2);
        var rectangle = { id: id, l: pLeft, r: pRight, mX: midX, h: pHeight, refCount: 0 };
        for( var top=0; top<this.bitmap.length; top++ ){
            if( this._collides(rectangle,top) )
                top++;
            else
                break;
        }
        rectangle.top = top;

        this._addRectToBitmap( rectangle );
        this.rectangles[id] = rectangle;
        //delete rectangle.mX; // don't need to store the midpoint

        top *= this.pitchY;
        this.totalHeight = Math.max( this.totalHeight||0, top+height );
        return top;
    },

    _collides: function( rect, top ) {
        var bitmap = this.bitmap;
        if( bitmap.length <= top )
            return false;
        var mY = top + rect.h/2; // Y midpoint: ( top+height  + top ) / 2
        var av = this._autovivify;

        // test the left first, then right, then middle
        if( av(bitmap,rect.l)[mY]
            || av(bitmap,rect.r)[mY]
            || av( bitmap, rect.mX )[mY]
          )
            return true;

        // finally, test exhaustively
        for( var x = rect.l; x <= rect.r; x++ )
            for( var y = top; y < top+rect.h; y++ )
                if( av(bitmap,x)[y] )
                    return true;

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

    _addRectToBitmap: function( rect ) {
        var bitmap = this.bitmap;
        var av = this._autovivify;
        // finally, test exhaustively
        var yEnd = rect.top+rect.h;
        for( var x = rect.l; x <= rect.r; x++ )
            for( var y = rect.top; y < yEnd; y++ ) {
                var vertSlice = av(bitmap,x);
                vertSlice[y]=true;
                if(!vertSlice.ids)
                    vertSlice.ids = {};
                vertSlice.ids[rect.id] = (vertSlice.ids[rect.id]||0) + 1;
                rect.refCount++;
            }
    },

    /**
     *  Given a basepair range, deletes all data dealing with the features
     */
    discardRange: function( left, right ) {
        left  = Math.ceil( left / this.pitchX );
        right = Math.floor( right / this.pitchX );
        var b = this.bitmap;
        for( var x = left; x<=right; x++ ) {
            var slice = b[x];
            if( ! slice )
                continue;

            for( var id in (slice.ids||{}) ) {
                this.rectangles[id].refCount -= slice.ids[id];
                if( this.rectangles[id].refCount == 0 )
                    delete this.rectangles[id];
                else if( this.rectangles[id].refCount < 0 )
                    console.error('wrong refcount!');
            }

            delete b[x];
        }
    },

    hasSeen: function( id ) {
        return !! this.rectangles[id];
    },

    cleanup: function() {
    },

    getTotalHeight: function() {
        return this.totalHeight || 0;
    }
}
);
});