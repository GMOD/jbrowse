Exhibit.SubmissionBackend = {};

Exhibit.SubmissionBackend.formatChanges = function(itemChanges, submissionProperties) {
    return itemChanges.map(function(change) {
        var item = { id: change.id, label: change.label || change.id };
                
        // google data API only accepts lower-case property names
        
        SimileAjax.jQuery.each(change.vals || {}, function(prop, val) {
            prop = prop.toLowerCase();
            item[prop] = val.newVal;
        });
        
        SimileAjax.jQuery.each(submissionProperties, function(prop, val) {
            prop = prop.toLowerCase();
            if (prop in item) {
                throw "Collision between change property and submission property "
                        + prop + ": " + item[prop] + ", " + val;
            } else {
                item[prop] = val;
            }
        });

        return item;
    });
};

Exhibit.SubmissionBackend.SubmissionDefaults = {
    'gdoc': {
        'url': 'http://valinor.mit.edu/sostler/gdocbackend.cgi',
    }
};

Exhibit.SubmissionBackend.getOutputOptions = function() {
    var links = $('head link[rel="exhibit/output"]');
    if (links.length == 0) {
        throw "No output link provided";
    } else if (links.length > 1) {
        SimileAjax.Debug.warn('Multiple output links provided; ignoring all but the first');
    }

    var opts = { url: null, data: {}};
    
    opts.url = links.attr('ex:url') || Exhibit.SubmissionBackend.SubmissionDefaults.gdoc.url;
        
    if (links.attr('ex:spreadsheetKey')) {
        opts.data.spreadsheetkey = links.attr('ex:spreadsheetKey');        
    }
    
    if (links.attr('ex:worksheetIndex')) {
        opts.data.worksheetindex = links.attr('ex:worksheetIndex');
    } else if (links.attr('ex:worksheetName')) {
        opts.data.worksheetname = links.attr('ex:worksheetName');
    } else {
        opts.data.worksheetindex = '0'; // default to first worksheet in spreadsheet
    }
        
    return opts;
};

Exhibit.SubmissionBackend.googleAuthSuccessWrapper = function(fSuccess) {
    return function(resp) {
        SimileAjax.Debug.log('wrapped');
        SimileAjax.Debug.log(resp);
        if (resp.session) {
            Exhibit.Authentication.GoogleSessionToken = resp.session;
        }
        fSuccess(resp);
    };
}

Exhibit.SubmissionBackend._submitChanges = function(changes, options, fSuccess, fError) {
    options.data.json = SimileAjax.JSON.toJSONString(changes);
    
    // if authentication is enabled, authentication token must be provided.
    if (Exhibit.Authentication.Enabled) {
        if (Exhibit.Authentication.GoogleSessionToken) {
            options.data.session = Exhibit.Authentication.GoogleSessionToken;
        } else if (Exhibit.Authentication.GoogleToken) {
            options.data.token = Exhibit.Authentication.GoogleToken;
            fSuccess = Exhibit.SubmissionBackend.googleAuthSuccessWrapper(fSuccess);
        } else {
            SimileAjax.Debug.warn('Authentication is enabled, but no tokens are present');
        }
    }
    
    $.ajax({
        url: options.url,
        data: options.data,
        dataType: 'jsonp',
        jsonp: 'callback',
        success: fSuccess,
        error: fError
    });
}

Exhibit.SubmissionBackend.submitAllChanges = function(uiContext, fSuccess, fError) {
    var opts = Exhibit.SubmissionBackend.getOutputOptions();
    var changes = uiContext.getDatabase().collectAllChanges();
    
    var formattedChanges = Exhibit.SubmissionBackend.formatChanges(
        changes, 
        Exhibit.Submission.Properties);
        
    Exhibit.SubmissionBackend._submitChanges(formattedChanges, opts, fSuccess, fError);
}

Exhibit.SubmissionBackend.submitItemChanges = function(uiContext, itemID, fSuccess, fError) {
    var opts = Exhibit.SubmissionBackend.getOutputOptions();
    var changes = uiContext.getDatabase().collectChangesForItem(itemID);
    
    var formattedChanges = Exhibit.SubmissionBackend.formatChanges(
        [changes],
        Exhibit.Submission.Properties);
        
    Exhibit.SubmissionBackend._submitChanges(formattedChanges, opts, fSuccess, fError);
}