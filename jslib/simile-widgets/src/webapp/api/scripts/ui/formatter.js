/*==================================================
 *  Exhibit.Formatter
 *  http://simile.mit.edu/wiki/Exhibit/API/Formatter
 *==================================================
 */
Exhibit.Formatter = new Object();

Exhibit.Formatter.createListDelimiter = function(parentElmt, count, uiContext) {
    var separator = uiContext.getSetting("format/list/separator");
    var lastSeparator = uiContext.getSetting("format/list/last-separator");
    var pairSeparator = uiContext.getSetting("format/list/pair-separator");
    
    if (typeof separator != "string") {
        separator = Exhibit.Formatter.l10n.listSeparator;
    }
    if (typeof lastSeparator != "string") {
        lastSeparator = Exhibit.Formatter.l10n.listLastSeparator;
    }
    if (typeof pairSeparator != "string") {
        pairSeparator = Exhibit.Formatter.l10n.listPairSeparator;
    }

    var f = function() {
        if (f.index > 0 && f.index < count) {
            if (count > 2) {
                parentElmt.appendChild(document.createTextNode(
                (f.index == count - 1) ? lastSeparator : separator));
            } else {
                parentElmt.appendChild(document.createTextNode(pairSeparator));
            }
        }
        f.index++;
    };
    f.index = 0;
    
    return f;
};

Exhibit.Formatter._lessThanRegex = /</g;
Exhibit.Formatter._greaterThanRegex = />/g;

Exhibit.Formatter.encodeAngleBrackets = function(s) {
    return s.replace(Exhibit.Formatter._lessThanRegex, "&lt;").
        replace(Exhibit.Formatter._greaterThanRegex, "&gt;");
};

/*==================================================
 *  Exhibit.Formatter._ListFormatter
 *==================================================
 */
Exhibit.Formatter._ListFormatter = function(uiContext) {
    this._uiContext = uiContext;
    this._separator = uiContext.getSetting("format/list/separator");
    this._lastSeparator = uiContext.getSetting("format/list/last-separator");
    this._pairSeparator = uiContext.getSetting("format/list/pair-separator");
    this._emptyText = uiContext.getSetting("format/list/empty-text");
    
    if (typeof this._separator != "string") {
        this._separator = Exhibit.Formatter.l10n.listSeparator;
    }
    if (typeof this._lastSeparator != "string") {
        this._lastSeparator = Exhibit.Formatter.l10n.listLastSeparator;
    }
    if (typeof this._pairSeparator != "string") {
        this._pairSeparator = Exhibit.Formatter.l10n.listPairSeparator;
    }
};

Exhibit.Formatter._ListFormatter.prototype.formatList = function(values, count, valueType, appender) {
    var uiContext = this._uiContext;
    var self = this;
    if (count == 0) {
        if (this._emptyText != null && this._emptyText.length > 0) {
            appender(document.createTextNode(this._emptyText));
        }
    } else if (count == 1) {
        values.visit(function(v) {
            uiContext.format(v, valueType, appender);
        });
    } else {
        var index = 0;
        if (count == 2) {
            values.visit(function(v) {
                uiContext.format(v, valueType, appender);
                index++;
                
                if (index == 1) {
                    appender(document.createTextNode(self._pairSeparator));
                }
            });
        } else {
            values.visit(function(v) {
                uiContext.format(v, valueType, appender);
                index++;
                
                if (index < count) {
                    appender(document.createTextNode(
                        (index == count - 1) ? self._lastSeparator : self._separator));
                }
            });
        }
    }
};

/*==================================================
 *  Exhibit.Formatter._TextFormatter
 *==================================================
 */
Exhibit.Formatter._TextFormatter = function(uiContext) {
    this._maxLength = uiContext.getSetting("format/text/max-length");
    
    if (typeof this._maxLength == "number") {
        this._maxLength = Math.max(3, Math.round(this._maxLength));
    } else {
        this._maxLength = 0; // zero means no limit
    }
};

