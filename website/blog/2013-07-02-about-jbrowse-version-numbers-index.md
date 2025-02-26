---
layout: post
title: About JBrowse version numbers
date: 2013-07-02
tags: ['Development']
---

Just so everybody's on the same page, I thought I should point out that from
1.2.0 onward, JBrowse version numbers follow a predictable scheme that encodes a
bit of information about what is contained in a release.

JBrowse version numbers look like "A.B.C", where A, B, and C are positive
integer numbers, which might have multiple digits. Each new JBrowse release
increments one of these numbers.

Incrementing C means that only bug fixes and small refinements have been added.

Incrementing B means that major new features have been added, and C is reset
to 0.

Incrementing A means that major new features have been added, **and** that the
new release is not backward-compatible with previous releases. B and C are reset
to 0.

So, JBrowse 1.9.5 has the same major features as all the other 1.9.x releases,
it just has bugs fixed. JBrowse 1.10.0 (if there is one) will have some major
new features not in 1.9.x. And JBrowse 2.0.0 will have major new features, and
will not be (completely) backward compatible with 1.x.x.

(This, by the way, is more or less the semantic versioning scheme proposed at
[semver.org](http://semver.org), which is pretty sensible.)

(Also, this is a cross-post from a message I sent to the gmod-ajax mailing
list.)
