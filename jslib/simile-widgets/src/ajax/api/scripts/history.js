/*======================================================================
 *  History
 *
 *  This is a singleton that keeps track of undoable user actions and 
 *  performs undos and redos in response to the browser's Back and 
 *  Forward buttons.
 *
 *  Call addAction(action) to register an undoable user action. action
 *  must have 4 fields:
 *
 *      perform: an argument-less function that carries out the action
 *      undo:    an argument-less function that undos the action
 *      label:   a short, user-friendly string describing the action
 *      uiLayer: the UI layer on which the action takes place
 *
 *  By default, the history keeps track of upto 10 actions. You can 
 *  configure this behavior by setting 
 *      SimileAjax.History.maxHistoryLength
 *  to a different number.
 *
 *  An iframe is inserted into the document's body element to track 
 *  onload events.
 *======================================================================
 */
 
SimileAjax.History = {
    maxHistoryLength:       10,
    historyFile:            "__history__.html",
    enabled:               true,
    
    _initialized:           false,
    _listeners:             new SimileAjax.ListenerQueue(),
    
    _actions:               [],
    _baseIndex:             0,
    _currentIndex:          0,
    
    _plainDocumentTitle:    document.title
};

SimileAjax.History.formatHistoryEntryTitle = function(actionLabel) {
    return SimileAjax.History._plainDocumentTitle + " {" + actionLabel + "}";
};

SimileAjax.History.initialize = function() {
    if (SimileAjax.History._initialized) {
        return;
    }
    
    if (SimileAjax.History.enabled) {
        var iframe = document.createElement("iframe");
        iframe.id = "simile-ajax-history";
        iframe.style.position = "absolute";
        iframe.style.width = "10px";
        iframe.style.height = "10px";
        iframe.style.top = "0px";
        iframe.style.left = "0px";
        iframe.style.visibility = "hidden";
        iframe.src = SimileAjax.History.historyFile + "?0";
        
        document.body.appendChild(iframe);
        SimileAjax.DOM.registerEvent(iframe, "load", SimileAjax.History._handleIFrameOnLoad);
        
        SimileAjax.History._iframe = iframe;
    }
    SimileAjax.History._initialized = true;
};

SimileAjax.History.addListener = function(listener) {
    SimileAjax.History.initialize();
    
    SimileAjax.History._listeners.add(listener);
};

SimileAjax.History.removeListener = function(listener) {
    SimileAjax.History.initialize();
    
    SimileAjax.History._listeners.remove(listener);
};

SimileAjax.History.addAction = function(action) {
    SimileAjax.History.initialize();
    
    SimileAjax.History._listeners.fire("onBeforePerform", [ action ]);
    window.setTimeout(function() {
        try {
            action.perform();
            SimileAjax.History._listeners.fire("onAfterPerform", [ action ]);
                
            if (SimileAjax.History.enabled) {
                SimileAjax.History._actions = SimileAjax.History._actions.slice(
                    0, SimileAjax.History._currentIndex - SimileAjax.History._baseIndex);
                    
                SimileAjax.History._actions.push(action);
                SimileAjax.History._currentIndex++;
                
                var diff = SimileAjax.History._actions.length - SimileAjax.History.maxHistoryLength;
                if (diff > 0) {
                    SimileAjax.History._actions = SimileAjax.History._actions.slice(diff);
                    SimileAjax.History._baseIndex += diff;
                }
                
                try {
                    SimileAjax.History._iframe.contentWindow.location.search = 
                        "?" + SimileAjax.History._currentIndex;
                } catch (e) {
                    /*
                     *  We can't modify location.search most probably because it's a file:// url.
                     *  We'll just going to modify the document's title.
                     */
                    var title = SimileAjax.History.formatHistoryEntryTitle(action.label);
                    document.title = title;
                }
            }
        } catch (e) {
            SimileAjax.Debug.exception(e, "Error adding action {" + action.label + "} to history");
        }
    }, 0);
};

SimileAjax.History.addLengthyAction = function(perform, undo, label) {
    SimileAjax.History.addAction({
        perform:    perform,
        undo:       undo,
        label:      label,
        uiLayer:    SimileAjax.WindowManager.getBaseLayer(),
        lengthy:    true
    });
};

SimileAjax.History._handleIFrameOnLoad = function() {
    /*
     *  This function is invoked when the user herself
     *  navigates backward or forward. We need to adjust
     *  the application's state accordingly.
     */
    
    try {
        var q = SimileAjax.History._iframe.contentWindow.location.search;
        var c = (q.length == 0) ? 0 : Math.max(0, parseInt(q.substr(1)));
        
        var finishUp = function() {
            var diff = c - SimileAjax.History._currentIndex;
            SimileAjax.History._currentIndex += diff;
            SimileAjax.History._baseIndex += diff;
                
            SimileAjax.History._iframe.contentWindow.location.search = "?" + c;
        };
        
        if (c < SimileAjax.History._currentIndex) { // need to undo
            SimileAjax.History._listeners.fire("onBeforeUndoSeveral", []);
            window.setTimeout(function() {
                while (SimileAjax.History._currentIndex > c && 
                       SimileAjax.History._currentIndex > SimileAjax.History._baseIndex) {
                       
                    SimileAjax.History._currentIndex--;
                    
                    var action = SimileAjax.History._actions[SimileAjax.History._currentIndex - SimileAjax.History._baseIndex];
                    
                    try {
                        action.undo();
                    } catch (e) {
                        SimileAjax.Debug.exception(e, "History: Failed to undo action {" + action.label + "}");
                    }
                }
                
                SimileAjax.History._listeners.fire("onAfterUndoSeveral", []);
                finishUp();
            }, 0);
        } else if (c > SimileAjax.History._currentIndex) { // need to redo
            SimileAjax.History._listeners.fire("onBeforeRedoSeveral", []);
            window.setTimeout(function() {
                while (SimileAjax.History._currentIndex < c && 
                       SimileAjax.History._currentIndex - SimileAjax.History._baseIndex < SimileAjax.History._actions.length) {
                       
                    var action = SimileAjax.History._actions[SimileAjax.History._currentIndex - SimileAjax.History._baseIndex];
                    
                    try {
                        action.perform();
                    } catch (e) {
                        SimileAjax.Debug.exception(e, "History: Failed to redo action {" + action.label + "}");
                    }
                    
                    SimileAjax.History._currentIndex++;
                }
                
                SimileAjax.History._listeners.fire("onAfterRedoSeveral", []);
                finishUp();
            }, 0);
        } else {
            var index = SimileAjax.History._currentIndex - SimileAjax.History._baseIndex - 1;
            var title = (index >= 0 && index < SimileAjax.History._actions.length) ?
                SimileAjax.History.formatHistoryEntryTitle(SimileAjax.History._actions[index].label) :
                SimileAjax.History._plainDocumentTitle;
                
            SimileAjax.History._iframe.contentWindow.document.title = title;
            document.title = title;
        }
    } catch (e) {
        // silent
    }
};

SimileAjax.History.getNextUndoAction = function() {
    try {
        var index = SimileAjax.History._currentIndex - SimileAjax.History._baseIndex - 1;
        return SimileAjax.History._actions[index];
    } catch (e) {
        return null;
    }
};

SimileAjax.History.getNextRedoAction = function() {
    try {
        var index = SimileAjax.History._currentIndex - SimileAjax.History._baseIndex;
        return SimileAjax.History._actions[index];
    } catch (e) {
        return null;
    }
};
