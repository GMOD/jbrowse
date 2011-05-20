import os
import subprocess
import tempfile
import urllib

import pysam

from json_generator import JsonGenerator, writeTrackEntry

modPath = os.path.abspath(__file__)
wig2png = os.path.join(os.path.split(os.path.split(modPath)[0])[0],
                       "bin", "wig2png")

class BamNotSortedError:
    pass

def bamCoverageImport(bamPath, dataDir, trackLabel, key = None,
                      config = {}):
    bamFile = pysam.Samfile(bamPath, 'rb')
    plusWig = tempfile.NamedTemporaryFile(mode = "w", suffix = '.wig',
                                          prefix = "wig-cov-",
                                          delete = True)
    minusWig = tempfile.NamedTemporaryFile(mode = "w", suffix = '.wig',
                                           prefix = "wig-cov-",
                                           delete = True)

    # get the list of reference seq metadata
    refs = bamFile.header['SQ']
    for ref in refs:
        plusWig.write("variableStep  chrom=%s\n" % (ref['SN'],))
        minusWig.write("variableStep  chrom=%s\n" % (ref['SN'],))
        for pileupCol in bamFile.pileup(ref['SN']):
            minusReads = sum(1 if rd.alignment.is_reverse else 0
                             for rd in pileupCol.pileups)
            plusReads = pileupCol.n - minusReads
            # wiggle is 1-based, pysam is 0-based
            plusWig.write('%s %d\n' % (pileupCol.pos + 1, plusReads))
            minusWig.write('%s %d\n' % (pileupCol.pos + 1, -minusReads)) 

    
    for (strand, wigFile, color) in [("+", plusWig, "121,199,76"),
                                     ("-", minusWig, "74,131,237")]:
        wigFile.flush()
        os.fsync(wigFile.fileno())

        outDir = os.path.join(dataDir, "tracks", trackLabel + "_" + strand)
        if not os.path.exists(outDir):
            os.makedirs(outDir)

        wig2pngArgs = [wig2png,
                       "--outdir", outDir,
                       "--foreground-color", color,
                       wigFile.name]
        retcode = subprocess.check_call(wig2pngArgs)
        wigFile.close()

        config['urlTemplate'] = ("tracks/%s/{refseq}/trackData.json"
                                 % urllib.quote(trackLabel + "_" + strand))
        writeTrackEntry(dataDir, 'ImageTrack', trackLabel + "_" + strand,
                        key + " " + strand
                        if key is not None
                        else trackLabel + "_" + strand,
                        config)


def bamImport(path, dataDir, trackLabel, key = None, chunkBytes = 200000,
              compress = True, config = None):
    defaultSEConfig = {
        'style': {
            'className': 'basic',
            'featureCss': 'background-color: #66F; height: 8px',
            'histCss': 'background-color: #88F'
            }
        }
    SEAttrs = ['Start', 'End', 'Strand', 'Name',
               'Quality', 'Sequence', 'Cigar', 'BAMFlag']
    
    bamFile = pysam.Samfile(path, 'rb')
    # check that the bam file is sorted by coordinate
    if bamFile.header['HD']['SO'] != 'coordinate':
        raise BamNotSortedError

    # get the list of reference seq metadata
    refs = bamFile.header['SQ']

    curTid = None
    jsongen = None
    for read in bamFile.fetch():
        if curTid != read.tid:
            if jsongen is not None:
                jsongen.generateTrack()

            classMeta = [{
                'attributes': SEAttrs,
                'proto': {'Chrom': refs[read.tid]['SN']}
                }]
            jsongen = JsonGenerator(dataDir, trackLabel, refs[read.tid]['SN'],
                                    chunkBytes, compress, classMeta,
                                    key = key, writeHists = False)
        jsongen.addSorted([0, read.pos, read.aend,
                           -1 if read.is_reverse else 1,
                           read.qname, read.qual, read.seq,
                           read.cigar, read.flag])
    if (jsongen is not None) and (jsongen.hasFeatures):
        jsongen.generateTrack()
