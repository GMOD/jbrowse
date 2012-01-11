/**
 * @fileOverview UI layers and window-wide dragging
 * @name SimileAjax.WindowManager
 */

/**
 *  This is a singleton that keeps track of UI layers (modal and 
 *  modeless) and enables/disables UI elements based on which layers
 *  they belong to. It also provides window-wide dragging 
 *  implementation.
 */ 
SimileAjax.WindowManager = {
    _initialized:       false,
    _listeners:         [],
    
    _draggedElement:                null,
    _draggedElementCallback:        null,
    _dropTargetHighlightElement:    null,
    _lastCoords:                    null,
    _ghostCoords:                   null,
    _draggingMode:                  "",
    _dragging:                      false,
    
    _layers:            []
};

SimileAjax.WindowManager.initialize = function() {
    if (SimileAjax.WindowManager._initialized) {
        return;
    }
    
    SimileAjax.DOM.registerEvent(document.body, "mousedown", SimileAjax.WindowManager._onBodyMouseDown);
    SimileAjax.DOM.registerEvent(document.body, "mousemove", SimileAjax.WindowManager._onBodyMouseMove);
    SimileAjax.DOM.registerEvent(document.body, "mouseup",   SimileAjax.WindowManager._onBodyMouseUp);
    SimileAjax.DOM.registerEvent(document, "keydown",       SimileAjax.WindowManager._onBodyKeyDown);
    SimileAjax.DOM.registerEvent(document, "keyup",         SimileAjax.WindowManager._onBodyKeyUp);
    
    SimileAjax.WindowManager._layers.push({index: 0});
    
    SimileAjax.WindowManager._historyListener = {
        onBeforeUndoSeveral:    function() {},
        onAfterUndoSeveral:     function() {},
        onBeforeUndo:           function() {},
        onAfterUndo:            function() {},
        
        onBeforeRedoSeveral:    function() {},
        onAfterRedoSeveral:     function() {},
        onBeforeRedo:           function() {},
        onAfterRedo:            function() {}
    };
    SimileAjax.History.addListener(SimileAjax.WindowManager._historyListener);
    
    SimileAjax.WindowManager._initialized = true;
};

SimileAjax.WindowManager.getBaseLayer = function() {
    SimileAjax.WindowManager.initialize();
    return SimileAjax.WindowManager._layers[0];
};

SimileAjax.WindowManager.getHighestLayer = function() {
    SimileAjax.WindowManager.initialize();
    return SimileAjax.WindowManager._layers[SimileAjax.WindowManager._layers.length - 1];
};

SimileAjax.WindowManager.registerEventWithObject = function(elmt, eventName, obj, handlerName, layer) {
    SimileAjax.WindowManager.registerEvent(
        elmt, 
        eventName, 
        function(elmt2, evt, target) {
            return obj[handlerName].call(obj, elmt2, evt, target);
        },
        layer
    );
};

SimileAjax.WindowManager.registerEvent = function(elmt, eventName, handler, layer) {
    if (layer == null) {
        layer = SimileAjax.WindowManager.getHighestLayer();
    }
    
    var handler2 = function(elmt, evt, target) {
        if (SimileAjax.WindowManager._canProcessEventAtLayer(layer)) {
            SimileAjax.WindowManager._popToLayer(layer.index);
            try {
                handler(elmt, evt, target);
            } catch (e) {
                SimileAjax.Debug.exception(e);
            }
        }
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    }
    
    SimileAjax.DOM.registerEvent(elmt, eventName, handler2);
};

SimileAjax.WindowManager.pushLayer = function(f, ephemeral, elmt) {
    var layer = { onPop: f, index: SimileAjax.WindowManager._layers.length, ephemeral: (ephemeral), elmt: elmt };
    SimileAjax.WindowManager._layers.push(layer);
    
    return layer;
};

SimileAjax.WindowManager.popLayer = function(layer) {
    for (var i = 1; i < SimileAjax.WindowManager._layers.length; i++) {
        if (SimileAjax.WindowManager._layers[i] == layer) {
            SimileAjax.WindowManager._popToLayer(i - 1);
            break;
        }
    }
};

SimileAjax.WindowManager.popAllLayers = function() {
    SimileAjax.WindowManager._popToLayer(0);
};

SimileAjax.WindowManager.registerForDragging = function(elmt, callback, layer) {
    SimileAjax.WindowManager.registerEvent(
        elmt, 
        "mousedown", 
        function(elmt, evt, target) {
            SimileAjax.WindowManager._handleMouseDown(elmt, evt, callback);
        }, 
        layer
    );
};

SimileAjax.WindowManager._popToLayer = function(level) {
    while (level+1 < SimileAjax.WindowManager._layers.length) {
        try {
            var layer = SimileAjax.WindowManager._layers.pop();
            if (layer.onPop != null) {
                layer.onPop();
            }
        } catch (e) {
        }
    }
};

SimileAjax.WindowManager._canProcessEventAtLayer = function(layer) {
    if (layer.index == (SimileAjax.WindowManager._layers.length - 1)) {
        return true;
    }
    for (var i = layer.index + 1; i < SimileAjax.WindowManager._layers.length; i++) {
        if (!SimileAjax.WindowManager._layers[i].ephemeral) {
            return false;
        }
    }
    return true;
};

SimileAjax.WindowManager.cancelPopups = function(evt) {
    var evtCoords = (evt) ? SimileAjax.DOM.getEventPageCoordinates(evt) : { x: -1, y: -1 };
    
    var i = SimileAjax.WindowManager._layers.length - 1;
    while (i > 0 && SimileAjax.WindowManager._layers[i].ephemeral) {
        var layer = SimileAjax.WindowManager._layers[i];
        if (layer.elmt != null) { // if event falls within main element of layer then don't cancel
            var elmt = layer.elmt;
            var elmtCoords = SimileAjax.DOM.getPageCoordinates(elmt);
            if (evtCoords.x >= elmtCoords.left && evtCoords.x < (elmtCoords.left + elmt.offsetWidth) &&
                evtCoords.y >= elmtCoords.top && evtCoords.y < (elmtCoords.top + elmt.offsetHeight)) {
                break;
            }
        }
        i--;
    }
    SimileAjax.WindowManager._popToLayer(i);
};

SimileAjax.WindowManager._onBodyMouseDown = function(elmt, evt, target) {
    if (!("eventPhase" in evt) || evt.eventPhase == evt.BUBBLING_PHASE) {
        SimileAjax.WindowManager.cancelPopups(evt);
    }
};

SimileAjax.WindowManager._handleMouseDown = function(elmt, evt, callback) {
    SimileAjax.WindowManager._draggedElement = elmt;
    SimileAjax.WindowManager._draggedElementCallback = callback;
    SimileAjax.WindowManager._lastCoords = { x: evt.clientX, y: evt.clientY };
        
    SimileAjax.DOM.cancelEvent(evt);
    return false;
};

SimileAjax.WindowManager._onBodyKeyDown = function(elmt, evt, target) {
    if (SimileAjax.WindowManager._dragging) {
        if (evt.keyCode == 27) { // esc
            SimileAjax.WindowManager._cancelDragging();
        } else if ((evt.keyCode == 17 || evt.keyCode == 16) && SimileAjax.WindowManager._draggingMode != "copy") {
            SimileAjax.WindowManager._draggingMode = "copy";
            
            var img = SimileAjax.Graphics.createTranslucentImage(SimileAjax.urlPrefix + "images/copy.png");
            img.style.position = "absolute";
            img.style.left = (SimileAjax.WindowManager._ghostCoords.left - 16) + "px";
            img.style.top = (SimileAjax.WindowManager._ghostCoords.top) + "px";
            document.body.appendChild(img);
            
            SimileAjax.WindowManager._draggingModeIndicatorElmt = img;
        }
    }
};

SimileAjax.WindowManager._onBodyKeyUp = function(elmt, evt, target) {
    if (SimileAjax.WindowManager._dragging) {
        if (evt.keyCode == 17 || evt.keyCode == 16) {
            SimileAjax.WindowManager._draggingMode = "";
            if (SimileAjax.WindowManager._draggingModeIndicatorElmt != null) {
                document.body.removeChild(SimileAjax.WindowManager._draggingModeIndicatorElmt);
                SimileAjax.WindowManager._draggingModeIndicatorElmt = null;
            }
        }
    }
};