Exhibit.Formatter._TextFormatter.prototype.format = function(value, appender) {
    var span = document.createElement("span");

    span.innerHTML = this.formatText(value);
    appender(span);
};

Exhibit.Formatter._TextFormatter.prototype.formatText = function(value) {
    if (Exhibit.params.safe) {
        value = Exhibit.Formatter.encodeAngleBrackets(value);
    }
    
    if (this._maxLength == 0 || value.length <= this._maxLength) {
        return value;
    } else {
        return value.substr(0, this._maxLength) + Exhibit.Formatter.l10n.textEllipsis;
    }
};

/*==================================================
 *  Exhibit.Formatter._BooleanFormatter
 *==================================================
 */
Exhibit.Formatter._BooleanFormatter = function(uiContext) {
};

Exhibit.Formatter._BooleanFormatter.prototype.format = function(value, appender) {
    var span = document.createElement("span");
    span.innerHTML = this.formatText(value);
    appender(span);
};

Exhibit.Formatter._BooleanFormatter.prototype.formatText = function(value) {
    return (typeof value == "boolean" ? value : (typeof value == "string" ? (value == "true") : false)) ? 
        Exhibit.Formatter.l10n.booleanTrue : Exhibit.Formatter.l10n.booleanFalse;
};

/*==================================================
 *  Exhibit.Formatter._NumberFormatter
 *==================================================
 */
Exhibit.Formatter._NumberFormatter = function(uiContext) {
    this._decimalDigits = uiContext.getSetting("format/number/decimal-digits");
    
    if (typeof this._decimalDigits == "number") {
        this._decimalDigits = Math.max(-1, Math.round(this._decimalDigits));
    } else {
        this._decimalDigits = -1; // -1 means no limit
    }
};

Exhibit.Formatter._NumberFormatter.prototype.format = function(value, appender) {
    appender(document.createTextNode(this.formatText(value)));
};

Exhibit.Formatter._NumberFormatter.prototype.formatText = function(value) {
    if (this._decimalDigits == -1) {
        return value.toString();
    } else {
        return new Number(value).toFixed(this._decimalDigits);
    }
};

/*==================================================
 *  Exhibit.Formatter._ImageFormatter
 *==================================================
 */
Exhibit.Formatter._ImageFormatter = function(uiContext) {
    this._uiContext = uiContext;
    
    this._maxWidth = uiContext.getSetting("format/image/max-width");
    if (typeof this._maxWidth == "number") {
        this._maxWidth = Math.max(-1, Math.round(this._maxWidth));
    } else {
        this._maxWidth = -1; // -1 means no limit
    }
    
    this._maxHeight = uiContext.getSetting("format/image/max-height");
    if (typeof this._maxHeight == "number") {
        this._maxHeight = Math.max(-1, Math.round(this._maxHeight));
    } else {
        this._maxHeight = -1; // -1 means no limit
    }
    
    this._tooltip = uiContext.getSetting("format/image/tooltip");
};

