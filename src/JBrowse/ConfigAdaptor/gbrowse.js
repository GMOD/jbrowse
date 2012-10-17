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
                    gbConfig = this.parse(data);
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
                halfParam:  /^(\w[\w\.\-\_\:\s]+)=\s*$/,
                comment:    /^\s*#|(\/\/).*$/,
                emptyLine:  /^\s*$/,
                newLine:    /\r\n|\r|\n/
            };
            this.value = {};
            this.lines = data.split(this.regex.newLine);
            this.section = null;
            this.subsection = null;
            var n = this.lines.length;


            //Process each line
            for (var i = 0; i < n; i++) {
                if (this.regex.comment.test(this.lines[i])) {                      //      #this is a comment
                    // do nothing, since it's a comment.
                } else if (this.regex.halfParam.test(this.lines[i])) {             //      name = 
                    i = this.multiLine(i); // skips lines, so get 'i': where to continue
                } else if (this.regex.param.test(this.lines[i])) {                 //      name = value
                    this.param(i);
                } else if (this.regex.subsection.test(this.lines[i])) {            //      [section_name]
                    this.subSection(i);
                } else if (this.regex.section.test(this.lines[i])){                //      [section/subsection]
                    this.mainSection(i);
                }
            };

            return AdaptorUtil.evalHooks(this.value); //Returns the JS object
        },

        //called for:  something =
        multiLine: function(i){
            var line = this.lines; var rx = this.regex;
            var lineNum = i+1;
            var tmpStrVal = '';
            // while (line is defined, and not a parameter, section, or subsection)
            while (typeof line[lineNum] !== 'undefined' && (! ( rx.param.test(line[lineNum]) ||
                    rx.section.test(line[lineNum]) || rx.subsection.test(line[lineNum])))){
                //if (line is not a comment or empty)
                if (! ( rx.comment.test(line[lineNum]) || rx.emptyLine.test(line[lineNum]) )) {
                    if (tmpStrVal === ''){
                        tmpStrVal += line[lineNum].trim();
                    } else {
                        tmpStrVal = tmpStrVal + ' ' + line[lineNum].trim();
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

        //called for:  something = value
        param: function(i) {
            var match = this.lines[i].match(this.regex.param);
            match[2].trim();
            if (!isNaN(match[2].trim())) {
                match[2] = parseFloat(match[2]);
            }
            if (this.subsection && this.section) {
                this.value[this.section][this.subsection][match[1].trim()] = match[2];
            } else if (this.section) {
                this.value[this.section][match[1].trim()] = match[2];
            } else{
                this.value[match[1].trim()] = match[2];
            }
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
