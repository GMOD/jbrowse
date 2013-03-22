define([
           'dojo/_base/declare',
           'JBrowse/View/FeatureGlyph',
           './_FeatureLabelMixin'
       ],
       function(
           declare,
           FeatureGlyph,
           FeatureLabelMixin
       ) {

return declare([ FeatureGlyph, FeatureLabelMixin ], {

    constructor: function() {
    },

    _defaultConfig: function() {
        return this._mergeConfigs(
            this.inherited(arguments),
            {
                style: {
                    maxDescriptionLength: 70,

                    color: 'goldenrod',
                    mouseovercolor: 'rgba(0,0,0,0.3)',
                    border_color: null,
                    height: 11,
                    marginBottom: 2,

                    label: function( feature ) { return feature.get('name') || feature.get('id'); },
                    textFont: 'normal 12px Univers,Helvetica,Arial,sans-serif',
                    textColor:  'black',
                    text2Color: 'blue',
                    text2Font: 'normal 12px Univers,Helvetica,Arial,sans-serif',

                    description: 'note, description'
                }
            });
    },

    mouseoverFeature: function( context, block, fRect ) {
        this.renderFeature( context, block, fRect );

        // highlight the feature rectangle if we're moused over
        context.fillStyle = this.getStyle( fRect.f, 'mouseovercolor' );
        context.fillRect( fRect.l, fRect.t, fRect.rectSize.w, fRect.rectSize.h );
    },

    _getFeatureRectangle: function( args ) {
        var fRect = this.inherited( arguments );
        var feature = args.feature;

        // save the original rect in `rectSize` as the dimensions
        // we'll use for the rectangle itself
        fRect.rectSize = { h: fRect.h, w: Math.max( fRect.w, 1 ) };
        fRect.h += this.getStyle( feature, 'marginBottom' ) || 0;

        var viewArgs = args.view;

        // maybe get the feature's name, and update the layout box
        // accordingly
        if( viewArgs.showLabels ) {
            var label = this.makeLabel( args.feature, fRect );
            if( label ) {
                fRect.h += label.h;
                fRect.w = Math.max( label.w, fRect.w );
                fRect.label = label;
                label.yOffset = fRect.rectSize.h + label.h;
            }
        }

        // maybe get the feature's description if available, and
        // update the layout box accordingly
        if( viewArgs.showDescriptions ) {
            var description = this.makeDescription( args.feature, fRect );
            if( description ) {
                fRect.description = description;
                fRect.h += description.h;
                fRect.w = Math.max( description.w, fRect.w );
                description.yOffset = fRect.h-(this.getStyle( feature, 'marginBottom' ) || 0);
            }
        }

        return fRect;
    },

    renderFeature: function( context, block, fRect ) {
        var rectWidth = fRect.rectSize.w;
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
            context.font = this.config.style.textFont;
            context.fillStyle = this.getStyle( fRect.f, 'textColor' );
            context.fillText( fRect.label.text, fRect.l, fRect.t + fRect.label.yOffset );
        }

        // description
        if( fRect.description ) {
            context.font = this.config.style.text2Font;
            context.fillStyle = this.getStyle( fRect.f, 'text2Color' );
            context.fillText( fRect.description.text, fRect.l, fRect.t + fRect.description.yOffset);
        }
    }

});
});