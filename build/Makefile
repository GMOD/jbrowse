BASEDIR = $(PWD)

JSDIR = $(BASEDIR)/src/JBrowse
PLUGINDIR = $(BASEDIR)/plugins
JS_SRCFILES = $(shell find $(JSDIR) -type f -and -name '*.js')

RELEASE_VERSION = $(shell node -e 'require("fs").readFile("$(JSDIR)/package.json", function(e,d){console.log(JSON.parse(d).version)})')
RELEASE_NAME = JBrowse-$(RELEASE_VERSION)
RELEASE_MIN  = $(RELEASE_NAME)
RELEASE_MIN_DIR  = $(BASEDIR)/$(RELEASE_MIN)/

ZIP=zip -q --symlinks -r
UNZIP=unzip -q
SHASUM=shasum

ELECTRON_PACKAGE_OPTS = --overwrite --icon=browser/icons/jbrowse --ignore=/tests/ --ignore=/website/ --ignore=/src/perl5/ --ignore=/extlib/ --ignore=/docs/


all: clean release

release: release-dev release-min release-electron-all release-notes.html
	ls -lh *.zip
	$(SHASUM) *.zip

release-electron-setup:
	echo "Setting up electron"
	cp -R node_modules extlib browser $(RELEASE_MIN)
	cd $(RELEASE_MIN) && ./setup.sh && rm -rf node_modules && yarn install --production && cd ..


release-electron-darwin: release-min release-electron-setup
	echo "Building mac electron"
	node_modules/.bin/electron-packager $(RELEASE_MIN) $(RELEASE_MIN)-desktop --platform=darwin $(ELECTRON_PACKAGE_OPTS)
	$(ZIP) $(RELEASE_MIN)-desktop-darwin-x64.zip $(RELEASE_MIN)-desktop-darwin-x64

release-electron-win32: release-min release-electron-setup
	echo "Building win32 electron"
	node_modules/.bin/electron-packager $(RELEASE_MIN) $(RELEASE_MIN)-desktop --platform=win32 $(ELECTRON_PACKAGE_OPTS)
	$(ZIP) $(RELEASE_MIN)-desktop-win32-x64.zip $(RELEASE_MIN)-desktop-win32-x64

release-electron-linux: release-min release-electron-setup
	echo "Building linux electron"
	node_modules/.bin/electron-packager $(RELEASE_MIN) $(RELEASE_MIN)-desktop --platform=linux $(ELECTRON_PACKAGE_OPTS)
	$(ZIP) $(RELEASE_MIN)-desktop-linux-x64.zip $(RELEASE_MIN)-desktop-linux-x64

release-electron-all: release-electron-darwin release-electron-win32 release-electron-linux
	echo "Building desktop packages"

release-notes.html: release-notes.md
	build/format_release_notes.pl $< > $@

node_modules:
	yarn install
release-min: node_modules
	rm -rf dist
	mkdir $(RELEASE_MIN);
	cp -R `ls -1d * | grep -v $(RELEASE_MIN)` $(RELEASE_MIN_DIR);

	for P in src browser css docs/jsdoc tests build node_modules extlib dist utils website; do \
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
