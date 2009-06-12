GCC_INC_ARGS =
GCC_LIB_ARGS =
GCC_ARGS = $(GCC_LIB_ARGS) $(GCC_INC_ARGS)

TWIKI_PLUGIN_MAKEFILE = twiki/JBrowsePlugin/Makefile.jbrowse

all: bin/wig2png

clean:
	rm bin/wig2png

jbrowse: all
	$(MAKE) -f $(TWIKI_PLUGIN_MAKEFILE) all

bin/wig2png: src/wig2png.cc
	g++ $(GCC_ARGS) -O3 -lpng -o bin/wig2png $<

.PHONY: all clean jbrowse

.SECONDARY:
