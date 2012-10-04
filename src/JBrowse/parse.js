//  script for parsing GBrowse config files

/*  Based (now quite loosely) on
 *  https://github.com/shockie/node-iniparser -> released under the MIT license
 *  Copyright (c) 2009-2010 Jordy van Gelder <jordyvangelder@gmail.com>, see
 *  https://github.com/shockie/node-iniparser/blob/master/README.md#license
 *  for license details
 */
 
function parseGBConfig(data){

    var regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([\w\.\-\_\:\s]+)\s*=\s*(.*?)\s*$/,
        halfParam: /^\s*([\w\.\-\_\:\s]+)\s*=\s*$/,
        comment: /^\s*#*.*$/,
        emptyLine: /^\s*$/
    };
    var value = {};
    var lines = data.split(/\r\n|\r|\n/);
    var section = null;

    for (i = 0; i < lines.length; i++){
        if(regex.comment.test(lines[i])){
            return;
        }else if(regex.param.test(lines[i])){
            if (regex.halfParam.test(lines[i])){
                var multiLineNum = i+1;
                var tmpStrVal = '';
                while  (! ( regex.param.test(lines[multiLineNum])   || regex.section.test(lines[multiLineNum])   )){
                    if (! ( regex.comment.test(lines[multiLineNum]) || regex.emptyLine.test(lines[multiLineNum]) )){
                        tmpStrVal += lines[multiLineNum];
                    }
                    multiLineNum++;
                }
                var match = line[i].match(regex.param);
                if(section){
                    value[section][match[1]] = tmpStrVal;
                }else{
                    value[match[1]] = tmpStrVal;
                }
                i = multiLineNum - 1;
            }else{
                var match = lines[i].match(regex.param);
                if(section){
                    value[section][match[1]] = match[2];
                }else{
                    value[match[1]] = match[2];
                }
            }
        }else if(regex.section.test(line[i])){
            var match = lines[i].match(regex.section);
            value[match[1]] = {};
            section = match[1];
        }else if(lines[i].length == 0 && section){
            section = null;
        };
    };
    return value;
}
