import os
from json_generator import JsonGenerator

# example call:
# snpQuery = 'select chromStart as Start, chromEnd as End, name as Name, transcript, frame, alleleCount, funcCodes, alleles, codons, peptides'
# db_importer.dbImport(conn, "snp132CodingDbSnp", snpQuery, "chromEnd", "chrom", "../data/tracks/snp132CodingDbSnp")
def dbImport(conn, table, query, endCol, chromCol, outDir,
             chunkBytes=200000, compress=True):
    query += " from %s where %s=? order by Start asc, End desc" \
             % (table, chromCol)
    cur = conn.execute("""
    select %(chrom)s, max(%(end)s), count(*) from %(table)s group by %(chrom)s
    """ % {'chrom': chromCol, 'end': endCol, 'table': table})
    chromList = cur.fetchall()
    for (chrom, refEnd, count) in chromList:
        cur = conn.execute(query, (chrom,))
        classes = [[f[0] for f in cur.description]]
        jsongen = JsonGenerator(os.path.join(outDir, chrom),
                                chunkBytes, compress,
                                classes, isArrayAttr=[{}],
                                refEnd = refEnd, writeHists = True,
                                featureProtos = [{'Chrom': chrom}],
                                featureCount = count)
        for row in cur:
            jsongen.addSorted([0] + list(row))

        jsongen.generateTrack()
        
        
