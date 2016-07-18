
# JavaScript dependencies
dep:
	bower install dojo/dojo dojo/dijit dojo/dojox dojo/util

bower:
	npm install -g bower

# data files
# chromosomal bands
cytoBand.txt.gz:
	curl -O http://hgdownload.cse.ucsc.edu/goldenpath/hg19/database/cytoBand.txt.gz

cytoBand.txt: cytoBand.txt.gz
	gunzip $<

# segmental duplications
GRCh37GenomicSuperDup.tab:
	curl -O http://humanparalogy.gs.washington.edu/build37/data/GRCh37GenomicSuperDup.tab

GRCh37GenomicSuperDup.links: GRCh37GenomicSuperDup.tab
	cat $< | cut -f 1,2,3,7,8,9 | sed '1,1d' >$@

# GC content
hg19.gc5Base.txt.gz:
	curl -O http://hgdownload.cse.ucsc.edu/goldenPath/hg19/gc5Base/hg19.gc5Base.txt.gz

BINGC = perl -e 'my$$newspan=shift;my($$sum,$$n,$$seq,$$s,$$e,$$span);sub p{print"$$seq $$s $$e ",$$sum/$$n,"\n"if$$n;$$sum=$$n=0;$$s=undef}while(<>){if(/variableStep chrom=(\S+) span=(\d+)/){my($$newseq,$$newspan)=($$1,$$2);p();($$seq,$$span)=($$newseq,$$newspan);warn $$_}else{my@f=split;next unless $$seq=~/^chr(\d+|[XY])$$/;$$s=$$f[0] unless defined$$s;$$e=$$f[0]+$$span-1;$$sum+=$$f[1];$$n++;if(($$e+1-$$s)>=$$newspan){p()}}}if(defined$$s){p()}'

hg19.gc10Mb.txt:
	gzcat hg19.gc5Base.txt.gz | $(BINGC) 1e7 >$@

hg19.gc1Mb.txt:
	gzcat hg19.gc5Base.txt.gz | $(BINGC) 1e6 >$@
