/*======================================================================
 *  Exhibit UI Utilities
 *======================================================================
 */
Exhibit.UI = new Object();

/*----------------------------------------------------------------------
 *  Component instantiation functions
 *----------------------------------------------------------------------
 */
 
Exhibit.UI.componentMap = {};

Exhibit.UI.registerComponent = function(name, comp) {
    var msg = "Cannot register component " + name + " -- ";
    if (name in Exhibit.UI.componentMap) {
        SimileAjax.Debug.warn(msg + 'another component has taken that name');
    } else if (!comp) {
        SimileAjax.Debug.warn(msg + 'no component object provided')
    } else if (!comp.create) {
        SimileAjax.Debug.warn(msg + "component has no create function");
    } else if (!comp.createFromDOM) {
        SimileAjax.Debug.warn(msg + "component has no createFromDOM function");
    } else {
        Exhibit.UI.componentMap[name] = comp;
    }
};

Exhibit.UI.create = function(configuration, elmt, uiContext) {
    if ("role" in configuration) {
        var role = configuration.role;
        if (role != null && role.startsWith("exhibit-")) {
            role = role.substr("exhibit-".length);
        }
        
        if (role in Exhibit.UI.componentMap) {
            var createFunc = Exhibit.UI.componentMap[role].create;
            return createFunc(configuration, elmt, uiContext);
        }
        
        switch (role) {
        case "lens":
        case "edit-lens":
            Exhibit.UIContext.registerLens(configuration, uiContext.getLensRegistry());
            return null;
        case "view":
            return Exhibit.UI.createView(configuration, elmt, uiContext);
        case "facet":
            return Exhibit.UI.createFacet(configuration, elmt, uiContext);
        case "coordinator":
            return Exhibit.UI.createCoordinator(configuration, uiContext);
        case "coder":
            return Exhibit.UI.createCoder(configuration, uiContext);
        case "viewPanel":
            return Exhibit.ViewPanel.create(configuration, elmt, uiContext);
        case "logo":
            return Exhibit.Logo.create(configuration, elmt, uiContext);
        case "hiddenContent":
            elmt.style.display = "none";
            return null;
        }
    }
    return null;
};

Exhibit.UI.createFromDOM = function(elmt, uiContext) {
    var role = Exhibit.getRoleAttribute(elmt);
    
    if (role in Exhibit.UI.componentMap) {
        var createFromDOMFunc = Exhibit.UI.componentMap[role].createFromDOM;
        return createFromDOMFunc(elmt, uiContext);
    }
    
    switch (role) {
    case "lens":
    case "edit-lens":
        Exhibit.UIContext.registerLensFromDOM(elmt, uiContext.getLensRegistry());
        return null;
    case "view":
        return Exhibit.UI.createViewFromDOM(elmt, null, uiContext);
    case "facet":
        return Exhibit.UI.createFacetFromDOM(elmt, null, uiContext);
    case "coordinator":
        return Exhibit.UI.createCoordinatorFromDOM(elmt, uiContext);
    case "coder":
        return Exhibit.UI.createCoderFromDOM(elmt, uiContext);
    case "viewPanel":
        return Exhibit.ViewPanel.createFromDOM(elmt, uiContext);
    case "logo":
        return Exhibit.Logo.createFromDOM(elmt, uiContext);
    case "hiddenContent":
        elmt.style.display = "none";
        return null;
    }
    return null;
};


Exhibit.UI.generateCreationMethods = function(constructor) {
    constructor.create = function(configuration, elmt, uiContext) {
        var newContext = Exhibit.UIContext.create(configuration, uiContext);
        var settings = {};
        
        Exhibit.SettingsUtilities.collectSettings(
            configuration, 
            constructor._settingSpecs || {}, 
            settings);
            
        return new constructor(elmt, newContext, settings);
    };
    constructor.createFromDOM = function(elmt, uiContext) {
        var newContext = Exhibit.UIContext.createFromDOM(elmt, uiContext);
        var settings = {};
        
        Exhibit.SettingsUtilities.collectSettingsFromDOM(
            elmt, 
            constructor._settingSpecs || {},
            settings);
        
        return new constructor(elmt, newContext, settings);
    };
};

Exhibit.UI.createView = function(configuration, elmt, uiContext) {
    var viewClass = "viewClass" in configuration ? configuration.viewClass : Exhibit.TileView;
    if (typeof viewClass == "string") {
        viewClass = Exhibit.UI.viewClassNameToViewClass(viewClass);
    }
    return viewClass.create(configuration, elmt, uiContext);
};

