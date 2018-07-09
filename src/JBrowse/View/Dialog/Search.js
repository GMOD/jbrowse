define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/promise/all',
    'dojo/request',
    'dojo/aspect',
    'dijit/Dialog',
    'dijit/form/Button',
    'dijit/form/TextBox',
    'dijit/focus',
    'JBrowse/View/LocationList',
    'JBrowse/Util'
],
function (
    declare,
    array,
    dom,
    on,
    all,
    request,
    aspect,
    Dialog,
    Button,
    TextBox,
    dijitFocus,
    LocationListView,
    Util
) {
    return declare(null, {
        constructor: function (args) {
            this.browser = args.browser;
            this.config = dojo.clone(args.config || {});
            this.locationChoices = [{label: 'Search results...', description: ' ', start: 0, end: 100, ref: 'ctgA'}];
            this.title = args.title || 'Choose location';
            this.prompt = args.prompt;
            this.goCallback = args.goCallback;
            this.showCallback = args.showCallback;
        },

        show: function () {
            var dialog = this.dialog = new Dialog({
                title: this.title,
                className: 'locationChoiceDialog',
                style: { width: '70%' }
            });
            var container = dom.create('div', {});

            if (this.prompt) {
                dom.create('div', {
                    className: 'prompt',
                    innerHTML: this.prompt
                }, container);
                var subcontainer = dojo.create('div', { style: { 'padding': '20px' } }, container);
                dojo.create('img', { width: '16px', src: 'img/search.png', style: { 'padding-right': '5px' } }, subcontainer);
                this.searchBox = new TextBox({intermediateChanges: true}).placeAt(subcontainer);
                dojo.create('label', {style: {marginLeft: '20px'}, for: 'exact_match', innerHTML: 'Exact?'}, subcontainer);
                this.exactCheckbox = dojo.create('input', {type: 'checkbox', id: 'exact_match'}, subcontainer);

                on(this.searchBox, 'change', dojo.hitch(this, 'searchBoxProcess'));
                on(this.exactCheckbox, 'change', dojo.hitch(this, 'searchBoxProcess'));
            }
            var browser = this.browser;
            this.locationListView = new LocationListView(
                {
                    browser: browser,
                    locations: this.locationChoices,
                    buttons: [{
                        className: 'show',
                        innerHTML: 'Show',
                        onClick: this.showCallback || function (location) {
                            browser.showRegionAfterSearch(location);
                        }
                    },
                    {
                        className: 'go',
                        innerHTML: 'Go',
                        onClick: this.goCallback   || function (location) {
                            dialog.hide();
                            browser.showRegionAfterSearch(location);
                        }
                    }]
                },
                dom.create('div', {
                    className: 'locationList',
                    style: { maxHeight: 0.5 * this.browser.container.offsetHeight + 'px'}
                }, container)
            );


            this.actionBar = dojo.create('div', { className: 'infoDialogActionBar dijitDialogPaneActionBar' });
            new Button({
                iconClass: 'dijitIconDelete',
                label: 'Cancel',
                onClick: dojo.hitch(dialog, 'hide')
            }).placeAt(this.actionBar);

            var numresults = dojo.create('div', { id: 'numResults', style: {margin: '10px'} }, container);
            var errResults = dojo.create('div', { id: 'errResults', style: {margin: '10px', color: 'red'} }, container);
            dialog.set('content', [ container, this.actionBar ]);
            dialog.show();

            aspect.after(dialog, 'hide', dojo.hitch(this, function () {
                if (dijitFocus.curNode) {
                    dijitFocus.curNode.blur();
                }
                setTimeout(function () {
                    dialog.destroyRecursive();
                }, 500);
            }));
        },
        searchBoxProcess: function() {
            var loc = this.searchBox.get('value');
            if (!this.exactCheckbox.checked) {
                loc += "*";
            }
            this.browser.nameStore.query({ name: loc }).then((nameMatches) => {
                var promises = nameMatches.map((match) => this.browser.nameStore.query({ name: match.name }));
                Promise.all(promises).then((res) => {
                    var grid = [];
                    for(var i = 0; i < res.length; i++) {
                        elt = res[i];
                        if(elt.length) {
                            elt = elt[0];
                            if(elt.multipleLocations) {
                                for(var j = 0; j < elt.multipleLocations.length; j++) {
                                    grid.push({
                                        locstring: Util.assembleLocString(elt.multipleLocations[j]),
                                        location: elt.multipleLocations[j],
                                        label: elt.name,
                                        description: this.browser.trackConfigsByName[elt.multipleLocations[j].tracks[0].label].key,
                                        tracks: elt.multipleLocations[j].tracks[0]
                                    });
                                }
                            } else {
                                console.log(elt)
                                grid.push({
                                    locstring: Util.assembleLocString(elt.location),
                                    location: elt.location,
                                    label: elt.location.objectName,
                                    description: this.browser.trackConfigsByName[elt.location.tracks[0].label].key,
                                    tracks: elt.location.tracks[0]
                                });
                            }
                        }
                    }
                    var g = this.locationListView.grid;
                    (g.store || g.collection).setData(grid);
                    this.locationListView.grid.refresh();
                    errResults.innerHTML = '';
                });
            }, (err) => {
                console.error(err);
                var g = this.locationListView.grid;
                (g.store || g.collection).setData([]);
                this.locationListView.grid.refresh();
                numresults.innerHTML = '';
                errResults.innerHTML = 'Error: ' + err;
            });
        }
    });
});
