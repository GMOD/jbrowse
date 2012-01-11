/*==================================================
 *  Exhibit.XMLImporter
 *==================================================
 */


/*
An XML node can represent three things:
* an item
* a relationship between a parent node (item) and child node (item)
* both, ie the node represents an item that is implicitly related to the containing node

ex:itemTags specifies tags that represent items
By default, the type of an item equals its itemTag
ex:itemTypes overrides this default
If an item C is a descendant of another item A, C becomes the value of some property of A
By default:
* if the (immediate) parent of C is NOT an item tag, then that tag names the property
* if the (immediate) parent of C IS an item tag, then C's tag names the property (even while it might also name C's type)
ex:parentRelation (one per itemTag) overrides this default.  It specifies, for each item tag, 
the property whose value is items with that tag.  In other words, if I see that tag, 
I infer it is the value of that property of the ancestor item 

After items have been constructed, labelProperty specifies which property of an item should become the item's label
Note that this property might not be a direct tag; it might have bubbled up from some far descendant


*/

Exhibit.XMLImporter = { };
Exhibit.importers["application/xml"] = Exhibit.XMLImporter;

Exhibit.XMLImporter.getItems = function(xmlDoc, configuration) {
    var items=[];
    function maybeAdd(item, property, value) {
	if (item && property && property.length > 0 && value && value.length > 0) {
	    if (item[property]) {
		item[property].push(value);
	    }
	    else {
		item[property]=[value];
	    }
	}
    }
    function visit(node,parentItem,parentProperty) { 
	//gather data from node into parentItem 
	//associated by parentProperty
	var tag=node.tagName;
	var jQ=SimileAjax.jQuery(node);
	var children = jQ.children();
	var oldParentItem = parentItem;
	if (tag in configuration.itemType) {
	    //found a new item
	    var item={type: [configuration.itemType[tag]]};
	    items.push(item);
	    parentItem=item; //for incorporating attributes
	}
	if (children.length == 0) {
	    //no children; look for text
	    var property=configuration.propertyNames[tag] || tag;
	    maybeAdd(parentItem, property, jQ.text().trim());
	}
	else {
	    children.each(function() {
		visit(this,parentItem,tag);
	    });
	}
	//now process attributes
	var attrMap=node.attributes;
	if (attrMap) {
	    for (i=0; i<attrMap.length; i++) {
		var attr=attrMap[i].nodeName;
		maybeAdd(parentItem, 
			 configuration.propertyNames[attr] || attr, 
			 jQ.attr(attr));
	    }
	}
	if (tag in configuration.itemType) {
	    //try to infer a label
	    if (configuration.labelProperty[tag] != "label") {
		var label=item[configuration.labelProperty[tag]] || [];
		if (label.length > 0)
		    item.label = label[0];
	    }
	    //current node is a new item
	    parentProperty = configuration.parentRelation[tag] || parentProperty;
	    maybeAdd(oldParentItem,parentProperty,item.label);
	}
    }

    visit(xmlDoc,null,null);
    return items;
}	

Exhibit.XMLImporter.configure = function(link) {
    var configuration = {
	'labelProperty': [],
	'itemType': [],
	'parentRelation': [],
	'propertyNames': {}
    }


	// get itemTag, labelTag, itemType, and parentRelation
    var itemTag = Exhibit.getAttribute(link,'ex:itemTags',',') || ["item"];
    var labelProperty = Exhibit.getAttribute(link,'ex:labelProperties',',') || [];
    var itemType = Exhibit.getAttribute(link,'ex:itemTypes',',') || [];
    var parentRelation = Exhibit.getAttribute(link,'ex:parentRelations',',') || [];

    for (i=0; i<itemTag.length; i++) {
	var tag=itemTag[i];
	configuration.itemType[tag] = itemType[i] || tag;
	configuration.labelProperty[tag] = labelProperty[i] || "label";
	configuration.parentRelation[tag] = parentRelation[i] || tag;
    }

    var propertyNames = Exhibit.getAttribute(link,'ex:propertyNames',',') || [];
    var propertyTags = Exhibit.getAttribute(link,'ex:propertyTags',',') || [];
    for (i=0; i< propertyTags.length; i++) {
	configuration.propertyNames[propertyTags[i]] = (i < propertyNames.length) ? propertyNames[i] : propertyTags[i];
    }
	
    return configuration;
}

Exhibit.XMLImporter.parse = function(content, link, url) {
    var self = this;
    var configuration;

    try {
	configuration = Exhibit.XMLImporter.configure(link);
	url = Exhibit.Persistence.resolveURL(url);
    } catch(e) {
	SimileAjax.Debug.exception(e, "Error configuring XML importer for " + url);
	return;
    }

    try {
	var xmlDoc=SimileAjax.jQuery.parseXML(content);
	var o = Exhibit.XMLImporter.getItems(xmlDoc,configuration);
	return {items: o};
    } catch (e) {
        SimileAjax.Debug.exception(e, "Error parsing XML data from " + url);
	return null;
    }	
}