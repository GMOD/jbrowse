/*==================================================
 *  Exhibit.Expression
 *  http://simile.mit.edu/wiki/Exhibit/API/Expression
 *==================================================
 */
Exhibit.Expression = new Object();

Exhibit.Expression._Impl = function(rootNode) {
    this._rootNode = rootNode;
};

Exhibit.Expression._Impl.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var collection = this._rootNode.evaluate(roots, rootValueTypes, defaultRootName, database);
    return {
        values:     collection.getSet(),
        valueType:  collection.valueType,
        size:       collection.size
    };
};

Exhibit.Expression._Impl.prototype.evaluateOnItem = function(itemID, database) {
    return this.evaluate(
        { "value" : itemID }, 
        { "value" : "item" }, 
        "value",
        database
    );
};

Exhibit.Expression._Impl.prototype.evaluateSingle = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var collection = this._rootNode.evaluate(roots, rootValueTypes, defaultRootName, database);
    var result = { value: null, valueType: collection.valueType };
    collection.forEachValue(function(v) { result.value = v; return true; });
    
    return result;
};

Exhibit.Expression._Impl.prototype.evaluateSingleOnItem = function(itemID, database) {
    return this.evaluateSingle(
        { "value" : itemID }, 
        { "value" : "item" }, 
        "value",
        database
    );
};

Exhibit.Expression._Impl.prototype.testExists = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return this.isPath() ?
        this._rootNode.testExists(roots, rootValueTypes, defaultRootName, database) :
        this.evaluate(roots, rootValueTypes, defaultRootName, database).values.size() > 0;
};

Exhibit.Expression._Impl.prototype.isPath = function() {
    return this._rootNode instanceof Exhibit.Expression.Path;
};

Exhibit.Expression._Impl.prototype.getPath = function() {
    return this.isPath() ? this._rootNode : null;
};

/*==================================================
 *  Exhibit.Expression._Collection
 *==================================================
 */
Exhibit.Expression._Collection = function(values, valueType) {
    this._values = values;
    this.valueType = valueType;
    
    if (values instanceof Array) {
        this.forEachValue = Exhibit.Expression._Collection._forEachValueInArray;
        this.getSet = Exhibit.Expression._Collection._getSetFromArray;
        this.contains = Exhibit.Expression._Collection._containsInArray;
        this.size = values.length;
    } else {
        this.forEachValue = Exhibit.Expression._Collection._forEachValueInSet;
        this.getSet = Exhibit.Expression._Collection._getSetFromSet;
        this.contains = Exhibit.Expression._Collection._containsInSet;
        this.size = values.size();
    }
};

Exhibit.Expression._Collection._forEachValueInSet = function(f) {
    this._values.visit(f);
};

Exhibit.Expression._Collection._forEachValueInArray = function(f) {
    var a = this._values;
    for (var i = 0; i < a.length; i++) {
        if (f(a[i])) {
            break;
        }
    }
};

Exhibit.Expression._Collection._getSetFromSet = function() {
    return this._values;
};

Exhibit.Expression._Collection._getSetFromArray = function() {
    return new Exhibit.Set(this._values);
};

Exhibit.Expression._Collection._containsInSet = function(v) {
    this._values.contains(v);
};

Exhibit.Expression._Collection._containsInArray = function(v) {
    var a = this._values;
    for (var i = 0; i < a.length; i++) {
        if (a[i] == v) {
            return true;
        }
    }
    return false;
};

/*==================================================
 *  Exhibit.Expression.Path
 *==================================================
 */
Exhibit.Expression.Path = function() {
    this._rootName = null;
    this._segments = [];
};

Exhibit.Expression.Path.create = function(property, forward) {
    var path = new Exhibit.Expression.Path();
    path._segments.push({ property: property, forward: forward, isArray: false });
    return path;
};

Exhibit.Expression.Path.prototype.setRootName = function(rootName) {
    this._rootName = rootName;
};

Exhibit.Expression.Path.prototype.appendSegment = function(property, hopOperator) {
    this._segments.push({
        property:   property,
        forward:    hopOperator.charAt(0) == ".",
        isArray:    hopOperator.length > 1
    });
};

Exhibit.Expression.Path.prototype.getSegment = function(index) {
    if (index < this._segments.length) {
        var segment = this._segments[index];
        return {
            property:   segment.property,
            forward:    segment.forward,
            isArray:    segment.isArray
        };
    } else {
        return null;
    }
};