SimileAjax.WindowManager._onBodyMouseMove = function(elmt, evt, target) {
    if (SimileAjax.WindowManager._draggedElement != null) {
        var callback = SimileAjax.WindowManager._draggedElementCallback;
        
        var lastCoords = SimileAjax.WindowManager._lastCoords;
        var diffX = evt.clientX - lastCoords.x;
        var diffY = evt.clientY - lastCoords.y;
        
        if (!SimileAjax.WindowManager._dragging) {
            if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
                try {
                    if ("onDragStart" in callback) {
                        callback.onDragStart();
                    }
                    
                    if ("ghost" in callback && callback.ghost) {
                        var draggedElmt = SimileAjax.WindowManager._draggedElement;
                        
                        SimileAjax.WindowManager._ghostCoords = SimileAjax.DOM.getPageCoordinates(draggedElmt);
                        SimileAjax.WindowManager._ghostCoords.left += diffX;
                        SimileAjax.WindowManager._ghostCoords.top += diffY;
                        
                        var ghostElmt = draggedElmt.cloneNode(true);
                        ghostElmt.style.position = "absolute";
                        ghostElmt.style.left = SimileAjax.WindowManager._ghostCoords.left + "px";
                        ghostElmt.style.top = SimileAjax.WindowManager._ghostCoords.top + "px";
                        ghostElmt.style.zIndex = 1000;
                        SimileAjax.Graphics.setOpacity(ghostElmt, 50);
                        
                        document.body.appendChild(ghostElmt);
                        callback._ghostElmt = ghostElmt;
                    }
                    
                    SimileAjax.WindowManager._dragging = true;
                    SimileAjax.WindowManager._lastCoords = { x: evt.clientX, y: evt.clientY };
                    
                    document.body.focus();
                } catch (e) {
                    SimileAjax.Debug.exception("WindowManager: Error handling mouse down", e);
                    SimileAjax.WindowManager._cancelDragging();
                }
            }
        } else {
            try {
                SimileAjax.WindowManager._lastCoords = { x: evt.clientX, y: evt.clientY };
                
                if ("onDragBy" in callback) {
                    callback.onDragBy(diffX, diffY);
                }
                
                if ("_ghostElmt" in callback) {
                    var ghostElmt = callback._ghostElmt;
                    
                    SimileAjax.WindowManager._ghostCoords.left += diffX;
                    SimileAjax.WindowManager._ghostCoords.top += diffY;
                    
                    ghostElmt.style.left = SimileAjax.WindowManager._ghostCoords.left + "px";
                    ghostElmt.style.top = SimileAjax.WindowManager._ghostCoords.top + "px";
                    if (SimileAjax.WindowManager._draggingModeIndicatorElmt != null) {
                        var indicatorElmt = SimileAjax.WindowManager._draggingModeIndicatorElmt;
                        
                        indicatorElmt.style.left = (SimileAjax.WindowManager._ghostCoords.left - 16) + "px";
                        indicatorElmt.style.top = SimileAjax.WindowManager._ghostCoords.top + "px";
                    }
                    
                    if ("droppable" in callback && callback.droppable) {
                        var coords = SimileAjax.DOM.getEventPageCoordinates(evt);
                        var target = SimileAjax.DOM.hittest(
                            coords.x, coords.y, 
                            [   SimileAjax.WindowManager._ghostElmt, 
                                SimileAjax.WindowManager._dropTargetHighlightElement 
                            ]
                        );
                        target = SimileAjax.WindowManager._findDropTarget(target);
                        
                        if (target != SimileAjax.WindowManager._potentialDropTarget) {
                            if (SimileAjax.WindowManager._dropTargetHighlightElement != null) {
                                document.body.removeChild(SimileAjax.WindowManager._dropTargetHighlightElement);
                                
                                SimileAjax.WindowManager._dropTargetHighlightElement = null;
                                SimileAjax.WindowManager._potentialDropTarget = null;
                            }

                            var droppable = false;
                            if (target != null) {
                                if ((!("canDropOn" in callback) || callback.canDropOn(target)) &&
                                    (!("canDrop" in target) || target.canDrop(SimileAjax.WindowManager._draggedElement))) {
                                    
                                    droppable = true;
                                }
                            }
                            
                            if (droppable) {
                                var border = 4;
                                var targetCoords = SimileAjax.DOM.getPageCoordinates(target);
                                var highlight = document.createElement("div");
                                highlight.style.border = border + "px solid yellow";
                                highlight.style.backgroundColor = "yellow";
                                highlight.style.position = "absolute";
                                highlight.style.left = targetCoords.left + "px";
                                highlight.style.top = targetCoords.top + "px";
                                highlight.style.width = (target.offsetWidth - border * 2) + "px";
                                highlight.style.height = (target.offsetHeight - border * 2) + "px";
                                SimileAjax.Graphics.setOpacity(highlight, 30);
                                document.body.appendChild(highlight);
                                
                                SimileAjax.WindowManager._potentialDropTarget = target;
                                SimileAjax.WindowManager._dropTargetHighlightElement = highlight;
                            }
                        }
                    }
                }
            } catch (e) {
                SimileAjax.Debug.exception("WindowManager: Error handling mouse move", e);
                SimileAjax.WindowManager._cancelDragging();
            }
        }
        
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    }
};

