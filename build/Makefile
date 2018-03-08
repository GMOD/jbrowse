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


all: docs

release-version.txt:
	echo $(RELEASE_VERSION) > release-version.txt

release: release-version.txt release-normal release-min release-notes.html
	ls -lh *.zip
	$(SHASUM) *.zip

release-notest: release

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

node_modules:
	npm install

release-normal: superclean $(JS_SRCFILES) node_modules
	mkdir $(RELEASE_FULL_DIR);
	cp -R `ls -1d * | grep -v $(RELEASE_FULL)` $(RELEASE_FULL_DIR);
	rm -rf $(RELEASE_FULL_DIR)/src/*/.git $(RELEASE_FULL_DIR)/$(RELEASE_FULL) $(RELEASE_FULL_DIR)/src/util $(RELEASE_FULL_DIR)/build $(RELEASE_FULL_DIR)/node_modules;

	# zip up the dev release
	$(ZIP) $(RELEASE_FULL).zip $(RELEASE_FULL)/;

PLUGINS = $(wildcard $(PLUGINDIR)/*)

plugins-min: release-normal
	for pdir in $(PLUGINS); do  \
		pname=`basename $$pdir`; \
		node $(BASEDIR)/src/dojo/dojo.js load=build \
			--require "$(JSDIR)/init.js" \
			--profile "$$pdir/js/$$pname" \
			--releaseDir "$(RELEASE_FULL_DIR)/plugins/$$pname/built" \
			2>&1 | grep -v '^warn'; \
		rm -rf "$(RELEASE_FULL_DIR)/plugins/$$pname/js"; \
		mv "$(RELEASE_FULL_DIR)/plugins/$$pname/built/$$pname" "$(RELEASE_FULL_DIR)/plugins/$$pname/js"; \
		rm -rf "$(RELEASE_FULL_DIR)/plugins/$$pname/built"; \
		rm -rf "$(RELEASE_FULL_DIR)/plugins/$$pname/.git"; \
	done

release-min: release-normal plugins-min

        # run the dojo build in the full dir to minify
	node src/dojo/dojo.js \
		load=build \
		--require "$(JSDIR)/init.js" \
		--profile "$(JSDIR)/JBrowse.profile.js" \
		--releaseDir "$(RELEASE_FULL_DIR)/src" \
		2>&1 | grep -v '^warn';

	cp -a $(RELEASE_FULL_DIR) $(RELEASE_MIN_DIR);

	for P in src docs/jsdoc tests tests_extended build node_modules; do \
	    rm -rf $(RELEASE_MIN_DIR)$$P; \
	done;
	for P in src/dojo/dojo.js \
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
			src/jDataView \
	; do \
	    mkdir -p `dirname $(RELEASE_MIN_DIR)$$P`; \
	    if [ -d $$P ]; then \
		    cp -R $(RELEASE_FULL_DIR)$$P/ $(RELEASE_MIN_DIR)$$P; \
	    else \
		    cp -R $(RELEASE_FULL_DIR)$$P $(RELEASE_MIN_DIR)$$P; \
	    fi;\
	done

	cp -r $(RELEASE_MIN_DIR)/src/dojo/nls $(RELEASE_MIN_DIR)/src/nls;

	find $(RELEASE_MIN_DIR) -name '*.uncompressed.js' -or -name '*.consoleStripped.js' -exec rm {} ';'

        # zip it up
	$(ZIP) $(RELEASE_MIN).zip $(RELEASE_MIN)/;

superclean: clean
	git clean -fdxq --exclude=./plugins

clean:
	rm -rf docs/jsdoc *-min.js release-notes.html;

.PHONY: all clean superclean jbrowse docs doc release release-min release-normal plugins-min
