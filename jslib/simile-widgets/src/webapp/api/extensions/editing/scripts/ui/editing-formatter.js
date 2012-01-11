Exhibit.Formatter._ListFormatter.prototype.formatList = function(values, count, valueType, appender, editing) {
    var uiContext = this._uiContext;
    var self = this;
    
    if (count == 0) {
        if (this._emptyText != null && this._emptyText.length > 0) {
            appender(document.createTextNode(this._emptyText));
        }
    } else if (count == 1) {
        values.visit(function(v) {
            uiContext.format(v, valueType, appender, editing);
        });
    } else {
        var index = 0;
        if (count == 2) {
            values.visit(function(v) {
                uiContext.format(v, valueType, appender, editing);
                index++;
                
                if (index == 1) {
                    appender(document.createTextNode(self._pairSeparator));
                }
            });
        } else {
            values.visit(function(v) {
                uiContext.format(v, valueType, appender, editing);
                index++;
                
                if (index < count) {
                    appender(document.createTextNode(
                        (index == count - 1) ? self._lastSeparator : self._separator));
                }
            });
        }
    }
};


Exhibit.Formatter._TextFormatter.prototype.format = function(value, appender, editing) {
    var self = this;
    var span = document.createElement("span");
    span.innerHTML = this.formatText(value); //cuts text, adds "..."
    
    if(editing && !editing) {
        span.setAttribute("ex:value", value);
        span.className = "editable-exhibit-value";
        SimileAjax.WindowManager.registerEvent(
            span,
            "click",
            function() {
                var newSpan = document.createElement("span");
                newSpan.setAttribute("ex:value", value);
                var input = document.createElement("input");
                //input.className = "editable-exhibit-value";
                input.style.width = span.style.width;
                input.value = value;
                newSpan.className = "editing-parent";
                newSpan.appendChild(input);
                SimileAjax.WindowManager.registerEvent(
                    input,
                    "blur",
                    function (){
                        var parent = newSpan.parentNode;
                        var newValue = input.value;
                        self.format(
                            newValue,
                            function(respan) {
                                respan.setAttribute("ex:value", value);
                                respan.className = newValue == value ? "editable-exhibit-value" : "modified-exhibit-value";
                                appender(respan);
                            },
                            editing);
                        parent.removeChild(newSpan);
                    }
                );
                span.parentNode.replaceChild(newSpan, span);
                //newSpan.select(); //if we decide to go for textarea
            }
        );
    }
    appender(span);
};

Exhibit.Formatter._BooleanFormatter.prototype.format = function(value, appender, editing) {
    var span = document.createElement("span");
    span.innerHTML = this.formatText(value);
    appender(span);
};

Exhibit.Formatter._BooleanFormatter.prototype.formatText = function(value) {
    return (typeof value == "boolean" ? value : (typeof value == "string" ? (value == "true") : false)) ? "true" : "false";
};

Exhibit.Formatter._NumberFormatter.prototype.format = function(value, appender, editing) {
    appender(document.createTextNode(this.formatText(value)));
};

Exhibit.Formatter._NumberFormatter.prototype.formatText = function(value) {
    if (this._decimalDigits == -1) {
        return value.toString();
    } else {
        return new Number(value).toFixed(this._decimalDigits);
    }
};

Exhibit.Formatter._ImageFormatter.prototype.format = function(value, appender, editing) {
    var img = document.createElement("img");
    img.src = value;
    
    if (this._tooltip != null) {
        if (typeof this._tooltip == "string") {
            img.title = this._tootlip;
        } else {
            img.title = this._tooltip.evaluateSingleOnItem(
                this._uiContext.getSetting("itemID"), this._uiContext.getDatabase()).value;
        }
    }
    appender(img);
};

Exhibit.Formatter._ImageFormatter.prototype.formatText = function(value) {
    return value;
};

Exhibit.Formatter._URLFormatter.prototype.format = function(value, appender, editing) {
    var a = document.createElement("a");
    a.href = value;
    a.innerHTML = value;
    
    if (this._target != null) {
        a.target = this._target;
    }
    if (this._externalIcon != null) {
        //
    }
    appender(a);
};

Exhibit.Formatter._URLFormatter.prototype.formatText = function(value) {
    return value;
};

Exhibit.Formatter._CurrencyFormatter.prototype.format = function(value, appender, editing) {
    var text = this.formatText(value);
    if (value < 0 && this._negativeFormat.red) {
        var span = document.createElement("span");
        span.innerHTML = text;
        span.style.color = "red";
        appender(span);
    } else {
        appender(document.createTextNode(text));
    }
};

Exhibit.Formatter._CurrencyFormatter.prototype.formatText = function(value) {
    var negative = value < 0;
    var text;
    if (this._decimalDigits == -1) {
        text = Math.abs(value);
    } else {
        text = new Number(Math.abs(value)).toFixed(this._decimalDigits);
    }
    
    var sign = (negative && this._negativeFormat.signed) ? "-" : "";
    if (negative && this._negativeFormat.parentheses) {
        text = "(" + text + ")";
    }
    
    switch (this._negativeFormat) {
    case "first":       text = this._symbol + sign + text; break;
    case "after-sign":  text = sign + this._symbol + text; break;
    case "last":        text = sign + text + this._symbol; break;
    }
    return text;
};

Exhibit.Formatter._ItemFormatter.prototype.format = function(value, appender, editing) {
    var self = this;
    var title = this.formatText(value);
    
    var a = SimileAjax.DOM.createElementFromString(
        "<a href=\"" + Exhibit.Persistence.getItemLink(value) + "\" class='exhibit-item'>" + title + "</a>");
        
    var handler = function(elmt, evt, target) {
        Exhibit.UI.showItemInPopup(value, elmt, self._uiContext);
    }
    SimileAjax.WindowManager.registerEvent(a, "click", handler, this._uiContext.getSetting("layer"));
    
    appender(a);
};

Exhibit.Formatter._ItemFormatter.prototype.formatText = function(value) {
    var database = this._uiContext.getDatabase();
    var title = null;
    
    if (this._title == null) {
        title = database.getObject(value, "label");
    } else {
        title = this._title.evaluateSingleOnItem(value, database).value;
    }
    
    if (title == null) {
        title = value;
    }
    
    return title;
};

Exhibit.Formatter._DateFormatter.prototype.format = function(value, appender, editing) {
    appender(document.createTextNode(this.formatText(value)));
};

Exhibit.Formatter._DateFormatter.prototype.formatText = function(value) {
    var date = (value instanceof Date) ? value : SimileAjax.DateTime.parseIso8601DateTime(value);
    if (date == null) {
        return value;
    }
    
    date.setTime(date.getTime() + this._timeZoneOffset);
    
    var text = "";
    var segments = this._segments;
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (typeof segment == "string") {
            text += segment;
        } else {
            text += segment(date);
        }
    }
    return text;
};

