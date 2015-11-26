
/*
 * additional modules
            { name: 'bootstrap', location: '//maxcdn.bootstrapcdn.com/bootstrap',main: '3.2.0/js/bootstrap.min' },
            { name: 'fuelux', location: '//www.fuelcdn.com/fuelux', main: '3.11.0/js/fuelux.min'},
*/
require( {
        packages: [
            { name: 'jqueryui', location: '//code.jquery.com/ui', main: '1.11.4/jquery-ui.min' },
            { name: 'jquery', location: '//code.jquery.com',main: 'jquery-2.1.4.min'},
            { name: 'ElementQueries', location: 'element-queries', main: 'src/ElementQueries' },
            { name: 'ResizeSensor', location: 'element-queries', main: 'src/ResizeSensor' }
        ]
    }
);

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Plugin'
       ],
       function(
           declare,
           lang,
           Deferred,
           JBrowsePlugin
       ) {
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        console.log("plugin: DivContainment");
        if (this.browser.config.divContainment != 1) {
            console.log("bypass div-containment");
            return;
        }
        
        var thisB = this;
        require(["jquery", "jqueryui","ElementQueries","ResizeSensor"],
        function($) {
            console.log("jquery-ui initialized");

            $( "#jb-genome-view" ).dialog({
                height: 600,
                width: 800,
                minHeight: 400,
                minWidth: 400
            });
            
            $( "#jb-track-selector" ).dialog({
                height: 600,
                width: 400,
                minHeight: 200,
                minWidth: 400
            });
            $( "#jb-top-panel" ).dialog({
                height: 140,
                width: 800,
                minHeight: 140,
                minWidth: 400
            });
            
            //$("div[aria-describedby*='jb-genome-view'").hide();
            //$("div[aria-describedby*='jb-track-selector'").hide();
            //$("div[aria-describedby*='jb-top-panel'").hide();
            
            $("#GenomeBrowser").appendTo("#jb-genome-view");
            $("#SelectorPanel").appendTo("#jb-track-selector");
            $("#TopPanel").appendTo("#jb-top-panel");
            
            // initialize data for ResizeSensor
            var eq = new ElementQueries();
            eq.init();
            
            // setup jquery function
            $.fn.jbContainer = function(obj) {
                eq.update();
                
                var thisB = this;   // the referenced object
                var thisObj = obj;  // the dojo pane object
                var parent = this.parent();
                var width = parent.width();
                var height = parent.height();

		console.log(this.attr("id")+" jbContainer obj="+thisObj);
		console.log($(parent).attr('id')+" parent coord "+width+","+parent.height());
                
                // create the new wrapper container element
                var containerDiv = $("<div>").attr({
                    'id': "jqdojo-container-"+ $(this).attr("id"),
                    'class': "jq-dojo-container",
                    'style': 'width:'+width+';'+'height:'+height+';'
                }).appendTo(parent);
                
                // place the dojo pane into the new wrapper container
                $(this).appendTo(containerDiv);

                //dojo.setStyle(thisObj,'width',width);
                thisB.width(width);
                thisB.height(height);
                //dojo.setStyle(containerDiv,'height',$(parent).css('height'));
                //thisObj.resize();
                
                
                // handle resize for the object
                new ResizeSensor(containerDiv, function(){
                    console.log( "a-"+containerDiv.attr("id") + " resize "+ containerDiv.width()+","+containerDiv.height());
                    $(thisB).width(containerDiv.width());
                    $(thisB).height(containerDiv.height());
                    dojo.setStyle(thisObj,'width',containerDiv.width());
                    dojo.setStyle(thisObj,'height',containerDiv.height());
                    thisObj.resize();
                });
                
                return this;
            };
        });
    },
    

});
});


