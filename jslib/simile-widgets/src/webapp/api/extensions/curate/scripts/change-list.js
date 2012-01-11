//=============================================================================
// ChangeListView
// Tracks changes made to Exhibit items through item changing interfaces, and
// provides an interface for enabling/disabling changes, and submitting the
// changes to a backend data source.
//=============================================================================

//=============================================================================
// Setup
//=============================================================================

Exhibit.ChangeList = function(elmt, uiContext, settings) {
    this._div = SimileAjax.jQuery(elmt);
    this._uiContext = uiContext;
    this._settings = settings;
    
    uiContext.getDatabase().addListener(this);
    
    // this.addMockData();
    this._initializeUI();
}

Exhibit.ChangeList._settingSpecs = {
    submissionText:  { type: "text", defaultValue: "Thanks for your submission! It has been sent to the exhibit author for approval." },
    placeholderText: { type: "text", defaultValue: "To begin editing this exhibit, click the 'edit' links on the exhibit items." },
    maxValueLength:     { type: "int", defaultValue: 50 },
    trunctationString:  { type: "text", defaultValue: "..." }
};

Exhibit.UI.generateCreationMethods(Exhibit.ChangeList);
Exhibit.UI.registerComponent('change-list', Exhibit.ChangeList);

// set to true after successful submission; triggers displaying of submissionText
Exhibit.ChangeList.showSubmissionText = false;

Exhibit.ChangeList.prototype.dispose = function() {
    this._uiContext.getDatabase().removeListener(this);
    this._div.innerHTML = "";
    this._div = null;
    this._uiContext = null;
    this._settings = null;
}

Exhibit.ChangeList.prototype.onAfterLoadingItems = function() {
    this._initializeUI();
}

Exhibit.ChangeList.prototype.addMockData = function(view) {
    this._uiContext.getDatabase().addItem({
        label: 'Gone With The Wind',
        type: 'book',
        author: 'Margaret Mitchell',
        year: '1936',
        availability: 'available',
        owner: 'Sarah',
        description: "Goin' down south"
    });
    this._uiContext.getDatabase().editItem('White Noise', 'year', '1990');
    this._uiContext.getDatabase().editItem('White Noise', 'label', 'White Noice');
}


//=============================================================================
// UI templating
//=============================================================================

Exhibit.ChangeList.defaultMaxValueLength = 50;
Exhibit.ChangeList.defaultTrunctationString = "...";

Exhibit.ChangeList.prototype.makePlaceholder = function() {
    var placeHolder = SimileAjax.jQuery('<span>').addClass('placeholderMessage')
    if (Exhibit.ChangeList.showSubmissionText) {
        Exhibit.ChangeList.showSubmissionText = false;
        placeHolder.text(this._settings.submissionText);
    } else {
        placeHolder.text(this._settings.placeholderText);
    }
    return placeHolder;
}

Exhibit.ChangeList.prototype.renderPropChange = function(prop, oldVal, newVal) {
    var span = function(t, c, title) { 
        if (title) {
            return SimileAjax.jQuery('<span>').text(t).addClass(c).attr('title', title);            
        } else {
            return SimileAjax.jQuery('<span>').text(t).addClass(c);
        }

    };
    var div = SimileAjax.jQuery('<div>').addClass('property-change');

    var title;
    var truncLength = this._settings.trunctationString.length;
    if (newVal.length - truncLength > this._settings.maxValueLength) {
        title = newVal;
        newVal = newVal.slice(0, this._settings.maxValueLength - truncLength) + '...';
    }

    if (oldVal) {
        div.append(
            span(prop, 'property-name'), ' was changed from ', 
            span(oldVal, 'old-value'), ' to ', 
            span(newVal, 'new-value', title));
    } else {
        div.append(
            span(prop, 'property-name'), ' was set to ', 
            span(newVal, 'new-value', title));
    }

    return div;
}

Exhibit.ChangeList.prototype.renderItem = function(item) {
    var labelText = item.label + " was " + item.changeType;
    var div = SimileAjax.jQuery('<div>').append(
        SimileAjax.jQuery('<div>')
            .text(labelText)
            .addClass('change-label')
    );
    
    for (var prop in item.vals) {
        var v = item.vals[prop];
        div.append(this.renderPropChange(prop, v.oldVal, v.newVal));
    }

    return div;
}

Exhibit.ChangeList.prototype._initializeUI = function() {
    this._div.empty();
    var view = this;
    var changes = this._uiContext.getDatabase().collectAllChanges();
    
    changes.sort(function(a,b) { return a.label > b.label });

    if (changes.length == 0) {
        this._div.append(this.makePlaceholder());
        if (Exhibit.Submission) {
            Exhibit.Submission.disableWidgets();   
        }
    } else {
        if (Exhibit.Submission) {
            Exhibit.Submission.enableWidgets();   
        }
        changes.forEach(function(item) {
            view._div.append(view.renderItem(item));
        });
    }
}