Exhibit.Expression.Path.prototype.getLastSegment = function() {
    return this.getSegment(this._segments.length - 1);
};

Exhibit.Expression.Path.prototype.getSegmentCount = function() {
    return this._segments.length;
};

Exhibit.Expression.Path.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var rootName = this._rootName != null ? this._rootName : defaultRootName;
    var valueType = rootName in rootValueTypes ? rootValueTypes[rootName] : "text";
    
    var collection = null;
    if (rootName in roots) {
        var root = roots[rootName];
        if (root instanceof Exhibit.Set || root instanceof Array) {
            collection = new Exhibit.Expression._Collection(root, valueType);
        } else {
            collection = new Exhibit.Expression._Collection([ root ], valueType);
        }
        
        return this._walkForward(collection, database);
    } else {
        throw new Error("No such variable called " + rootName);
    }
};

Exhibit.Expression.Path.prototype.evaluateBackward = function(
    value,
    valueType,
    filter,
    database
) {
    var collection = new Exhibit.Expression._Collection([ value ], valueType);
    
    return this._walkBackward(collection, filter, database);
}

Exhibit.Expression.Path.prototype.walkForward = function(
    values,
    valueType,
    database
) {
    return this._walkForward(new Exhibit.Expression._Collection(values, valueType), database);
};

Exhibit.Expression.Path.prototype.walkBackward = function(
    values,
    valueType,
    filter,
    database
) {
    return this._walkBackward(new Exhibit.Expression._Collection(values, valueType), filter, database);
};

Exhibit.Expression.Path.prototype._walkForward = function(collection, database) {
    for (var i = 0; i < this._segments.length; i++) {
        var segment = this._segments[i];
        if (segment.isArray) {
            var a = [];
            var valueType;
            if (segment.forward) {
                collection.forEachValue(function(v) {
                    database.getObjects(v, segment.property).visit(function(v2) { a.push(v2); });
                });
                
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            } else {
                collection.forEachValue(function(v) {
                    database.getSubjects(v, segment.property).visit(function(v2) { a.push(v2); });
                });
                valueType = "item";
            }
            collection = new Exhibit.Expression._Collection(a, valueType);
        } else {
            if (segment.forward) {
                var values = database.getObjectsUnion(collection.getSet(), segment.property);
                var property = database.getProperty(segment.property);
                var valueType = property != null ? property.getValueType() : "text";
                collection = new Exhibit.Expression._Collection(values, valueType);
            } else {
                var values = database.getSubjectsUnion(collection.getSet(), segment.property);
                collection = new Exhibit.Expression._Collection(values, "item");
            }
        }
    }
    
    return collection;
};

Exhibit.Expression.Path.prototype._walkBackward = function(collection, filter, database) {
    for (var i = this._segments.length - 1; i >= 0; i--) {
        var segment = this._segments[i];
        if (segment.isArray) {
            var a = [];
            var valueType;
            if (segment.forward) {
                collection.forEachValue(function(v) {
                    database.getSubjects(v, segment.property).visit(function(v2) { 
                        if (i > 0 || filter == null || filter.contains(v2)) {
                            a.push(v2); 
                        }
                    });
                });
                
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            } else {
                collection.forEachValue(function(v) {
                    database.getObjects(v, segment.property).visit(function(v2) { 
                        if (i > 0 || filter == null || filter.contains(v2)) {
                            a.push(v2); 
                        }
                    });
                });
                valueType = "item";
            }
            collection = new Exhibit.Expression._Collection(a, valueType);
        } else {
            if (segment.forward) {
                var values = database.getSubjectsUnion(collection.getSet(), segment.property, null, i == 0 ? filter : null);
                collection = new Exhibit.Expression._Collection(values, "item");
            } else {
                var values = database.getObjectsUnion(collection.getSet(), segment.property, null, i == 0 ? filter : null);
                var property = database.getProperty(segment.property);
                var valueType = property != null ? property.getValueType() : "text";
                collection = new Exhibit.Expression._Collection(values, valueType);
            }
        }
    }
    
    return collection;
};

