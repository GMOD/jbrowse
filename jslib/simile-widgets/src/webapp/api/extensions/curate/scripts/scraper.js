Exhibit.Scraper = function(elmt, uiContext, settings) {    
    if (!settings.scraperInput) {
        SimileAjax.Debug.warn('Scraper not given an input element!');
        return;
    }
    
    var input = this._input = SimileAjax.jQuery('#' + settings.scraperInput);

    input.val('');
    input.attr('disabled', false);

    var elmt = this._elmt = SimileAjax.jQuery(elmt);
    this._uiContext = uiContext;
    this._settings = settings;
    
    elmt.attr('href', 'javascript:');
    
    var scraper = this;
    elmt.click(function() { scraper.activate() });
}

Exhibit.Scraper._settingSpecs = {
    "scraperInput":  { type: "text" },
    "itemType":  { type: "text", defaultValue: "item" },
    "inputType": { type: "text", defaultValue: "auto" },
    "scraperService":  { type: "text", defaultValue: "http://valinor.mit.edu/sostler/scraper.cgi" }
};

Exhibit.UI.generateCreationMethods(Exhibit.Scraper);
Exhibit.UI.registerComponent('scraper', Exhibit.Scraper);

Exhibit.Scraper.prototype.activate = function() {
    var input = this._input.val();
    if (this._settings.inputType == 'auto') {
        if (input.startsWith('http://')) {
            this.scrapeURL(input);
        } else {
            this.scrapeText(input);
        }
    } else if (this._settings.inputType == 'text') {
        this.scrapeText(input);        
    } else if (this._settings.inputType.toLowerCase() == 'url') {
        this.scrapeURL(input);
    } else {
        SimileAjax.Debug.warn('Unknown scraper input type ' + this._settings.inputType);
    }
}

Exhibit.Scraper.prototype.disableUI = function() {
    this._input.attr('disabled', true);
    this._elmt.removeAttr('href');
    this._elmt.css('color', 'AAA');
    this._elmt.unbind();
}

Exhibit.Scraper.prototype.enableUI = function() {
    var scraper = this;
    this._input.attr('disabled', false);
    this._elmt.attr('href', 'javascript:');
    this._elmt.css('color', '');
    SimileAjax.jQuery(this._elmt).click(function() { scraper.activate() });
}

Exhibit.Scraper.prototype.scrapeURL = function(url) {
    this.disableUI();
    var scraper = this;
    
    var success = function(resp) {
        var status = resp.status;
        if (status == 'ok') {
            scraper.scrapePageSource(resp.obj);
        } else if (status == 'error') {
            alert("Error using scraper service!\n\n" + resp.obj);
        } else {
            alert('Unknown response from scraper service:\n\n' + status);
        }
        scraper.enableUI();
    }

    this.disableUI();
    
    SimileAjax.jQuery.ajax({
        url: this._settings.scraperService,
        dataType: 'jsonp',
        jsonp: 'callback',
        data: { url: url },
        success: success
    });
}

Exhibit.Scraper.prototype.scrapeText = function(text) {
    var title = null;
    var item = Exhibit.ScraperBackend.extractItemFromText(
        text, this._settings.itemType, this._uiContext.getDatabase());

    Exhibit.ItemCreator.makeNewItemBox(this._uiContext, item);
}

Exhibit.Scraper.prototype.scrapePageSource = function(pageSource) {
    var text = Exhibit.ScraperBackend.getTextFromPageSource(pageSource);
    
    var title = Exhibit.ScraperBackend.getTitleFromPageSource(pageSource);
    var item = Exhibit.ScraperBackend.extractItemFromText(
        text, this._settings.itemType, this._uiContext.getDatabase());
    
    Exhibit.ItemCreator.makeNewItemBox(this._uiContext, item, { title: title });
}

// The backend performs content extraction
Exhibit.ScraperBackend = {};

Exhibit.ScraperBackend.getTitleFromPageSource = function(pageSource) {
    var div = document.createElement('div');
    div.innerHTML = pageSource.replace(/\s+/g, ' ');
    
    var dom = SimileAjax.jQuery(div);
    var title = dom.find('title').text();
    
    return title;
}

// returns contents of all children textnodes of node argument
// from JavaScript: the Definitive Guide, by David Flanagan
Exhibit.ScraperBackend.getTextContents = function(node) {
    function getStrings(n, strings) {
        if (n.nodeType == 3) {
            strings.push(n.data);
        } else if (n.nodeType == 1) {
            for (var m = n.firstChild; m != null; m = m.nextSibling) {
                getStrings(m, strings)
            }
        }
    }
    var strings = [];
    getStrings(node, strings);
    return strings.join('');
}

Exhibit.ScraperBackend.getTextFromPageSource = function(pageSource) {
    var div = document.createElement('div');
    div.innerHTML = pageSource.replace(/\s+/g, ' ');
    
    // we ignore contents of style/script tags
    var children = div.childNodes;
    for (i=0; i < children.length; i++) {
        var node = children[i];
        if (node.nodeName.toLowerCase() == 'style' || node.nodeName.toLowerCase() == 'script') {
            div.removeChild(node);
        }
    }
    
    return Exhibit.ScraperBackend.getTextContents(div);
}

Exhibit.ScraperBackend.findMostCommon = function(substrings, text) {
    var maxCount = 0; // if none have more than 0, return null
    var maxSubstring = null;
    
    function countSubstrings(str, text) {
        str = str.toLowerCase();
        var count = 0;
        var index = null;

        while ((index = text.indexOf(str, index)) != -1) {
            count++;
            index += 1;
        }
        return count;
    }
    
    for (var i=0; i < substrings.length; i++) {
        var s = substrings[i];
        var count = countSubstrings(s, text);
        if (count > maxCount) {
            maxCount = count;
            maxSubstring = s;
        }
    };
    return maxSubstring;
}

Exhibit.ScraperBackend.extractItemFromText = function(text, itemType, db) {
    var item = { type: itemType };    
    var typeSet = new Exhibit.Set();
    typeSet.add(itemType);
    
    var subjects = db.getSubjectsUnion(typeSet, 'type');

    text = text.toLowerCase(); // ignore cases
    
    db.getAllProperties().forEach(function(prop) {
        var itemVals = db.getObjectsUnion(subjects, prop).toArray();
        var mostCommonItemValue = Exhibit.ScraperBackend.findMostCommon(itemVals, text);
        
        if (mostCommonItemValue) {
            item[prop] = mostCommonItemValue;
        }
    });
   
    return item;
}