Exhibit.UI.createViewFromDOM = function(elmt, container, uiContext) {
    var viewClass = Exhibit.UI.viewClassNameToViewClass(Exhibit.getAttribute(elmt, "viewClass"));
    return viewClass.createFromDOM(elmt, container, uiContext);
};

Exhibit.UI.viewClassNameToViewClass = function(name) {
    if (name != null && name.length > 0) {
        try {
            return Exhibit.UI._stringToObject(name, "View");
        } catch (e) {
            SimileAjax.Debug.warn("Unknown viewClass " + name);
        }
    }
    return Exhibit.TileView;
};

Exhibit.UI.createFacet = function(configuration, elmt, uiContext) {
    var facetClass = "facetClass" in configuration ? configuration.facetClass : Exhibit.ListFacet;
    if (typeof facetClass == "string") {
        facetClass = Exhibit.UI.facetClassNameToFacetClass(facetClass);
    }
    return facetClass.create(configuration, elmt, uiContext);
};

Exhibit.UI.createFacetFromDOM = function(elmt, container, uiContext) {
    var facetClass = Exhibit.UI.facetClassNameToFacetClass(Exhibit.getAttribute(elmt, "facetClass"));
    return facetClass.createFromDOM(elmt, container, uiContext);
};

Exhibit.UI.facetClassNameToFacetClass = function(name) {
    if (name != null && name.length > 0) {
        try {
            return Exhibit.UI._stringToObject(name, "Facet");
        } catch (e) {
            SimileAjax.Debug.warn("Unknown facetClass " + name);
        }
    }
    return Exhibit.ListFacet;
};


Exhibit.UI.createCoder = function(configuration, uiContext) {
    var coderClass = "coderClass" in configuration ? configuration.coderClass : Exhibit.ColorCoder;
    if (typeof coderClass == "string") {
        coderClass = Exhibit.UI.coderClassNameToCoderClass(coderClass);
    }
    return coderClass.create(configuration, uiContext);
};

Exhibit.UI.createCoderFromDOM = function(elmt, uiContext) {
    var coderClass = Exhibit.UI.coderClassNameToCoderClass(Exhibit.getAttribute(elmt, "coderClass"));
    return coderClass.createFromDOM(elmt, uiContext);
};

Exhibit.UI.coderClassNameToCoderClass = function(name) {
    if (name != null && name.length > 0) {
        try {
            return Exhibit.UI._stringToObject(name, "Coder");
        } catch (e) {
            SimileAjax.Debug.warn("Unknown coderClass " + name);
        }
    }
    return Exhibit.ColorCoder;
};


Exhibit.UI.createCoordinator = function(configuration, uiContext) {
    return Exhibit.Coordinator.create(configuration, uiContext);
};

Exhibit.UI.createCoordinatorFromDOM = function(elmt, uiContext) {
    return Exhibit.Coordinator.createFromDOM(elmt, uiContext);
};

Exhibit.UI._stringToObject = function(name, suffix) {
    if (!name.startsWith("Exhibit.")) {
        if (!name.endsWith(suffix)) {
            try {
                return eval("Exhibit." + name + suffix);
            } catch (e) {
                // ignore
            }
        }
        
        try {
            return eval("Exhibit." + name);
        } catch (e) {
            // ignore
        }
    }
    
    if (!name.endsWith(suffix)) {
        try {
            return eval(name + suffix);
        } catch (e) {
            // ignore
        }
    }
    
    try {
        return eval(name);
    } catch (e) {
        // ignore
    }
    
    throw new Error("Unknown class " + name);
};

/*----------------------------------------------------------------------
 *  Help and Debugging
 *----------------------------------------------------------------------
 */
Exhibit.UI.docRoot = "http://service.simile-widgets.org/wiki/";
Exhibit.UI.validator = "http://service.simile-widgets.org/babel/validator";

Exhibit.UI.showHelp = function(message, url, target) {
    target = (target) ? target : "_blank";
    if (url != null) {
        if (window.confirm(message + "\n\n" + Exhibit.l10n.showDocumentationMessage)) {
            window.open(url, target);
        }
    } else {
        window.alert(message);
    }
};

Exhibit.UI.showJavascriptExpressionValidation = function(message, expression) {
    var target = "_blank";
    if (window.confirm(message + "\n\n" + Exhibit.l10n.showJavascriptValidationMessage)) {
        window.open(Exhibit.UI.validator + "?expresson=" + encodeURIComponent(expression), target);
    }
};

Exhibit.UI.showJsonFileValidation = function(message, url) {
    var target = "_blank";
    if (url.indexOf("file:") == 0) {
        if (window.confirm(message + "\n\n" + Exhibit.l10n.showJsonValidationFormMessage)) {
            window.open(Exhibit.UI.validator, target);
        }
    } else {
        if (window.confirm(message + "\n\n" + Exhibit.l10n.showJsonValidationMessage)) {
            window.open(Exhibit.UI.validator + "?url=" + url, target);
        }
    }
};

/*----------------------------------------------------------------------
 *  Status Indication and Feedback
 *----------------------------------------------------------------------
 */
Exhibit.UI._busyIndicator = null;
Exhibit.UI._busyIndicatorCount = 0;

Exhibit.UI.showBusyIndicator = function() {
    Exhibit.UI._busyIndicatorCount++;
    if (Exhibit.UI._busyIndicatorCount > 1) {
        return;
    }
    
    if (Exhibit.UI._busyIndicator == null) {
        Exhibit.UI._busyIndicator = Exhibit.UI.createBusyIndicator();
    }
    
    var scrollTop = ("scrollTop" in document.body) ?
        document.body.scrollTop :
        document.body.parentNode.scrollTop;
    var height = ("innerHeight" in window) ?
        window.innerHeight :
        ("clientHeight" in document.body ?
            document.body.clientHeight :
            document.body.parentNode.clientHeight);
        
    var top = Math.floor(scrollTop + height / 3);
    
    Exhibit.UI._busyIndicator.style.top = top + "px";
    document.body.appendChild(Exhibit.UI._busyIndicator);
};

Exhibit.UI.hideBusyIndicator = function() {
    Exhibit.UI._busyIndicatorCount--;
    if (Exhibit.UI._busyIndicatorCount > 0) {
        return;
    }
    
    try {
        document.body.removeChild(Exhibit.UI._busyIndicator);
    } catch(e) {
        // silent
    }
};

/*----------------------------------------------------------------------
 *  Common UI Generation
 *----------------------------------------------------------------------
 */
Exhibit.UI.protectUI = function(elmt) {
    SimileAjax.DOM.appendClassName(elmt, "exhibit-ui-protection");
};

Exhibit.UI.makeActionLink = function(text, handler, layer) {
    var a = document.createElement("a");
    a.href = "javascript:";
    a.className = "exhibit-action";
    a.innerHTML = text;
    
    var handler2 = function(elmt, evt, target) {
        if ("true" != elmt.getAttribute("disabled")) {
            handler(elmt, evt, target);
        }
    }
    SimileAjax.WindowManager.registerEvent(a, "click", handler2, layer);
    
    return a;
};

Exhibit.UI.enableActionLink = function(a, enabled) {
    a.setAttribute("disabled", enabled ? "false" : "true");
    a.className = enabled ? "exhibit-action" : "exhibit-action-disabled";
};

Exhibit.UI.makeItemSpan = function(itemID, label, uiContext, layer) {
    if (label == null) {
        label = database.getObject(itemID, "label");
        if (label == null) {
            label = itemID;
        }
    }
    
    var a = SimileAjax.DOM.createElementFromString(
        "<a href=\"" + Exhibit.Persistence.getItemLink(itemID) + "\" class='exhibit-item'>" + label + "</a>");
        
    var handler = function(elmt, evt, target) {
        Exhibit.UI.showItemInPopup(itemID, elmt, uiContext);
    }
    SimileAjax.WindowManager.registerEvent(a, "click", handler, layer);
    
    return a;
};

Exhibit.UI.makeValueSpan = function(label, valueType, layer) {
    var span = document.createElement("span");
    span.className = "exhibit-value";
    if (valueType == "url") {
        var url = label;
        if (Exhibit.params.safe && url.trim().startsWith("javascript:")) {
            span.appendChild(document.createTextNode(url));
        } else {
            span.innerHTML = 
                "<a href=\"" + url + "\" target='_blank'>" +
                    (label.length > 50 ? 
                        label.substr(0, 20) + " ... " + label.substr(label.length - 20) :
                        label) +
                "</a>";
        }
    } else {
        if (Exhibit.params.safe) {
            label = Exhibit.Formatter.encodeAngleBrackets(label);
        }
        span.innerHTML = label;
    }
    return span;
};

