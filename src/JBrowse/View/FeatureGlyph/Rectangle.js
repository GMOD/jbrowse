define([
           'dojo/_base/declare',
           'JBrowse/View/FeatureGlyph'
       ],
       function(
           declare,
           FeatureGlyph
       ) {

return declare( FeatureGlyph, {

    constructor: function() {
    },

    mouseoverFeature: function( context, args, fRect ) {
        context.fillStyle = this.getStyle( fRect.f, 'mouseovercolor' );
        context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
    },

    _getFeatureRectangle: function( args ) {
        var fRect = this.inherited( arguments );
        var feature = args.feature;

        fRect.rectSize = { h: fRect.h, w: fRect.w };
        fRect.h += this.getStyle( feature, 'marginBottom' ) || 0;

        var viewArgs = args.view;

        // maybe get the feature's name, and update the layout box accordingly
        if( viewArgs.showLabels ) {
            var label = this.getStyle( args.feature, 'label' );
            if( label ) {
                var lsize = this.estimateLabelSize( label );
                fRect.h += lsize.h;
                fRect.w = Math.max( lsize.w, fRect.w );
                fRect.label = label;
                lsize.yOffset = fRect.rectSize.h + lsize.h;
                fRect.labelSize = lsize;
            }
        }

        // get the feature's description if available, and update the layout height accordingly
        if( viewArgs.showDescriptions ) {
            var description = this.track.getFeatureDescription( args.feature );
            if( description ) {
                fRect.description = description;
                var dsize = this.estimateDescriptionSize( description );
                fRect.h += dsize.h;
                fRect.w = Math.max( dsize.w, fRect.w );
                dsize.yOffset = fRect.h-(this.getStyle( feature, 'marginBottom' ) || 0);
                fRect.descriptionSize = dsize;
            }
        }

        return fRect;
    },

    estimateLabelSize: function( text ) {
        var dims = this._labelDims
            || ( this._labelDims = this._measureFont( this.track.config.style.textFont ) );
        return { w: dims.w * text.length, h: dims.h };
    },

    estimateDescriptionSize: function( text ) {
        var dims = this._descriptionDims
            || ( this._descriptionDims =
                    this._measureFont(    this.track.config.style.text2Font
                                       || this.track.config.style.textFont
                                     )
               );
        return { w: dims.w * text.length, h: dims.h };
    },

    _measureFont: function( font ) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        ctx.font = font;
        var testString = "AaBbMmNn-..Zz1234567890";
        var m = ctx.measureText( testString );
        return {
            h: m.height || parseInt( font.match(/(\d+)px/)[1] ),
            w: m.width / testString.length
        };
    },

    renderFeature: function( context, viewArgs, fRect ) {
        var rectWidth = Math.max( fRect.rectSize.w, 1 );
        var rectHeight = fRect.rectSize.h;

        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );

        // background
        var color = this.getStyle( fRect.f, 'color' );
        if( color ) {
            context.fillStyle = color;
            context.fillRect( fRect.l, fRect.t, rectWidth, rectHeight );
        }

        // foreground border
        var border_color;
        if( rectHeight > 3 ) {
            border_color = this.getStyle( fRect.f, 'border_color' );
            if( border_color ) {
                context.lineWidth = 1;
                context.strokeStyle = border_color;

                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.strokeRect( fRect.l+0.5, fRect.t+0.5, rectWidth-1, rectHeight-1 );
            }
        }
        else if( rectHeight > 1 ) {
            border_color = this.getStyle( fRect.f, 'border_color' );
            if( border_color ) {
                context.fillStyle = border_color;
                context.fillRect( fRect.l, fRect.t+fRect.h-1, rectWidth, 1 );
            }
        }

        // label
        if( fRect.label ) {
            context.font = this.track.config.style.textFont;
            context.fillStyle = this.getStyle( fRect.f, 'textColor' );
            context.fillText( fRect.label, fRect.l, fRect.t + fRect.labelSize.yOffset );
        }

        // description
        if( fRect.description ) {
            context.font = this.track.config.style.text2Font;
            context.fillStyle = this.getStyle( fRect.f, 'text2Color' );
            context.fillText( fRect.description, fRect.l, fRect.t + fRect.descriptionSize.yOffset);
        }
    }

});
});