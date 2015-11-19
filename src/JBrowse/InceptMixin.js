/**
 * InceptMixin
 * The incept framework allow entities like jbrowse plugins to intercept functions/values of "deep" classes.
 * Any class can selectively be incepted by name.
 * Classes that can be incepted have the InceptMixin and their constructor function should call this.inceptInit()
 */
define([
            'dojo/_base/declare'
        ],
        function(
            declare
        ) {

return declare( null, {

    constructor: function() {
        //console.log("IsMixin constructor");
        this.jbClassName = "NA";
    },
    inceptInit: function() {
        this.jbClassName = this.getJbClassName();
        //console.log("incept class "+this.jbClassName);
        this.callInterceptFunction();
    },
    getJbClassName: function () {
        var err = new Error();
        var stack = err.stack.split(" ");   // get the call stack
        var fnName = false;

        //console.log(stack);
        
        // parse the call stack to determine the class name
        for(var i=0;i<stack.length;i++) {
            if (stack[i]=="new") {
                fnName = stack[i-5];
                break;
            } 
        }
        if (fnName != false) {
            var t2 = fnName.split("/");
            var t3 = t2[t2.length-1];
            var t4 = t3.split(".js");
            fnName = t4[0]; 
        }
        //console.log("class name "+fnName);
        return fnName;
    },
    callInterceptFunction: function() {
        var browser = this.browser;
        if (typeof browser === 'undefined') {
            console.log("browser object undefined in "+this.jbClassName);
            return;
        }
        
        if (typeof browser.config.classInterceptList !== 'undefined') {
            var fnList = browser.config.classInterceptList[this.jbClassName];
            
            if (typeof fnList !== 'undefined') {
                for(var i=0;i < fnList.length;i++){
                    fnList[i](this);
                }
            }
        }
    }
});
});
/*
if (typeof("getJbClassName") != "function") {
    function getJbClassName() {
        var err = new Error();
        var stack = err.stack.split(" ");   // get the call stack
        var fnName = false;

        //console.dir(stack);
        // parse the call stack to determine the class name
        for(var i=0;i<stack.length;i++) {
            if (stack[i]=="new") {
                fnName = stack[i-5];
                break;
            } 
        }
        if (fnName != false) {
            var t2 = fnName.split("/");
            var t3 = t2[t2.length-1];
            var t4 = t3.split(".js");
            fnName = t4[0]; 
        }
        //console.log("class name "+fnName);
        return fnName;
    }
}

if (typeof("getJbClassName2") != "function") {
    function getJbClassName2() {
        var error = new Error()
          , source
          , lastStackFrameRegex = new RegExp(/.+\/(.*?):\d+(:\d+)*$/)
          , currentStackFrameRegex = new RegExp(/getScriptName \(.+\/(.*):\d+:\d+\)/);

        console.dir(error.stack);

        if((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] != "")
            return source[1];
        else if((source = currentStackFrameRegex.exec(error.stack.trim())))
            return source[1];
        else if(error.fileName != undefined)
            return error.fileName;
    }
}
*/
