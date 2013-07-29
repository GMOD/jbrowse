define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'JBrowse/Util/FastPromise',
           'JBrowse/View/FeatureGlyph',
           './_FeatureLabelMixin'
       ],
       function(
           declare,
           array,
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

    _getFeatureHeight: function( viewArgs, feature ) {
        var h = this.getStyle( feature, 'height');

        if( viewArgs.displayMode == 'compact' )
            h = 0.45 * h;

        return h;
    },

    _getFeatureRectangle: function( viewArgs, feature ) {
        var block = viewArgs.block;
        var fRect = {
            l: block.bpToX( feature.get('start') ),
            h: this._getFeatureHeight(viewArgs, feature),
            viewInfo: viewArgs,
            f: feature,
            glyph: this
        };

        fRect.w = block.bpToX( feature.get('end') ) - fRect.l;

        // save the original rect in `rect` as the dimensions
        // we'll use for the rectangle itself
        fRect.rect = { l: fRect.l, h: fRect.h, w: Math.max( fRect.w, 2 ), t: 0 };
        fRect.w = fRect.rect.w; // in case it was increased
        if( viewArgs.displayMode != 'compact' )
            fRect.h += this.getStyle( feature, 'marginBottom' ) || 0
;
        // if we are showing strand arrowheads, expand the frect a little
        if( this.getStyle( feature, 'strandArrow') ) {
            var strand = fRect.strandArrow = feature.get('strand');

            fRect.w += 9;
            fRect.rect.w += 9;
            if( strand == -1 ) {
                fRect.l -= 9;
                fRect.rect.l -= 9;
            }
        }

        // no labels or descriptions if displayMode is collapsed, so stop here
        if( viewArgs.displayMode == "collapsed")
            return fRect;

        this._expandRectangleWithLabels( viewArgs, feature, fRect );
        this._addMasksToRect( viewArgs, feature, fRect );

        return fRect;
    },

    // given an under-construction feature layout rectangle, expand it
    // to accomodate a label and/or a description
    _expandRectangleWithLabels: function( viewArgs, feature, fRect ) {
        // maybe get the feature's name, and update the layout box
        // accordingly
        if( viewArgs.showLabels ) {
            var label = this.makeFeatureLabel( feature, fRect );
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
            var description = this.makeFeatureDescriptionLabel( feature, fRect );
            if( description ) {
                fRect.description = description;
                fRect.h += description.h;
                fRect.w = Math.max( description.w, fRect.w );
                description.yOffset = fRect.h-(this.getStyle( feature, 'marginBottom' ) || 0);
            }
        }
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

    renderFeature: function( context, fRect ) {
        if( this.track.displayMode != 'collapsed' )
            context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w-Math.floor(fRect.l)+fRect.l), fRect.h );

        this.renderBox( context, fRect.viewInfo, fRect.f, fRect.t, fRect.rect.h, fRect.f );
        this.renderLabel( context, fRect );
        this.renderDescription( context, fRect );
        this.renderArrowhead( context, fRect );
    },

    // top and height are in px
    renderBox: function( context, viewInfo, feature, top, overallHeight, parentFeature, style ) {
        var left  = viewInfo.block.bpToX( feature.get('start') );
        var width = viewInfo.block.bpToX( feature.get('end') ) - left;
        //left = Math.round( left );
        //width = Math.round( width );

        style = style || lang.hitch( this, 'getStyle' );

        var height = style( feature, 'height' );
        if( ! height )
            return;
        if( height != overallHeight )
            top += Math.round( (overallHeight - height)/2 );

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

    // feature label
    renderLabel: function( context, fRect ) {
        if( fRect.label ) {
            context.font = fRect.label.font;
            context.fillStyle = fRect.label.fill;
            context.textBaseline = fRect.label.baseline;
            context.fillText( fRect.label.text,
                              fRect.l+(fRect.label.xOffset||0),
                              fRect.t+(fRect.label.yOffset||0)
                            );
        }
    },

    // feature description
    renderDescription: function( context, fRect ) {
        if( fRect.description ) {
            context.font = fRect.description.font;
            context.fillStyle = fRect.description.fill;
            context.textBaseline = fRect.description.baseline;
            context.fillText(
                fRect.description.text,
                fRect.l+(fRect.description.xOffset||0),
                fRect.t + (fRect.description.yOffset||0)
            );
        }
    },

    // strand arrowhead
    renderArrowhead: function( context, fRect ) {
        if( fRect.strandArrow ) {
            if( fRect.strandArrow == 1 && fRect.rect.l+fRect.rect.w <= context.canvas.width ) {
                this.getEmbeddedImage( 'plus_arrow' )
                    .then( function( img ) {
                               context.imageSmoothingEnabled = false;
                               context.drawImage( img, fRect.rect.l + fRect.rect.w - 9, fRect.t + (fRect.rect.h-img.height)/2 );
                           });
            }
            else if( fRect.strandArrow == -1 && fRect.rect.l >= 0 ) {
                this.getEmbeddedImage( 'minus_arrow' )
                    .then( function( img ) {
                               context.imageSmoothingEnabled = false;
                               context.drawImage( img, fRect.rect.l, fRect.t + (fRect.rect.h-img.height)/2 );
                           });
            }
        }
    }

});
});