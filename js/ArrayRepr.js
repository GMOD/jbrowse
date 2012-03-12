// MODEL

/*
    class for operating on indexed representations of objects

    For example, if we have a lot of objects with similar attributes, e.g.:
        [
            {start: 1, end: 2, strand: -1},
            {start: 5, end: 6, strand: 1},
            ...
        ]
    we can represent them more compactly (e.g., in JSON) something like this:
        class = ["start", "end", "strand"]
        [
            [1, 2, -1],
            [5, 6, 1],
            ...
        ]

    If we want to represent a few different kinds of objects in our big list,
    we can have multiple "class" arrays, and tag each object to identify
    which "class" array describes it.

    For example, if we have a lot of instances of a few types of objects,
    like this:
        [
            {start: 1, end: 2, strand: 1, id: 1},
            {start: 5, end: 6, strand: 1, id: 2},
            ...
            {start: 10, end: 20, chunk: 1},
            {start: 30, end: 40, chunk: 2},
            ...
        ]
    We could use the first array position to indicate the "class" for the
    object, like this:
        classes = [["start", "end", "strand", "id"], ["start", "end", "chunk"]]
        [
            [0, 1, 2, 1, 1],
            [0, 5, 6, 1, 2],
            ...
            [1, 10, 20, 1],
            [1, 30, 40, 1]
        ]
    Also, if we occasionally want to add an ad-hoc attribute, we could just
    stick an optional dictionary onto the end:
        classes = [["start", "end", "strand", "id"], ["start", "end", "chunk"]]
        [
            [0, 1, 2, 1, 1],
            [0, 5, 6, 1, 2, {foo: 1}]
        ]

    Given that individual objects are being represented by arrays, generic
    code needs some way to differentiate arrays that are meant to be objects
    from arrays that are actually meant to be arrays.
    So for each class, we include a dict with <attribute name>: true mappings
    for each attribute that is meant to be an array.

    Also, in cases where some attribute values are the same for all objects
    in a particular set, it may be convenient to define a "prototype"
    with default values for all objects in the set

    In the end, we get something like this:

        classes=[
            {'attributes': ['Start', 'End', 'Subfeatures'],
             'proto': {'Chrom': 'chr1'},
             'isArrayAttr': {Subfeatures: true}}
            ]

    That's what this class facilitates.
    """

*/
function ArrayRepr (classes) {
    this.classes = classes;
    this.fields = [];
    for (var cl = 0; cl < classes.length; cl++) {
        this.fields[cl] = {};
        for (var f = 0; f < classes[cl].attributes.length; f++) {
            this.fields[cl][classes[cl].attributes[f]] = f + 1;
        }
        if (classes[cl].proto === undefined)
            classes[cl].proto = {};
        if (classes[cl].isArrayAttr === undefined)
            classes[cl].isArrayAttr = {};
    }
}

ArrayRepr.prototype.attrIndices = function(attr) {
    return this.classes.map(
        function(x) {
            var i = x.attributes.indexOf(attr);
            return i >= 0 ? i + 1 : undefined;
        }
    );
};

ArrayRepr.prototype.get = function(obj, attr) {
    if (attr in this.fields[obj[0]]) {
        return obj[this.fields[obj[0]][attr]];
    } else {
        var adhocIndex = this.classes[obj[0]].attributes.length + 1;
        if ((adhocIndex >= obj.length) || (!(attr in obj[adhocIndex]))) {
            if (attr in this.classes[obj[0]].proto)
                return this.classes[obj[0]].proto[attr];
            return undefined;
        }
        return obj[adhocIndex][attr];
    }
};

ArrayRepr.prototype.fastGet = function(obj, attr) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    return obj[self.fields[obj[0]][attr]];
};

ArrayRepr.prototype.set = function(obj, attr, val) {
    if (attr in this.fields[obj[0]]) {
        obj[this.fields[obj[0]][attr]] = val;
    } else {
        var adhocIndex = self.classes[obj[0]].length + 1;
        if (adhocIndex >= obj.length)
            obj[adhocIndex] = {};
        obj[adhocIndex][attr] = val;
    }
};

ArrayRepr.prototype.fastSet = function(obj, attr, val) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    obj[this.fields[obj[0]][attr]] = val;
};

ArrayRepr.prototype.makeSetter = function(attr) {
    var self = this;
    return function(obj, val) { self.set(obj, attr, val); };
};

ArrayRepr.prototype.makeGetter = function(attr) {
    var self = this;
    return function(obj) { return self.get(obj, attr); };
};

ArrayRepr.prototype.makeFastSetter = function(attr) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    var indices = this.attrIndices(attr);
    return function(obj, val) {
        if (indices[obj[0]] !== undefined)
            obj[indices[obj[0]]] = val;
    };
};

ArrayRepr.prototype.makeFastGetter = function(attr) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    var indices = this.attrIndices(attr);
    return function(obj) {
        if (indices[obj[0]] !== undefined)
            return obj[indices[obj[0]]];
        else
            return undefined;
    };
};

ArrayRepr.prototype.construct = function(self, obj, klass) {
    var result = new Array(self.classes[klass].length);
    for (var attr in obj) {
        this.set(result, attr, obj[attr]);
    }
    return result;
};

ArrayRepr.prototype.accessors = function () {
    return this._accessors = this._accessors || this._makeAccessors();
};

// make an object like
//     { get: { attrname: func() {}, ... },
//       set: { attrname: func() {}. ... }
//     }
// prototype object that, when set as the prototype on a data
// array, provides nicely-named, fast accessors to access the
// attributes in that array
ArrayRepr.prototype._makeAccessors = function() {
    var that = this,
        accessors = {
            get: function(field) {
                try { return this.get[field].call(this); }
                catch (x) { return undefined; }
            },
            set: function(field,val) {
                try { return this.set[field].call(this,val); }
                catch (x) { return undefined; }
            }
        };

    // make a data structure as: { attr_name: [offset,offset,offset], }
    // that will be convenient for finding the location of the attr
    // for a given class like: indexForAttr{attrname}[classnum]
    var indices = {};
    dojo.forEach( this.classes, function(cdef,classnum) {
        dojo.forEach( cdef.attributes || [], function(attrname,offset) {
            attrname = attrname.toLowerCase();
            indices[attrname] = indices[attrname] || [];
            indices[attrname][classnum] = offset + 1;
        });
    });

    for( var attrname in indices ) {
        if( ! indices.hasOwnProperty(attrname) ) continue;

        // make a get accessor
        accessors.get[ attrname ] = (function() {
            var attr_indices = indices[attrname];
            return !attr_indices ? function() { return undefined; } : function() {
                return this[ attr_indices[ this[0] ] ];
            };
        })();

        // make a set accessor
        accessors.set[ attrname ] = (function() {
            var attr_indices =  indices[attrname];
            return !attr_indices ? function() { return undefined; } : function(v) {
                return ( this[ attr_indices[ this[0] ] ] = v );
            };
        })();
    }

    return accessors;
};

/*

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
