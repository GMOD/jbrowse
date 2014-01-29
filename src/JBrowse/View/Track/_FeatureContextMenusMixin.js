define([
           'dojo/_base/declare',
           'dojo/_base/lang'
       ],
       function(
           declare,
           lang
       ) {
return declare( null, {

_refreshContextMenu: function( fRect ) {
    var stash = this.getBlockStash()[ fRect.blockID ];
    if( ! stash )
        return;
    stash = stash.contextMenus || ( stash.contextMenus = {} );

    var menuRecord = stash[ fRect.f.id() ] || ( stash[ fRect.f.id() ] = {} );
    menuRecord.menu = this._makeFeatureContextMenu( fRect, this.getConfForFeature( 'menuTemplate', fRect.f ) );

    // give the menu a timeout so that it's cleaned up if it's not used within a certain time
    if( menuRecord.timeout )
        clearTimeout( menuRecord.timeout );

    var timeToLive = 30000; // clean menus up after 30 seconds
    menuRecord.timeout = setTimeout( function() {
        if( menuRecord.menu ) {
            menuRecord.menu.destroyRecursive();
            delete menuRecord.menu;
        }
        delete menuRecord.timeout;
    }, timeToLive );
},

/**
 * Make the right-click dijit menu for a feature.
 */
_makeFeatureContextMenu: function( fRect, menuTemplate ) {
    var context = lang.mixin( { track: this, feature: fRect.f, callbackArgs: [ this, fRect.f, fRect ] }, fRect );
    // interpolate template strings in the menuTemplate
    menuTemplate = this._processMenuSpec(
        menuTemplate,
        context
    );

    // render the menu, start it up, and bind it to right-clicks
    // both on the feature div and on the label div
    var menu = this._renderContextMenu( menuTemplate, context );
    menu.startup();
    return menu;
}

});
});
