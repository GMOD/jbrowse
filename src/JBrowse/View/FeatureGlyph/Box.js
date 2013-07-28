define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'JBrowse/Util/FastPromise',
           'JBrowse/View/FeatureGlyph',
           './_FeatureLabelMixin'
       ],
       function(
           declare,
           lang,
           FastPromise,
           FeatureGlyph,
           FeatureLabelMixin
       ) {


return declare([ FeatureGlyph, FeatureLabelMixin ], {

    constructor: function() {
        this._embeddedImagePromises = {};
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
                    border_width: 0.5,
                    height: 11,
                    marginBottom: 2,

                    strandArrow: true,

                    label: 'name, id',
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
        context.fillRect( fRect.rect.l, fRect.t, fRect.rect.w, fRect.rect.h );
    },

    _getFeatureHeight: function( viewArgs, feature ) {
        var h = this.getStyle( feature, 'height');

        if( viewArgs.displayMode == 'compact' )
            h = Math.round( 0.4 * h );

        return h;
    },

    _getFeatureRectangle: function( viewArgs, feature ) {
        var block = viewArgs.block;
        var fRect = {
            l: block.bpToX( feature.get('start') ),
            h: this._getFeatureHeight(viewArgs, feature)
        };

        fRect.w = block.bpToX( feature.get('end') ) - fRect.l;

        // save the original rect in `rect` as the dimensions
        // we'll use for the rectangle itself
        fRect.rect = { l: fRect.l, h: fRect.h, w: Math.max( fRect.w, 2 ) };
        fRect.w = fRect.rect.w; // in case it was increased
        fRect.h += this.getStyle( feature, 'marginBottom' ) || 0;

        if( viewArgs.displayMode == "collapsed")
            return fRect;

        // maybe get the feature's name, and update the layout box
        // accordingly
        if( viewArgs.showLabels ) {
            var label = this.makeLabel( feature, fRect );
            if( label ) {
                fRect.h += label.h;
                fRect.w = Math.max( label.w, fRect.w );
                fRect.label = label;
                label.yOffset = fRect.rect.h + label.h;
            }
        }

        // maybe get the feature's description if available, and
        // update the layout box accordingly
        if( viewArgs.showDescriptions ) {
            var description = this.makeDescription( feature, fRect );
            if( description ) {
                fRect.description = description;
                fRect.h += description.h;
                fRect.w = Math.max( description.w, fRect.w );
                description.yOffset = fRect.h-(this.getStyle( feature, 'marginBottom' ) || 0);
            }
        }

        // if we are showing strand arrowheads, expand the frect a little
        if( this.getStyle( feature, 'strandArrow') ) {
            var strand = fRect.strandArrow = feature.get('strand');

            fRect.w += 9;
            if( strand == -1 )
                fRect.l -= 9;
        }

        return fRect;
    },

    _imgData: {
         plus_arrow: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAFCAYAAACXU8ZrAAAATUlEQVQIW2NkwATGQKFYIG4A4g8gacb///+7AWlBmNq+vj6V4uLiJiD/FRBXA/F8xu7u7kcVFRWyMEVATQz//v0Dcf9CxaYRZxIxbgIARiAhmifVe8UAAAAASUVORK5CYII=",
         minus_arrow: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAFCAYAAACXU8ZrAAAASklEQVQIW2NkQAABILMBiBcD8VkkcQZGIAeEE4G4FYjFent764qKiu4gKXoPUjAJiLOggsxMTEwMjIwgYQjo6Oh4TLRJME043QQA+W8UD/sdk9IAAAAASUVORK5CYII="
    },

    /**
     * Returns a promise for an Image object for the image with the
     * given name.  Image data comes from a data URL embedded in this
     * source code.
     */
    getEmbeddedImage: function( name ) {
        return (this._embeddedImagePromises[name] || function() {
                    var p = new FastPromise();
                    var data = this._imgData[ name ];
                    if( ! data ) {
                        p.resolve( null );
                    }
                    else {
                        var i = new Image();
                        var thisB = this;
                        i.onload = function() {
                            p.resolve( this );
                        };
                        i.src = data;
                    }
                    return this._embeddedImagePromises[name] = p;
                }.call(this));
    },

    renderFeature: function( context, block, fRect ) {
        if( this.track.displayMode != 'collapsed' )
            context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );

        this.renderBox( context, block, fRect.f, fRect.t, fRect.rect.h, fRect.f );
        this.renderLabel( context, block, fRect );
        this.renderDescription( context, block, fRect );
        this.renderArrowhead( context, block, fRect );
    },

    // top and height are in px
    renderBox: function( context, block, feature, top, overallHeight, parentFeature, style ) {
        var left  = block.bpToX( feature.get('start') );
        var width = block.bpToX( feature.get('end') ) - left;
        //left = Math.round( left );
        //width = Math.round( width );

        style = style || lang.hitch( this, 'getStyle' );

        var height = style( feature, 'height' );
        if( ! height )
            return;
        if( height != overallHeight )
            top -= Math.round( (overallHeight - height)/2 );

        // background
        var bgcolor = style( feature, 'color' );
        if( bgcolor ) {
            context.fillStyle = bgcolor;
            context.fillRect( left, top, Math.max(1,width), height );
        }
        else {
            context.clearRect( left, top, Math.max(1,width), height );
        }

        // foreground border
        var borderColor, lineWidth;
        if( (borderColor = style( feature, 'border_color' )) && ( lineWidth = style( feature, 'border_width')) ) {
            if( width > 3 ) {
                context.lineWidth = lineWidth;
                context.strokeStyle = borderColor;

                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.strokeRect( left+lineWidth/2, top+lineWidth/2, width-lineWidth, height-lineWidth );
            }
            else {
                context.globalAlpha = lineWidth*2/width;
                context.fillStyle = borderColor;
                context.fillRect( left, top, Math.max(1,width), height );
                context.globalAlpha = 1;
            }
        }
    },

    // label
    renderLabel: function( context, block, fRect ) {
        if( fRect.label ) {
            context.font = this.config.style.textFont;
            context.fillStyle = this.getStyle( fRect.f, 'textColor' );
            context.fillText( fRect.label.text, fRect.l, fRect.t + fRect.label.yOffset );
        }
    },

    // description
    renderDescription: function( context, block, fRect ) {
        if( fRect.description ) {
            context.font = this.config.style.text2Font;
            context.fillStyle = this.getStyle( fRect.f, 'text2Color' );
            context.fillText( fRect.description.text, fRect.l, fRect.t + fRect.description.yOffset);
        }
    },

    // strand arrowhead
    renderArrowhead: function( context, block, fRect ) {
        if( fRect.strandArrow ) {
            if( fRect.strandArrow == 1 ) {
                this.getEmbeddedImage( 'plus_arrow' )
                    .then( function( img ) {
                               context.imageSmoothingEnabled = false;
                               context.drawImage( img, fRect.l + fRect.rect.w, fRect.t + (fRect.rect.h-img.height)/2 );
                           });
            }
            else if( fRect.strandArrow == -1 ) {
                this.getEmbeddedImage( 'minus_arrow' )
                    .then( function( img ) {
                               context.imageSmoothingEnabled = false;
                               context.drawImage( img, fRect.l, fRect.t + (fRect.rect.h-img.height)/2 );
                           });
            }
        }
    }

});
});