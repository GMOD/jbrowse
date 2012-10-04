define(['dojo','JBrowse/parse'], function (parse) {

describe( 'GMOD config file parser', function() {

    // run the script with shortened ITAG2.3_genomic.conf.mas as input
    // to test different kinds of input
    // config file => GBrowseParseTestBasic.conf

    var xhrArgs = {
        url: "spec/GBrowseParseTestBasic.conf",
        handleAs: "text",
        load: function(data){
            gbConfig = parseGBConfig(data);
        }
    }

    var data = dojo.xhrGet(xhrArgs);

    it ("Check the gbConfig values", function(){

        expect(gbConfig).toBeTruthy();

        expect(gbConfig['TRACK DEFAULTS']).toBeTruthy();
        expect(gbConfig['TRACK DEFAULTS']['glyph'           ]).toBe('generic');
        expect(gbConfig['TRACK DEFAULTS']['height'          ]).toBe(8);
        expect(gbConfig['TRACK DEFAULTS']['bgcolor'         ]).toBe('cyan');
        expect(gbConfig['TRACK DEFAULTS']['fgcolor'         ]).toBe('black');
        expect(gbConfig['TRACK DEFAULTS']['label density'   ]).toBe(25);
        expect(gbConfig['TRACK DEFAULTS']['bump density'    ]).toBe(25);

        expect(gbConfig['Markers:region']).toBeTruthy();
        expect(gbConfig['Markers:region']['feature'         ]).toBe('match:ITAG_sgn_markers');
        expect(gbConfig['Markers:region']['ignore_sub_part' ]).toBe('match_part');
        expect(gbConfig['Markers:region']['key'             ]).toBe('Markers');
        expect(gbConfig['Markers:region']['fgcolor'         ]).toBe('black');
        expect(gbConfig['Markers:region']['bgcolor'         ]).toBe('yellow');
        expect(gbConfig['Markers:region']['glyph'           ]).toBe('generic');
        expect(gbConfig['Markers:region']['label density'   ]).toBe(100);
        expect(gbConfig['Markers:region']['bump density'    ]).toBe(100);
        expect(gbConfig['Markers:region']['link'            ]).toBe('/search/quick?term=$name');
        expect(gbConfig['Markers:region']['citation'        ]).toBe('GenomeThreader alignments of SGN marker sequences.');

    });
});
});
