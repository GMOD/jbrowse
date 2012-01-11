/*==================================================
 *  Exhibit.Set
 *==================================================
 */
 
Exhibit.Set = function(a) {
    this._hash = {};
    this._count = 0;
    
    if (a instanceof Array) {
        for (var i = 0; i < a.length; i++) {
            this.add(a[i]);
        }
    } else if (a instanceof Exhibit.Set) {
        this.addSet(a);
    }
}

Exhibit.Set.prototype.add = function(o) {
    if (!(o in this._hash)) {
        this._hash[o] = true;
        this._count++;
        return true;
    }
    return false;
}

Exhibit.Set.prototype.addSet = function(set) {
    for (var o in set._hash) {
        this.add(o);
    }
}

Exhibit.Set.prototype.remove = function(o) {
    if (o in this._hash) {
        delete this._hash[o];
        this._count--;
        return true;
    }
    return false;
}

Exhibit.Set.prototype.removeSet = function(set) {
    for (var o in set._hash) {
        this.remove(o);
    }
}

Exhibit.Set.prototype.retainSet = function(set) {
    for (var o in this._hash) {
        if (!set.contains(o)) {
            delete this._hash[o];
            this._count--;
        }
    }
}

Exhibit.Set.prototype.contains = function(o) {
    return (o in this._hash);
}

Exhibit.Set.prototype.size = function() {
    return this._count;
}

Exhibit.Set.prototype.toArray = function() {
    var a = [];
    for (var o in this._hash) {
        a.push(o);
    }
    return a;
}

Exhibit.Set.prototype.visit = function(f) {
    for (var o in this._hash) {
        if (f(o) == true) {
            break;
        }
    }
}

Exhibit.Set.createIntersection = function(set1, set2, result) {
    var set = (result) ? result : new Exhibit.Set();
    var setA, setB;
    if (set1.size() < set2.size()) {
        setA = set1;
        setB = set2;
    } else {
        setA = set2;
        setB = set1;
    }
    setA.visit(function (v) {
        if (setB.contains(v)) {
            set.add(v);
        }
    });
    return set;
}
