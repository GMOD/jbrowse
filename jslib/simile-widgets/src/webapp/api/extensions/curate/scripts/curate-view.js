
(function () {
    
var $ = SimileAjax.jQuery;
    
//=============================================================================
// Exhibit View Boilerplate
//=============================================================================


Exhibit.CurateView = function(containerElmt, uiContext) {
    this._div = $(containerElmt).addClass('CurateView');
    this._uiContext = uiContext;
    this._settings = {};
    this._accessors = {};
    this._submissions = null;
    uiContext.getCollection().addListener(this);
}

Exhibit.CurateView._settingSpecs = {
    adminURL:     { type: "text", defaultValue: "admin.py" }
};

Exhibit.CurateView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.CurateView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );

    Exhibit.SettingsUtilities.collectSettings(
        configuration,
        Exhibit.CurateView._settingSpecs,
        view._settings);

    view._initializeUI();
    return view;
};

Exhibit.CurateView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.CurateView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );

    Exhibit.SettingsUtilities.collectSettingsFromDOM(
        configElmt, 
        Exhibit.CurateView._settingSpecs, 
        view._settings);

    Exhibit.SettingsUtilities.collectSettings(
        configuration, 
        Exhibit.CurateView._settingSpecs, 
        view._settings);

    view._initializeUI();
    return view;
};

Exhibit.CurateView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this);
    this._div.innerHTML = "";
    this._div = null;
    this._uiContext = null;
    this._settings = null;
    this._accessors = null;
    this._submissions = null;
}


//=============================================================================
// Misc functions
//=============================================================================


Exhibit.CurateView.prototype.adminURL = function() {
    return this._settings.adminURL;
}

function toJSON(obj) {
    return SimileAjax.JSON.toJSONString(obj);
}

function button(text, callback) {
    return $('<input type="button">').val(text).click(callback);
}

function nameForProperty(prop) {
    return exhibit.getDatabase().getProperty(prop).getLabel();
}


//=============================================================================
// UI functionality
//=============================================================================


function makeDismissalHandler(div, s) {
    return function() {
        div.find('.buttonDiv').attr('disabled', true);
        
        var answer = confirm("Are you sure you want to remove this " +
            "submission? This action cannot be undone!");
        if (answer) {
            var msg = { 'command': 'dismiss', 'sub_id': s.sub_id };
            $.get(view.adminURL(), 'message=' + toJSON(msg),
                function() { div.remove() });
        }
    }
}

function makeApprovalMessage(div, s) {
    var edits = div.find('.edit').map(function() {
        var edit = { 
            label: $(this).attr('label'),
            values: {}
        };
        
        $(this).find('input[property]').each(function() {
            var prop = $(this).attr('property');
            var val = $(this).val();
            edit.values[prop] = val;
        });
        
        return edit;
    });
    
    return {
        sub_id: s.sub_id,
        edits: edits
    };
}

function makeApprovalHandler(view, div, s) {
    return function() {
        toJSON(makeApprovalMessage(div, s));
    }
}

function makeEdit(view, div, submission, edit) {
    var div = $('<div>')
        .addClass('edit')
        .attr('label', edit.label);
    
    var title = edit.type == 'modified' ?
        'Changes to ' + edit.label :
        'New Item (' + edit.label + ')';

    div.append($('<div>').addClass('header').append(title));
    
    var table = $('<table>').appendTo(div);
    edit.values.forEach(function(val) {
        
        var input = $('<input>')
            .val(val.value)
            .attr('property', val.property);
        
        table.append($('<tr>').addClass('value').append(
            $('<td>').append(nameForProperty(val.property)),
            $('<td>').append(input),
            $('<td>').append($('<input type="checkbox">'))
       ));
    });
        
    
    return div;
}


function makeSubmission(view, div, s) {
    var div = $('<div>').addClass('submission').attr('sub_id', s.sub_id);
    
    if (s.comment) {
        div.append($('<p>').text("Submittor's comment: " + s.comment));
    }
    
    s.edits.forEach(function(e) {
       div.append(makeEdit(view, div, s, e)) 
    });
    
    var buttonDiv = $('<div>').addClass('buttonDiv').append(
        button('Dismiss', makeDismissalHandler(view, div, s)),
        button('Approve', makeApprovalHandler(view, div, s)));
            
    div.append(buttonDiv);

    return div;
}

function makeSubmissionHandler(view) {
   return function(submissions) {
       Exhibit.CurateView._submissions = submissions;
       view._div.empty();
       view._div.append($('<h1>').text('Submissions'));
       
       submissions.forEach(function(s) {
           view._div.append(makeSubmission(view, view._div, s));
       });
       
   };
}

Exhibit.CurateView.prototype._initializeUI = function() {
    var submissionLink = $('head link[rel=exhibit/submissions]');
    if (submissionLink.length > 0)  {
        var url = submissionLink.attr('href');
        
        $.getJSON(url, makeSubmissionHandler(this));
        this._div.append($('<h1>').text('Loading...'));
    } else {
        this._div.append($('<h1>').text("No submission link was provided!"));
    }
}


})();
