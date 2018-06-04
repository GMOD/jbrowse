#!/bin/bash

set -e;

VERSION=$1
ALPHA_VERSION=$2

# make sure we were given a version number
if [[ $VERSION = '' || $ALPHA_VERSION = '' ]]; then
    echo "Usage:"
    echo "    build/release.sh release_version next_version"
    echo
    echo "Example:"
    echo "    build/release.sh 1.12.6 1.12.7-alpha.0"
    exit 1
fi

# make sure we were given a version number
if [[ $VERSION = '' ]]; then
    echo Please provide a version number to release.
    exit 1
fi

# make sure there are no unstaged changes
if ! git diff-files --quiet || ! git diff-index --quiet HEAD --; then
    echo You have uncommitted changes. Aborting.
    exit 1
fi

# make sure we are on the dev branch
BRANCH=`git rev-parse --symbolic-full-name --abbrev-ref HEAD`
if [[ $BRANCH != 'dev' ]]; then
    echo You are not on the dev branch. Aborting.
    exit 1
fi

set -x

# datestamp the release notes
build/datestamp_release_notes.pl $VERSION release-notes.md > release-notes.md.new
mv release-notes.md.new release-notes.md

# update the versions in the package.json files
build/set_package_versions.pl $VERSION src/JBrowse/package.json package.json

# commit the release notes and package.jsons
git commit -m "release $VERSION" release-notes.md src/JBrowse/package.json package.json

# make a tag and update master
git tag $VERSION-release

# add a {{$NEXT}} marker
( echo '{{$NEXT}}'; echo; echo; cat release-notes.md) > release-notes.md.new
mv release-notes.md.new release-notes.md

# update the package.json files with alpha versions
build/set_package_versions.pl $ALPHA_VERSION src/JBrowse/package.json package.json

# commit the alpha versions
git commit -m "start next release cycle as $ALPHA_VERSION" release-notes.md src/JBrowse/package.json package.json

# finally, push everything to the remote
echo
echo "****** AND NOW IF THAT ALL LOOKS FINE, YOU SHOULD RUN ******"
echo git push --tags origin dev $VERSION-release:master