Exhibit.UI.calculatePopupPosition = function(elmt) {
    var coords = SimileAjax.DOM.getPageCoordinates(elmt);
    return {
        x: coords.left + Math.round(elmt.offsetWidth / 2),
        y: coords.top + Math.round(elmt.offsetHeight / 2)
    };
}

Exhibit.UI.showItemInPopup = function(itemID, elmt, uiContext, opts) {
    SimileAjax.WindowManager.popAllLayers();
    
    opts = opts || {};
    opts.coords = opts.coords || Exhibit.UI.calculatePopupPosition(elmt);
    
    var itemLensDiv = document.createElement("div");

    var lensOpts = {
        inPopup: true,
        coords: opts.coords
    };

    if (opts.lensType == 'normal') {
        lensOpts.lensTemplate = uiContext.getLensRegistry().getNormalLens(itemID, uiContext);
    } else if (opts.lensType == 'edit') {
        lensOpts.lensTemplate = uiContext.getLensRegistry().getEditLens(itemID, uiContext);
    } else if (opts.lensType) {
        SimileAjax.Debug.warn('Unknown Exhibit.UI.showItemInPopup opts.lensType: ' + opts.lensType);
    }

    uiContext.getLensRegistry().createLens(itemID, itemLensDiv, uiContext, lensOpts);
    
    SimileAjax.Graphics.createBubbleForContentAndPoint(
        itemLensDiv, 
        opts.coords.x,
        opts.coords.y, 
        uiContext.getSetting("bubbleWidth")
    );
};

Exhibit.UI.createButton = function(name, handler, className) {
    var button = document.createElement("button");
    button.className = (className || "exhibit-button") + " screen";
    button.innerHTML = name;
    if (handler) {
        SimileAjax.WindowManager.registerEvent(button, "click", handler);
    }
    return button;
};

Exhibit.UI.createPopupMenuDom = function(element) {
    var div = document.createElement("div");
    div.className = "exhibit-menu-popup exhibit-ui-protection";
    
    var dom = {
        elmt: div,
        close: function() {
            document.body.removeChild(this.elmt);
        },
        open: function() {
            var self = this;
            this.layer = SimileAjax.WindowManager.pushLayer(function() { self.close(); }, true, div);
                
            var docWidth = document.body.offsetWidth;
            var docHeight = document.body.offsetHeight;
        
            var coords = SimileAjax.DOM.getPageCoordinates(element);
            div.style.top = (coords.top + element.scrollHeight) + "px";
            div.style.right = (docWidth - (coords.left + element.scrollWidth)) + "px";
        
            document.body.appendChild(this.elmt);
        },
        appendMenuItem: function(label, icon, onClick) {
            var self = this;
            var a = document.createElement("a");
            a.className = "exhibit-menu-item";
            a.href = "javascript:";
            SimileAjax.WindowManager.registerEvent(a, "click", function(elmt, evt, target) {
                onClick(elmt, evt, target);
                SimileAjax.WindowManager.popLayer(self.layer);
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            });
            
            var div = document.createElement("div");
            a.appendChild(div);
    
            div.appendChild(SimileAjax.Graphics.createTranslucentImage(
                icon != null ? icon : (Exhibit.urlPrefix + "images/blank-16x16.png")));
                
            div.appendChild(document.createTextNode(label));
            
            this.elmt.appendChild(a);
        },
        appendSeparator: function() {
            var hr = document.createElement("hr");
            this.elmt.appendChild(hr);
        }
    };
    return dom;
};