Exhibit.Formatter._ImageFormatter.prototype.format = function(value, appender) {
    if (Exhibit.params.safe) {
        value = value.trim().startsWith("javascript:") ? "" : value;
    }
    
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

/*==================================================
 *  Exhibit.Formatter._URLFormatter
 *==================================================
 */
Exhibit.Formatter._URLFormatter = function(uiContext) {
    this._target = uiContext.getSetting("format/url/target");
    this._externalIcon = uiContext.getSetting("format/url/external-icon");
};

Exhibit.Formatter._URLFormatter.prototype.format = function(value, appender) {
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
    if (Exhibit.params.safe) {
        value = value.trim().startsWith("javascript:") ? "" : value;
    }
    return value;
};

/*==================================================
 *  Exhibit.Formatter._CurrencyFormatter
 *==================================================
 */
Exhibit.Formatter._CurrencyFormatter = function(uiContext) {
    this._decimalDigits = uiContext.getSetting("format/currency/decimal-digits");
    if (typeof this._decimalDigits == "number") {
        this._decimalDigits = Math.max(-1, Math.round(this._decimalDigits)); // -1 means no limit
    } else {
        this._decimalDigits = 2;
    }
    
    this._symbol = uiContext.getSetting("format/currency/symbol");
    if (this._symbol == null) {
        this._symbol = Exhibit.Formatter.l10n.currencySymbol;
    }
    
    this._symbolPlacement = uiContext.getSetting("format/currency/symbol-placement");
    if (this._symbolPlacement == null) {
        this._symbol = Exhibit.Formatter.l10n.currencySymbolPlacement;
    }
    
    this._negativeFormat = {
        signed :      uiContext.getBooleanSetting("format/currency/negative-format/signed", Exhibit.Formatter.l10n.currencyShowSign),
        red :         uiContext.getBooleanSetting("format/currency/negative-format/red", Exhibit.Formatter.l10n.currencyShowRed),
        parentheses : uiContext.getBooleanSetting("format/currency/negative-format/parentheses", Exhibit.Formatter.l10n.currencyShowParentheses)
    };
};

Exhibit.Formatter._CurrencyFormatter.prototype.format = function(value, appender) {
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

/*==================================================
 *  Exhibit.Formatter._ItemFormatter
 *==================================================
 */
Exhibit.Formatter._ItemFormatter = function(uiContext) {
    this._uiContext = uiContext;
    this._title = uiContext.getSetting("format/item/title");
};

Exhibit.Formatter._ItemFormatter.prototype.format = function(value, appender) {
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

/*==================================================
 *  Exhibit.Formatter._DateFormatter
 *==================================================
 */
Exhibit.Formatter._DateFormatter = function(uiContext) {
    this._timeZone = uiContext.getSetting("format/date/time-zone");
    if (!(typeof this._timeZone == "number")) {
        this._timeZone = -(new Date().getTimezoneOffset()) / 60;
    }
    this._timeZoneOffset = this._timeZone * 3600000;
    
    var mode = uiContext.getSetting("format/date/mode");
    var show = uiContext.getSetting("format/date/show");
    var template = null;
    
    switch (mode) {
    case "short":
        template = 
            show == "date" ?  Exhibit.Formatter.l10n.dateShortFormat :
            (show == "time" ? Exhibit.Formatter.l10n.timeShortFormat : 
                              Exhibit.Formatter.l10n.dateTimeShortFormat);
        break;
    case "medium":
        template = 
            show == "date" ?  Exhibit.Formatter.l10n.dateMediumFormat :
            (show == "time" ? Exhibit.Formatter.l10n.timeMediumFormat : 
                              Exhibit.Formatter.l10n.dateTimeMediumFormat);
        break;
    case "long":
        template = 
            show == "date" ?  Exhibit.Formatter.l10n.dateLongFormat :
            (show == "time" ? Exhibit.Formatter.l10n.timeLongFormat : 
                              Exhibit.Formatter.l10n.dateTimeLongFormat);
        break;
    case "full":
        template = 
            show == "date" ?  Exhibit.Formatter.l10n.dateFullFormat :
            (show == "time" ? Exhibit.Formatter.l10n.timeFullFormat : 
                              Exhibit.Formatter.l10n.dateTimeFullFormat);
        break;
    default:
        template = uiContext.getSetting("format/date/template");
    }
    
    if (typeof template != "string") {
        template = Exhibit.Formatter.l10n.dateTimeDefaultFormat;
    }
    
    var segments = [];
    
    var placeholders = template.match(/\b\w+\b/g);
    var startIndex = 0;
    for (var p = 0; p < placeholders.length; p++) {
        var placeholder = placeholders[p];
        var index = template.indexOf(placeholder, startIndex);
        if (index > startIndex) {
            segments.push(template.substring(startIndex, index));
        }
        
        var retriever = Exhibit.Formatter._DateFormatter._retrievers[placeholder];
        if (typeof retriever == "function") {
            segments.push(retriever);
        } else {
            segments.push(placeholder);
        }
        
        startIndex = index + placeholder.length;
    }
    
    if (startIndex < template.length) {
        segments.push(template.substr(startIndex));
    }
    
    this._segments = segments;
};

Exhibit.Formatter._DateFormatter.prototype.format = function(value, appender) {
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

Exhibit.Formatter._DateFormatter._pad = function(n) {
    return n < 10 ? ("0" + n) : n.toString();
};
Exhibit.Formatter._DateFormatter._pad3 = function(n) {
    return n < 10 ? ("00" + n) : (n < 100 ? ("0" + n) : n.toString());
};

Exhibit.Formatter._DateFormatter._retrievers = {
    // day of month
    "d": function(date) {
        return date.getUTCDate().toString();
    },
    "dd": function(date) {
        return Exhibit.Formatter._DateFormatter._pad(date.getUTCDate());
    },
    
    // day of week
    "EEE": function(date) {
        return Exhibit.Formatter.l10n.shortDaysOfWeek[date.getUTCDay()];
    },
    "EEEE": function(date) {
        return Exhibit.Formatter.l10n.daysOfWeek[date.getUTCDay()];
    },
    
    // month
    "MM": function(date) {
        return Exhibit.Formatter._DateFormatter._pad(date.getUTCMonth() + 1);
    },
    "MMM": function(date) {
        return Exhibit.Formatter.l10n.shortMonths[date.getUTCMonth()];
    },
    "MMMM": function(date) {
        return Exhibit.Formatter.l10n.months[date.getUTCMonth()];
    },
    
    // year
    "yy": function(date) {
        return Exhibit.Formatter._DateFormatter._pad(date.getUTCFullYear() % 100);
    },
    "yyyy": function(date) {
        var y = date.getUTCFullYear();
        return y > 0 ? y.toString() : (1 - y);
    },
    
    // era
    "G": function(date) {
        var y = date.getUTCYear();
        return y > 0 ? Exhibit.Formatter.l10n.commonEra : Exhibit.Formatter.l10n.beforeCommonEra;
    },
    
    // hours of day
    "HH": function(date) {
        return Exhibit.Formatter._DateFormatter._pad(date.getUTCHours());
    },
    "hh": function(date) {
        var h = date.getUTCHours();
        return Exhibit.Formatter._DateFormatter._pad(h == 0 ? 12 : (h > 12 ? h - 12 : h));
    },
    "h": function(date) {
        var h = date.getUTCHours();
        return (h == 0 ? 12 : (h > 12 ? h - 12 : h)).toString();
    },
    
    // am/pm
    "a": function(date) {
        return date.getUTCHours() < 12 ? Exhibit.Formatter.l10n.beforeNoon : Exhibit.Formatter.l10n.afterNoon;
    },
    "A": function(date) {
        return date.getUTCHours() < 12 ? Exhibit.Formatter.l10n.BeforeNoon : Exhibit.Formatter.l10n.AfterNoon;
    },
    
    // minutes of hour
    "mm": function(date) {
        return Exhibit.Formatter._DateFormatter._pad(date.getUTCMinutes());
    },
    
    // seconds of minute
    "ss": function(date) {
        return Exhibit.Formatter._DateFormatter._pad(date.getUTCSeconds());
    },
    
    // milliseconds of minute
    "S": function(date) {
        return Exhibit.Formatter._DateFormatter._pad3(date.getUTCMilliseconds());
    }
    
};

/*==================================================
 *  Exhibit.Formatter constructor map
 *==================================================
 */
Exhibit.Formatter._constructors = {
    "number" : Exhibit.Formatter._NumberFormatter,
    "date" : Exhibit.Formatter._DateFormatter,
    "text" : Exhibit.Formatter._TextFormatter,
    "boolean" : Exhibit.Formatter._BooleanFormatter,
    "image" : Exhibit.Formatter._ImageFormatter,
    "url" : Exhibit.Formatter._URLFormatter,
    "item" : Exhibit.Formatter._ItemFormatter,
    "currency" : Exhibit.Formatter._CurrencyFormatter
};
