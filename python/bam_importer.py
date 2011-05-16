import os
import subprocess
import tempfile

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
    wigFile = tempfile.NamedTemporaryFile(mode = "w", suffix = '.wig',
                                          prefix = "wig-cov-", delete = True)
    # get the list of reference seq metadata
    refs = bamFile.header['SQ']
    for ref in refs:
        wigFile.write("variableStep  chrom=%s\n" % (ref['SN'],))
        for pileupCol in bamFile.pileup(ref['SN']):
            # wiggle is 1-based, pysam is 0-based
            wigFile.write('%s %s\n' % (pileupCol.pos + 1, pileupCol.n))

    wigFile.flush()
    os.fsync(wigFile.fileno())

    wig2pngArgs = [wig2png, "--outdir", dataDir,
                   "--json-dir", os.path.join(dataDir, "tracks"),
                   "--track-label", trackLabel,
                   wigFile.name]
    retcode = subprocess.check_call(wig2pngArgs)
    wigFile.close()

    config['urlTemplate'] = "tracks/%s/{refseq}.json" % trackLabel
    writeTrackEntry(dataDir, 'ImageTrack', trackLabel,
                    key if key is not None else trackLabel,
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