Exhibit.UI.createBusyIndicator = function() {

    var existing=SimileAjax.jQuery(".exhibit-busyIndicator");
    if (existing.length > 0) {
	var node= existing.eq(0);
	node.detach();
	node.show(); //in case author hid it
	return node.get(0);
    }

    var urlPrefix = Exhibit.urlPrefix + "images/";
    var containerDiv = document.createElement("div");
    if (SimileAjax.Graphics.pngIsTranslucent) {
        
        var topDiv = document.createElement("div");
        topDiv.style.height = "33px";
        topDiv.style.background = "url(" + urlPrefix + "message-bubble/message-top-left.png) top left no-repeat";
        topDiv.style.paddingLeft = "44px";
        containerDiv.appendChild(topDiv);
        
        var topRightDiv = document.createElement("div");
        topRightDiv.style.height = "33px";
        topRightDiv.style.background = "url(" + urlPrefix + "message-bubble/message-top-right.png) top right no-repeat";
        topDiv.appendChild(topRightDiv);
        
        var middleDiv = document.createElement("div");
        middleDiv.style.background = "url(" + urlPrefix + "message-bubble/message-left.png) top left repeat-y";
        middleDiv.style.paddingLeft = "44px";
        containerDiv.appendChild(middleDiv);
        
        var middleRightDiv = document.createElement("div");
        middleRightDiv.style.background = "url(" + urlPrefix + "message-bubble/message-right.png) top right repeat-y";
        middleRightDiv.style.paddingRight = "44px";
        middleDiv.appendChild(middleRightDiv);
        
        var contentDiv = document.createElement("div");
        middleRightDiv.appendChild(contentDiv);
        
        var bottomDiv = document.createElement("div");
        bottomDiv.style.height = "55px";
        bottomDiv.style.background = "url(" + urlPrefix + "message-bubble/message-bottom-left.png) bottom left no-repeat";
        bottomDiv.style.paddingLeft = "44px";
        containerDiv.appendChild(bottomDiv);
        
        var bottomRightDiv = document.createElement("div");
        bottomRightDiv.style.height = "55px";
        bottomRightDiv.style.background = "url(" + urlPrefix + "message-bubble/message-bottom-right.png) bottom right no-repeat";
        bottomDiv.appendChild(bottomRightDiv);
    } else {
        containerDiv.style.border = "2px solid #7777AA";
        containerDiv.style.padding = "20px";
        containerDiv.style.background = "white";
        SimileAjax.Graphics.setOpacity(containerDiv, 90);
        
        var contentDiv = document.createElement("div");
        containerDiv.appendChild(contentDiv);
    }
    
    containerDiv.className = "exhibit-busyIndicator";
    contentDiv.className = "exhibit-busyIndicator-content";
    
    var img = document.createElement("img");
    img.src = urlPrefix + "progress-running.gif";
    contentDiv.appendChild(img);
    contentDiv.appendChild(document.createTextNode(" " + Exhibit.l10n.busyIndicatorMessage));
    
    return containerDiv;
};

Exhibit.UI.createFocusDialogBox = function(itemID, exhibit, configuration) {
    var template = {
        tag:        "div",
        className:  "exhibit-focusDialog exhibit-ui-protection",
        children: [
            {   tag:        "div",
                className:  "exhibit-focusDialog-viewContainer",
                field:      "viewContainer"
            },
            {   tag:        "div",
                className:  "exhibit-focusDialog-controls",
                children: [
                    {   tag:        "button",
                        field:      "closeButton",
                        children:    [ Exhibit.l10n.focusDialogBoxCloseButtonLabel ]
                    }
                ]
            }
        ]
    };
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    dom.close = function() {
        document.body.removeChild(dom.elmt);
    };
    dom.open = function() {
        dom.layer = SimileAjax.WindowManager.pushLayer(function() { dom.close(); }, false);
        var lens = new Exhibit.Lens(itemID, dom.viewContainer, exhibit, configuration);
        
        dom.elmt.style.top = (document.body.scrollTop + 100) + "px";
        document.body.appendChild(dom.elmt);
        
        SimileAjax.WindowManager.registerEvent(
            dom.closeButton, 
            "click", 
            function(elmt, evt, target) {
                SimileAjax.WindowManager.popLayer(dom.layer);
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            }, 
            dom.layer
        );
    };
    
    return dom;
};

Exhibit.UI.createTranslucentImage = function(relativeUrl, verticalAlign) {
    return SimileAjax.Graphics.createTranslucentImage(Exhibit.urlPrefix + relativeUrl, verticalAlign);
};
Exhibit.UI.createTranslucentImageHTML = function(relativeUrl, verticalAlign) {
    return SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + relativeUrl, verticalAlign);
};

// jQuery can't search for attributes with colons in them
Exhibit.UI.findAttribute = function(attr, value, parent) {
    var parent = SimileAjax.jQuery(parent || document.body);
    var f = function( ) {
        var v = this.getAttribute(attr);
        if (value === undefined) {
            return !!v;
        } else if (value instanceof Array) {
            return value.indexOf(v) != -1;
        } else {
            return value.toString() == v;
        }
    }
    return parent.find('*').add(parent).filter(f);
}