__webpack_public_path__ = '../../dist/'

import 'babel-polyfill'

var jasmine = window.jasmine
var jasmineEnv = jasmine.getEnv()
jasmineEnv.updateInterval = 1000

var htmlReporter = new jasmine.HtmlReporter()

jasmineEnv.addReporter(htmlReporter)
jasmineEnv.specFilter = function (spec) {
  return htmlReporter.specFilter(spec)
}

window.addEventListener('load', function (event) {
  jasmineEnv.execute()
})

cjsRequire('./spec/ExportGFF3.spec.js')
cjsRequire('./spec/QueryParamConfigMapper.spec.js')
cjsRequire('./spec/LazyArray.spec.js')
cjsRequire('./spec/FeatureLayout.spec.js')
cjsRequire('./spec/BigWig.spec.js')
cjsRequire('./spec/ConfigManager.spec.js')
cjsRequire('./spec/BAM.spec.js')
cjsRequire('./spec/CRAM.spec.js')
cjsRequire('./spec/Util.spec.js')
cjsRequire('./spec/AddFiles.spec.js')
cjsRequire('./spec/GBrowseParser.spec.js')
cjsRequire('./spec/NestedFrequencyTable.spec.js')
cjsRequire('./spec/TabixIndex.spec.js')
cjsRequire('./spec/RESTStore.spec.js')
cjsRequire('./spec/RegularizeRefSeqs.spec.js')
cjsRequire('./spec/GFF3.spec.js')
cjsRequire('./spec/SPARQLStore.spec.js')
cjsRequire('./spec/SequenceChunkStore.spec.js')
cjsRequire('./spec/GFF3Tabix.spec.js')
cjsRequire('./spec/BEDTabix.spec.js')
cjsRequire('./spec/BED.spec.js')
cjsRequire('./spec/TwoBit.spec.js')
cjsRequire('./spec/SequenceTrack.spec.js')
cjsRequire('./spec/VCF.spec.js')
cjsRequire('./spec/BigBed.spec.js')
cjsRequire('./spec/Hash.spec.js')
cjsRequire('./spec/Hierarchical.spec.js')
