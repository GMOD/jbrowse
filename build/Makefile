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


all: clean release

release: release-dev release-min release-electron-all release-notes.html
	ls -lh *.zip
	$(SHASUM) *.zip

release-electron-setup:
	echo "Setting up electron"
	cd $(RELEASE_MIN) && cp -r ../node_modules ../extlib . && ./setup.sh && cd ..
	cp -R browser $(RELEASE_MIN)

release-electron-darwin: clean release-min release-electron-setup
	echo "Building mac electron"
	node_modules/.bin/electron-packager $(RELEASE_MIN) $(RELEASE_MIN)-desktop --platform=darwin --icon=browser/icons/jbrowse
	$(ZIP) $(RELEASE_MIN)-desktop-darwin-x64.zip $(RELEASE_MIN)-desktop-darwin-x64

release-electron-win32: clean release-min release-electron-setup
	echo "Building win32 electron"
	node_modules/.bin/electron-packager $(RELEASE_MIN) $(RELEASE_MIN)-desktop --platform=win32 --icon=browser/icons/jbrowse
	$(ZIP) $(RELEASE_MIN)-desktop-win32-x64.zip $(RELEASE_MIN)-desktop-win32-x64

release-electron-linux: clean release-min release-electron-setup
	echo "Building linux electron"
	node_modules/.bin/electron-packager $(RELEASE_MIN) $(RELEASE_MIN)-desktop --platform=linux --icon=browser/icons/jbrowse
	$(ZIP) $(RELEASE_MIN)-desktop-linux-x64.zip $(RELEASE_MIN)-desktop-linux-x64

release-electron-all: release-electron-darwin release-electron-win32 release-electron-linux
	echo "Building desktop packages"

release-notes.html: release-notes.md
	build/format_release_notes.pl $< > $@

node_modules:
	yarn install

release-dev: $(JS_SRCFILES) node_modules
	rm -rf dist
	mkdir $(RELEASE_FULL_DIR);
	cp -R `ls -1d * | grep -v $(RELEASE_FULL)` $(RELEASE_FULL_DIR);
	rm -rf $(RELEASE_FULL_DIR)/src/*/.git $(RELEASE_FULL_DIR)/$(RELEASE_FULL) $(RELEASE_FULL_DIR)/src/util $(RELEASE_FULL_DIR)/node_modules $(RELEASE_FULL_DIR)/extlib;

	# zip up the dev release
	$(ZIP) $(RELEASE_FULL).zip $(RELEASE_FULL)/;

release-min: release-dev
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

.PHONY: all clean jbrowse docs doc release release-min release-dev plugins-min release-electron-all release-electron-linux release-electron-win32 release-electron-darwin
