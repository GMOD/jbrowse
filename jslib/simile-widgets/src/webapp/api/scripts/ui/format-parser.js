/*==================================================
 *  Exhibit.FormatParser
 *  http://simile.mit.edu/wiki/Exhibit/API/FormatParser
 *==================================================
 */
Exhibit.FormatParser = new Object();

Exhibit.FormatParser.parse = function(uiContext, s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    
    var scanner = new Exhibit.FormatScanner(s, startIndex);
    try {
        return Exhibit.FormatParser._internalParse(uiContext, scanner, results, false);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};

Exhibit.FormatParser.parseSeveral = function(uiContext, s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    
    var scanner = new Exhibit.FormatScanner(s, startIndex);
    try {
        return Exhibit.FormatParser._internalParse(uiContext, scanner, results, true);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};

Exhibit.FormatParser._valueTypes = {
    "list" : true,
    "number" : true,
    "date" : true,
    "item" : true,
    "text" : true,
    "url" : true,
    "image" : true,
    "currency" : true
};

Exhibit.FormatParser._internalParse = function(uiContext, scanner, results, several) {
    var Scanner = Exhibit.FormatScanner;
    var token = scanner.token();
    var next = function() { scanner.next(); token = scanner.token(); };
    var makePosition = function() { return token != null ? token.start : scanner.index(); };
    var enterSetting = function(valueType, settingName, value) {
        uiContext.putSetting("format/" + valueType + "/" + settingName, value);
    };
    var checkKeywords = function(valueType, settingName, keywords) {
        if (token != null && token.type != Scanner.IDENTIFIER && token.value in keywords) {
            enterSetting(valueType, settingName, keywords[token.value]);
            next();
            return false;
        }
        return true;
    };
    
    var parseNumber = function(valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.NUMBER) {
                throw new Error("Missing number at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseInteger = function(valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.NUMBER) {
                throw new Error("Missing integer at position " + makePosition());
            }
            enterSetting(valueType, settingName, Math.round(token.value));
            next();
        }
    };
    var parseNonnegativeInteger = function(valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.NUMBER || token.value < 0) {
                throw new Error("Missing non-negative integer at position " + makePosition());
            }
            enterSetting(valueType, settingName, Math.round(token.value));
            next();
        }
    };
    var parseString = function(valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.STRING) {
                throw new Error("Missing string at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseURL = function(valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.URL) {
                throw new Error("Missing url at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseExpression = function(valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.EXPRESSION) {
                throw new Error("Missing expression at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseExpressionOrString = function(valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || (token.type != Scanner.EXPRESSION && token.type != Scanner.STRING)) {
                throw new Error("Missing expression or string at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseChoices = function(valueType, settingName, choices) {
        if (token == null || token.type != Scanner.IDENTIFIER) {
            throw new Error("Missing option at position " + makePosition());
        }
        for (var i = 0; i < choices.length; i++) {
            if (token.value == choices[i]) {
                enterSetting(valueType, settingName, token.value);
                next();
                return;
            }
        }
        throw new Error(
            "Unsupported option " + token.value + 
            " for setting " + settingName + 
            " on value type " + valueType + 
            " found at position " + makePosition());
    };
    var parseFlags = function(valueType, settingName, flags, counterFlags) {
        outer: while (token != null && token.type == Scanner.IDENTIFIER) {
            for (var i = 0; i < flags.length; i++) {
                if (token.value == flags[i]) {
                    enterSetting(valueType, settingName + "/" + token.value, true);
                    next();
                    continue outer;
                }
            }
            if (token.value in counterFlags) {
                enterSetting(valueType, settingName + "/" + counterFlags[token.value], false);
                next();
                continue outer;
            }
            throw new Error(
                "Unsupported flag " + token.value + 
                " for setting " + settingName + 
                " on value type " + valueType + 
                " found at position " + makePosition());
        }
    };
    
    var parseSetting = function(valueType, settingName) {
        switch (valueType) {
        case "number":
            switch (settingName) {
            case "decimal-digits":
                parseNonnegativeInteger(valueType, settingName, { "default": -1 });
                return;
            }
            break;
        case "date":
            switch (settingName) {
            case "time-zone":
                parseNumber(valueType, settingName, { "default" : null });
                return;
            case "show":
                parseChoices(valueType, settingName, [ "date", "time", "date-time" ]);
                return;
            case "mode":
                parseChoices(valueType, settingName, [ "short", "medium", "long", "full" ]);
                enterSetting(valueType, "template", null); // mode and template are exclusive
                return;
            case "template":
                parseString(valueType, settingName, {});
                enterSetting(valueType, "mode", null); // mode and template are exclusive
                return;
            }
            break;
        case "boolean":
            switch (settingName) {
            }
            break;
        case "text":
            switch (settingName) {
            case "max-length":
                parseInteger(valueType, settingName, { "none" : 0 });
                return;
            }
            break;
        case "image":
            switch (settingName) {
            case "tooltip":
                parseExpressionOrString(valueType, settingName, { "none" : null });
                return;
            case "max-width":
            case "max-height":
                parseInteger(valueType, settingName, { "none" : -1 });
                return;
            }
            break;
        case "url":
            switch (settingName) {
            case "target":
                parseString(valueType, settingName, { "none" : null });
                return;
            case "external-icon":
                parseURL(valueType, settingName, { "none" : null });
                return;
            }
            break;
        case "item":
            switch (settingName) {
            case "title":
                parseExpression(valueType, settingName, { "default" : null });
                return;
            }
            break;
        case "currency":
            switch (settingName) {
            case "negative-format":
                parseFlags(valueType, settingName, 
                    [ "red", "parentheses", "signed" ], 
                    { "unsigned" : "signed", "no-parenthesis" : "parentheses", "black" : "red" }
                );
                return;
            case "symbol":
                parseString(valueType, settingName, { "default" : "$", "none" : null });
                return;
            case "symbol-placement":
                parseChoices(valueType, settingName, [ "first", "last", "after-sign" ]);
                return;
            case "decimal-digits":
                parseNonnegativeInteger(valueType, settingName, { "default" : -1 });
                return;
            }
            break;
        case "list":
            switch (settingName) {
            case "separator":
            case "last-separator":
            case "pair-separator":
            case "empty-text":
                parseString(valueType, settingName, {});
                return;
            }
            break;
        }
        throw new Error("Unsupported setting called " + settingName + 
            " for value type " + valueType + " found at position " + makePosition());
    };
    var parseSettingList = function(valueType) {

        while (token != null && token.type == Scanner.IDENTIFIER) {
            var settingName = token.value;

            next();
            

            if (token == null || token.type != Scanner.DELIMITER || token.value != ":") {
                throw new Error("Missing : at position " + makePosition());
            }
            next();
            
            parseSetting(valueType, settingName);
            

            if (token == null || token.type != Scanner.DELIMITER || token.value != ";") {
                break;
            } else {
                next();
            }
        }

    }
    var parseRule = function() {
        if (token == null || token.type != Scanner.IDENTIFIER) {
            throw new Error("Missing value type at position " + makePosition());
        }
        
        var valueType = token.value;
        if (!(valueType in Exhibit.FormatParser._valueTypes)) {
            throw new Error("Unsupported value type " + valueType + " at position " + makePosition());
        }
        next();
        
        if (token != null && token.type == Scanner.DELIMITER && token.value == "{") {
            next();
            parseSettingList(valueType);
            
            if (token == null || token.type != Scanner.DELIMITER || token.value != "}") {
                throw new Error("Missing } at position " + makePosition());
            }
            next();
        }
        return valueType;
    };
    var parseRuleList = function() {
        var valueType = "text";
        while (token != null && token.type == Scanner.IDENTIFIER) {
            valueType = parseRule();
        }
        return valueType;
    }
    
    if (several) {
        return parseRuleList();
    } else {
        return parseRule();
    }
};

/*==================================================
 *  Exhibit.FormatScanner
 *==================================================
 */
Exhibit.FormatScanner = function(text, startIndex) {
    this._text = text + " "; // make it easier to parse
    this._maxIndex = text.length;
    this._index = startIndex;
    this.next();
};

Exhibit.FormatScanner.DELIMITER     = 0;
Exhibit.FormatScanner.NUMBER        = 1;
Exhibit.FormatScanner.STRING        = 2;
Exhibit.FormatScanner.IDENTIFIER    = 3;
Exhibit.FormatScanner.URL           = 4;
Exhibit.FormatScanner.EXPRESSION    = 5;
Exhibit.FormatScanner.COLOR         = 6;

Exhibit.FormatScanner.prototype.token = function() {
    return this._token;
};

Exhibit.FormatScanner.prototype.index = function() {
    return this._index;
};

Exhibit.FormatScanner.prototype.next = function() {
    this._token = null;
    
    var self = this;
    var skipSpaces = function(x) {
        while (x < self._maxIndex &&
            " \t\r\n".indexOf(self._text.charAt(x)) >= 0) {
            
            x++;
        }
        return x;
    };
    this._index = skipSpaces(this._index);
    
    if (this._index < this._maxIndex) {
        var c1 = this._text.charAt(this._index);
        var c2 = this._text.charAt(this._index + 1);
        
        if ("{}(),:;".indexOf(c1) >= 0) {
            this._token = {
                type:   Exhibit.FormatScanner.DELIMITER,
                value:  c1,
                start:  this._index,
                end:    this._index + 1
            };
            this._index++;
        } else if ("\"'".indexOf(c1) >= 0) { // quoted strings
            var i = this._index + 1;
            while (i < this._maxIndex) {
                if (this._text.charAt(i) == c1 && this._text.charAt(i - 1) != "\\") {
                    break;
                }
                i++;
            }
            
            if (i < this._maxIndex) {
                this._token = {
                    type:   Exhibit.FormatScanner.STRING,
                    value:  this._text.substring(this._index + 1, i).replace(/\\'/g, "'").replace(/\\"/g, '"'),
                    start:  this._index,
                    end:    i + 1
                };
                this._index = i + 1;
            } else {
                throw new Error("Unterminated string starting at " + this._index);
            }
        } else if (c1 == "#") { // color
            var i = this._index + 1;
            while (i < this._maxIndex && this._isHexDigit(this._text.charAt(i))) {
                i++;
            }
            
            this._token = {
                type:   Exhibit.FormatScanner.COLOR,
                value:  this._text.substring(this._index, i),
                start:  this._index,
                end:    i
            };
            this._index = i;
        } else if (this._isDigit(c1)) { // number
            var i = this._index;
            while (i < this._maxIndex && this._isDigit(this._text.charAt(i))) {
                i++;
            }
            
            if (i < this._maxIndex && this._text.charAt(i) == ".") {
                i++;
                while (i < this._maxIndex && this._isDigit(this._text.charAt(i))) {
                    i++;
                }
            }
            
            this._token = {
                type:   Exhibit.FormatScanner.NUMBER,
                value:  parseFloat(this._text.substring(this._index, i)),
                start:  this._index,
                end:    i
            };
            this._index = i;
        } else { // identifier
            var i = this._index;
            while (i < this._maxIndex) {
                var j = this._text.substr(i).search(/\W/);
                if (j > 0) {
                    i += j;
                } else if ("-".indexOf(this._text.charAt(i)) >= 0) {
                    i++;
                } else {
                    break;
                }
            }
            
            var identifier = this._text.substring(this._index, i);
            while (true) {
                if (identifier == "url") {
                    var openParen = skipSpaces(i);
                    if (this._text.charAt(openParen) == "(") {
                        var closeParen = this._text.indexOf(")", openParen);
                        if (closeParen > 0) {
                            this._token = {
                                type:   Exhibit.FormatScanner.URL,
                                value:  this._text.substring(openParen + 1, closeParen),
                                start:  this._index,
                                end:    closeParen + 1
                            };
                            this._index = closeParen + 1;
                            break;
                        } else {
                            throw new Error("Missing ) to close url at " + this._index);
                        }
                    }
                } else if (identifier == "expression") {
                    var openParen = skipSpaces(i);
                    if (this._text.charAt(openParen) == "(") {
                        var o = {};
                        var expression = Exhibit.ExpressionParser.parse(this._text, openParen + 1, o);
                        
                        var closeParen = skipSpaces(o.index);
                        if (this._text.charAt(closeParen) == ")") {
                            this._token = {
                                type:   Exhibit.FormatScanner.EXPRESSION,
                                value:  expression,
                                start:  this._index,
                                end:    closeParen + 1
                            };
                            this._index = closeParen + 1;
                            break;
                        } else {
                            throw new Error("Missing ) to close expression at " + o.index);
                        }
                    }
                }
                
                this._token = {
                    type:   Exhibit.FormatScanner.IDENTIFIER,
                    value:  identifier,
                    start:  this._index,
                    end:    i
                };
                this._index = i;
                break;
            }
        }
    }
};

Exhibit.FormatScanner.prototype._isDigit = function(c) {
    return "0123456789".indexOf(c) >= 0;
};
Exhibit.FormatScanner.prototype._isHexDigit = function(c) {
    return "0123456789abcdefABCDEF".indexOf(c) >= 0;
};
