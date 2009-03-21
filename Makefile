JROOT = $(CURDIR)
JBROWSE_MAKEFILE = $(JROOT)/twiki/JBrowsePlugin/Makefile.jbrowse

GCC_INC_ARGS =
GCC_LIB_ARGS =
GCC_ARGS = $(GCC_LIB_ARGS) $(GCC_INC_ARGS)

default: binaries

all: binaries jbrowse

DELEGATED_PHONIES = jbrowse reference-sequences track-info name-index jbrowse-clean bed2gff
$(DELEGATED_PHONIES):
	make -f $(JBROWSE_MAKEFILE) JROOT=$(JROOT) $@

binaries: bin/wig2png

bin/wig2png: src/wig2png.cc
	g++ $(GCC_ARGS) -O3 -lpng -o bin/wig2png $<

clean:
	rm bin/wig2png

.PHONY: clean default binaries $(DELEGATED_PHONIES)

.SECONDARY:
