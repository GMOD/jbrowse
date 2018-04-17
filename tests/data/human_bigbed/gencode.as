version: 4
fieldCount: 17
hasHeaderExtension: yes
isCompressed: yes
isSwapped: 0
extraIndexCount: 1
itemCount: 862
primaryDataSize: 40,104
primaryIndexSize: 6,212
zoomLevels: 6
chromCount: 1
as:
table gencode
"GENCODE genes"
   (
   string chrom;       "Reference sequence chromosome or scaffold"
   uint   chromStart;  "Start position in chromosome"
   uint   chromEnd;    "End position in chromosome"
   string name;        "Name of item."
   uint score;          "Score (0-1000)"
   char[1] strand;     "+ or - for strand"
   uint thickStart;   "Start of where display should be thick (start codon)"
   uint thickEnd;     "End of where display should be thick (stop codon)"
   uint reserved;     "Used as itemRgb as of 2004-11-22"
   int blockCount;    "Number of blocks"
   int[blockCount] blockSizes; "Comma separated list of block sizes"
   int[blockCount] chromStarts; "Start positions relative to chromStart"
   string geneId ;    "Gene ID"
   string geneName;   "Gene name"
   string method;     "Transcript type"
   string geneBioType; "Gene Biotype"
   string tags;       "Transcript attributes"
   )
basesCovered: 3,658,623
meanDepth (of bases covered): 4.979758
minDepth: 1.000000
maxDepth: 34.000000
std of depth: 4.242235
