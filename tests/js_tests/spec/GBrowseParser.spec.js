require(['JBrowse/ConfigAdaptor/conf'], function (gbrowseConfigAdaptor) {
  describe('GBrowse-like config file parser', function () {
    var gbrowse = new gbrowseConfigAdaptor()
    var gbConfig

    // run the script with GBrowseParseTestBasic.conf as input
    // to test different kinds of input
    // config file => ./spec/GBrowseParseTestBasic.conf

    it('should parse', function () {
      gbrowse
        .load({
          config: { url: 'spec/GBrowseParseTestBasic.conf' },
        })
        .then(
          function (c) {
            gbConfig = c
          },
          function (error) {
            console.error(error.stack || '' + error)
          },
        )

      waitsFor(function () {
        return gbConfig
      })
      runs(function () {
        expect(typeof gbConfig).toEqual('object')
        expect(gbConfig['TRACK DEFAULTS']).toBeTruthy()
        expect(gbConfig['TRACK DEFAULTS']['glyph']).toBe('generic')
        expect(gbConfig['TRACK DEFAULTS']['height']).toBe(8)
        expect(gbConfig['TRACK DEFAULTS']['bgcolor']).toBe('#fefefe')
        expect(gbConfig['TRACK DEFAULTS']['fgcolor']).toBe('black')
        expect(gbConfig['TRACK DEFAULTS']['label density']).toBe(25)
        expect(gbConfig['TRACK DEFAULTS']['bump density']).toBe(25)
        expect(gbConfig['TRACK DEFAULTS']['fogbat']).toBe('')

        expect(gbConfig['Markers:region']).toBeTruthy()
        expect(gbConfig['Markers:region']['feature']).toBe(
          'match:ITAG_sgn_markers',
        )
        expect(gbConfig['Markers:region']['ignore_sub_part']).toBe('match_part')
        expect(gbConfig['Markers:region']['key']).toBe('Markers')
        expect(gbConfig['Markers:region']['fgcolor']).toBe('black')
        expect(gbConfig['Markers:region']['bgcolor']).toBe('yellow')
        expect(gbConfig['Markers:region']['glyph']).toBe('generic')
        expect(gbConfig['Markers:region']['label density']).toBe(100)
        expect(gbConfig['Markers:region']['bump density']).toBe(100)
        expect(gbConfig['Markers:region']['link']).toBe(
          '/search/quick?term=$name',
        )
        expect(gbConfig['Markers:region']['citation']).toBe(
          'GenomeThreader alignments of SGN marker sequences.',
        )

        expect(gbConfig['DM_BAC']).toBeTruthy()
        expect(gbConfig['DM_BAC']['feature']).toBe(
          '\"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_sg\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_sb\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_lg\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_lb\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_hg\" \"BAC_clone:DBolser_Dundee_BES_SSAHA_dm_bes_hb\"',
        )
        expect(gbConfig['DM_BAC']['citation']).toBe(
          'BAC ends from the \'POTATO-B-01-100-110KB\' library aligned using SSAHA2. The clone ends pair correctly (solid connector) or not (dashed connector), and are color coded by insert-size.  Provided by Dan Bolser, <a href="http://www.compbio.dundee.ac.uk/">University of Dundee</a>.',
        )

        expect(gbConfig['sub']['section']['giant word']).toBe(
          'Antidisestablishmentarianism',
        )
        expect(gbConfig['sub']['section']['multiline']).toBe('herp derp')
        expect(gbConfig['sub']['section']['fancyMultiline']).toBe(
          'Le herp derp',
        )
        expect(gbConfig.sub.section.array.length).toBe(3)
        expect(gbConfig.sub.section.array[0]).toBe(1)
        expect(gbConfig.sub.section.array[1]).toBe(2)
        expect(gbConfig.sub.section.array[2]).toBe(3)
        expect(gbConfig.sub.section.inline.subsection.deeply).toBe('hihi')
        expect(gbConfig.sub.section.inline.con.spaces).toBe('hoho')

        expect(gbConfig.threshold).toBe(-1234221e-2)

        expect(gbConfig.em.bedded.json.myjson.length).toBe(2)
        expect(gbConfig.em.bedded.json.myjson[0].zee).toBe('hallo')
        expect(gbConfig.em.bedded.json.myjson[1]).toBe(53)

        expect(
          gbConfig.function_testing.randomNumberTitle.charAt(
            gbConfig.function_testing.randomNumberTitle.length - 1,
          ),
        ).toBe('}')

        expect(
          gbConfig.function_testing.alertTest.charAt(
            gbConfig.function_testing.alertTest.length - 1,
          ),
        ).toBe('}')

        expect(gbConfig.array_of_objects.foo[0].nog).toBe(1)
        expect(gbConfig.array_of_objects.foo[1].egg).toBe(2)

        expect(gbConfig.array_of_objects.bar[0]).toBe('one')
        expect(gbConfig.array_of_objects.bar[1]).toBe('two')
        expect(gbConfig.array_of_objects.bar[2]).toBe('three and a half')
        expect(gbConfig.array_of_objects.bar[3]).toBe('four')
      })
    })
  })
})
