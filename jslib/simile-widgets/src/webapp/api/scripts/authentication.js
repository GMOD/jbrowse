Exhibit.Authentication = {};

// global flag for whether exhibit is authenticated
Exhibit.Authentication.Enabled = false;

// token given by Google AuthSubRequest service, passed to CGI scripts
// to authenticate exhibit user.
Exhibit.Authentication.GoogleToken = null;

// token returned from CGI script, after auth token is upgraded
// to a session token. once a session token is obtained, it should
// be used for all subsequent requests.
Exhibit.Authentication.GoogleSessionToken = null;

Exhibit.Authentication.authenticate = function() {
    if (!window.Exhibit.params.authenticated) {
        return;
    }

    var links = document.getElementsByTagName('head')[0].childNodes;
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        if (link.rel == 'exhibit/output' && link.getAttribute('ex:authenticated')) {
            Exhibit.Authentication.handleGoogleAuthentication();
            return;
        }
    }
    
}

Exhibit.Authentication.parseLocationParams = function() {
    var params = document.location.search.substr(1).split("&");
    var ret = {};
    for (var i = 0; i < params.length; i++) {
        var p = params[i];
        if (p.indexOf('=') != -1) {
            var components = p.split('=');
            if (components.length != 2) {
                SimileAjax.Debug.warn("Error parsing location parameter " + p);
            } else {
                ret[components[0]] = components[1];
            }
        } else {
            ret[p] = true;
        }
    }
    return ret;
}

Exhibit.Authentication.GoogleAuthenticationURL = "https://www.google.com/accounts/AuthSubRequest";

Exhibit.Authentication.handleGoogleAuthentication = function() {
    var params = Exhibit.Authentication.parseLocationParams();
    if (params.token) {
        Exhibit.Authentication.GoogleToken = params.token;
        Exhibit.Authentication.Enabled = true;
    } else {
        var authURL = Exhibit.Authentication.GoogleAuthenticationURL;
        authURL += '?session=1'; // server CGI script requires session authentication to perform multiple actions
        authURL += '&scope=http://spreadsheets.google.com/feeds/';
        authURL += '&next=' + document.location.href;
        document.location.href = authURL;
    }
}