/*
 * Extended Neat Features Plugin
 * Draws introns and paints gradient subfeatures. 
 */
/* 
    Created on : Aug 5, 2015
    Author     : EY
*/

define([
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/Deferred',
        'dojo/dom-construct',
        'dojo/query',
        'JBrowse/Plugin'
       ],
       function(
        declare,
        lang,
        Deferred,
        domConstruct,
        query,
        JBrowsePlugin
       ) {
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        console.log("plugin: NeatHTMLFeatures");
        //console.dir(args);

        var thisB = this;
        var browser = this.browser;

        this.gradient = 1;
        if(typeof args.gradientFeatures != 'undefined' && args.gradientFeatures == 0) {
            this.gradient = 0;
        }

        // trap the redraw event for handling resize
        dojo.subscribe("/jbrowse/v1/n/tracks/redraw", function(data){
            setTimeout(function(){ 
                thisB.updateFeatures();
            }, 100); 
        });

        // create function intercept after view initialization (because the view object doesn't exist before that)
        browser.afterMilestone( 'initView', function() {

            // reroute renderTrack function
            browser.view.oldRenderTrack = browser.view.renderTrack;

            // this is the replacement renderTrack function
            browser.view.renderTrack = function (trackConfig) {
                //console.log("view.renderTrack() intercepted!");

                // call the original renderTrack function
                var trackDiv = browser.view.oldRenderTrack(trackConfig);
                
                // we add neat-track class as a flag to indicate this is a track to be "painted"
                if(typeof trackConfig.gradientFeatures != 'undefined' && trackConfig.gradientFeatures != 0) {
                    dojo.addClass(trackDiv,"neat-track");
                }
                return trackDiv;
            };

        });
        

    },
    updateFeatures: function( args ) {
        //console.log("updateFeatures");

        var thisB = this;

        var divQuery = "div.feature";       // by default, paint all feature divs
        if (this.gradient==0)
            divQuery = "div.neat-track div.feature";    // paint only selected tracks 

            query(divQuery).forEach(function(featureNode, index, arr){

                //console.dir(featureNode);

                // scan and insert introns, where applicable
                thisB.insertIntrons(featureNode);
                
                //Process Gradent Features
                thisB.paintGradientFeatures(featureNode);
            });

        //});
    },
    insertIntrons: function(featureNode) {

    var intronCount = 0;
        
        // ignore if we have already processed this node
        if (! dojo.hasClass(featureNode,"has-neat-introns")) {
            
            // get the subfeatures nodes (only immediate children)
            var subNodesX = query('> .subfeature',featureNode);
            
            // filter nodes - eliminate nodes that are splice sites (for Apollo)
            var subNodes = [];
            for(var i=0;i < subNodesX.length;i++){
                var attr = dojo.attr(subNodesX[i],"class");
                if (attr.indexOf("splice-site") === -1)
                    subNodes.push(subNodesX[i]);
            }
            
            if (subNodes.length) {
            
                // identify directionality
                var classAttr = dojo.attr(featureNode, "class")
                var direction = 1;
                if (classAttr.indexOf("minus") > -1) {
                    direction = -1;
                }
                //console.log("direction = "+ direction);

                //extract some left & width -  more convient to access
                for(var i=0; i < subNodes.length;i++) {
                    subNodes[i].left = dojo.getStyle(subNodes[i], "left");
                    subNodes[i].width = dojo.getStyle(subNodes[i], "width");
                }
                // sort the subfeatures
                if (subNodes.length >= 2) {
                    subNodes.sort(function(a, b){ return a.left - b.left; });    
                }

                /* debug display subfeature list
                console.dir(subNodes);
                for(var i=0; i < subNodes.length;i++) {
                    console.log(i + " subfeature left,width: "+subNodes[i].left+", "+subNodes[i].width);
                }
                */

                // insert introns between subfeature gaps
                for(var i=0; i< subNodes.length-1;++i) {
                    var gap = subNodes[i+1].left-(subNodes[i].left+subNodes[i].width);
                    //console.log("gap "+gap);
                    if (gap > .02) {
                        //console.log("gap of "+gap+" between "+i+" and "+(i+1));

                        var subLeft = subNodes[i].left + subNodes[i].width;
                        var subWidth = subNodes[i+1].left - (subNodes[i].left + subNodes[i].width);

                        var left = subLeft;
                        var width = subWidth;
                        //console.log("inserting left "+subLeft+" width "+subWidth);

                        var height = "100%";

                        // invert hat if reverse direction
                        var dir = "50,5";
                        if (direction==-1) dir = "50,95";

                        var str = "";
                        str += "<svg class='jb-intron' viewBox='0 0 100 100' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' ";
                        str += "style='position:absolute;z-index: 15;";  // this must be here and not in CSS file
                        str += "left: "+left+"px;width: "+width+"px;height: "+height+"'>";
                        str += "<polyline points='0,50 "+ dir +" 100,50' style='fill:none;stroke:black;stroke-width:5' shape-rendering='optimizeQuality' />";
                        str += "</svg>";

                        // note: dojo.create("svg") does not render due to namespace issue between DOM and SVG

                        domConstruct.place(str, featureNode);

                        intronCount ++;

                    }
                }
                if (intronCount) {
                    // mark that we have processed this node
                    dojo.addClass(featureNode, "has-neat-introns");
                }
            }
        }
    },
    /*
     * Paint gradient features and subfeatures
     */
    paintGradientFeatures: function(featureNode) {
    
        // get the subfeature nodes (only immediate children)
        var subNodesX = query('> .subfeature',featureNode);
        var thisB = this;

        // filter nodes - eliminate nodes that are splice sites (for Apollo)
        var subNodes = [];
        for(var i=0;i < subNodesX.length;i++){
            var attr = dojo.attr(subNodesX[i],"class");
            if (attr.indexOf("splice-site") === -1)
                subNodes.push(subNodesX[i]);
        }
        
        // if feature has subfeatures
        if (subNodes.length) {
            
            dojo.setStyle(featureNode, {
                'background-color': 'transparent',
                'border-width':'0px'
            });
            
            // paint subfeatures
            for(var i=0;i < subNodes.length;i++) {

                // if this is Apollo, we have another subfeature level to traverse
                if (subNodes[i].childElementCount) {
                    // get the subfeature nodes (only immediate children)
                    var childNodes = query('> .subfeature',subNodes[i]);
                    
                    for(var j=0;j<childNodes.length;j++){
                        thisB.paintSubNode(childNodes[j]);
                    }
                }
                // handle the first level subfeature
                else {
                    thisB.paintSubNode(subNodes[i]);
                }
            }
            
        }
        // paint features that have no subfeatures
        else {
            
            // ignore if we have already processed node
            if (! dojo.hasClass(featureNode,"neat-feature")) {
            
                var classAttr = dojo.attr(featureNode,'class');
                var color = dojo.getStyle(featureNode,'background-color');
                //console.log("F "+classAttr+" "+color);

                // update the element with new styling
                dojo.setStyle(featureNode, {
                    'background': 'linear-gradient(to bottom,  '+color+' 0%,#e5e5e5 50%,'+color+' 100%)'
                });
                // mark that we have processed the node
                dojo.addClass(featureNode, "neat-feature");
            }
        }

    },
    /*
     * apply gradient background to feature node
     */
    paintSubNode: function(subNode) {
        //console.log("paintSubNode");
        //console.dir(subNode);
        var classAttr = dojo.attr(subNode,'class');
        var color = dojo.getStyle(subNode,'background-color');
        //console.log(classAttr+" "+color);
        
        // ignore if we have already processed node
        if (! dojo.hasClass(subNode,"neat-subfeature")) {

            // restyle UTR
            if(classAttr.indexOf('UTR') > -1) {
                dojo.setStyle(subNode, {
                    //'background-color': 'white',
                    //'height': '100%',
                    'top': '0px',
                    //'margin-top': '0px',
                    'border': '1px solid '+color
                });
                // mark as neat subfeature
                dojo.addClass(subNode, "neat-UTR");
            }
            // restyle other subfeatures
            else {
            //if(classAttr.indexOf('CDS') > -1 || classAttr.indexOf('exon') > -1) {
                dojo.setStyle(subNode, {
                    //'height': '100%',
                    'top': '0px',
                    //'border-width': '0px',
                    'background': 'linear-gradient(to bottom,  '+color+' 0%,#e5e5e5 50%,'+color+' 100%)'
                });
            }
            // mark that we have processed the node
            dojo.addClass(subNode, "neat-subfeature");
        }
        
    }
});
});

