BINDIR = bin
SRCDIR = src

CXX = g++
CXXFLAGS = -I/usr/X11/include -include $(SRCDIR)/config.h
LDFLAGS = -L/usr/X11/lib
LIBS = -lpng 
CXXARGS = $(CXXFLAGS) $(LDFLAGS) $(LIBS)

WIG2PNG_TARGET = $(BINDIR)/wig2png
WIG2PNG_SRCFILES = $(SRCDIR)/wig2png.cc $(SRCDIR)/opts_list.cc

TWIKI_PLUGIN_MAKEFILE = twiki/JBrowsePlugin/Makefile.jbrowse

all: $(WIG2PNG_TARGET)

clean:
	rm $(WIG2PNG_TARGET)

jbrowse: all
	$(MAKE) -f $(TWIKI_PLUGIN_MAKEFILE) all

$(WIG2PNG_TARGET): $(WIG2PNG_SRCFILES)
	$(CXX) $(CXXARGS) -o $@ $(WIG2PNG_SRCFILES)

.PHONY: all clean jbrowse

.SECONDARY:
