require(['JBrowse/ConfigAdaptor/gbrowse'], function ( gbrowseConfigAdaptor ) {
    describe( 'GBrowse config file parser', function() {
        var gbrowse = new gbrowseConfigAdaptor();
        var gbConfig;

        // run the script with GBrowseParseTestBasic.conf as input
        // to test different kinds of input
        // config file => ./spec/GBrowseParseTestBasic.conf

        it('should return a javascript object', function() {
            var gbrowseArgs = {
                config: { url: 'spec/GBrowseParseTestBasic.conf' },
                onSuccess: function( c ) {
                        gbConfig = c;
                },
                onFailure: function( error ) {
                    console.error(error);
                }
            };
            gbrowse.load(gbrowseArgs);

            waitsFor( function() { return gbConfig; } );
            runs(function() {
                expect( typeof gbConfig).toEqual('object');
            });
        });

        it ("should return correct values", function(){

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

            expect(gbConfig['DM_BAC']).toBeTruthy();
            expect(gbConfig['DM_BAC']['feature'  ]).toBe('\"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_sg\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_sb\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_lg\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_lb\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_hg\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_hb\"');
            expect(gbConfig['DM_BAC']['citation' ]).toBe('BAC ends from the \'POTATO-B-01-100-110KB\' library aligned using SSAHA2. The clone ends pair correctly (solid connector) or not (dashed connector), and are color coded by insert-size.  Provided by Dan Bolser, <a href="http://www.compbio.dundee.ac.uk/">University of Dundee</a>.');

            expect(gbConfig['sub']['section']['giant word']).toBe('Antidisestablishmentarianism');
            expect(gbConfig['sub']['section']['multiline']).toBe('herp derp');
            expect(gbConfig['sub']['section']['fancyMultiline']).toBe('Le herp derp');
            
            var x = gbConfig.function_testing.meaningOfLife();
            expect(x).toBe(42);

        });
    });
});
