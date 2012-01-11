/*==================================================
 *  DOM Utility Functions
 *==================================================
 */

SimileAjax.DOM = new Object();

SimileAjax.DOM.registerEventWithObject = function(elmt, eventName, obj, handlerName) {
    SimileAjax.DOM.registerEvent(elmt, eventName, function(elmt2, evt, target) {
        return obj[handlerName].call(obj, elmt2, evt, target);
    });
};

SimileAjax.DOM.registerEvent = function(elmt, eventName, handler) {
    var handler2 = function(evt) {
        evt = (evt) ? evt : ((event) ? event : null);
        if (evt) {
            var target = (evt.target) ? 
                evt.target : ((evt.srcElement) ? evt.srcElement : null);
            if (target) {
                target = (target.nodeType == 1 || target.nodeType == 9) ? 
                    target : target.parentNode;
            }
            
            return handler(elmt, evt, target);
        }
        return true;
    }
    
    if (SimileAjax.Platform.browser.isIE) {
        elmt.attachEvent("on" + eventName, handler2);
    } else {
        elmt.addEventListener(eventName, handler2, false);
    }
};

SimileAjax.DOM.getPageCoordinates = function(elmt) {
    var left = 0;
    var top = 0;
    
    if (elmt.nodeType != 1) {
        elmt = elmt.parentNode;
    }
    
    var elmt2 = elmt;
    while (elmt2 != null) {
        left += elmt2.offsetLeft;
        top += elmt2.offsetTop;
        elmt2 = elmt2.offsetParent;
    }
    
    var body = document.body;
    while (elmt != null && elmt != body) {
        if ("scrollLeft" in elmt) {
            left -= elmt.scrollLeft;
            top -= elmt.scrollTop;
        }
        elmt = elmt.parentNode;
    }
    
    return { left: left, top: top };
};

SimileAjax.DOM.getSize = function(elmt) {
	var w = this.getStyle(elmt,"width");
	var h = this.getStyle(elmt,"height");
	if (w.indexOf("px") > -1) w = w.replace("px","");
	if (h.indexOf("px") > -1) h = h.replace("px","");
	return {
		w: w,
		h: h
	}
}

SimileAjax.DOM.getStyle = function(elmt, styleProp) {
    if (elmt.currentStyle) { // IE
        var style = elmt.currentStyle[styleProp];
    } else if (window.getComputedStyle) { // standard DOM
        var style = document.defaultView.getComputedStyle(elmt, null).getPropertyValue(styleProp);
    } else {
    	var style = "";
    }
    return style;
}

SimileAjax.DOM.getEventRelativeCoordinates = function(evt, elmt) {
    if (SimileAjax.Platform.browser.isIE) {
      if (evt.type == "mousewheel") {
        var coords = SimileAjax.DOM.getPageCoordinates(elmt);
        return {
          x: evt.clientX - coords.left, 
          y: evt.clientY - coords.top
        };        
      } else {
        return {
          x: evt.offsetX,
          y: evt.offsetY
        };
      }
    } else {
        var coords = SimileAjax.DOM.getPageCoordinates(elmt);

        if ((evt.type == "DOMMouseScroll") &&
          SimileAjax.Platform.browser.isFirefox &&
          (SimileAjax.Platform.browser.majorVersion == 2)) {
          // Due to: https://bugzilla.mozilla.org/show_bug.cgi?id=352179                  

          return {
            x: evt.screenX - coords.left,
            y: evt.screenY - coords.top 
          };
        } else {
          return {
              x: evt.pageX - coords.left,
              y: evt.pageY - coords.top
          };
        }
    }
};

SimileAjax.DOM.getEventPageCoordinates = function(evt) {
    if (SimileAjax.Platform.browser.isIE) {

        var scrOfY = 0;
        var scrOfX = 0;

        if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
            //DOM compliant
            scrOfY = document.body.scrollTop;
            scrOfX = document.body.scrollLeft;
        } else if (document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
            //IE6 standards compliant mode
            scrOfY = document.documentElement.scrollTop;
            scrOfX = document.documentElement.scrollLeft;
        }

        return { x: evt.clientX + scrOfX, y: evt.clientY + scrOfY }; 
    } else {
        return {
            x: evt.pageX,
            y: evt.pageY
        };
    }
};

SimileAjax.DOM.hittest = function(x, y, except) {
    return SimileAjax.DOM._hittest(document.body, x, y, except);
};

SimileAjax.DOM._hittest = function(elmt, x, y, except) {
    var childNodes = elmt.childNodes;
    outer: for (var i = 0; i < childNodes.length; i++) {
        var childNode = childNodes[i];
        for (var j = 0; j < except.length; j++) {
            if (childNode == except[j]) {
                continue outer;
            }
        }
        
        if (childNode.offsetWidth == 0 && childNode.offsetHeight == 0) {
            /*
             *  Sometimes SPAN elements have zero width and height but
             *  they have children like DIVs that cover non-zero areas.
             */
            var hitNode = SimileAjax.DOM._hittest(childNode, x, y, except);
            if (hitNode != childNode) {
                return hitNode;
            }
        } else {
            var top = 0;
            var left = 0;
            
            var node = childNode;
            while (node) {
                top += node.offsetTop;
                left += node.offsetLeft;
                node = node.offsetParent;
            }
            
            if (left <= x && top <= y && (x - left) < childNode.offsetWidth && (y - top) < childNode.offsetHeight) {
                return SimileAjax.DOM._hittest(childNode, x, y, except);
            } else if (childNode.nodeType == 1 && childNode.tagName == "TR") {
                /*
                 *  Table row might have cells that span several rows.
                 */
                var childNode2 = SimileAjax.DOM._hittest(childNode, x, y, except);
                if (childNode2 != childNode) {
                    return childNode2;
                }
            }
        }
    }
    return elmt;
};

