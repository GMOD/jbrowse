
Exhibit.LensRegistry.prototype.createLens = function(itemID, div, uiContext, editing) {
    var lensTemplate = this.getLens(itemID, uiContext);
    var create = function(ilens) {
        if (lensTemplate == null) {
            ilens._constructDefaultUI(itemID, div, uiContext);
        } else if (typeof lensTemplate == "string") {
            ilens._constructFromLensTemplateURL(itemID, div, uiContext, lensTemplate);
        } else {
            ilens._constructFromLensTemplateDOM(itemID, div, uiContext, lensTemplate);
        }
    }
    
    var lens={};
    try {
        if (editing)
            lens = Exhibit.EditingLens.create(itemID, div, uiContext, lens, create);
        else
            lens = new Exhibit.Lens();
    } catch (e) {
        SimileAjax.Debug.warn("Something wrong happened while building the editing lens, reverting to regular lens.");
        lens = new Exhibit.Lens();
    }
    create(lens);

    if(editing) {
        var walk = function(a,b) {
            if(Exhibit.getAttribute(a, "ex:content")!=null) {
                Exhibit.setAttribute(b, "ex:content", Exhibit.getAttributes(a, "ex:content"));
            } else for(var i=0; i<a.childNodes.length; i++)
                walk(a.childNodes[i], b.childNodes[i]);
        }
        //console.log("before " + itemID);
        //walk(lens._rootNode, div);
        //console.log("after " + itemID);
    }
    
    return lens;
};
 

Exhibit.Lens._constructFromLensTemplateNode = function(
    roots, rootValueTypes, templateNode, parentElmt, uiContext, job
) {
    if (typeof templateNode == "string") {
        parentElmt.appendChild(document.createTextNode(templateNode));
        return;
    }
    
    var database = uiContext.getDatabase();
    var children = templateNode.children;
    if (templateNode.condition != null) {
        if (templateNode.condition.test == "if-exists") {
            if (!templateNode.condition.expression.testExists(
                    roots,
                    rootValueTypes,
                    "value",
                    database
                )) {
                return;
            }
        } else if (templateNode.condition.test == "if") {
            if (templateNode.condition.expression.evaluate(
                    roots,
                    rootValueTypes,
                    "value",
                    database
                ).values.contains(true)) {
                
                if (children != null && children.length > 0) {
                    Exhibit.Lens._constructFromLensTemplateNode(
                        roots, rootValueTypes, children[0], parentElmt, uiContext, job);
                }
            } else {
                if (children != null && children.length > 1) {
                    Exhibit.Lens._constructFromLensTemplateNode(
                        roots, rootValueTypes, children[1], parentElmt, uiContext, job);
                }
            }
            return;
        } else if (templateNode.condition.test == "select") {
            var values = templateNode.condition.expression.evaluate(
                roots,
                rootValueTypes,
                "value",
                database
            ).values;
            
            if (children != null) {
                var lastChildTemplateNode = null;
                for (var c = 0; c < children.length; c++) {
                    var childTemplateNode = children[c];
                    if (childTemplateNode.condition != null && 
                        childTemplateNode.condition.test == "case") {
                        
                        if (values.contains(childTemplateNode.condition.value)) {
                            Exhibit.Lens._constructFromLensTemplateNode(
                                roots, rootValueTypes, childTemplateNode, parentElmt, uiContext, job);
                                
                            return;
                        }
                    } else if (typeof childTemplateNode != "string") {
                        lastChildTemplateNode = childTemplateNode;
                    }
                }
            }
            
            if (lastChildTemplateNode != null) {
                Exhibit.Lens._constructFromLensTemplateNode(
                    roots, rootValueTypes, lastChildTemplateNode, parentElmt, uiContext, job);
            }
            return;
        }
    }
    
    var elmt = Exhibit.Lens._constructElmtWithAttributes(templateNode, parentElmt, database);
    if (templateNode.contentAttributes != null) {
        var contentAttributes = templateNode.contentAttributes;
        for (var i = 0; i < contentAttributes.length; i++) {
            var attribute = contentAttributes[i];
            var values = [];
            
            attribute.expression.evaluate(
                roots,
                rootValueTypes,
                "value",
                database
            ).values.visit(function(v) { values.push(v); });
                
            elmt.setAttribute(attribute.name, values.join(";"));
        }
    }
    if (templateNode.subcontentAttributes != null) {
        var subcontentAttributes = templateNode.subcontentAttributes;
        for (var i = 0; i < subcontentAttributes.length; i++) {
            var attribute = subcontentAttributes[i];
            var fragments = attribute.fragments;
            var results = "";
            for (var r = 0; r < fragments.length; r++) {
                var fragment = fragments[r];
                if (typeof fragment == "string") {
                    results += fragment;
                } else {
                    results += fragment.evaluateSingle(
                        roots,
                        rootValueTypes,
                        "value",
                        database
                    ).value;
                }
            }
            elmt.setAttribute(attribute.name, results);
        }
    }
    var handlers = templateNode.handlers;
    for (var h = 0; h < handlers.length; h++) {
        var handler = handlers[h];
        elmt[handler.name] = handler.code;
    }
    
    if (templateNode.control != null) {
        switch (templateNode.control) {
        case "item-link":
            var a = document.createElement("a");
            a.innerHTML = Exhibit.l10n.itemLinkLabel;
            a.href = Exhibit.Persistence.getItemLink(roots["value"]);
            a.target = "_blank";
            elmt.appendChild(a);
        }
    } else if (templateNode.content != null) {
        var results = templateNode.content.evaluate(
            roots,
            rootValueTypes,
            "value",
            database
        );
        if (children != null) {
            var rootValueTypes2 = { "value" : results.valueType, "index" : "number" };
            var index = 1;
            
            var processOneValue = function(childValue) {
                var roots2 = { "value" : childValue, "index" : index++ };
                for (var i = 0; i < children.length; i++) {
                    Exhibit.Lens._constructFromLensTemplateNode(
                        roots2, rootValueTypes2, children[i], elmt, uiContext, job);
                }
            };
            if (results.values instanceof Array) {
                for (var i = 0; i < results.values.length; i++) {
                    processOneValue(results.values[i]);
                }
            } else {
                results.values.visit(processOneValue);
            }
        } else {
            Exhibit.Lens._constructDefaultValueList(results.values, results.valueType, elmt, uiContext, job.itemID, templateNode.content._rootNode._segments[0].property);
            //itemID: job.itemID
            //propertyID: templateNode.content._rootNode._segments[0].property
        }
    } else if (children != null) {
        for (var i = 0; i < children.length; i++) {
            Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[i], elmt, uiContext, job);
        }
    }
};


Exhibit.Lens.original_constructDefaultValueList = Exhibit.Lens._constructDefaultValueList;