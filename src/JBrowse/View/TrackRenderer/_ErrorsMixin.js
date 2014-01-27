define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',

           'JBrowse/Errors',
           'JBrowse/has!dom?dojo/dom-geometry',
           'JBrowse/has!dom?dojo/dom-construct',
           'JBrowse/has!dom?dojo/dom-style'
       ],
       function(
           declare,
           lang,
           array,

           Errors,

           domGeom,
           domConstruct,
           domStyle

       ) {
return declare( null, {

    handleBlockError: function( error, viewArgs ) {
        try {
            if( error instanceof Errors.CancelError )
                return;
        } catch(e) {}

        var errorContext = lang.mixin( {}, error );
        lang.mixin( errorContext, viewArgs );

        var isObject = typeof error == 'object';

        if( isObject && error instanceof Errors.TimeOut && errorContext.block )
            this.fillBlockTimeout( errorContext.block, errorContext.blockNode, error );
        else if( isObject && error instanceof Errors.DataOverflow ) {
            if( errorContext.block )
                this.fillBlockTooManyFeaturesMessage( errorContext.block, errorContext.blockNode, viewArgs.scale, error );
            else
                this.showTrackMessage( 'Too much data to show' );
        }
        else {
            console.error( error.stack || ''+error, error );
            this.fatalError = error;
            if( this.get('widget') && this.get('widget')._handleError )
                this.get('widget')._handleError( error );
            else
                this.fillBlockError( error );
        }
    },

    fillBlockError: function( block, blockNode, error ) {
        error = error || this.fatalError || this.error;

        domConstruct.empty( blockNode );
        var msgDiv = this._renderErrorMessage( error.stack || ''+error, blockNode );
        this.heightUpdate( domGeom.position(msgDiv).h, block );
    },

    fillBlockTooManyFeaturesMessage: function( block, blockNode, scale, error ) {
        this.fillMessage(
            blockIndex,
            block,
            (error && error.message || 'Too much data to show')
                + (scale >= this.genomeView.maxPxPerBp ? '': '; zoom in to see detail')
                + '.'
        );
    },

    fillBlockTimeout: function( block, blockNode ) {
        domConstruct.empty( blockNode );
        domClass.add( blockNode, 'timed_out' );
        this.fillBlockMessage( block, blockNode,
                           'This region took too long'
                           + ' to display, possibly because'
                           + ' it contains too much data.'
                           + ' Try zooming in to show a smaller region.'
                         );
    },

    fillBlockMessage: function( block, blockNode, message, class_ ) {
        domConstruct.empty( blockNode );
        var msgDiv = domConstruct.create(
            'div', {
                className: class_ || 'message',
                innerHTML: message
            }, blockNode );
        this.heightUpdate( domGeom.getMarginBox(msgDiv, domStyle.getComputedStyle(msgDiv)).h, blockIndex );
    },

    _renderErrorMessage: function( message, parent ) {
        return domConstruct.create(
            'div', {
                className: 'error',
                innerHTML: '<h2>Oops!</h2><div class="text">There was a problem displaying this track.</div>'
                    +( message ? '<div class="codecaption">Diagnostic message</div><code>'+message+'</code>' : '' ),
                title: 'An error occurred'
            }, parent );
    },

    handleError: function( error, block, blockNode, changeInfo ) {
        if( blockNode && has('dom') ) {
            return this.handleBlockError( block, blockNode, error );
        } else if( this.get('widget') && this.get('widget')._handleError ) {
            return this.get('widget')._handleError( error );
        } else {
            console.error( error.stack || ''+error );
            return undefined;
        }
    },

    removeTrackMessage: function() {
        var w = this.get('widget');
        return w.removeTrackMessage.apply( w, arguments );
    },

    showTrackMessage: function() {
        var w = this.get('widget');
        return w.showTrackMessage.apply( w, arguments );
    }

});
});