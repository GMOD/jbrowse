define([
       'dojo/_base/declare',
       'dojo/_base/lang',
        'dijit/MenuItem',
       'JBrowse/Plugin',
       'dojo/dom',
       'dojo/dom-construct',
       'dojo/_base/fx',
       'dojo/dom-attr',
       'dojo/dom-class',
       'dijit/TooltipDialog',
       'dijit/form/Button',
       'dijit/popup',
    ],
    function(
       declare,
       lang,
       dijitMenuItem,
       JBrowsePlugin,
       dom,
       domConstruct,
       baseFx,
       domAttr,
       domClass,
       TooltipDialog,
       Button,
       popup
    ){
    return declare( JBrowsePlugin, {
        constructor: function( args ) {
            this.overlayVisible = false;
            this.isRunning = false;
            this.currentLegIndex = -1;
            this.legs = [];
            this.highlighted = undefined;
            this.buildTour()

            this.browser.afterMilestone('initView', function() {
                this.browser.addGlobalMenuItem( 'help', new dijitMenuItem({
                   label: 'Interactive Tour',
                   onClick: lang.hitch(this, 'startInteractiveTour')
               }));
            }, this );

            // Add our DOM node for the overlay
            var overlay = domConstruct.toDom("<div id=\"tour-overlay\" ></div>")
            domConstruct.place(overlay, "GenomeBrowser");

        },

        buildTour: function(){
            // TODO: How do I get the correct URL (cwd + '../Tours/basic.json')
            this.buildTourFromScript("/plugins/InteractiveTour/Tours/basic.json")
            //
            //this.showOverlay()
            //this.highlightNode("navbox")
        },

        buildTourFromScript: function(tourPath){
            var self = this
            var xhrArgs = {
                url: tourPath,
                handleAs: "json",
                load: function(data){
                    for(var idx in data){
                        if(data[idx].message !== undefined){
                            data[idx].message = data[idx].message.replace('\n\n', '<br/>')
                        }
                    }
                    console.log("Loaded " + data.length + " legs")
                    self.legs = data
                },
                error: function(error){
                    // TODO
                }
            }
            // Call the asynchronous xhrGet
            var deferred = dojo.xhrGet(xhrArgs);
        },

        startInteractiveTour: function( ) {
            var self = this

            this.start()
        },

        start: function(){
            this.isRunning = true;
            this.showOverlay()
            this.currentLegIndex = -1;
            this.next();
        },

        stop: function(){
            if(!this.isRunning){
                return
            }
            this.hideOverlay();
            this.isRunning = false;
            this.currentLegIndex = -1;
        },

        next: function(){
            this.hideLeg();
            this.currentLegIndex++;
            if(this.currentLegIndex >= this.legs.length){
                this.stop();
            } else {
                this.showLeg();
            }
        },

        prev: function(){
            this.hideLeg();
            this.currentLegIndex--;
            if(this.currentLegIndex < 0){
                this.stop();
            } else {
                this.showLeg();
            }
        },

        hideLeg: function(index){
            if(index === undefined){
                index = this.currentLegIndex
            }
            var leg = this.legs[index]
            if(leg === undefined){
                return
            }
            this.dehighlightNode()
        },

        dehighlightNode: function(node){
            if(node === undefined){
                node = this.highlighted
            }

            //domClass.remove(node, "tour-highlight")
            this.highlighted = undefined
        },

        highlightNode: function(node){
            if (node === undefined) {
                return
            }
            this.highlighted = node;
            //domClass.add(node, "tour-highlight");
        },

        showLeg: function(index){
            if(index === undefined){
                index = this.currentLegIndex
            }

            var leg = this.legs[index],
                self = this,
                isLast = (this.legs.length == index + 1)

            console.log(leg)

            if(leg === undefined){
                return
            }

            var headerDiv = '<h3 class="tour-annotation-header">' + leg['title'] + '</h3>' +
                '<p class="tour-note">'
            var buttonDiv = '</p>' +
                '<div>' +
                '<button id="tourProgressPrev" type="button">Prev</button>' +
                '<button id="tourProgressNext" type="button">Next</button>' +
                (index + 1) + '/' + this.legs.length +
                '</div>'

            this.highlightNode(leg.node)

            var tip = new TooltipDialog({
                id: 'tour-annotation',
                content: headerDiv + leg['message'] + buttonDiv,
            });

            var around = (leg.around === undefined ? leg.node : leg.around);
            var around_node = dom.byId(around);
            // TODO: louder
            if(around_node === undefined){
                console.log("Error: undefined node to place popup around")
            }
            popup.open({
                popup: tip,
                around: around_node,
                onCancel: function(){
                    self.stop()
                    popup.close(tip)
                    tip.destroyRecursive()
                },
                // TODO: can't seem to get orient working properly.
                y: around === undefined ? 32 : undefined,
                orient: ['below-centered'],
            });

            var nextButton = new Button({
                label: (isLast ? "Done" : "Next"),
                onClick: function(){
                    popup.close(tip)
                    tip.destroyRecursive()
                    self.next()
                }
            }, "tourProgressNext").startup();

            var prevButton = new Button({
                label: "Previous",
                onClick: function(){
                    popup.close(tip)
                    tip.destroyRecursive()
                    self.prev()
                }
            }, "tourProgressPrev").startup();
        },

        showOverlay: function(){
            //domAttr.set("tour-overlay", "style", "display: block")
            //baseFx.animateProperty({
                //node: dom.byId("tour-overlay"),
                //duration: 300,
                //properties: {
                    //opacity: {
                        //start: 0,
                        //end: .5,
                    //},
                //}
            //}).play();
            //this.overlayVisible = true;
        },

        hideOverlay: function(){
            //var node = dom.byId("tour-overlay")
            //baseFx.animateProperty({
                //node: dom.byId("tour-overlay"),
                //duration: 300,
                //properties: {
                    //opacity: {
                        //start: .5,
                        //end: 0,
                    //},
                //}
            //}).play();
            //setTimeout(function(){
                //domAttr.set("tour-overlay", "style", "display: none")
            //}, 310)
            //this.overlayVisible = false;
        },

    });
});
