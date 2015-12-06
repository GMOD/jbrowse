/*
HideTrackLabels JBrowse plugin CSS
*/
/*
    Created on : Jul 15, 2015, 7:19:50 PM
    Author     : EY
*/

define([
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/Deferred',
            'dojo/dom-construct',
            'dijit/form/Button',
            'dojo/fx',
            'dojo/dom',
            'dojo/dom-style',
            'dojo/on',
            'dojo/query',
            'dojo/dom-geometry',
            'JBrowse/Plugin'
       ],
       function(
           declare,
           lang,
           Deferred,
           domConstruct,
           dijitButton,
           coreFx,
           dom,
           style,
           on,
           query,
           domGeom,
           JBrowsePlugin
       ) {
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        console.log("plugin HideTracksButton constructor");

        var baseUrl = this._defaultConfig().baseUrl;
        var thisB = this;

        // create the hide/show button after genome view initialization
        this.browser.afterMilestone( 'initView', function() {

            var navBox = dojo.byId("navbox");

            thisB.browser.hideTitlesButton = new dijitButton(
            {
                title: "Hide/Show Track Titles",
                id: "hidetitles-btn",
                width: "24px",
                onClick: dojo.hitch( thisB, function(event) {
                    thisB.browser.showTrackLabels("toggle");
                    dojo.stopEvent(event);
                })
            }, dojo.create('button',{},navBox));   //thisB.browser.navBox));
        });

        /* show or hide track labels
         * showTrackLabels(param)
         * @param {string} function "show", "hide", "toggle", or "hide-if"
         * "hide-if" rehides if already hidden.
         * @returns {undefined}
         */
        this.browser.showTrackLabels = function(fn) {

            // does the hide/show button exists yet?
            if (dojo.byId('hidetitles-btn')==null) return;


            var direction = 1;

            if (fn=="show") {
                dojo.removeAttr(dom.byId("hidetitles-btn"),"hidden-titles");
                direction = 1;
            }
            if (fn=="hide") {
                dojo.attr(dom.byId("hidetitles-btn"),"hidden-titles","");
                direction = -1;
            }
            if (fn=="hide-if") {
                if (dojo.hasAttr(dom.byId("hidetitles-btn"),"hidden-titles")) direction = -1;
                else return;
            }

            if (fn=="toggle"){
                if (dojo.hasAttr(dom.byId("hidetitles-btn"),"hidden-titles")) {     // if hidden, show
                    dojo.removeAttr(dom.byId("hidetitles-btn"),"hidden-titles");
                    direction = 1;
                }
                else {
                    dojo.attr(dom.byId("hidetitles-btn"),"hidden-titles","");       // if shown, hide
                    direction = -1;
                }
            }
            // protect Hide button from clicks durng animation
            dojo.attr(dom.byId("hidetitles-btn"),"disabled","");
            setTimeout(function(){
                dojo.removeAttr(dom.byId("hidetitles-btn"),"disabled");
            },1000);

            // slide em
            query(".track-label").forEach(function(node, index, arr){
                var w = domGeom.getMarginBox(node).w;
                coreFx.slideTo({
                  node: node,
                  top: domGeom.getMarginBox(node).t.toString(),
                  left: (domGeom.getMarginBox(node).l + (w*direction) ).toString(),
                  unit: "px"
                }).play();
            });
        };
        // trap the redraw event for handling resize, scroll and zoom events
        dojo.subscribe("/jbrowse/v1/n/tracks/redraw", function(data){
            // hide track labels if necessary
            thisB.browser.showTrackLabels("hide-if");
        });
    }

});
});

