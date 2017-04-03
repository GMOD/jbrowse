BASEDIR = $(PWD)

JSDIR = $(BASEDIR)/src/JBrowse
PLUGINDIR = $(BASEDIR)/plugins
JS_SRCFILES = $(shell find $(JSDIR)/ -type f -and -name '*.js')

CSS_SRCFILES = $(shell find $(BASEDIR)/ -type f -and -name '*.css')

RELEASE_VERSION = $(shell node -e 'require("fs").readFile("$(JSDIR)/package.json", function(e,d){console.log(JSON.parse(d).version)})')
RELEASE_NAME = JBrowse-$(RELEASE_VERSION)
RELEASE_FULL = $(RELEASE_NAME)-dev
RELEASE_FULL_DIR = $(BASEDIR)/$(RELEASE_FULL)/
RELEASE_MIN  = $(RELEASE_NAME)
RELEASE_MIN_DIR  = $(BASEDIR)/$(RELEASE_MIN)/
RELEASE_DESKTOP_OSX = $(RELEASE_NAME)-desktop-osx
RELEASE_DESKTOP_WIN = $(RELEASE_NAME)-desktop-win
#RELEASE_DESKTOP_LINUX = $(RELEASE_NAME)-desktop-linux

ZIP=zip -q --symlinks -r
UNZIP=unzip -q
SHASUM=shasum


all: docs bin/wig2png

release-version.txt:
	echo $(RELEASE_VERSION) > release-version.txt

release: release-version.txt release-normal release-min release-normal-test release-min-test release-notes.html
	ls -lh *.zip
	$(SHASUM) *.zip

release-notest: release-version.txt release-normal release-min release-notes.html
	ls -lh *.zip
	$(SHASUM) *.zip

release-electron-darwin: release-notest
	cd $(RELEASE_MIN)&&./setup.sh legacy&&cd ..
	npm install
	electron-packager $(RELEASE_MIN) JBrowseDesktop --platform=darwin --arch=x64
	$(ZIP) $(RELEASE_DESKTOP_OSX).zip JBrowseDesktop-darwin-x64
	
release-electron-all: release-notest
	echo "Building desktop packages..."
	cd $(RELEASE_MIN)&&./setup.sh legacy&&cd ..
	npm install
	# build all versions
	#   electron-packager $(RELEASE_MIN) JBrowseDesktop --platform=all --arch=x64
	# build specific versions
	electron-packager $(RELEASE_MIN) JBrowseDesktop --platform=darwin --arch=x64
	electron-packager $(RELEASE_MIN) JBrowseDesktop --platform=win32 --arch=ia32
	# zap files that cause problems on windows (because of colons in filenames)
	find JBrowseDesktop-win32-ia32 -type f -name "*.3pm" -delete &> /dev/null
	# zip packages
	$(ZIP) $(RELEASE_DESKTOP_OSX).zip JBrowseDesktop-darwin-x64
	$(ZIP) $(RELEASE_DESKTOP_WIN).zip JBrowseDesktop-win32-ia32
	#	$(ZIP) $(RELEASE_DESKTOP_LINUX).zip JBrowseDesktop-linux-x64

release-notes.html: release-notes.txt
	build/format_release_notes.pl $< > $@

release-normal: superclean $(JS_SRCFILES)
	mkdir $(RELEASE_FULL_DIR);
	cp -R `ls -1d * | grep -v $(RELEASE_FULL)` $(RELEASE_FULL_DIR);
	rm -rf $(RELEASE_FULL_DIR)/src/*/.git $(RELEASE_FULL_DIR)/$(RELEASE_FULL) $(RELEASE_FULL_DIR)/src/util $(RELEASE_FULL_DIR)/build;

        # version-stamp Browser.js
	perl -i -pE 's!(?<=BUILD_SYSTEM_JBROWSE_VERSION);! = "$(RELEASE_VERSION)";!' $(JSDIR)/Browser.js;

        # date stamp the release notes
	perl -MDateTime -i -pE 'BEGIN{ $$datestring = DateTime->from_epoch( epoch => time(), time_zone => DateTime::TimeZone->new(name => "local"))->format_cldr(q|yyyy-MM-dd HH:mm:ss VVVV|)}; s/\{\{\$$NEXT\}\}\s*/# Release $(RELEASE_VERSION)     $$datestring\n/m' $(RELEASE_FULL_DIR)/release-notes.txt
	cp $(RELEASE_FULL_DIR)/release-notes.txt .;
	perl -i -pE 'say "{{\$$NEXT}}\n" unless $$x++' release-notes.txt;

        # zip up the dev release
	$(ZIP) $(RELEASE_FULL).zip $(RELEASE_FULL)/;

release-normal-test: release-normal
        # unzip to make sure we are looking at what's really in the releases
	rm -rf $(RELEASE_FULL_DIR);
	$(UNZIP) $(RELEASE_FULL).zip
	cd $(RELEASE_FULL_DIR) \
	  && ./setup.sh legacy \
	  && prove -Isrc/perl5 -r -j3 tests/perl_tests;


PLUGINS = $(wildcard $(PLUGINDIR)/*)

plugins-min: release-normal
	for pdir in $(PLUGINS); do  \
		pname=`basename $$pdir`; \
		node $(BASEDIR)/src/dojo/dojo.js load=build \
			--require "$(JSDIR)/init.js" \
			--profile "$$pdir/js/$$pname" \
			--releaseDir "$(RELEASE_FULL_DIR)/plugins/$$pname/built"; \
		rm -rf "$(RELEASE_FULL_DIR)/plugins/$$pname/js"; \
		mv "$(RELEASE_FULL_DIR)/plugins/$$pname/built/$$pname" "$(RELEASE_FULL_DIR)/plugins/$$pname/js"; \
		rm -rf "$(RELEASE_FULL_DIR)/plugins/$$pname/built"; \
	done

release-min: release-normal plugins-min

        # run the dojo build in the full dir to minify
	node src/dojo/dojo.js load=build --require "$(JSDIR)/init.js" --profile "$(JSDIR)/JBrowse.profile.js" --releaseDir "$(RELEASE_FULL_DIR)/src";

	cp -a $(RELEASE_FULL_DIR) $(RELEASE_MIN_DIR);

	for P in src docs/jsdoc tests tests_extended build; do \
	    rm -rf $(RELEASE_MIN_DIR)$$P; \
	done;
	for P in 	src/wig2png \
			src/dojo/dojo.js \
			`find src/ -name nls -and -type d -and -not -wholename '*/tests/*' | grep -v src/dojox/grid` \
			src/dojo/resources \
			src/dojox/grid \
			src/dojox/gfx/vml.js \
			src/dojox/form/resources \
			src/dojox/gfx/vml_attach.js \
			src/dijit/themes/tundra \
			src/dijit/form/templates \
			src/dijit/icons \
			src/dijit/templates \
			src/JBrowse \
			src/perl5 \
			src/dgrid/css \
	; do \
	    mkdir -p `dirname $(RELEASE_MIN_DIR)$$P`; \
	    if [ -d $$P ]; then \
		    cp -R $(RELEASE_FULL_DIR)$$P/ $(RELEASE_MIN_DIR)$$P; \
	    else \
		    cp -R $(RELEASE_FULL_DIR)$$P $(RELEASE_MIN_DIR)$$P; \
	    fi;\
	done

	mv $(RELEASE_MIN_DIR)/src/dojo/nls $(RELEASE_MIN_DIR)/src/nls;

	find $(RELEASE_MIN_DIR) -name '*.uncompressed.js' -or -name '*.consoleStripped.js' -exec rm {} ';'

        # zip it up
	$(ZIP) $(RELEASE_MIN).zip $(RELEASE_MIN)/;

release-min-test: release-min
        # unzip to make sure we are looking at what's really in the releases
	rm -rf $(RELEASE_MIN_DIR);
	$(UNZIP) $(RELEASE_MIN).zip
	rm $(RELEASE_MIN_DIR)/sample_data/raw/volvox
	cp -R docs tests* sample_data $(RELEASE_MIN_DIR);
	cd $(RELEASE_MIN_DIR) && ./setup.sh legacy
	cd $(RELEASE_MIN_DIR) && prove -Isrc/perl5 -r -j3 tests/perl_tests;

bin/wig2png: src/wig2png/Makefile
	$(MAKE) -C src/wig2png;
src/wig2png/Makefile: src/wig2png/configure
	cd src/wig2png && ./configure
src/wig2png/configure: src/wig2png/configure.in
	cd src/wig2png && autoconf

superclean: clean
	-git clean -fdx --exclude=plugins/ \
	    --exclude src/FileSaver/ \
	    --exclude src/dbind/ \
	    --exclude src/dgrid/ \
	    --exclude src/dstore/ \
	    --exclude src/dijit/ \
	    --exclude src/dojo/ \
	    --exclude src/dojox/ \
	    --exclude src/jDataView/ \
	    --exclude src/json-schema/ \
	    --exclude src/jszlib/ \
	    --exclude src/lazyload/ \
	    --exclude src/put-selector/ \
	    --exclude src/util/ \
	    --exclude src/xstyle/ 

clean:
	rm -rf docs/jsdoc *-min.js release-notes.html;

.PHONY: all clean superclean jbrowse docs doc release release-min release-normal release-normal-test release-min-test plugins-min
