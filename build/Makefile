BASEDIR = $(PWD)
JSDIR = $(BASEDIR)/src/JBrowse
JS_SRCFILES = $(shell find $(JSDIR)/ -type f -and -name '*.js')
RELEASE_VERSION = $(shell node -e 'require("fs").readFile("$(JSDIR)/package.json", function(e,d){console.log(JSON.parse(d).version)})')
RELEASE_NAME = JBrowse-$(RELEASE_VERSION)
RELEASE_FULL = $(RELEASE_NAME)-full
RELEASE_MIN  = $(RELEASE_NAME)-min
DISTDIR=$(BASEDIR)/dist

all: dist docs $(BASEDIR)/bin/wig2png

release: release-normal release-min release-normal-test release-min-test release-notes.html

release-notes.html: release-notes.txt
	markdown release-notes.txt > $@

release-normal: superclean docs dist
	rm -rf $(RELEASE_NAME)-*/;
	mkdir $(RELEASE_FULL);
	-cp -r * $(RELEASE_FULL)/;
	rm -rf $(RELEASE_FULL)/src/*/.git;
	rmdir $(RELEASE_FULL)/$(RELEASE_FULL);

        # date stamp the release notes
	perl -MDateTime -i -pE 'BEGIN{ $$datestring = DateTime->from_epoch( epoch => time(), time_zone => DateTime::TimeZone->new(name => "local"))->format_cldr(q|yyyy-MM-dd HH:mm:ss VVVV|)}; s/\{\{\$$NEXT\}\}\s*/1.4.1     $$datestring\n/m' $(RELEASE_NAME)-full/release-notes.txt
	cp JBrowse-*-full/release-notes.txt .;
	perl -i -pE 'say "{{\$$NEXT}}\n" unless $$x++' release-notes.txt;

	zip -r $(RELEASE_FULL).zip $(RELEASE_FULL)/;

release-normal-test: release-normal
	cd JBrowse-*-full;
	./setup.sh;
	prove -Isrc/perl5 -r -j3 tests/perl_tests;

release-min: release-normal
	cp -a $(RELEASE_FULL)/ $(RELEASE_MIN)/;
	rm -rf $(RELEASE_MIN)/{index-debug.html,/src/JBrowse,docs/jsdoc,tests,tests_extended,sample_data};
	zip -r $(RELEASE_MIN).zip $(RELEASE_MIN)/;
	cd $(RELEASE_MIN) && ./setup.sh;

release-min-test: release-min
	cd JBrowse-*-min;
	./setup.sh;

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

dist: $(JS_SRCFILES)
	rm -rf $(DISTDIR);
	#mkdir $(DISTDIR);
	( cd $(BASEDIR)/src/util/buildscripts && node ../../dojo/dojo.js load=build --require "$(BASEDIR)/build/init.js" --profile "$(JSDIR)/JBrowse.profile.js" --releaseDir "$(DISTDIR)/src"; )
	for HTMLFILE in index compat_121; do \
	  perl -pe "s/(?<=data-dojo-config=\")[^\"]+\"/deps: ['JBrowse'], async: 1\"/;" $(BASEDIR)/$$HTMLFILE.html | grep -v JBrowse/run.js > "$(DISTDIR)/$$HTMLFILE.html"; \
	done;

superclean: clean
	-git clean -fdx;

clean:
	-mv index-debug.html index.html;
	-mv compat_121-debug.html compat_121.html;
	rm -rf docs/jsdoc *-min.js release-notes.html;

.PHONY: all clean superclean jbrowse docs doc release release-min release-normal release-normal-test release-min-test dist
