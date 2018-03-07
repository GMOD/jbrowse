BASEDIR = $(PWD)

JSDIR = $(BASEDIR)/src/JBrowse
PLUGINDIR = $(BASEDIR)/plugins
JS_SRCFILES = $(shell find $(JSDIR) -type f -and -name '*.js')

CSS_SRCFILES = $(shell find $(BASEDIR) -type f -and -name '*.css')

RELEASE_VERSION = $(shell node -e 'require("fs").readFile("$(JSDIR)/package.json", function(e,d){console.log(JSON.parse(d).version)})')
RELEASE_NAME = JBrowse-$(RELEASE_VERSION)
RELEASE_FULL = $(RELEASE_NAME)-dev
RELEASE_FULL_DIR = $(BASEDIR)/$(RELEASE_FULL)/
RELEASE_MIN  = $(RELEASE_NAME)
RELEASE_MIN_DIR  = $(BASEDIR)/$(RELEASE_MIN)/
RELEASE_DESKTOP_OSX = $(RELEASE_NAME)-desktop-osx
RELEASE_DESKTOP_WIN = $(RELEASE_NAME)-desktop-win
RELEASE_DESKTOP_LINUX = $(RELEASE_NAME)-desktop-linux

ZIP=zip -q --symlinks -r
UNZIP=unzip -q
SHASUM=shasum


all: clean release-dev release-min

release: release-dev release-min release-notes.html
	ls -lh *.zip
	$(SHASUM) *.zip

release-electron-darwin: release
	cd $(RELEASE_MIN)&&./setup.sh legacy&&cd ..
	npm install
	electron-packager $(RELEASE_MIN) JBrowseDesktop --platform=darwin --arch=x64
	$(ZIP) $(RELEASE_DESKTOP_OSX).zip JBrowseDesktop-darwin-x64

release-electron-all: release
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

release-dev: $(JS_SRCFILES) node_modules
	rm -rf dist
	mkdir $(RELEASE_FULL_DIR);
	cp -R `ls -1d * | grep -v $(RELEASE_FULL)` $(RELEASE_FULL_DIR);
	rm -rf $(RELEASE_FULL_DIR)/src/*/.git $(RELEASE_FULL_DIR)/$(RELEASE_FULL) $(RELEASE_FULL_DIR)/src/util $(RELEASE_FULL_DIR)/node_modules $(RELEASE_FULL_DIR)/extlib;

	# zip up the dev release
	$(ZIP) $(RELEASE_FULL).zip $(RELEASE_FULL)/;

release-min: $(JS_SRCFILES) node_modules
	cp -a $(RELEASE_FULL_DIR) $(RELEASE_MIN_DIR);

	for P in src browser css docs/jsdoc tests build node_modules extlib dist; do \
	    rm -rf $(RELEASE_MIN_DIR)$$P; \
	done;

	rm -rf dist
	JBROWSE_BUILD_MIN=1 npm run build
	cp -r dist $(RELEASE_MIN_DIR)

	for P in src/perl5 \
	; do \
	    mkdir -p `dirname $(RELEASE_MIN_DIR)$$P`; \
	    if [ -d $$P ]; then \
		    cp -R $(RELEASE_FULL_DIR)$$P/ $(RELEASE_MIN_DIR)$$P; \
	    else \
		    cp -R $(RELEASE_FULL_DIR)$$P $(RELEASE_MIN_DIR)$$P; \
	    fi;\
	done

	# zip it up
	$(ZIP) $(RELEASE_MIN).zip $(RELEASE_MIN)/;

clean:
	git clean -ffdxq --exclude=/plugins/ --exclude=/node_modules/ --exclude=/extlib/

.PHONY: all clean jbrowse docs doc release release-min release-dev plugins-min
