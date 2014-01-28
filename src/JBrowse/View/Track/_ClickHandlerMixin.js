define([
           'dojo/_base/declare',
           'dojo/aspect',

           'JBrowse/has!dom?dijit/Dialog',
           'JBrowse/has!dom?dijit/Menu',
           'JBrowse/has!dom?dijit/PopupMenuItem',

           'JBrowse/Util',
           'JBrowse/has!dom?JBrowse/View/Dialog/Info'
       ],
       function(
           declare,
           aspect,

           Dialog,
           dijitMenu,
           dijitPopupMenuItem,

           Util,
           InfoDialog
       ) {
return declare( null, {

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
        if ( !parent ) {
            parent = new dijitMenu();
            this.own( parent );
        }

        for ( key in menuStructure ) {
            var spec = menuStructure [ key ];
            try {
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
                else {
                    var menuConf = dojo.clone( spec );
                    if( menuConf.action || menuConf.url || menuConf.href ) {
                        menuConf.onClick = this._makeClickHandler( spec, context );
                    }
                    // only draw other menu items if they do something when clicked.
                    // drawing menu items that do nothing when clicked
                    // would frustrate users.
                    if( menuConf.label && !menuConf.onClick )
                        menuConf.disabled = true;

                    // currently can only use preloaded types
                    var class_ = {
                        'dijit/MenuItem':        dijitMenuItem,
                        'dijit/CheckedMenuItem': dijitCheckedMenuItem,
                        'dijit/MenuSeparator':   dijitMenuSeparator
                    }[spec.type] || dijitMenuItem;

                    parent.addChild( new class_( menuConf ) );
                }
            } catch(e) {
                console.error('failed to render menu item: '+e);
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
                    content:        'contentDialog',
                    baredialog:     'bareDialog',
                    bare:           'bareDialog',
                    xhrdialog:      'xhrDialog',
                    xhr:            'xhrDialog',
                    newwindow:      'newWindow',
                    "_blank":       'newWindow'
                }[(''+spec.action).toLowerCase()];

                if( spec.action == 'newWindow' )
                    window.open( url, '_blank' );
                else if( spec.action in { iframeDialog:1, contentDialog:1, xhrDialog:1, bareDialog: 1} )
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

    _openDialog: function( spec, evt, context ) {
        context = context || {};
        var type = spec.action;
        type = type.replace(/Dialog/,'');
        var featureName = context.feature && (context.feature.get('name')||context.feature.get('id'));
        var dialogOpts = {
            browser: this,
            "class": "popup-dialog popup-dialog-"+type,
            title: spec.title || spec.label || ( featureName ? featureName +' details' : "Details"),
            style: dojo.clone( spec.style || {} )
        };
        if( spec.dialog )
            declare.safeMixin( dialogOpts, spec.dialog );

        var dialog;

        function setContent( dialog, content ) {
            // content can be a promise or Deferred
            if( typeof content.then == 'function' )
                content.then( function( c ) { dialog.set( 'content', c ); } );
            // or maybe it's just a regular object
            else
                dialog.set( 'content', content );
        }

        // if dialog == xhr, open the link in a dialog
        // with the html from the URL just shoved in it
        if( type == 'xhr' || type == 'content' ) {
            if( type == 'xhr' )
                dialogOpts.href = spec.url;

            dialog = new InfoDialog( dialogOpts );
            context.dialog = dialog;

            if( type == 'content' )
                setContent( dialog, this._evalConf( context, spec.content, null ) );

            Util.removeAttribute( context, 'dialog' );
        }
        else if( type == 'bare' ) {
            dialog = new Dialog( dialogOpts );
            context.dialog = dialog;

            setContent( dialog, this._evalConf( context, spec.content, null ) );

            Util.removeAttribute( context, 'dialog' );
        }
        // open the link in a dialog with an iframe
        else if( type == 'iframe' ) {
            var iframeDims = function() {
                var d = domGeom.position( this.browser.container );
                return { h: Math.round(d.h * 0.8), w: Math.round( d.w * 0.8 ) };
            }.call(this);

            dialog = new Dialog( dialogOpts );

            var iframe = dojo.create(
                'iframe', {
                    tabindex: "0",
                    width: iframeDims.w,
                    height: iframeDims.h,
                    style: { border: 'none' },
                    src: spec.url
                });

            dialog.set( 'content', iframe );
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
                var cDims = domGeom.position( dialog.containerNode );
                var width  = cDims.w;
                var height = cDims.h - domGeom.position(dialog.titleBar).h;
                iframe.width = width;
                iframe.height = height;
            };
            aspect.after( dialog, 'layout', updateIframeSize );
            aspect.after( dialog, 'show', updateIframeSize );
        }

        // destroy the dialog after it is hidden
        aspect.after( dialog, 'hide', function() {
                          setTimeout(function() {
                              dialog.destroyRecursive();
                          }, 500 );
        });

        // show the dialog
        dialog.show();
    },

    _processMenuSpec: function( spec, context ) {
        for( var x in spec ) {
            if( spec.hasOwnProperty(x) ) {
                if( typeof spec[x] == 'object' )
                    spec[x] = this._processMenuSpec( spec[x], context );
                else
                    spec[x] = this.template( context.feature, this._evalConf( context, spec[x], x ) );
            }
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
    }
});
});