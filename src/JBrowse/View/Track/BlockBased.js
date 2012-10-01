define( [
            'dojo/_base/declare',
            'dojo/aspect',
            'dojo/dom-geometry',
            'dijit/Dialog',
            'dijit/Menu',
            'dijit/PopupMenuItem',
            'dijit/MenuItem',
            'JBrowse/Util'
        ],
        function( declare,
                  aspect,
                  domGeom,
                  dijitDialog,
                  dijitMenu,
                  dijitPopupMenuItem,
                  dijitMenuItem,
                  Util
                ) {
return declare( null,
/**
 * @lends JBrowse.View.Track.BlockBased.prototype
 */
{
    /**
     * Base class for all JBrowse tracks.
     * @constructs
     */
    constructor: function( args ) {
        args = args || {};
        var config = args.config || {};
        this.name = args.label || config.label;
        this.key = args.key || config.key || this.name;
        this.loaded = false;
        this.changed = args.changeCallback || function() {};
        this.height = 0;
        this.shown = true;
        this.empty = false;
        this.browser = args.browser;
    },

    load: function(url) {
        dojo.xhrGet({ url: url,
                      handleAs: "json",
                      failOk: true,
                      load:  dojo.hitch( this, function(o) { this.loadSuccess(o, url); }),
                      error: dojo.hitch( this, function(o) { this.loadFail(o, url);    })
	            });
    },

    loadSuccess: function(error) {
        this.setLoaded();
    },

    loadFail: function(error) {
        if( error.status != 404 )
            console.error(''+error);
        this.empty = true;
        this.setLoaded();
    },

    heightUpdate: function(height, blockIndex) {
        if (!this.shown) {
            this.heightUpdateCallback(0);
            return;
        }

        if (blockIndex !== undefined)
            this.blockHeights[blockIndex] = height;

        this.height = Math.max( this.height, height );
        if ( ! this.inShowRange ) {
            this.heightUpdateCallback( Math.max( this.labelHeight, this.height ) );
        }
    },

    setViewInfo: function( genomeView, heightUpdate, numBlocks,
                           trackDiv, labelDiv,
                           widthPct, widthPx, scale) {
        this.genomeView = genomeView;
        this.heightUpdateCallback = heightUpdate;
        this.div = trackDiv;
        this.label = labelDiv;
        this.widthPct = widthPct;
        this.widthPx = widthPx;

        this.leftBlank = document.createElement("div");
        this.leftBlank.className = "blank-block";
        this.rightBlank = document.createElement("div");
        this.rightBlank.className = "blank-block";
        this.div.appendChild(this.rightBlank);
        this.div.appendChild(this.leftBlank);

        this.sizeInit(numBlocks, widthPct);
        this.labelHTML = "";
        this.labelHeight = 0;

        this.setLabel( this.key );
    },


    hide: function() {
        if (this.shown) {
            this.div.style.display = "none";
            this.shown = false;
        }
    },

    show: function() {
        if (!this.shown) {
            this.div.style.display = "block";
            this.shown = true;
        }
    },

    initBlocks: function() {
        this.blocks = new Array(this.numBlocks);
        this.blockHeights = new Array(this.numBlocks);
        for (var i = 0; i < this.numBlocks; i++) this.blockHeights[i] = 0;
        this.firstAttached = null;
        this.lastAttached = null;
        this._adjustBlanks();
    },

    clear: function() {
        if (this.blocks) {
            for (var i = 0; i < this.numBlocks; i++)
                this._hideBlock(i);
        }
        this.initBlocks();
    },

    setLabel: function(newHTML) {
        if (this.label === undefined || this.labelHTML == newHTML )
            return;

        this.labelHTML = newHTML;
        dojo.query('.track-label-text',this.label)
            .forEach(function(n){ n.innerHTML = newHTML; });
        this.labelHeight = this.label.offsetHeight;
    },

    /**
     * Stub.
     */
    transfer: function() {},

    /**
     *  Stub.
     */
    startZoom: function(destScale, destStart, destEnd) {},

    /**
     * Stub.
     */
    endZoom: function(destScale, destBlockBases) {},


    showRange: function(first, last, startBase, bpPerBlock, scale,
                        containerStart, containerEnd) {
        if (this.blocks === undefined) return 0;

        // this might make more sense in setViewInfo, but the label element
        // isn't in the DOM tree yet at that point
        if ((this.labelHeight == 0) && this.label)
            this.labelHeight = this.label.offsetHeight;

        this.inShowRange = true;
        this.height = this.labelHeight;

        var firstAttached = (null == this.firstAttached ? last + 1 : this.firstAttached);
        var lastAttached =  (null == this.lastAttached ? first - 1 : this.lastAttached);

        var i, leftBase;
        var maxHeight = 0;
        //fill left, including existing blocks (to get their heights)
        for (i = lastAttached; i >= first; i--) {
            leftBase = startBase + (bpPerBlock * (i - first));
            this._showBlock(i, leftBase, leftBase + bpPerBlock, scale,
                            containerStart, containerEnd);
        }
        //fill right
        for (i = lastAttached + 1; i <= last; i++) {
            leftBase = startBase + (bpPerBlock * (i - first));
            this._showBlock(i, leftBase, leftBase + bpPerBlock, scale,
                            containerStart, containerEnd);
        }

        //detach left blocks
        var destBlock = this.blocks[first];
        for (i = firstAttached; i < first; i++) {
            this.transfer(this.blocks[i], destBlock, scale,
                          containerStart, containerEnd);
            this.cleanupBlock(this.blocks[i]);
            this._hideBlock(i);
        }
        //detach right blocks
        destBlock = this.blocks[last];
        for (i = lastAttached; i > last; i--) {
            this.transfer(this.blocks[i], destBlock, scale,
                          containerStart, containerEnd);
            this.cleanupBlock(this.blocks[i]);
            this._hideBlock(i);
        }

        this.firstAttached = first;
        this.lastAttached = last;
        this._adjustBlanks();
        this.inShowRange = false;

        this.heightUpdate(this.height);
        this.updateStaticElements( this.genomeView.getPosition() );

        return 1;
    },

    cleanupBlock: function() {},

    _hideBlock: function(blockIndex) {
        if (this.blocks[blockIndex]) {
            this.div.removeChild(this.blocks[blockIndex]);
            this.blocks[blockIndex] = undefined;
            this.blockHeights[blockIndex] = 0;
        }
    },

    _adjustBlanks: function() {
        if ((this.firstAttached === null)
            || (this.lastAttached === null)) {
            this.leftBlank.style.left = "0px";
            this.leftBlank.style.width = "50%";
            this.rightBlank.style.left = "50%";
            this.rightBlank.style.width = "50%";
        } else {
            this.leftBlank.style.width = (this.firstAttached * this.widthPct) + "%";
            this.rightBlank.style.left = ((this.lastAttached + 1)
                                          * this.widthPct) + "%";
            this.rightBlank.style.width = ((this.numBlocks - this.lastAttached - 1)
                                           * this.widthPct) + "%";
        }
    },

    hideAll: function() {
        if (null == this.firstAttached) return;
        for (var i = this.firstAttached; i <= this.lastAttached; i++)
            this._hideBlock(i);


        this.firstAttached = null;
        this.lastAttached = null;
        this._adjustBlanks();
        //this.div.style.backgroundColor = "#eee";
    },

    setLoaded: function() {
        this.loaded = true;
        this.hideAll();
        this.changed();
    },

    _loadingBlock: function(blockDiv) {
        blockDiv.appendChild(document.createTextNode("Loading..."));
        blockDiv.style.backgroundColor = "#eee";
        return 50;
    },

    _showBlock: function(blockIndex, startBase, endBase, scale,
                         containerStart, containerEnd) {
        if (this.blocks[blockIndex]) {
            this.heightUpdate(this.blockHeights[blockIndex], blockIndex);
            return;
        }
        if (this.empty) {
            this.heightUpdate(this.labelHeight, blockIndex);
            return;
        }

        var blockDiv = document.createElement("div");
        blockDiv.className = "block";
        blockDiv.style.left = (blockIndex * this.widthPct) + "%";
        blockDiv.style.width = this.widthPct + "%";
        blockDiv.startBase = startBase;
        blockDiv.endBase = endBase;
        this.blocks[blockIndex] = blockDiv;
        this.div.appendChild(blockDiv);

        if (this.loaded) {
            this.fillBlock(blockIndex,
                           blockDiv,
                           this.blocks[blockIndex - 1],
                           this.blocks[blockIndex + 1],
                           startBase,
                           endBase,
                           scale,
                           this.widthPx,
                           containerStart,
                           containerEnd);
        } else {
            this._loadingBlock(blockDiv);
        }
    },

    moveBlocks: function(delta) {
        var newBlocks = new Array(this.numBlocks);
        var newHeights = new Array(this.numBlocks);
        var i;
        for (i = 0; i < this.numBlocks; i++)
            newHeights[i] = 0;

        var destBlock;
        if ((this.lastAttached + delta < 0)
            || (this.firstAttached + delta >= this.numBlocks)) {
            this.firstAttached = null;
            this.lastAttached = null;
        } else {
            this.firstAttached = Math.max(0, Math.min(this.numBlocks - 1,
                                                      this.firstAttached + delta));
            this.lastAttached = Math.max(0, Math.min(this.numBlocks - 1,
                                                     this.lastAttached + delta));
            if (delta < 0)
                destBlock = this.blocks[this.firstAttached - delta];
            else
                destBlock = this.blocks[this.lastAttached - delta];
        }

        for (i = 0; i < this.blocks.length; i++) {
            var newIndex = i + delta;
            if ((newIndex < 0) || (newIndex >= this.numBlocks)) {
                //We're not keeping this block around, so delete
                //the old one.
                if (destBlock && this.blocks[i])
                    this.transfer(this.blocks[i], destBlock);
                this._hideBlock(i);
            } else {
                //move block
                newBlocks[newIndex] = this.blocks[i];
                if (newBlocks[newIndex])
                    newBlocks[newIndex].style.left =
                    ((newIndex) * this.widthPct) + "%";

                newHeights[newIndex] = this.blockHeights[i];
            }
        }
        this.blocks = newBlocks;
        this.blockHeights = newHeights;
        this._adjustBlanks();
    },

    sizeInit: function(numBlocks, widthPct, blockDelta) {
        var i, oldLast;
        this.numBlocks = numBlocks;
        this.widthPct = widthPct;
        if (blockDelta) this.moveBlocks(-blockDelta);
        if (this.blocks && (this.blocks.length > 0)) {
            //if we're shrinking, clear out the end blocks
            var destBlock = this.blocks[numBlocks - 1];
            for (i = numBlocks; i < this.blocks.length; i++) {
                if (destBlock && this.blocks[i])
                    this.transfer(this.blocks[i], destBlock);
                this._hideBlock(i);
            }
            oldLast = this.blocks.length;
            this.blocks.length = numBlocks;
            this.blockHeights.length = numBlocks;
            //if we're expanding, set new blocks to be not there
            for (i = oldLast; i < numBlocks; i++) {
                this.blocks[i] = undefined;
                this.blockHeights[i] = 0;
            }
            this.lastAttached = Math.min(this.lastAttached, numBlocks - 1);
            if (this.firstAttached > this.lastAttached) {
                //not sure if this can happen
                this.firstAttached = null;
                this.lastAttached = null;
            }

            if (this.blocks.length != numBlocks) throw new Error("block number mismatch: should be " + numBlocks + "; blocks.length: " + this.blocks.length);
            for (i = 0; i < numBlocks; i++) {
                if (this.blocks[i]) {
                    //if (!this.blocks[i].style) console.log(this.blocks);
                    this.blocks[i].style.left = (i * widthPct) + "%";
                    this.blocks[i].style.width = widthPct + "%";
                }
            }
        } else {
            this.initBlocks();
        }
    },

    /**
     * Called by GenomeView when the view is scrolled: communicates the
     * new x, y, width, and height of the view.  This is needed by tracks
     * for positioning stationary things like axis labels.
     */
    updateStaticElements: function( /**Object*/ coords ) {
        this.window_info = dojo.mixin( this.window_info || {}, coords );
    },

    /**
     * Render a dijit menu from a specification object.
     *
     * @param menuTemplate definition of the menu's structure
     * @param context {Object} optional object containing the context
     *   in which any click handlers defined in the menu should be
     *   invoked, containing thing like what feature is being operated
     *   upon, the track object that is involved, etc.
     * @param parent {dijit.Menu|...} parent menu, if this is a submenu
     */
    _renderContextMenu: function( /**Object*/ menuStructure, /** Object */ context, /** dijit.Menu */ parent ) {
       if ( !parent )
            parent = new dijitMenu();

        for ( key in menuStructure ) {
            var spec = menuStructure [ key ];
            if ( spec.children ) {
                var child = new dijitMenu();
                parent.addChild( child );
                parent.addChild( new dijitPopupMenuItem(
                                     {
                                         popup : child,
                                         label : spec.label
                                     }));
                this._renderContextMenu( spec.children, context, child );
            }
            // only draw other menu items if they have an action.
            // drawing menu items that do nothing when clicked
            // would frustrate users.
            else if( spec.action || spec.url || spec.href ) {
                var menuConf = dojo.clone( spec );
                menuConf.onClick = this._makeClickHandler( spec, context );
                var child = new dijitMenuItem( menuConf );
                parent.addChild(child);
            }
        }
        return parent;
    },

    _makeClickHandler: function( inputSpec, context ) {
        var track  = this;

        if( typeof inputSpec == 'function' ) {
            inputSpec = { action: inputSpec };
        }
        else if( typeof inputSpec == 'undefined' ) {
            console.error("Undefined click specification, cannot make click handler");
            return function() {};
        }

        var handler = function ( evt ) {
            if( track.genomeView.dragging )
                return;

            var ctx = context || this;
            var spec = track._processMenuSpec( dojo.clone( inputSpec ), ctx );
            var url = spec.url || spec.href;
            spec.url = url;
            var style = dojo.clone( spec.style || {} );

            // try to understand the `action` setting
            spec.action = spec.action ||
                ( url          ? 'iframeDialog'  :
                  spec.content ? 'contentDialog' :
                                 false
                );
            spec.title = spec.title || spec.label;

            if( typeof spec.action == 'string' ) {
                // treat `action` case-insensitively
                spec.action = {
                    iframedialog:   'iframeDialog',
                    iframe:         'iframeDialog',
                    contentdialog:  'contentDialog',
                    content:        'content',
                    xhrdialog:      'xhrDialog',
                    xhr:            'xhr',
                    newwindow:      'newWindow',
                    "_blank":       'newWindow'
                }[(''+spec.action).toLowerCase()];

                if( spec.action == 'newWindow' )
                    window.open( url, '_blank' );
                else if( spec.action in { iframeDialog:1, contentDialog:1, xhrDialog:1} )
                    track._openDialog( spec, evt, ctx );
            }
            else if( typeof spec.action == 'function' ) {
                spec.action.call( ctx, evt );
            }
            else {
                return;
            }
        };

        // if there is a label, set it on the handler so that it's
        // accessible for tooltips or whatever.
        if( inputSpec.label )
            handler.label = inputSpec.label;

        return handler;
    },

    /**
     * @returns {String} string of HTML that prints the detailed metadata about this track
     */
    _trackDetailsContent: function() {
        var details = '<div class="detail">';
        var fmt = dojo.hitch(this, '_fmtDetailField');
        details += fmt( 'Name', this.key || this.name );
        var metadata = dojo.clone( this.getMetadata() );
        delete metadata.key;
        delete metadata.label;

        var md_keys = [];
        for( var k in metadata )
            md_keys.push(k);
        // TODO: maybe do some intelligent sorting of the keys here?
        dojo.forEach( md_keys, function(key) {
                          details += fmt( Util.ucFirst(key), metadata[key] );
                      });
        details += "</div>";
        return details;
    },

    getMetadata: function() {
        return this.browser && this.browser.trackMetaDataStore ? this.browser.trackMetaDataStore.getItem(this.name) :
                                          this.config.metadata ? this.config.metadata :
                                                                 {};
    },

    _fmtDetailField: function( title, val, class_ ) {
        var valType = typeof val;
        if( !( valType in {string:1,number:1} ) )
            return ''; //val = '<span class="ghosted">none</span>';
        class_ = class_ || title.replace(/\s+/g,'_').toLowerCase();
        return '<div class="field_container"><h2 class="field '+class_+'">'+title+'</h2> <div class="value '+class_+'">'+val+'</div></div>';
    },


    /**
     * @returns {Array} menu options for this track's menu (usually contains save as, etc)
     */
    _trackMenuOptions: function() {
        return [
            { label: 'About this track',
              title: 'About track: '+(this.key||this.name),
              iconClass: 'jbrowseIconHelp',
              action: 'contentDialog',
              content: dojo.hitch(this,'_trackDetailsContent')
            }
        ];
    },


    _processMenuSpec: function( spec, context ) {
        for( var x in spec ) {
            if( typeof spec[x] == 'object' )
                spec[x] = this._processMenuSpec( spec[x], context );
            else
                spec[x] = this.template( context.feature, this._evalConf( context, spec[x], x ) );
        }
        return spec;
    },

    /**
     * Get the value of a conf variable, evaluating it if it is a
     * function.  Note: does not template it, that is a separate step.
     *
     * @private
     */
    _evalConf: function( context, confVal, confKey ) {

        // list of conf vals that should not be run immediately on the
        // feature data if they are functions
        var dontRunImmediately = {
            action: 1,
            click: 1,
            content: 1
        };

        return typeof confVal == 'function' && !dontRunImmediately[confKey]
            ? confVal.apply( context, context.callbackArgs || [] )
            : confVal;
    },

    _openDialog: function( spec, evt, context ) {
        context = context || {};
        var type = spec.action;
        type = type.replace(/Dialog/,'');
        var featureName = context.feature && (context.feature.get('name')||context.feature.get('id'));
        var dialogOpts = {
            "class": "popup-dialog popup-dialog-"+type,
            title: spec.title || spec.label || ( featureName ? featureName +' details' : "Details"),
            style: dojo.clone( spec.style || {} )
        };
        if( spec.dialog )
            declare.safeMixin( dialogOpts, spec.dialog );

        var dialog;

        // if dialog == xhr, open the link in a dialog
        // with the html from the URL just shoved in it
        if( type == 'xhr' || type == 'content' ) {
            if( type == 'xhr' )
                dialogOpts.href = spec.url;

            dialog = new dijitDialog( dialogOpts );
            context.dialog = dialog;

            if( type == 'content' )
                dialog.set( 'content', this._evalConf( context, spec.content, null ) );

            delete context.dialog;
        }
        // open the link in a dialog with an iframe
        else if( type == 'iframe' ) {
            dojo.safeMixin( dialogOpts.style, {width: '90%', height: '90%'});
            dialogOpts.draggable = false;

            var container = dojo.create('div', {}, document.body);
            var iframe = dojo.create(
                'iframe', {
                    width: '100%', height: '100%',
                    tabindex: "0",
                    style: { border: 'none' },
                    src: spec.url
                }, container
            );
            dialog = new dijitDialog( dialogOpts, container );
            dojo.create( 'a', {
                             href: spec.url,
                             target: '_blank',
                             className: 'dialog-new-window',
                             title: 'open in new window',
                             onclick: dojo.hitch(dialog,'hide'),
                             innerHTML: spec.url
                         }, dialog.titleBar );
            var updateIframeSize = function() {
                // hitch a ride on the dialog box's
                // layout function, which is called on
                // initial display, and when the window
                // is resized, to keep the iframe
                // sized to fit exactly in it.
                var cDims = domGeom.getMarginBox( dialog.domNode );
                iframe.width  = cDims.w;
                iframe.height = cDims.h - domGeom.getMarginBox(dialog.titleBar).h - 2;
            };
            aspect.after( dialog, 'layout', updateIframeSize );
            aspect.after( dialog, 'show', updateIframeSize );
        }

        aspect.after( dialog, 'hide', function() { dialog.destroyRecursive(); });
        dialog.show();
    },

    /**
     * Given a string with template callouts, interpolate them with
     * data from the given object.  For example, "{foo}" is replaced
     * with whatever is returned by obj.get('foo')
     */
    template: function( /** Object */ obj, /** String */ template ) {
        if( typeof template != 'string' || !obj )
            return template;

        var valid = true;
        if ( template ) {
            return template.replace(
                    /\{([^}]+)\}/g,
                    function(match, group) {
                        var val = obj ? obj.get( group.toLowerCase() ) : undefined;
                        if (val !== undefined)
                            return val;
                        else {
                            return '';
                        }
                    });
        }
        return undefined;
    },

    /**
     * @param menuButton {Element} the menu button (little down arrow in the track label) element
     * @param labelDiv {Element} the track label element
     * @returns {dijit.Menu} the operations menu for this track
     */
    makeTrackMenu: function( menuButton, labelDiv ) {
        var options = this._trackMenuOptions();
        if( options && options.length ) {
            var menu = this._renderContextMenu( options, { menuButton: menuButton, track: this, browser: this.browser, refSeq: this.refSeq } );
            menu.startup();
            menu.set('leftClickToOpen', true );
            menu.bindDomNode( menuButton );
            menu.set('leftClickToOpen',  false);
            menu.bindDomNode( labelDiv );
        }
    }

});
});

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
