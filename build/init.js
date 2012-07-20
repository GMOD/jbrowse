require({
    baseUrl: '',
    packages: [
        // If you are registering a package that has an identical name and location, you can just pass a string
        // instead, and it will configure it using that string for both the "name" and "location" properties. Handy!
        'dojo',
        'dijit',
        'dojox',
        'JBrowse',
        'jszlib'
    ],

    tlmSiblingOfDojo: 0,

    cache: {}
}, [ 'JBrowse' ]);
