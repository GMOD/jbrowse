define([
       'dojo/_base/declare',
       'dojo/_base/lang',
        'dijit/MenuItem',
       'JBrowse/Plugin',
       'dojo/on',
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
       on,
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
            this.buildTourFromScript(this.config.baseUrl + "/Tours/basic.json")
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
                        if(data[idx].message){
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
            if(!index){
                index = this.currentLegIndex
            }
            var leg = this.legs[index]
            if(!leg){
                return
            }
            this.dehighlightNode()
        },

        dehighlightNode: function(node){
            if(!node){
                node = this.highlighted
            }

            //domClass.remove(node, "tour-highlight")
            this.highlighted = undefined
        },

        highlightNode: function(node){
            if (!node) {
                return
            }
            this.highlighted = node;
            //domClass.add(node, "tour-highlight");
        },

        actionMove: function(moveLocation){
            console.log("HI")
            setTimeout(function(){
                browser.navigateTo(moveLocation['navigateTo'])
            }, moveLocation['delay'])
        },

        showLeg: function(index){
            if(!index){
                index = this.currentLegIndex
            }

            var leg = this.legs[index],
                self = this,
                isLast = (this.legs.length == index + 1)

            console.log(leg)

            if(!leg){
                return
            }

            var headerDiv = '<h3 class="tour-annotation-header">' + leg['title'] + '</h3>' +
                '<div class="tour-note">'
            var buttonDiv = '</div>' +
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

            var around = (!leg.around ? leg.node : leg.around);
            var around_node = dom.byId(around);
            // TODO: louder
            if(!around_node){
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
                y: around ? undefined: 32,
                orient: ['below-centered'],
            });

            var nextButton = new Button({
                label: (isLast ? "Done" : "Next"),
                onClick: function(){
                    popup.close(tip)
                    tip.destroyRecursive()
                    self.next()
                }
            }, "tourProgressNext")

            var prevButton = new Button({
                label: "Previous",
                onClick: function(){
                    popup.close(tip)
                    tip.destroyRecursive()
                    self.prev()
                }
            }, "tourProgressPrev");

            nextButton.startup();
            prevButton.startup();

            if(leg.requireInteraction){
                this._handleAction(leg, nextButton, leg.requireInteraction)
            }

            if(leg.requireInteractions){
                for(var idx in leg.requireInteractions){
                    this._handleAction(leg, nextButton, leg.requireInteractions[idx],
                                       // If the last action, mark as complete. Otherwise the user isn't done.
                                       idx == leg.requireInteractions.length - 1)
                }
            }
        },

        _handleAction: function(leg, nextButton, actionDef, complete){
            // If complete isn't defined, default to it being true.
            if(complete === undefined) { complete = true }
            console.log("Processing action")
            console.log(actionDef)
            console.log(complete)
            if(actionDef.type === "click"){
                this._handleClickAction(leg, nextButton, actionDef, complete)
            //} else if (actionDef.type === "dataValue"){
                //this._handleDataValueAction(leg, nextButton, actionDef, complete)
            }
        },

        //_handleDataValueAction: function(leg, nextButton, actionDef, complete){
            //// Only one target allowed.
            //var inputTarget = dojo.query(actionDef.target)[0]
            //console.log(inputTarget)
            //dojo.connect(inputTarget, "onkeypress", function(e) {
                //console.log(e)
                //console.log(inputTarget.value)
                //if(inputTarget.value === actionDef.expectedContents){
                    //console.log('hi')
                //}
            //})
        //},

        _handleClickAction: function(leg, nextButton, actionDef, complete){
            nextButton.setDisabled(true);

            var atLeastOne = false
            for(var idx in actionDef.targets){
                var target = dom.byId(actionDef.targets[idx]);
                if(target) {
                    atLeastOne = true;
                    // If the user is done after this action, then we OK the button.
                    if(complete){
                        on(target, "click", function(evt){
                            nextButton.setDisabled(false);
                        })
                    }
                }else {
                    console.log("Unknown click target: " + actionDef.targets[idx] + " User will not be able to continue. Overriding disabled continue.")
                }
            }

            // If none of the targets were valid, give up.
            if(!atLeastOne){
                console.log("No found click targets. User would not be able to continue. Overriding disabled continue.")
                nextButton.setDisabled(false);
            }
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
