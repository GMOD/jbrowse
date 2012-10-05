//  script for parsing GBrowse config files

/*  Based (now quite loosely) on
 *  https://github.com/shockie/node-iniparser -> released under the MIT license
 */
 
function parseGBConfig(data){

    var regex = {
        section:   /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param:     /^(\w[\w\.\-\_\:\s]+)=\s*(.*?)\s*$/,
        halfParam: /^(\w[\w\.\-\_\:\s]+)=\s*$/,
        comment:   /^\s*#.*$/,
        emptyLine: /^\s*$/,
        newLine:   /\r\n|\r|\n/
    };
    var value = {};
    var lines = data.split(regex.newLine);
    var section = null;
    var n = lines.length;
    for (var i = 0; i < n; i++){
        if(regex.comment.test(lines[i])){
            // do nothing, since it's a comment.
        }else if(regex.param.test(lines[i])){
            if (regex.halfParam.test(lines[i])){
                var multiLineNum = i+1;
                var tmpStrVal = '';
                while (typeof lines[multiLineNum] !== 'undefined' && (! ( regex.param.test(lines[multiLineNum])   || regex.section.test(lines[multiLineNum])  ))){
                    if (! ( regex.comment.test(lines[multiLineNum]) || regex.emptyLine.test(lines[multiLineNum]) )){
                        if (tmpStrVal === ''){
                            tmpStrVal += lines[multiLineNum].trim();
                        } else {
                            tmpStrVal = tmpStrVal + ' ' + lines[multiLineNum].trim();
                        }
                    }
                    multiLineNum++;
                }
                var match = lines[i].match(regex.param);
                if(section){
                    value[section][match[1].trim()] = tmpStrVal;
                }else{
                    value[match[1].trim()] = tmpStrVal;
                }
                i = multiLineNum - 1;
            }else{
                var match = lines[i].match(regex.param);
                if(section){
                    if (!isNaN(match[2])){
                        match[2] = parseInt(match[2]);
                    }
                    value[section][match[1].trim()] = match[2];
                }else{
                    if (!isNaN(match[2].trim())){
                        match[2] = parseInt(match[2].trim());
                    }
                    value[match[1].trim()] = match[2].trim();
                }
            }
        }else if(regex.section.test(lines[i])){
            var match = lines[i].match(regex.section);
            value[match[1].trim()] = {};
            section = match[1].trim();
        }else if(lines[i].length == 0 && section){
            section = null;
        };
    };
    return value;
}