SimileAjax.DOM.cancelEvent = function(evt) {
    evt.returnValue = false;
    evt.cancelBubble = true;
    if ("preventDefault" in evt) {
        evt.preventDefault();
    }
};

SimileAjax.DOM.appendClassName = function(elmt, className) {
    var classes = elmt.className.split(" ");
    for (var i = 0; i < classes.length; i++) {
        if (classes[i] == className) {
            return;
        }
    }
    classes.push(className);
    elmt.className = classes.join(" ");
};

SimileAjax.DOM.createInputElement = function(type) {
    var div = document.createElement("div");
    div.innerHTML = "<input type='" + type + "' />";
    
    return div.firstChild;
};

SimileAjax.DOM.createDOMFromTemplate = function(template) {
    var result = {};
    result.elmt = SimileAjax.DOM._createDOMFromTemplate(template, result, null);
    
    return result;
};

SimileAjax.DOM._createDOMFromTemplate = function(templateNode, result, parentElmt) {
    if (templateNode == null) {
        /*
        var node = doc.createTextNode("--null--");
        if (parentElmt != null) {
            parentElmt.appendChild(node);
        }
        return node;
        */
        return null;
    } else if (typeof templateNode != "object") {
        var node = document.createTextNode(templateNode);
        if (parentElmt != null) {
            parentElmt.appendChild(node);
        }
        return node;
    } else {
        var elmt = null;
        if ("tag" in templateNode) {
            var tag = templateNode.tag;
            if (parentElmt != null) {
                if (tag == "tr") {
                    elmt = parentElmt.insertRow(parentElmt.rows.length);
                } else if (tag == "td") {
                    elmt = parentElmt.insertCell(parentElmt.cells.length);
                }
            }
            if (elmt == null) {
                elmt = tag == "input" ?
                    SimileAjax.DOM.createInputElement(templateNode.type) :
                    document.createElement(tag);
                    
                if (parentElmt != null) {
                    parentElmt.appendChild(elmt);
                }
            }
        } else {
            elmt = templateNode.elmt;
            if (parentElmt != null) {
                parentElmt.appendChild(elmt);
            }
        }
        
        for (var attribute in templateNode) {
            var value = templateNode[attribute];
            
            if (attribute == "field") {
                result[value] = elmt;
                
            } else if (attribute == "className") {
                elmt.className = value;
            } else if (attribute == "id") {
                elmt.id = value;
            } else if (attribute == "title") {
                elmt.title = value;
            } else if (attribute == "type" && elmt.tagName == "input") {
                // do nothing
            } else if (attribute == "style") {
                for (n in value) {
                    var v = value[n];
                    if (n == "float") {
                        n = SimileAjax.Platform.browser.isIE ? "styleFloat" : "cssFloat";
                    }
                    elmt.style[n] = v;
                }
            } else if (attribute == "children") {
                for (var i = 0; i < value.length; i++) {
                    SimileAjax.DOM._createDOMFromTemplate(value[i], result, elmt);
                }
            } else if (attribute != "tag" && attribute != "elmt") {
                elmt.setAttribute(attribute, value);
            }
        }
        return elmt;
    }
}

SimileAjax.DOM._cachedParent = null;
SimileAjax.DOM.createElementFromString = function(s) {
    if (SimileAjax.DOM._cachedParent == null) {
        SimileAjax.DOM._cachedParent = document.createElement("div");
    }
    SimileAjax.DOM._cachedParent.innerHTML = s;
    return SimileAjax.DOM._cachedParent.firstChild;
};

SimileAjax.DOM.createDOMFromString = function(root, s, fieldElmts) {
    var elmt = typeof root == "string" ? document.createElement(root) : root;
    elmt.innerHTML = s;
    
    var dom = { elmt: elmt };
    SimileAjax.DOM._processDOMChildrenConstructedFromString(dom, elmt, fieldElmts != null ? fieldElmts : {} );
    
    return dom;
};

SimileAjax.DOM._processDOMConstructedFromString = function(dom, elmt, fieldElmts) {
    var id = elmt.id;
    if (id != null && id.length > 0) {
        elmt.removeAttribute("id");
        if (id in fieldElmts) {
            var parentElmt = elmt.parentNode;
            parentElmt.insertBefore(fieldElmts[id], elmt);
            parentElmt.removeChild(elmt);
            
            dom[id] = fieldElmts[id];
            return;
        } else {
            dom[id] = elmt;
        }
    }
    
    if (elmt.hasChildNodes()) {
        SimileAjax.DOM._processDOMChildrenConstructedFromString(dom, elmt, fieldElmts);
    }
};

SimileAjax.DOM._processDOMChildrenConstructedFromString = function(dom, elmt, fieldElmts) {
    var node = elmt.firstChild;
    while (node != null) {
        var node2 = node.nextSibling;
        if (node.nodeType == 1) {
            SimileAjax.DOM._processDOMConstructedFromString(dom, node, fieldElmts);
        }
        node = node2;
    }
};
