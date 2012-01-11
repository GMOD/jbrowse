/*==================================================
 *  Exhibit.ExpressionParser
 *  http://simile.mit.edu/wiki/Exhibit/API/ExpressionParser
 *==================================================
 */
Exhibit.ExpressionParser = new Object();

Exhibit.ExpressionParser.parse = function(s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    
    var scanner = new Exhibit.ExpressionScanner(s, startIndex);
    try {
        return Exhibit.ExpressionParser._internalParse(scanner, false);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};

Exhibit.ExpressionParser.parseSeveral = function(s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    
    var scanner = new Exhibit.ExpressionScanner(s, startIndex);
    try {
        return Exhibit.ExpressionParser._internalParse(scanner, true);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};

Exhibit.ExpressionParser._internalParse = function(scanner, several) {
    var Scanner = Exhibit.ExpressionScanner;
    var token = scanner.token();
    var next = function() { scanner.next(); token = scanner.token(); };
    var makePosition = function() { return token != null ? token.start : scanner.index(); };
    
    var parsePath = function() {
        var path = new Exhibit.Expression.Path();
        while (token != null && token.type == Scanner.PATH_OPERATOR) {
            var hopOperator = token.value;
            next();
            
            if (token != null && token.type == Scanner.IDENTIFIER) {
                path.appendSegment(token.value, hopOperator);
                next();

            } else {
                throw new Error("Missing property ID at position " + makePosition());
            }
        }
        return path;
    };
    var parseFactor = function() {
        if (token == null) {
            throw new Error("Missing factor at end of expression");
        }
        
        var result = null;
        
        switch (token.type) {
        case Scanner.NUMBER:
            result = new Exhibit.Expression._Constant(token.value, "number");
            next();
            break;
        case Scanner.STRING:
            result = new Exhibit.Expression._Constant(token.value, "text");
            next();
            break;
        case Scanner.PATH_OPERATOR:
            result = parsePath();
            break;
        case Scanner.IDENTIFIER:
            var identifier = token.value;
            next();
            
            if (identifier in Exhibit.Controls) {
                if (token != null && token.type == Scanner.DELIMITER && token.value == "(") {
                    next();
                    
                    var args = (token != null && token.type == Scanner.DELIMITER && token.value == ")") ? 
                        [] :
                        parseExpressionList();
                        
                    result = new Exhibit.Expression._ControlCall(identifier, args);
                    
                    if (token != null && token.type == Scanner.DELIMITER && token.value == ")") {
                        next();
                    } else {
                        throw new Error("Missing ) to end " + identifier + " at position " + makePosition());
                    }
                } else {
                    throw new Error("Missing ( to start " + identifier + " at position " + makePosition());
                }
            } else {
                if (token != null && token.type == Scanner.DELIMITER && token.value == "(") {
                    next();
                    
                    var args = (token != null && token.type == Scanner.DELIMITER && token.value == ")") ? 
                        [] :
                        parseExpressionList();
                        
                    result = new Exhibit.Expression._FunctionCall(identifier, args);
                    
                    if (token != null && token.type == Scanner.DELIMITER && token.value == ")") {
                        next();
                    } else {
                        throw new Error("Missing ) after function call " + identifier + " at position " + makePosition());
                    }
                } else {
                    result = parsePath();
                    result.setRootName(identifier);
                }
            }
            break;
        case Scanner.DELIMITER:
            if (token.value == "(") {
                next();
                
                result = parseExpression();
                if (token != null && token.type == Scanner.DELIMITER && token.value == ")") {
                    next();
                    break;
                } else {
                    throw new Error("Missing ) at position " + makePosition());
                }
            } // else, fall through
        default:
            throw new Error("Unexpected text " + token.value + " at position " + makePosition());
        }
        
        return result;
    };
    var parseTerm = function() {
        var term = parseFactor();
        while (token != null && token.type == Scanner.OPERATOR && 
            (token.value == "*" || token.value == "/")) {
            var operator = token.value;
            next();
            
            term = new Exhibit.Expression._Operator(operator, [ term, parseFactor() ]);
        }
        return term;
    };
    var parseSubExpression = function() {
        var subExpression = parseTerm();
        while (token != null && token.type == Scanner.OPERATOR && 
            (token.value == "+" || token.value == "-")) {
            
            var operator = token.value;
            next();
            
            subExpression = new Exhibit.Expression._Operator(operator, [ subExpression, parseTerm() ]);
        }
        return subExpression;
    };
    var parseExpression = function() {
        var expression = parseSubExpression();
        while (token != null && token.type == Scanner.OPERATOR && 
            (token.value == "=" || token.value == "<>" || 
             token.value == "<" || token.value == "<=" || 
             token.value == ">" || token.value == ">=")) {
            
            var operator = token.value;
            next();
            
            expression = new Exhibit.Expression._Operator(operator, [ expression, parseSubExpression() ]);
        }
        return expression;
    };
    var parseExpressionList = function() {
        var expressions = [ parseExpression() ];
        while (token != null && token.type == Scanner.DELIMITER && token.value == ",") {
            next();
            expressions.push(parseExpression());
        }
        return expressions;
    }
    
    if (several) {
        var roots = parseExpressionList();
        var expressions = [];
        for (var r = 0; r < roots.length; r++) {
            expressions.push(new Exhibit.Expression._Impl(roots[r]));
        }
        return expressions;
    } else {
        return new Exhibit.Expression._Impl(parseExpression());
    }
};

/*==================================================
 *  Exhibit.ExpressionScanner
 *==================================================
 */
Exhibit.ExpressionScanner = function(text, startIndex) {
    this._text = text + " "; // make it easier to parse
    this._maxIndex = text.length;
    this._index = startIndex;
    this.next();
};

Exhibit.ExpressionScanner.DELIMITER     = 0;
Exhibit.ExpressionScanner.NUMBER        = 1;
Exhibit.ExpressionScanner.STRING        = 2;
Exhibit.ExpressionScanner.IDENTIFIER    = 3;
Exhibit.ExpressionScanner.OPERATOR      = 4;
Exhibit.ExpressionScanner.PATH_OPERATOR = 5;

Exhibit.ExpressionScanner.prototype.token = function() {
    return this._token;
};

Exhibit.ExpressionScanner.prototype.index = function() {
    return this._index;
};

Exhibit.ExpressionScanner.prototype.next = function() {
    this._token = null;
    
    while (this._index < this._maxIndex &&
        " \t\r\n".indexOf(this._text.charAt(this._index)) >= 0) {
        this._index++;
    }
    
    if (this._index < this._maxIndex) {
        var c1 = this._text.charAt(this._index);
        var c2 = this._text.charAt(this._index + 1);
        
        if (".!".indexOf(c1) >= 0) {
            if (c2 == "@") {
                this._token = {
                    type:   Exhibit.ExpressionScanner.PATH_OPERATOR,
                    value:  c1 + c2,
                    start:  this._index,
                    end:    this._index + 2
                };
                this._index += 2;
            } else {
                this._token = {
                    type:   Exhibit.ExpressionScanner.PATH_OPERATOR,
                    value:  c1,
                    start:  this._index,
                    end:    this._index + 1
                };
                this._index++;
            }
        } else if ("<>".indexOf(c1) >= 0) {
            if ((c2 == "=") || ("<>".indexOf(c2) >= 0 && c1 != c2)) {
                this._token = {
                    type:   Exhibit.ExpressionScanner.OPERATOR,
                    value:  c1 + c2,
                    start:  this._index,
                    end:    this._index + 2
                };
                this._index += 2;
            } else {
                this._token = {
                    type:   Exhibit.ExpressionScanner.OPERATOR,
                    value:  c1,
                    start:  this._index,
                    end:    this._index + 1
                };
                this._index++;
            }
        } else if ("+-*/=".indexOf(c1) >= 0) {
            this._token = {
                type:   Exhibit.ExpressionScanner.OPERATOR,
                value:  c1,
                start:  this._index,
                end:    this._index + 1
            };
            this._index++;
        } else if ("(),".indexOf(c1) >= 0) {
            this._token = {
                type:   Exhibit.ExpressionScanner.DELIMITER,
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
                    type:   Exhibit.ExpressionScanner.STRING,
                    value:  this._text.substring(this._index + 1, i).replace(/\\'/g, "'").replace(/\\"/g, '"'),
                    start:  this._index,
                    end:    i + 1
                };
                this._index = i + 1;
            } else {
                throw new Error("Unterminated string starting at " + this._index);
            }
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
                type:   Exhibit.ExpressionScanner.NUMBER,
                value:  parseFloat(this._text.substring(this._index, i)),
                start:  this._index,
                end:    i
            };
            this._index = i;
        } else { // identifier
            var i = this._index;
            while (i < this._maxIndex) {
                var c = this._text.charAt(i);
                if ("(),.!@ \t".indexOf(c) < 0) {
                    i++;
                } else {
                    break;
                }
            }
            this._token = {
                type:   Exhibit.ExpressionScanner.IDENTIFIER,
                value:  this._text.substring(this._index, i),
                start:  this._index,
                end:    i
            };
            this._index = i;
        }
    }
};

Exhibit.ExpressionScanner.prototype._isDigit = function(c) {
    return "0123456789".indexOf(c) >= 0;
};