SimileAjax.WindowManager._onBodyMouseUp = function(elmt, evt, target) {
    if (SimileAjax.WindowManager._draggedElement != null) {
        try {
            if (SimileAjax.WindowManager._dragging) {
                var callback = SimileAjax.WindowManager._draggedElementCallback;
                if ("onDragEnd" in callback) {
                    callback.onDragEnd();
                }
                if ("droppable" in callback && callback.droppable) {
                    var dropped = false;
                    
                    var target = SimileAjax.WindowManager._potentialDropTarget;
                    if (target != null) {
                        if ((!("canDropOn" in callback) || callback.canDropOn(target)) &&
                            (!("canDrop" in target) || target.canDrop(SimileAjax.WindowManager._draggedElement))) {
                            
                            if ("onDropOn" in callback) {
                                callback.onDropOn(target);
                            }
                            target.ondrop(SimileAjax.WindowManager._draggedElement, SimileAjax.WindowManager._draggingMode);
                            
                            dropped = true;
                        }
                    }
                    
                    if (!dropped) {
                        // TODO: do holywood explosion here
                    }
                }
            }
        } finally {
            SimileAjax.WindowManager._cancelDragging();
        }
        
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    }
};

SimileAjax.WindowManager._cancelDragging = function() {
    var callback = SimileAjax.WindowManager._draggedElementCallback;
    if ("_ghostElmt" in callback) {
        var ghostElmt = callback._ghostElmt;
        document.body.removeChild(ghostElmt);
        
        delete callback._ghostElmt;
    }
    if (SimileAjax.WindowManager._dropTargetHighlightElement != null) {
        document.body.removeChild(SimileAjax.WindowManager._dropTargetHighlightElement);
        SimileAjax.WindowManager._dropTargetHighlightElement = null;
    }
    if (SimileAjax.WindowManager._draggingModeIndicatorElmt != null) {
        document.body.removeChild(SimileAjax.WindowManager._draggingModeIndicatorElmt);
        SimileAjax.WindowManager._draggingModeIndicatorElmt = null;
    }
    
    SimileAjax.WindowManager._draggedElement = null;
    SimileAjax.WindowManager._draggedElementCallback = null;
    SimileAjax.WindowManager._potentialDropTarget = null;
    SimileAjax.WindowManager._dropTargetHighlightElement = null;
    SimileAjax.WindowManager._lastCoords = null;
    SimileAjax.WindowManager._ghostCoords = null;
    SimileAjax.WindowManager._draggingMode = "";
    SimileAjax.WindowManager._dragging = false;
};

SimileAjax.WindowManager._findDropTarget = function(elmt) {
    while (elmt != null) {
        if ("ondrop" in elmt && (typeof elmt.ondrop) == "function") {
            break;
        }
        elmt = elmt.parentNode;
    }
    return elmt;
};
