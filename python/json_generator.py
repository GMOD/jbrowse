from array import array
from gzip import GzipFile
import itertools
import json
import math
import shutil

from array_repr import ArrayRepr

class JsonGenerator:
    #this series of numbers is used in JBrowse for zoom level relationships
    multiples = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000,
                 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
    histChunkSize = 10000

    def __init__(outDir, chunkBytes, compress, label, featureProto,
                 refStart, refEnd, classes, featureCount = None):
        self.outDir = outDir
        self.chunkBytes = chunkBytes
        self.compress = compress
        self.label = label
        self.featureProto = featureProto
        self.refStart = refStart
        self.refEnd = refEnd
        self.ext = "jsonz" if compress else "json"
        self.count = 0

        # featureCount is an optional parameter; if we don't know
        # it, then arbitrarily estimate that there's 0.25 features
        # per base (0.25 features/base is pretty dense, which gives
        # us a relatively high-resolution histogram; we can always
        # throw away the higher-resolution histogram data later, so
        # a dense estimate is conservative.  A dense estimate does
        # cost more RAM, though)
        self.featureCount = (refEnd * 0.25) \
                            if (featureCount is None) \
                            else featureCount

        # histBinThresh is the approximate the number of bases per
        # histogram bin at the zoom level where FeatureTrack.js switches
        # to the histogram view by default
        histBinThresh = (refEnd * 2.5) / featureCount
        for multiple in multiples:
            self.histBinBases = multiple
            if multiple > histBinThresh:
                break

        # initialize histogram arrays to all zeroes
        self.hists = []
        for multiple in multiples:
            binBases = self.histBinBases * multiple
            self.hists.append(array('l', itertools.repeat(0, \
                              int(math.ceil(refEnd / float(binBases))))))
            if (binBases * 100) > refEnd:
                break

        if os.path.exists(outDir):
            shutil.rmtree(outDir)
        os.makedirs(outDir)

        lazyPathTemplate = os.path.append(outDir,
                                          "lazyfeatures-{chunk}." + self.ext)
        self.jenc = json.JSONEncoder(separators=(',', ':'))
        # output writes out the given data for the given chunk to the
        # appropriate file
        def output(toWrite, chunkId):
            path = re.sub("\{chunk\}", str(chunkId), lazyPathTemplate)
            self.writeJSON(path, self.jenc.encode(toWrite))

        # measure returns the size of the given object, encoded as JSON
        def measure(obj):
            return len(self.jenc.encode(obj))

        lazyClass = len(classes)
        classes = classes + ["Start", "End", "Chunk"]
        self.attrs = ArrayRepr(classes)
        def makeLazy(start, end, chunkId):
            return [start, end, chunkId]
        self.start = self.attrs.makeFastGetter("Start")
        self.end = self.attrs.makeFastGetter("End")
        self.features = LazyNCList(self.start,
                                   self.end,
                                   self.attrs.makeSetter("Sublist")
                                   makeLazy,
                                   measure,
                                   output,
                                   chunkBytes)

    def addSorted(self, feat):
        self.features.addSorted(feat)
        self.count += 1

        startBase = max(0, min(self.start(feat), self.refEnd))
        endBase = min(self.end(feat), self.refEnd)
        if endBase < 0:
            return

        for i in xrange(0, len(histograms) - 1):
            binBases = self.histBinBases * multiples[i]
            curHist = histograms[i]

            firstBin = startBase / binBases
            lastBin = int(math.ceil(startBase / float(binBases)))
            for j in xrange(firstBin, lastBin + 1):
                curHist[j] += 1

    @property
    def featureCount(self):
        return self.count

    @property
    def hasFeatures(self):
        return self.count > 0

    def generateTrack:
        self.features.finish()

        # approximate the number of bases per histogram bin at the zoom
        # level where FeatureTrack.js switches to histogram view, by default
        histBinThresh = (self.refEnd * 2.5) / float(self.count);

        # find multiple of base hist bin size that's just over histBinThresh
        for i in xrange(1, len(multiples)):
            if (self.histBinBases * multiples[i]) > histBinThresh:
                break

        histogramMeta = []
        jenc = json.JSONEncoder(separators=(',', ':'))
        # Generate more zoomed-out histograms so that the client doesn't
        # have to load all of the histogram data when there's a lot of it.
        for j in xrange(i - 1, len(multiples)):
            if j >= len(self.hists):
                break
            curHist = self.hists[j]
            histBases = self.histBinBases * multiples[j]

            chunkCount = int(math.ceil(len(curHist) / float(histChunkSize)))
            for chunk in xrange(0, chunkCount + 1):
                path = os.path.append(self.outDir,
                                      "hist-%i-%i.%s" %
                                      (histBases, chunk, self.ext) )
                self.writeJSON(path,
                               curHist[(chunk * histChunkSize)
                                       : ((chunk + 1) * histChunkSize) - 1] )

            histogramMeta.append(
                {
                    'basesPerBin': histBases,
                    'arrayParams': {
                        'length': len(curHist),
                        'urlTemplate':
                            "hist-%i-%i.%s" % (histBases, chunk, self.ext)
                        'chunkSize': histChunkSize
                    }
                }
            );

        histStats = []
        for j in xrange(i - 1, len(multiples)):
            if j >= len(self.hists):
                break
            binBases = self.histBinBases * multiples[j]
            histStats.append({'bases': binBases,
                              'max': max(self.hists[j]),
                              'mean': ( sum(self.hists[j]) /
                                        float(len(self.hists[j])) ) })

        trackData = 

        writeJSON(
            os.path.append(self.outDir, "trackData." + self.ext),
            {
                #'label': self.label,
                'classes': self.classes,
                'featureCount': self.count,
                'featureNCList': self.features.topLevel,
                'featureProto': self.featureProto,
                'lazyfeatureUrlTemplate': "lazyfeatures-{chunk}" + self.ext,
                'histogramMeta': histogramMeta,
                'histogramStats': histStats
            }
        )
            
    def writeJSON(self, path, data):
        if self.compress:
            fh = GzipFile(path, "w")
        else:
            fh = open(path, "w")
        fh.write(data)
        fh.close()
