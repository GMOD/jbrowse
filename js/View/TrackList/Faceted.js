dojo.declare( 'JBrowse.View.TrackList.Faceted', null,
   /**
    * @lends JBrowse.View.TrackList.Faceted.prototype
    */
   {

   /**
     * Drag-and-drop track selector with facets and text searching.
     * @constructs
     */
   constructor: function(args) {
       dojo.require('dojox.grid.DataGrid');
       dojo.require('dojo.data.ItemFileWriteStore');

       var grid_div = dojo.create('div', {
                                      style: {
                                          height: '95%',
                                          width: '600px'
                                      }
                                  },
                                  document.body
                                 );

        /*create a new grid:*/
       this.dataGrid = new dojox.grid.DataGrid({
               id: 'grid',
               store: new dojo.data.ItemFileWriteStore({
                   data: {
                       identifier: 'label',
                       items: dojo.map( args.trackConfigs, function(c){
                           return { key: c.key, label: c.label, type: c.type };
                       })
                   }
               }),
               structure: [[
                     {'name': 'Type', 'field': 'type', 'width': '100px'},
                     {'name': 'Key', 'field': 'key', 'width': '100px'}
               ]],
               rowSelector: '20px'
           },
           document.createElement('div')
           );

       /*append the new grid to the div*/
       grid_div.appendChild(this.dataGrid.domNode);
       this.dataGrid.startup();

       this.dialog = new dijit.Dialog({
           id: "faceted_tracksel",
           refocus: false,
           draggable: false,
           resizable: true,
           title: "Track Selection",
           style: "width: 95%;"
         },
         grid_div
      );
   },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned on.
     */
    setTracksActive: function( /**Array[Object]*/ trackConfigs ) {
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned off.
     */
    setTracksInactive: function( /**Array[Object]*/ trackConfigs ) {
    },

    /**
     * Make the track selector visible.
     */
    show: function() {
        this.dialog.show();
        this.dataGrid.startup();
        this.shown = true;
    },

    /**
     * Make the track selector invisible.
     */
    hide: function() {
        this.dialog.hide();
        this.shown = false;
    },

    /**
     * Toggle whether the track selector is visible.
     */
    toggle: function() {
        this.shown ? this.hide() : this.show();
    }
});