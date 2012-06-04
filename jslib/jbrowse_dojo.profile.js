var dependencies =   {
    prefixes: [
        ["dijit", "../dijit"]
    ],
    layers: [
        {
            dependencies: [
                "dojo.dnd.Source",
                "dojo.dnd.Moveable",
                "dojo.dnd.Mover",
                "dojo.dnd.move",
                "dijit.layout.ContentPane",
                "dijit.layout.BorderContainer",
                "dijit.Dialog",
                "dijit.form.Button",
                "dijit.form.ComboBox",
                "dojox.gfx.svg",
                "dojox.gfx.vml",
                "dojox.charting.Chart2D",
                "dojox.lang.functional"
            ],
            layerDependencies: [],
            name: "jbrowse_dojo.js",
            resourceName: "jbrowse_dojo"
        },
        {
            dependencies: [
                "dojox.grid.EnhancedGrid",
                'dojox.grid.enhanced.plugins.IndirectSelection',
                'dijit.layout.AccordionContainer',
                'dijit.layout.AccordionPane',
                'dojox.data.CsvStore',
                'dojox.data.JsonRestStore'
            ],
            layerDependencies: [ "jbrowse_dojo" ],
            name: "jbrowse_dojo_faceted_tracksel.js",
            resourceName: "jbrowse_dojo_faceted_tracksel"
        }
    ]
};
