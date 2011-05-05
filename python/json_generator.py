from array import array
from gzip import GzipFile
import itertools
import json
import math
import os
import re
import shutil

from array_repr import ArrayRepr
from nclist import LazyNCList


class JsonIntervalWriter:
    def __init__(self, store, chunkBytes, lazyTempl, classes):
        self.store = store
        self.chunkBytes = chunkBytes
        self.lazyTempl = lazyTempl
        self.classes = classes

        # output writes out the given data for the given chunk to the
        # appropriate file
        def output(toWrite, chunkId):
            path = re.sub("\{Chunk\}", str(chunkId), self.lazyTempl)
            self.store.put(path, toWrite)

        jenc = json.JSONEncoder(separators=(',', ':'))
        # measure returns the size of the given object, encoded as JSON
        def measure(obj):
            # add 1 for the comma between features
            # (ignoring, for now, the extra characters for sublist brackets)
            return len(jenc.encode(obj)) + 1

        self.lazyClass = len(classes)
        classes.append({
            'attributes': ['Start', 'End', 'Chunk'],
            'isArrayAttr': {'Sublist': True}
            });
        attrs = ArrayRepr(classes)
        def makeLazy(start, end, chunkId):
            return [self.lazyClass, start, end, chunkId]
        start = attrs.makeFastGetter("Start")
        end = attrs.makeFastGetter("End")
        self.features = LazyNCList(start,
                                   end,
                                   attrs.makeSetter("Sublist"),
                                   makeLazy,
                                   measure,
                                   output,
                                   chunkBytes)

    def addSorted(self, feat):
        self.features.addSorted(feat)

    def finish(self):
        self.features.finish()
        return {
            'classes': self.classes,
            'lazyClass': self.lazyClass,
            'nclist': self.features.topLevel,
            'urlTemplate': self.lazyTempl
        }


class JsonHistWriter:
    #this series of numbers is used in JBrowse for zoom level relationships
    multiples = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000,
                 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
    histChunkSize = 10000

    def __init__(self, store, refEnd, classes, featureCount = None):
        self.store = store
        self.refEnd = refEnd
        self.attrs = ArrayRepr(classes)
        self.start = self.attrs.makeFastGetter("Start")
        self.end = self.attrs.makeFastGetter("End")
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
        for multiple in self.multiples:
            self.histBinBases = multiple
            if multiple > histBinThresh:
                break

        # initialize histogram arrays to all zeroes
        self.hists = []
        for multiple in self.multiples:
            binBases = self.histBinBases * multiple
            self.hists.append(array('l', itertools.repeat(0, \
                              int(math.ceil(refEnd / float(binBases))) + 1)) )
            # somewhat arbitrarily cut off the histograms at 100 bins
            if (binBases * 100) > refEnd:
                break

    def addFeature(self, feat):
        self.count += 1
        startBase = max(0, min(self.start(feat), self.refEnd))
        endBase = min(self.end(feat), self.refEnd)
        if endBase < 0:
            return

        for i in xrange(0, len(self.hists) - 1):
            binBases = self.histBinBases * self.multiples[i]
            curHist = self.hists[i]

            firstBin = startBase / binBases
            lastBin = int(math.ceil(startBase / float(binBases)))
            for j in xrange(firstBin, lastBin + 1):
                curHist[j] += 1

    def finish(self):
        # approximate the number of bases per histogram bin at the zoom
        # level where FeatureTrack.js switches to histogram view, by default
        histBinThresh = (self.refEnd * 2.5) / float(self.count);

        # find multiple of base hist bin size that's just over histBinThresh
        for i in xrange(1, len(self.multiples)):
            if (self.histBinBases * self.multiples[i]) > histBinThresh:
                break

        histogramMeta = []
        # Generate more zoomed-out histograms so that the client doesn't
        # have to load all of the histogram data when there's a lot of it.
        for j in xrange(i - 1, len(self.hists)):
            curHist = self.hists[j]
            histBases = self.histBinBases * self.multiples[j]

            chunkCount = int(math.ceil(len(curHist)
                                       / float(self.histChunkSize)))
            for chunk in xrange(0, chunkCount + 1):
                path = os.path.join("hist-%i-%i.%s" %
                                    (histBases, chunk, self.store.ext) )
                self.store.put(path,
                               list(curHist[(chunk * self.histChunkSize)
                                            : ((chunk + 1)
                                               * self.histChunkSize) - 1] ) )

            histogramMeta.append(
                {
                    'basesPerBin': histBases,
                    'arrayParams': {
                        'length': len(curHist),
                        'urlTemplate':
                            "hist-%i-{Chunk}.%s" % (histBases, self.store.ext),
                        'chunkSize': self.histChunkSize
                    }
                }
            );

        histStats = []
        for j in xrange(i - 1, len(self.hists)):
            binBases = self.histBinBases * self.multiples[j]
            histStats.append({'bases': binBases,
                              'max': max(self.hists[j]),
                              'mean': ( sum(self.hists[j]) /
                                        float(len(self.hists[j])) ) })

        return {
            'meta': histogramMeta,
            'stats': histStats
        }


class JsonFileStorage:
    def __init__(self, outDir, compress):
        self.outDir = outDir
        self.ext = "jsonz" if compress else "json"
        self.compress = compress
        if os.path.exists(outDir):
            shutil.rmtree(outDir)
        os.makedirs(outDir)

    def put(self, path, obj):
        if self.compress:
            fh = GzipFile(os.path.join(self.outDir, path), "w")
        else:
            fh = open(os.path.join(self.outDir, path), "w")
        json.dump(obj, fh, check_circular = False, separators = (',', ':'))
        fh.close()


class JsonGenerator:
    def __init__(self, outDir, chunkBytes, compress, classes,
                 refEnd = None, writeHists = False, featureCount = None):
        self.store = JsonFileStorage(outDir, compress)
        self.outDir = outDir
        self.chunkBytes = chunkBytes
        self.refEnd = refEnd
        self.writeHists = writeHists
        self.count = 0

        # the client code interprets this URL template as being
        # relative to the directory containing the "trackData.json" file
        lazyTempl = "lazyfeatures-{Chunk}." + self.store.ext
        self.intervalWriter = JsonIntervalWriter(self.store, chunkBytes,
                                                 lazyTempl, classes)
        if writeHists:
            assert((refEnd is not None) and (refEnd > 0))
            self.histWriter = JsonHistWriter(self.store, refEnd,
                                             classes, featureCount)

    def addSorted(self, feat):
        self.count += 1
        self.intervalWriter.addSorted(feat)
        if self.writeHists:
            self.histWriter.addFeature(feat)

    @property
    def featureCount(self):
        return self.count

    @property
    def hasFeatures(self):
        return self.count > 0

    def generateTrack(self):
        trackData = {
            'featureCount': self.count,
            'intervals': self.intervalWriter.finish(),
            'formatVersion': 1
        }

        if self.writeHists:
            trackData['histograms'] = self.histWriter.finish()

        self.store.put(
            os.path.join("trackData." + self.store.ext),
            trackData
        )
