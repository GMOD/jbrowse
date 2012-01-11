/*==================================================
 *  Exhibit.Controls
 *==================================================
 */
Exhibit.Controls = {};

Exhibit.Controls["if"] = {
    f: function(
        args,
        roots, 
        rootValueTypes, 
        defaultRootName, 
        database
    ) {
        var conditionCollection = args[0].evaluate(roots, rootValueTypes, defaultRootName, database);
        var condition = false;
        conditionCollection.forEachValue(function(v) {
            if (v) {
                condition = true;
                return true;
            }
        });
        
        if (condition) {
            return args[1].evaluate(roots, rootValueTypes, defaultRootName, database);
        } else {
            return args[2].evaluate(roots, rootValueTypes, defaultRootName, database);
        }
    }
};

Exhibit.Controls["foreach"] = {
    f: function(
        args,
        roots, 
        rootValueTypes, 
        defaultRootName, 
        database
    ) {
        var collection = args[0].evaluate(roots, rootValueTypes, defaultRootName, database);
        
        var oldValue = roots["value"];
        var oldValueType = rootValueTypes["value"];
        rootValueTypes["value"] = collection.valueType;
        
        var results = [];
        var valueType = "text";
        
        collection.forEachValue(function(element) {
            roots["value"] = element;
            
            var collection2 = args[1].evaluate(roots, rootValueTypes, defaultRootName, database);
            valueType = collection2.valueType;
            
            collection2.forEachValue(function(result) {
                results.push(result);
            });
        });
        
        roots["value"] = oldValue;
        rootValueTypes["value"] = oldValueType;
        
        return new Exhibit.Expression._Collection(results, valueType);
    }
};

Exhibit.Controls["default"] = {
    f: function(
        args,
        roots, 
        rootValueTypes, 
        defaultRootName, 
        database
    ) {
        for (var i = 0; i < args.length; i++) {
            var collection = args[i].evaluate(roots, rootValueTypes, defaultRootName, database);
            if (collection.size > 0) {
                return collection;
            }
        }
        return new Exhibit.Expression._Collection([], "text");
    }
};

Exhibit.Controls["filter"] = {
    f: function(
        args,
        roots,
        rootValueTypes,
        defaultRootName,
        database
    ) {
        var collection = args[0].evaluate(roots, rootValueTypes, defaultRootName, database);
       
        var oldValue = roots["value"];
        var oldValueType = rootValueTypes["value"];
       
        var results = new Exhibit.Set();
        rootValueTypes["value"] = collection.valueType;
       
        collection.forEachValue(function(element) {
            roots["value"] = element;
           
            var collection2 = args[1].evaluate(roots, rootValueTypes, defaultRootName, database);
            if (collection2.size > 0 && collection2.contains("true")) {
                results.add(element);
            }
        });
       
        roots["value"] = oldValue;
        rootValueTypes["value"] = oldValueType;
       
        return new Exhibit.Expression._Collection(results, collection.valueType);
    }
};