from json_generator import JsonGenerator, writeTrackEntry

def delimImport(file, skipLines, colNames, dataDir, trackLabel,
                mungeCallback = None, key = None,
                delim = "\t", chunkBytes = 200000, compress = True,
                config = {'style': {'className': 'feature2'}} ):
    fh = open(file, 'r')
    data = [line.strip().split(delim) for line in fh.readlines()]
    fh.close()

    startIndex = colNames.index("Start")
    endIndex = colNames.index("End")
    chromIndex = colNames.index("Chrom")

    for item in data:
        if mungeCallback is not None:
            mungeCallback(item)
        item[startIndex]  = int(item[startIndex])
        item[endIndex]  = int(item[endIndex])

    def nclCmp(a, b):
        if a[chromIndex] != b[chromIndex]:
            return cmp(a[chromIndex], b[chromIndex]) 
        if a[startIndex] != b[startIndex]:
            return a[startIndex] - b[startIndex]
        return b[endIndex] - a[endIndex]

    data.sort(nclCmp)

    curRef = None
    jsongen = None
    for item in data:
        if item[chromIndex] != curRef:
            if jsongen is not None:
                jsongen.generateTrack()
            curRef = item[chromIndex]
            classMeta = [{'attributes': colNames,
                          'proto': {'Chrom': item[chromIndex]} } ]
            jsongen = JsonGenerator(dataDir, trackLabel, item[chromIndex],
                                    chunkBytes, compress, classMeta, key)
        jsongen.addSorted([0] + item)

    if (jsongen is not None) and (jsongen.hasFeatures):
        jsongen.generateTrack()

    config['urlTemplate'] = jsongen.urlTemplate
    writeTrackEntry(dataDir, 'FeatureTrack', trackLabel,
                    key if key is not None else trackLabel,
                    config)
    
    
