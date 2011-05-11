import os
from json_generator import JsonGenerator

# example call:
# snpQuery = 'select chromStart as Start, chromEnd as End, name as Name, transcript, frame, alleleCount, funcCodes, alleles, codons, peptides from snp132CodingDbSnp where chrom=%s'
# db_importer.dbImport(cur, "snp132CodingDbSnp", snpQuery, "chromEnd", "chrom", "../data/", "snp132CodingDbSnp")
def dbImport(cur, table, query, endCol, chromCol, dataDir,
             trackLabel, key = None, chunkBytes = 200000,
             compress = True,
             config = {'style': {'className': 'feature2'}}):
    cur.execute("""
    select %(chrom)s, max(%(end)s), count(*) from %(table)s group by %(chrom)s
    """ % {'chrom': chromCol, 'end': endCol, 'table': table})
    chromList = cur.fetchall()
    for (chrom, refEnd, count) in chromList:
        cur.execute(query, (chrom,))
        classes = [{
            'attributes': [f[0] for f in cur.description],
            'proto': {'Chrom': chrom}
            }]
        jsongen = JsonGenerator(dataDir, trackLabel, chrom, chunkBytes,
                                compress, classes, refEnd = refEnd,
                                writeHists = True, featureCount = count)
        for row in cur:
            jsongen.addSorted([0] + list(row))

        jsongen.generateTrack()
    jsongen.writeTrackEntry('FeatureTrack', config)
        
        
