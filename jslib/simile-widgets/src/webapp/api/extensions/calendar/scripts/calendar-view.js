/*==================================================
 *  Exhibit.CalendarView
 *==================================================
 */

Exhibit.CalendarView = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._settings = {};
    this._accessors = {
        getEventLabel:  function(itemID, database, visitor) { visitor(database.getObject(itemID, "label")); },
        getProxy:       function(itemID, database, visitor) { visitor(itemID); },
        getColorKey:    null,
        getIconKey:     null 
    };
    
    this._currentDate = new Date();
    
    var view = this;

    this._listener = { onItemsChanged: function() { view._reconstruct(); } };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.CalendarView._settingSpecs = {
    "showToolbox":          { type: "boolean", defaultValue: true }
};

Exhibit.CalendarView._accessorSpecs = [
    {   accessorName:   "getProxy",
        attributeName:  "proxy"
    },
    {   accessorName: "getDuration",
        bindings: [
            {   attributeName:  "start",
                type:           "date",
                bindingName:    "start"
            },
            {   attributeName:  "end",
                type:           "date",
                bindingName:    "end",
                optional:       true
            }
        ]
    },
    {   accessorName:   "getColorKey",
        type:           "text"
    },
    {   accessorName:   "getColorKey",
        attributeName:  "colorKey",
        type:           "text"
    },
    {   accessorName:   "getIconKey",
        attributeName:  "iconKey",
        type:           "text"
    },
    {   accessorName:   "getEventLabel",
        attributeName:  "eventLabel",
        type:           "text"
    },
    {
        accessorName:   "getHoverText",
        attributeName:  "hoverText",
        type:           "text"
    }
];

Exhibit.CalendarView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.CalendarView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.CalendarView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.CalendarView._settingSpecs, view._settings);
    Exhibit.CalendarView._configure(view, configuration);

    view._initializeUI();
    return view;
};

Exhibit.CalendarView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.CalendarView(
        containerElmt != null ? containerElmt : configElmt,
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );
    
    Exhibit.SettingsUtilities.createAccessorsFromDOM(
        configElmt, Exhibit.CalendarView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(
        configElmt, Exhibit.CalendarView._settingSpecs, view._settings);
    Exhibit.SettingsUtilities.collectSettings(
        configuration, Exhibit.CalendarView._settingSpecs, view._settings);
    Exhibit.CalendarView._configure(view, configuration);

    view._initializeUI();
    return view;
};

Exhibit.CalendarView._configure = function(view, configuration) {
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.CalendarView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.CalendarView._settingSpecs, view._settings);
    
    var accessors = view._accessors;
    view._getDuration = function(itemID, database, visitor) {
        accessors.getProxy(itemID, database, function(proxy) {
            accessors.getDuration(proxy, database, visitor);
        });
    };
};

Exhibit.CalendarView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);

    this._div.innerHTML = "";

    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    
    this._dom = null;

    this._div = null;
    this._uiContext = null;
};

Exhibit.CalendarView.prototype._initializeUI = function() {
    var self = this;
    
    var template = {
        elmt:       this._div,
        className:  "exhibit-collectionView-header",
        children: [
            {   tag:    "div",
                field:  "collectionSummaryDiv"
            },
            {   tag:    "div",
                field:  "bodyDiv"
            }
        ]
    };
    this._dom = SimileAjax.DOM.createDOMFromTemplate(template);
    
    this._collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create(
        {}, 
        this._dom.collectionSummaryDiv, 
        this._uiContext
    );
    
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
        this._toolboxWidget.getGeneratedHTML = function() {
            return self._dom.bodyDiv.innerHTML;
        };
    }

    this._reconstruct();
};

Exhibit.CalendarView.prototype.browse = function(date) {
  if (date !== undefined) {
    this._currentDate = Exhibit.DateUtil.parseDate(date);
  }
  this._reconstruct();
}

Exhibit.CalendarView.prototype._reconstruct = function() {
    var bodyDiv = this._dom.bodyDiv;
    bodyDiv.innerHTML = "";
    
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;
    var currentSize = collection.countRestrictedItems();
    var events = {};
    
    if (currentSize > 0) {
      var currentSet = collection.getRestrictedItems();
      var hasColorKey = (this._accessors.getColorKey != null);
      var hasIconKey = (this._accessors.getIconKey != null && this._iconCoder != null);
      var hasHoverText = (this._accessors.getHoverText != null);
      var colorCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
      var iconCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
      
      var addEvent = function(itemID, duration, color, icon, hoverText) {
          var label;
          accessors.getEventLabel(itemID, database, function(v) { label = v; return true; });

          var evt = {
            itemID: itemID,
            start: duration.start,
            end: duration.end,
            label: label,
            icon: icon,
            color: color,
            hoverText: hoverText,
            getProperty: function(name) {
                return database.getObject(this._itemID, name);
            },
            fillInfoBubble: function(elmt, theme, labeller) {
                self._fillInfoBubble(itemID, elmt, theme, labeller);
            }
          };
          
          events[itemID] = evt;
      };
      
      currentSet.visit(function(itemID) {
          var durations = [];
          self._getDuration(itemID, database, function(duration) { if ("start" in duration) durations.push(duration); });

          if (durations.length > 0) {
              var color = null;
              var icon = null;
              var hoverText = null;
              if (hasColorKey) {
                  var colorKeys = new Exhibit.Set();
                  accessors.getColorKey(itemID, database, function(key) { colorKeys.add(key); });

                  color = self._colorCoder.translateSet(colorKeys, colorCodingFlags);
              }

              var icon = null;
              if (hasIconKey) {
                  var iconKeys = new Exhibit.Set();
                  accessors.getIconKey(itemID, database, function(key) { iconKeys.add(key); });

                  icon = self._iconCoder.translateSet(iconKeys, iconCodingFlags);
              }

              if(hasHoverText) {
                  var hoverKeys = new Exhibit.Set();
                  accessors.getHoverText(itemID, database, function(key) { hoverKeys.add(key); });
                  for(var i in hoverKeys._hash)
                      hoverText = i;
              }

              for (var i = 0; i < durations.length; i++) {
                  addEvent(itemID, durations[i], color, icon, hoverText);
              }
          }
      });
    }
    
    this._div.style.display = "none";
    this.buildCal(bodyDiv, events);
    this._div.style.display = "block";
};

Exhibit.CalendarView.daysInMonth = [31,0,31,30,31,30,31,31,30,31,30,31];

Exhibit.CalendarView.prototype.dateToIndex = function(date) {
  // convert date to format YYYYMMDD for use as index
  return Exhibit.DateUtil.formatDate(date, 'yyyyMMdd');
};

Exhibit.CalendarView.prototype.buildCal = function(tableDiv, items){
  tableDiv.className = 'exhibit-calendar';
  
  var self = this;
  
  var y = this._currentDate.getFullYear();
  var m = this._currentDate.getMonth()+1;
  
  var bom = new Date(y, m-1, 1);
  bom.start_dow = bom.getDay()+1;

  var todaydate=new Date();
  var scanfortoday = (y==todaydate.getFullYear() && m==todaydate.getMonth()+1) ? todaydate.getDate() : 0;

  // Handle leap year
  Exhibit.CalendarView.daysInMonth[1]=(((bom.getFullYear()%100!==0)&&(bom.getFullYear()%4===0))||(bom.getFullYear()%400===0)) ? 29 :  28;
  
  // Calculate previous and next months
  base = new Date(y, m-1, 1);
  var eolm = new Date(base.setDate(base.getDate()-1));
  base = new Date(y, m-1, 1);
  var bonm = new Date(base.setDate(base.getDate()+Exhibit.CalendarView.daysInMonth[m-1]+1));
  
  // Header table
  var tableHeaderTable = document.createElement('table');
  tableHeaderTable.setAttribute('cellpadding', 0);
  tableHeaderTable.setAttribute('cellspacing',0);
  tableHeaderTable.className = 'exhibit-view-month-header';
  var tableHeaderBody = document.createElement('tbody');
  tableHeaderTable.appendChild(tableHeaderBody);
  var tableHeaderRow = document.createElement('tr');
  tableHeaderBody.appendChild(tableHeaderRow);

  var tablePrevCell = document.createElement('td');
  tablePrevCell.className = 'previous-month';
  var tablePrevMonthLink = document.createElement('a');
  tablePrevMonthLink.innerHTML = Exhibit.DateUtil.MONTH_NAMES[eolm.getMonth()+12];
  tablePrevMonthLink.setAttribute('href', 'javascript:void');
  tablePrevCell.appendChild(tablePrevMonthLink);
  tableHeaderRow.appendChild(tablePrevCell);

  var tableCurCell = document.createElement('td');
  tableCurCell.innerHTML = Exhibit.DateUtil.MONTH_NAMES[m-1]+', '+y;
  tableCurCell.className = 'current-month';
  tableCurCell.setAttribute('allign', 'center');
  tableCurCell.setAttribute('width', '100%');
  tableHeaderRow.appendChild(tableCurCell);

  var tableNextCell = document.createElement('td');
  tableNextCell.className = 'next-month';
  var tableNextMonthLink = document.createElement('a');
  tableNextMonthLink.innerHTML = Exhibit.DateUtil.MONTH_NAMES[bonm.getMonth()+12];
  tableNextMonthLink.setAttribute('href', 'javascript:void');
  tableNextCell.appendChild(tableNextMonthLink);
  tableHeaderRow.appendChild(tableNextCell);
  
  tableDiv.appendChild(tableHeaderTable);
  
  // Attach previous/next actions
  SimileAjax.WindowManager.registerEvent(tablePrevMonthLink, "click", function(elmt, evt, target){
    self.browse(Exhibit.DateUtil.formatDate(eolm, 'y-MM-dd'));
  });
  SimileAjax.WindowManager.registerEvent(tableNextMonthLink, "click", function(elmt, evt, target){
    self.browse(Exhibit.DateUtil.formatDate(bonm, 'y-MM-dd'));
  });
  
  
  // Main Table
  var table = document.createElement('table');
  table.setAttribute('cellpadding', '0');
  table.setAttribute('cellspacing','0');
  table.className = 'exhibit-view-month'

  var tableBody = document.createElement('tbody');
  table.appendChild(tableBody);
  var tableRow = document.createElement('tr');
  tableRow.setAttribute('align', 'center');
  tableBody.appendChild(tableRow);

  for(s=0;s<7;s++) {
    var tableHeaderDayCell = document.createElement('td');
    tableHeaderDayCell.innerHTML = Exhibit.DateUtil.DAY_NAMES[s];
    tableHeaderDayCell.className = 'day-header';
    tableHeaderDayCell.setAttribute('align', 'center')
    tableRow.appendChild(tableHeaderDayCell);
  }
  
  // Create item index
  var getItemIndex = function(items) {
    var index = {}
    for (itemID in items) {
      var evt = items[itemID];
      if (evt.end == null) {
        var d = self.dateToIndex(evt.start);
        if (index[d] == undefined) {
          index[d] = [itemID];
        }
        else {
          index[d].push(itemID); 
        }
      }
      else {
        var start = new Date(evt.start.getFullYear(), evt.start.getMonth(), evt.start.getDate());
        var end = new Date(evt.end.getFullYear(), evt.start.getMonth(), evt.start.getDate());
        for (var x = start.valueOf(); x <= end.valueOf(); x+=86400000) {
          var d = self.dateToIndex(new Date(x));
          if (index[d] == undefined) {
            index[d] = [itemID];
          }
          else {
            index[d].push(itemID); 
          }
        }
      }
    }
    return index;
  };
  
  var itemIndex = getItemIndex(items);
  
  // Build table contents
  var tr = null;
  var x, dayNum, curDate, cssClass;
  for(i=1;i<=42;i++){
  
    x = i - bom.start_dow;
    // Pxrevious month days
    if (x < 0) {
      dayNum = Exhibit.CalendarView.daysInMonth[eolm.getMonth()] + x + 1;
      curDate = new Date(eolm.getFullYear(), eolm.getMonth(), dayNum);
      cssClass = 'previous-month';
    }
    // Current month days
    if ((x >= 0) && (x < Exhibit.CalendarView.daysInMonth[m-1])) {
     dayNum = i - bom.start_dow + 1;
     curDate = new Date(bom.getFullYear(), m-1, dayNum);
     cssClass = (x == scanfortoday ? 'current-month today' : 'current-month');
    }
    // Following month
    if (x >= Exhibit.CalendarView.daysInMonth[m-1]) {
      dayNum = x - Exhibit.CalendarView.daysInMonth[m-1] + 1;
      curDate = new Date(bonm.getFullYear(), bonm.getMonth(), dayNum);
      cssClass = 'next-month';
    }
    
    var dateIndex = this.dateToIndex(curDate);
    td = this.buildCell(curDate, cssClass, items, itemIndex[dateIndex]);
    
    if (i == 1 || i%7 == 1) {
      if (tr !== null) {
        tableBody.appendChild(tr);
      }
      tr = this.buildRow(curDate);
    }
    
    tr.appendChild(td);
  }
  
  tableBody.appendChild(tr);
  tableDiv.appendChild(table);
  return tableDiv;
};

Exhibit.CalendarView.prototype.buildRow = function(date) {
  try {
  var self = this;
  var toDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  toDate = new Date(toDate.setDate(toDate.getDate()+6));

  var dom = SimileAjax.DOM.createDOMFromString('tr', '');
  dom.elmt.align = 'center';
  return dom.elmt;
} catch(e) {alert("buildRow: " + e.message);}
};

Exhibit.CalendarView.prototype.buildCell = function(date, cssClass, items, itemIndex) {
  try {
  var self = this;
  var dom = document.createElement('td');
  var cellNum = document.createElement('span');
  cellNum.innerHTML = date.getDate();
  cellNum.className = 'calendar-date-title';
  dom.appendChild(cellNum);
  if (itemIndex && itemIndex.length) {
    for (var x = 0; x < itemIndex.length && x < 4; x++) {
      var item = items[itemIndex[x]];
      var cell = document.createElement('span')
      cell.className = 'event-title';
      var cellLink = document.createElement('a');
      cellLink.href = Exhibit.Persistence.getItemLink(item.itemID);
      cellLink.setAttribute('ex:itemID', item.itemID)
      cellLink.innerHTML = item.label;
      cell.appendChild(cellLink);
      dom.appendChild(cell); 
      SimileAjax.WindowManager.registerEvent(cellLink, "click", function(elmt, evt, target) {
          Exhibit.ViewUtilities.openBubbleForItems(elmt, [elmt.getAttribute('ex:itemID')], self._uiContext);
      });
    } 
    if (itemIndex.length > 4) {
      var viewMore = document.createElement('span');
      var viewMoreLink = document.createElement('a');
      viewMoreLink.innerHTML = 'View More +';
      viewMoreLink.href = 'javascript:void';
      viewMoreLink.className = 'view-more';
      viewMore.appendChild(viewMoreLink);
      SimileAjax.WindowManager.registerEvent(viewMoreLink, "click", function(elmt, evt, target) {
          Exhibit.ViewUtilities.openBubbleForItems(elmt, itemIndex, self._uiContext);
      });

      dom.appendChild(viewMore);
    }
  }
  
  dom.className = [cssClass, 
                        'day', 
                        ((date.getDay() === 0 || date.getDay() == 6) ? 'weekend' : '')].join(' ');
  
  return dom;
  } catch(e) {alert("buildCell: " + e.message);}
};