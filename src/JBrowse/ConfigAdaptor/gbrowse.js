// Code for parsing GBrowse config files
// Output : a JS object

// Based (now *extremely* loosely) on
// https://github.com/shockie/node-iniparser -> released under the MIT license


define(['dojo/_base/declare','JBrowse/Util','JBrowse/ConfigAdaptor/AdaptorUtil'], function(declare,Util,AdaptorUtil) { 
return declare('JBrowse.ConfigAdaptor.gbrowse',null,

    {

        constructor: function() {},

        load: function(args){
            var that = this;
            dojo.xhrGet({
                url: Util.resolveUrl( args.baseUrl || window.location.href, args.config.url ),
                handleAs: 'text',
                load: dojo.hitch( that, function(data) {
                    var gbConfig = this.parse(data);
                    args.onSuccess.call( that, gbConfig );
                }),
                error: function(e) {
                    console.error( '' + e );
                    if( args.onFailure )
                        args.onFailure.call( args.context || this, e );
                }
            });
        },

        parse: function(data){
            this.regex = {
                section:    /^\s*\[\s*([^\]\/]*)\s*\]\s*$/,
                subsection: /^\s*\[\s*([^\]]*)\/([^\]]*)\s*\]\s*$/,
                param:      /^(\w[\w\.\-\_\:\s]+)=\s*(.*?)\s*$/,
                comment:    /^\s*(#|\/\/).*$/,
                emptyLine:  /^\s*$/,
                newLine:    /\r\n|\r|\n/,
                code:       /^\s*function\s*\(/
            };
            this.value = {};
            this.lines = data.split(this.regex.newLine);
            this.section = null;
            this.subsection = null;
            var n = this.lines.length;


            //Process each line
            for (var i = 0; i < n; i++) {
                if (this.regex.comment.test(this.lines[i])) {                      //      #this is a comment
                    // do nothing, since it's a comment.                           //      // this is also a comment
                } else if (this.regex.param.test(this.lines[i])) {                 //      param = *
                    i = this.param(i);
                } else if (this.regex.subsection.test(this.lines[i])) {            //      [section_name]
                    this.subSection(i);
                } else if (this.regex.section.test(this.lines[i])){                //      [section/subsection]
                    this.mainSection(i);
                }
            };

            return AdaptorUtil.evalHooks(this.value); //Returns the JS object
        },

        //called for:  something = *
        param: function(i){
            var line = this.lines; var rx = this.regex;
            var lineNum = i+1;

            var match = this.lines[i].match(this.regex.param);  // Check for a value
            match[2].trim();                                    // on the first
            if (!isNaN(match[2].trim())) {                      // line, then check
                match[2] = parseFloat(match[2]);                // the rest of the
            }                                                   // block

            var tmpStrVal = match[2] ? match[2] : '';
            var divider = this.regex.code.test(line[lineNum]) ? "\n" : ' ';
            // while (line is defined, and not a parameter, section, or subsection)
            while (typeof line[lineNum] !== 'undefined' && (! ( rx.param.test(line[lineNum]) ||
                    rx.section.test(line[lineNum]) || rx.subsection.test(line[lineNum])))){
                //if (line is not a comment or empty)
                if (! ( rx.comment.test(line[lineNum]) || rx.emptyLine.test(line[lineNum]) )) {
                    if (tmpStrVal === ''){
                        tmpStrVal += line[lineNum].trim();
                    } else {
                        tmpStrVal = tmpStrVal + divider + line[lineNum].trim();
                    }
                }
                lineNum++;
            }
            var match = this.lines[i].match(this.regex.param);
            if (this.subsection && this.section) {
                this.value[this.section][this.subsection][match[1].trim()] = tmpStrVal;
            } else if (this.section){
                this.value[this.section][match[1].trim()] = tmpStrVal;
            } else {
                this.value[match[1].trim()] = tmpStrVal;
            }
            return lineNum - 1; //The line it should continue at.
        },

        //called for:  [foobar]
        mainSection: function(i) {
            var match = this.lines[i].match(this.regex.section);
            this.section = match[1].trim();
            this.value[this.section] = {};
            this.subsection = null;
        },

        //called for:  [foo/bar]
         subSection: function(i) {
            var match = this.lines[i].match(this.regex.subsection);
            this.section = match[1].trim();
            this.subsection = match[2].trim();
            this.value[this.section] = {};
            this.value[this.section][this.subsection] = {};
        }
    });
});
