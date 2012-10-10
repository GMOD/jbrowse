// Function for parsing GBrowse config files
// Input : The text in a file (with newlines)
// Output : a JS object

// Based (now extremely loosely) on
// https://github.com/shockie/node-iniparser -> released under the MIT license

function parseGBConfig(data){

    this.regex = {
        section:   /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param:     /^(\w[\w\.\-\_\:\s]+)=\s*(.*?)\s*$/,
        halfParam: /^(\w[\w\.\-\_\:\s]+)=\s*$/,
        comment:   /^\s*#.*$/,
        emptyLine: /^\s*$/,
        newLine:   /\r\n|\r|\n/
    };
    this.value = {};
    this.lines = data.split(this.regex.newLine);
    this.section = null;
    var n = this.lines.length;


    for (var i = 0; i < n; i++){
        if(this.regex.comment.test(this.lines[i])){
            // do nothing, since it's a comment.
        }else if(this.regex.param.test(this.lines[i])){
            i = itIsParam(i);
        }else if(this.regex.section.test(this.lines[i])){
            isSection(i);
        }else if(this.lines[i].length == 0 && this.section){
            this.section = null;
        };
    };


    return this.value; //Returns the JS object
}

function itIsParam(i){
    if (this.regex.halfParam.test(this.lines[i])){
        return multiLine (i);
    }else{
        var match = this.lines[i].match(this.regex.param);
        if(this.section){
            if (!isNaN(match[2])){
                match[2] = parseInt(match[2]);
            }
            this.value[this.section][match[1].trim()] = match[2];
        }else{
            if (!isNaN(match[2].trim())){
                match[2] = parseInt(match[2].trim());
            }
            this.value[match[1].trim()] = match[2].trim();
        }
        return i; //don't change
    }
}

function multiLine (i){
    var multiLineNum = i+1;
    var tmpStrVal = '';
    while (typeof this.lines[multiLineNum] !== 'undefined' && (! ( this.regex.param.test(this.lines[multiLineNum])   || this.regex.section.test(this.lines[multiLineNum])  ))){
        if (! ( this.regex.comment.test(this.lines[multiLineNum]) || this.regex.emptyLine.test(this.lines[multiLineNum]) )){
            if (tmpStrVal === ''){
                tmpStrVal += this.lines[multiLineNum].trim();
            } else {
                tmpStrVal = tmpStrVal + ' ' + this.lines[multiLineNum].trim();
            }
        }
        multiLineNum++;
    }
    var match = this.lines[i].match(this.regex.param);
    if(this.section){
        this.value[this.section][match[1].trim()] = tmpStrVal;
    }else{
        this.value[match[1].trim()] = tmpStrVal;
    }
    return multiLineNum - 1; //The next line it should read
}

function isSection (i){
    var match = this.lines[i].match(this.regex.section);
    this.value[match[1].trim()] = {};
    this.section = match[1].trim();
}
