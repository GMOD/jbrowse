/*
    DebugEvents - log Publish and Milestone events in console
    A JBrowse plugin.
    Created on : Aug 26, 2015, 1:31:00 PM
    Author     : EY
*/

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
        console.log("plugin DebugEvents constructor");

        var thisB = this;

        this.browser.afterMilestone( 'completely initialized', function() {
            console.log("Milestone: completely initialized");
        });
        this.browser.afterMilestone( 'initPlugins', function() {
            console.log("Milestone: initPlugins");
        });
        this.browser.afterMilestone( 'initView', function() {
            console.log("Milestone: initView");
        });
        this.browser.afterMilestone( 'loadRefSeqs', function() {
            console.log("Milestone: loadRefSeqs");
        });
        this.browser.afterMilestone( 'loadUserCSS', function() {
            console.log("Milestone: loadUserCSS");
        });
        this.browser.afterMilestone( 'loadNames', function() {
            console.log("Milestone: loadNames");
        });
        this.browser.afterMilestone( 'loadConfig', function() {
            console.log("Milestone: loadConfig");
        });
        this.browser.afterMilestone( 'initTrackMetadata', function() {
            console.log("Milestone: initTrackMetadata");
        });
        this.browser.afterMilestone( 'createTrack', function() {
            console.log("Milestone: createTrack");
        });
        
        
        dojo.subscribe("/jbrowse/v1/v/tracks/new", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/new");
        });        
        dojo.subscribe("/jbrowse/v1/v/tracks/show", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/show");
        });        
        dojo.subscribe("/jbrowse/v1/c/tracks/show", function(data){
            console.log("Event: /jbrowse/v1/c/tracks/show");
        });        
        dojo.subscribe("/jbrowse/v1/v/tracks/hide", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/hide");
        });        
        dojo.subscribe("/jbrowse/v1/c/tracks/hide", function(data){
            console.log("Event: /jbrowse/v1/c/tracks/hide");
        });        
        dojo.subscribe("/jbrowse/v1/v/tracks/hide", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/hide");
        });        
        dojo.subscribe("/jbrowse/v1/c/tracks/new", function(data){
            console.log("Event: /jbrowse/v1/c/tracks/new");
        });        
        dojo.subscribe("/jbrowse/v1/n/tracks/new", function(data){
            console.log("Event: /jbrowse/v1/n/tracks/new");
        });        
        dojo.subscribe("/jbrowse/v1/v/tracks/replace", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/replace");
        });        
        dojo.subscribe("/jbrowse/v1/c/tracks/replace", function(data){
            console.log("Event: /jbrowse/v1/c/tracks/replace");
        });        
        dojo.subscribe("/jbrowse/v1/n/tracks/replace", function(data){
            console.log("Event: /jbrowse/v1/n/tracks/replace");
        });        
        dojo.subscribe("/jbrowse/v1/v/tracks/delete", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/delete");
        });        
        dojo.subscribe("/jbrowse/v1/c/tracks/delete", function(data){
            console.log("Event: /jbrowse/v1/c/tracks/delete");
        });        
        dojo.subscribe("/jbrowse/v1/n/tracks/delete", function(data){
            console.log("Event: /jbrowse/v1/n/tracks/delete");
        });        
        dojo.subscribe("/jbrowse/v1/v/tracks/pin", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/pin");
        });        
        dojo.subscribe("/jbrowse/v1/c/tracks/pin", function(data){
            console.log("Event: /jbrowse/v1/c/tracks/pin");
        });        
        dojo.subscribe("/jbrowse/v1/n/tracks/pin", function(data){
            console.log("Event: /jbrowse/v1/n/tracks/pin");
        });        
        dojo.subscribe("/jbrowse/v1/v/tracks/unpin", function(data){
            console.log("Event: /jbrowse/v1/v/tracks/unpin");
        });        
        dojo.subscribe("/jbrowse/v1/c/tracks/unpin", function(data){
            console.log("Event: /jbrowse/v1/c/tracks/unpin");
        });        
        dojo.subscribe("/jbrowse/v1/n/tracks/unpin", function(data){
            console.log("Event: /jbrowse/v1/n/tracks/unpin");
        });        
        dojo.subscribe("/jbrowse/v1/n/tracks/visibleChanged", function(data){
            console.log("Event: /jbrowse/v1/n/tracks/visibleChanged");
        });        
        dojo.subscribe("/jbrowse/v1/n/navigate", function(data){
            console.log("Event: /jbrowse/v1/n/navigate");
        });        
        dojo.subscribe("/jbrowse/v1/n/globalHighlightChanged", function(data){
            console.log("Event: /jbrowse/v1/n/globalHighlightChanged");
        });        
        dojo.subscribe("/jbrowse/v1/n/tracks/redraw", function(data){
            console.log("Event: /jbrowse/v1/n/tracks/redraw");
        });        
    }


});
});

