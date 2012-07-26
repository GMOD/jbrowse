BASEDIR = $(PWD)

JSDIR = $(BASEDIR)/src/JBrowse
JS_SRCFILES = $(shell find $(JSDIR)/ -type f -and -name '*.js')

RELEASE_VERSION = $(shell node -e 'require("fs").readFile("$(JSDIR)/package.json", function(e,d){console.log(JSON.parse(d).version)})')
RELEASE_NAME = JBrowse-$(RELEASE_VERSION)
RELEASE_FULL = $(RELEASE_NAME)-full
RELEASE_FULL_DIR = $(BASEDIR)/$(RELEASE_NAME)-full/
RELEASE_MIN  = $(RELEASE_NAME)-min
RELEASE_MIN_DIR  = $(BASEDIR)/$(RELEASE_NAME)-min/

ZIP=zip -q --symlinks -r

all: docs bin/wig2png

release: release-normal release-min release-normal-test release-min-test release-notes.html

release-notes.html: release-notes.txt
	markdown release-notes.txt > $@

release-normal: superclean $(JS_SRCFILES)
	mkdir $(RELEASE_FULL_DIR);
	-cp -r * $(RELEASE_FULL_DIR);
	rm -rf $(RELEASE_FULL_DIR)/src/*/.git $(RELEASE_FULL_DIR)/$(RELEASE_FULL) $(RELEASE_FULL_DIR)/src/util $(RELEASE_FULL_DIR)/build;

	( cd $(BASEDIR)/src/util/buildscripts && node ../../dojo/dojo.js load=build --require "$(BASEDIR)/build/init.js" --profile "$(JSDIR)/JBrowse.profile.js" --releaseDir "$(RELEASE_FULL_DIR)/src"; )
	for HTMLFILE in index compat_121; do \
	  perl -pe "s/(?<=data-dojo-config=\")[^\"]+\"/deps: ['JBrowse'], async: 1\"/;" $$HTMLFILE.html > "$(RELEASE_FULL_DIR)/$$HTMLFILE.html"; \
	done;

        # date stamp the release notes
	perl -MDateTime -i -pE 'BEGIN{ $$datestring = DateTime->from_epoch( epoch => time(), time_zone => DateTime::TimeZone->new(name => "local"))->format_cldr(q|yyyy-MM-dd HH:mm:ss VVVV|)}; s/\{\{\$$NEXT\}\}\s*/$(RELEASE_VERSION)     $$datestring\n/m' $(RELEASE_FULL_DIR)/release-notes.txt
	cp $(RELEASE_FULL_DIR)/release-notes.txt .;
	perl -i -pE 'say "{{\$$NEXT}}\n" unless $$x++' release-notes.txt;
	$(ZIP) $(RELEASE_FULL).zip $(RELEASE_FULL)/;

release-normal-test: release-normal
	cd $(RELEASE_FULL_DIR) \
	  && ./setup.sh \
	  && prove -Isrc/perl5 -r -j3 tests/perl_tests;

release-min: release-normal
	cp -a $(RELEASE_FULL_DIR) $(RELEASE_MIN_DIR);
	for P in src docs/jsdoc tests tests_extended sample_data build; do \
	    rm -rf $(RELEASE_MIN_DIR)$$P; \
	done;
	for P in src/wig2png src/dojo/dojo.js src/dojo/nls src/dojo/resources src/dojox/grid src/dijit/themes/tundra src/dijit/icons src/JBrowse src/perl5; do \
	    mkdir -p `dirname $(RELEASE_MIN_DIR)$$P`; \
	    cp -r $(RELEASE_FULL_DIR)$$P $(RELEASE_MIN_DIR)$$P; \
	done
	$(ZIP) $(RELEASE_MIN).zip $(RELEASE_MIN)/;

release-min-test: release-min
	cd $(RELEASE_MIN_DIR) && ./setup.sh;

bin/wig2png: src/wig2png/Makefile
	$(MAKE) -C src/wig2png;
src/wig2png/Makefile: src/wig2png/configure
	cd src/wig2png && ./configure
src/wig2png/configure: src/wig2png/configure.in
	cd src/wig2png && autoconf

docs: doc

doc: docs/jsdoc/index.html

docs/jsdoc/index.html: $(JS_SRCFILES)
	cd src/jsdoc_toolkit-*/ && java -jar jsrun.jar app/run.js -a -t=templates/jsdoc -d=../../docs/jsdoc $(JS_SRCFILES)

superclean: clean
	-git clean -fdx

clean:
	rm -rf docs/jsdoc *-min.js release-notes.html;

.PHONY: all clean superclean jbrowse docs doc release release-min release-normal release-normal-test release-min-test
