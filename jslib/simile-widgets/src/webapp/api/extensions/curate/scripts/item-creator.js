Exhibit.ItemCreator = function(elmt, uiContext, settings) {
    var db = uiContext.getDatabase();

    if (elmt.nodeName.toLowerCase() == 'a') {
        elmt.href = "javascript:";
    }
    
    SimileAjax.jQuery(elmt).click(function() {
        if (Exhibit.ItemCreator.ItemBoxPresent) { return; }
        var item = { type: settings.itemType };
        Exhibit.ItemCreator.makeNewItemBox(uiContext, item, settings);
    });
    
    SimileAjax.jQuery(elmt).addClass('exhibit-itemCreator');
    
    return elmt;
}

Exhibit.ItemCreator._settingSpecs = {
    "itemType":             { type: "text",    defaultValue: "Item" },
    "automaticallySubmit":  { type: "boolean", defaultValue: false },
    "submissionMessage":    { type: "text" },
    "cancelButtonText":     { type: "text",    defaultValue: "Cancel" },
    "createButtonText":     { type: "text",    defaultValue: "Add Item" }
};

Exhibit.UI.generateCreationMethods(Exhibit.ItemCreator);
Exhibit.UI.registerComponent('item-creator', Exhibit.ItemCreator);

Exhibit.ItemCreator.ItemBoxPresent = false;

Exhibit.ItemCreator.makeNewItemID = function(db, type) {
    var typeLabel = db.getType(type).getLabel();
    
    var seed = "Untitled " + typeLabel;
    var count = "";
    var name = seed;
    
    while (db.containsItem(name)) {
        count++;
        name = seed + ' ' + count;
    }
    
    return name;
}

Exhibit.ItemCreator.makeNewItemBox = function(uiContext, item, opts) {
    Exhibit.ItemCreator.ItemBoxPresent = true;
    SimileAjax.jQuery('.exhibit-itemCreator').css('color', 'AAA');
    
    var db = uiContext.getDatabase();
    opts = opts || {};
    
    var box = $("<div>" +
        "<h1 class='exhibit-focusDialog-header' id='boxHeader'></h1>" +
        "<div class='exhibit-focusDialog-viewContainer' id='itemContainer'></div>" +
        "<div class='exhibit-focusDialog-controls'>" +
            "<button id='cancelButton' style='margin-right: 2em'>Cancel</button>" +
            "<button id='createButton' style='margin-left: 2em'>Add Item</button>" +
        "</div>" +
    "</div>");

    if (opts.title) {
        box.find('#boxHeader').text(opts.title);
    } else {
        box.find('#boxHeader').remove();
    }
    
    if (opts.cancelButtonText) {
        box.find('#cancelButton').text(opts.cancelButtonText);
    }
    
    if (opts.createButtonText) {
        box.find('#createButton').text(opts.createButtonText);
    }

    box.addClass('exhibit-focusDialog').addClass("exhibit-ui-protection");
    box.css({
      top: document.body.scrollTop + 100 + 'px',
      background: "#EEE repeat",
      paddingBottom: "0px"
    });

    item.type = item.type || 'item';
    item.id = item.id || Exhibit.ItemCreator.makeNewItemID(db, item.type);
    item.label = item.label || item.id;

    db.addItem(item);

    var itemDiv = box.find('#itemContainer').get(0);
        
    uiContext.getLensRegistry().createEditLens(item.id, itemDiv, uiContext, {
        disableEditWidgets: true
    });
    
    var uiCleanupFunc = function() {
        box.remove();
        Exhibit.ItemCreator.ItemBoxPresent = false;
        SimileAjax.jQuery('.exhibit-itemCreator').css('color', '');
    };
    
    box.find('#cancelButton').click(function() {
        uiCleanupFunc();
        database.removeItem(item.id);
    });
    
    box.find('#createButton').click(function() {
       if (opts.automaticallySubmit) {
           box.find('.exhibit-focusDialog-controls button').attr("disabled", "disabled");

           var fSuccess = function() {
               database.fixChangesForItem(item.id);
               uiCleanupFunc();
               if (opts.submissionMessage) {
                   alert(opts.submissionMessage);
               }
               
           };
           
           var fError = function(xhr, textStatus, errorThrown) {
               alert("Error saving new item to server!\n\n" + textStatus);
               box.find('.exhibit-focusDialog-controls button').removeAttr("disabled");
           };
           
           Exhibit.SubmissionBackend.submitItemChanges(uiContext, item.id, fSuccess, fError);
       } else {
           uiCleanupFunc();
       }
    });
    
    box.appendTo(document.body);
}