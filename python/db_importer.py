import os
from json_generator import JsonGenerator

def dbImport(conn, query, chroms, outDir, chunkBytes=100000, compress=True):
    query += " order by Start asc, End desc"
    for chrom in chroms:
        cur = conn.cursor()
        cur.execute(query, (chrom,))
        classes = [[f[0] for f in cur.description]]
        jsongen = JsonGenerator(os.path.join(outDir, chrom),
                                chunkBytes, compress,
                                classes, isArrayAttr=[],
                                featureProtos=[{'Chrom': chrom}])
        for row in cur:
            jsongen.addSorted((0,) + row)

        jsongen.generateTrack()
        
        
