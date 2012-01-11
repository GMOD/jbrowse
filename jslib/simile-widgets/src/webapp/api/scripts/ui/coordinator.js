/*======================================================================
 *  Exhibit.Coordinator
 *======================================================================
 */
Exhibit.Coordinator = function(uiContext) {
    this._uiContext = uiContext;
    this._listeners = [];
}

Exhibit.Coordinator.create = function(configuration, uiContext) {
    var coordinator = new Exhibit.Coordinator(uiContext);
    
    return coordinator;
};

Exhibit.Coordinator.createFromDOM = function(div, uiContext) {
    var coordinator = new Exhibit.Coordinator(Exhibit.UIContext.createFromDOM(div, uiContext, false));
    
    return coordinator;
};

Exhibit.Coordinator.prototype.dispose = function() {
    this._uiContext.dispose();
    this._uiContext = null;
};

Exhibit.Coordinator.prototype.addListener = function(callback) {
    var listener = new Exhibit.Coordinator._Listener(this, callback);
    this._listeners.push(listener);
    
    return listener;
};

Exhibit.Coordinator.prototype._removeListener = function(listener) {
    for (var i = 0; i < this._listeners.length; i++) {
        if (this._listeners[i] == listener) {
            this._listeners.splice(i, 1);
            return;
        }
    }
};

Exhibit.Coordinator.prototype._fire = function(listener, o) {
    for (var i = 0; i < this._listeners.length; i++) {
        var listener2 = this._listeners[i];
        if (listener2 != listener) {
            listener2._callback(o);
        }
    }
};

Exhibit.Coordinator._Listener = function(coordinator, callback) {
    this._coordinator = coordinator;
    this._callback = callback;
};

Exhibit.Coordinator._Listener.prototype.dispose = function() {
    this._coordinator._removeListener(this);
};

Exhibit.Coordinator._Listener.prototype.fire = function(o) {
    this._coordinator._fire(this, o);
};