Exhibit.Expression.Path.prototype.rangeBackward = function(
    from,
    to,
    inclusive,
    filter,
    database
) {
    var set = new Exhibit.Set();
    var valueType = "item";
    if (this._segments.length > 0) {
        var segment = this._segments[this._segments.length - 1];
        if (segment.forward) {
            database.getSubjectsInRange(segment.property, from, to, inclusive, set, this._segments.length == 1 ? filter : null);
        } else {
            throw new Error("Last path of segment must be forward");
        }
                
        for (var i = this._segments.length - 2; i >= 0; i--) {
            segment = this._segments[i];
            if (segment.forward) {
                set = database.getSubjectsUnion(set, segment.property, null, i == 0 ? filter : null);
                valueType = "item";
            } else {
                set = database.getObjectsUnion(set, segment.property, null, i == 0 ? filter : null);
                
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            }
        }
    }
    return {
        valueType:  valueType,
        values:     set,
        count:      set.size()
    };
};

Exhibit.Expression.Path.prototype.testExists = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return this.evaluate(roots, rootValueTypes, defaultRootName, database).size > 0;
};

/*==================================================
 *  Exhibit.Expression._Constant
 *==================================================
 */
Exhibit.Expression._Constant = function(value, valueType) {
    this._value = value;
    this._valueType = valueType;
};

Exhibit.Expression._Constant.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return new Exhibit.Expression._Collection([ this._value ], this._valueType);
};

/*==================================================
 *  Exhibit.Expression._Operator
 *==================================================
 */
Exhibit.Expression._Operator = function(operator, args) {
    this._operator = operator;
    this._args = args;
};

Exhibit.Expression._Operator.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var values = [];
    
    var args = [];
    for (var i = 0; i < this._args.length; i++) {
        args.push(this._args[i].evaluate(roots, rootValueTypes, defaultRootName, database));
    }
    
    var operator = Exhibit.Expression._operators[this._operator];
    var f = operator.f;
    if (operator.argumentType == "number") {
        args[0].forEachValue(function(v1) {
            if (!(typeof v1 == "number")) {
                v1 = parseFloat(v1);
            }
        
            args[1].forEachValue(function(v2) {
                if (!(typeof v2 == "number")) {
                    v2 = parseFloat(v2);
                }
                
                values.push(f(v1, v2));
            });
        });
    } else {
        args[0].forEachValue(function(v1) {
            args[1].forEachValue(function(v2) {
                values.push(f(v1, v2));
            });
        });
    }
    
    return new Exhibit.Expression._Collection(values, operator.valueType);
};

Exhibit.Expression._operators = {
    "+" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a + b; }
    },
    "-" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a - b; }
    },
    "*" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a * b; }
    },
    "/" : {
        argumentType: "number",
        valueType: "number",
        f: function(a, b) { return a / b; }
    },
    "=" : {
        valueType: "boolean",
        f: function(a, b) { return a == b; }
    },
    "<>" : {
        valueType: "boolean",
        f: function(a, b) { return a != b; }
    },
    "><" : {
        valueType: "boolean",
        f: function(a, b) { return a != b; }
    },
    "<" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a < b; }
    },
    ">" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a > b; }
    },
    "<=" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a <= b; }
    },
    ">=" : {
        argumentType: "number",
        valueType: "boolean",
        f: function(a, b) { return a >= b; }
    }
}

/*==================================================
 *  Exhibit.Expression._FunctionCall
 *==================================================
 */
Exhibit.Expression._FunctionCall = function(name, args) {
    this._name = name;
    this._args = args;
};

Exhibit.Expression._FunctionCall.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    var args = [];
    for (var i = 0; i < this._args.length; i++) {
        args.push(this._args[i].evaluate(roots, rootValueTypes, defaultRootName, database));
    }
    
    if (this._name in Exhibit.Functions) {
        return Exhibit.Functions[this._name].f(args);
    } else {
        throw new Error("No such function named " + this._name);
    }
};

/*==================================================
 *  Exhibit.Expression._ControlCall
 *==================================================
 */
Exhibit.Expression._ControlCall = function(name, args) {
    this._name = name;
    this._args = args;
};

Exhibit.Expression._ControlCall.prototype.evaluate = function(
    roots, 
    rootValueTypes, 
    defaultRootName, 
    database
) {
    return Exhibit.Controls[this._name].f(this._args, roots, rootValueTypes, defaultRootName, database);
};
