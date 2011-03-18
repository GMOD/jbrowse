BINDIR = bin
SRCDIR = src
JSDIR = js
JARDIR = jar

CXX = g++
CXXFLAGS = -I/usr/X11/include -include $(SRCDIR)/config.h
LDFLAGS = -L/usr/X11/lib
LIBS = -lpng 
CXXARGS = $(CXXFLAGS) $(LDFLAGS) $(LIBS)

WIG2PNG_TARGET = $(BINDIR)/wig2png
WIG2PNG_SRCFILES = $(SRCDIR)/wig2png.cc $(SRCDIR)/opts_list.cc

JSMIN_TARGET = jbrowse.js
JS_SRCFILES = $(wildcard $(JSDIR)/*.js)

TWIKI_PLUGIN_MAKEFILE = twiki/JBrowsePlugin/Makefile.jbrowse

all: $(WIG2PNG_TARGET)

clean:
	rm $(WIG2PNG_TARGET)

jbrowse: all
	$(MAKE) -f $(TWIKI_PLUGIN_MAKEFILE) all

$(WIG2PNG_TARGET): $(WIG2PNG_SRCFILES)
	$(CXX) $(CXXARGS) -o $@ $(WIG2PNG_SRCFILES)

minify-js: $(JSMIN_TARGET)

$(JSMIN_TARGET): $(JS_SRCFILES)
	java -jar $(JARDIR)/shrinksafe.jar $^ > $@
	if grep -q '<!-- js_source_files -->' index.html; then \
	    mv index.html index-debug.html; \
	    perl -pe 'BEGIN { undef $$/; }; s#<!-- js_source_files -->.*<!-- js_source_files -->#    <script type="text/javascript" src="$(JSMIN_TARGET)"></script>\n#ms' index-debug.html > index.html; \
	fi

.PHONY: all clean jbrowse minify-js

.SECONDARY:
