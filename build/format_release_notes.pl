#!/usr/bin/env perl
use strict;
use warnings;
use Text::Markdown 'markdown';

my $release = "";
my $line = 0;
while(<>) {
    $line += 1;
    next if $line == 1 && /^# /;
    last if /^# /;
    next if /\{\{\$NEXT\}\}/;
    $release .= $_;
}

$release =~ s!issue \#(\d+)!<a href="https://github.com/gmod/jbrowse/issues/$1">issue #$1</a>!g;
$release =~ s!pull ( request)?\#(\d+)!<a href="https://github.com/gmod/jbrowse/pull/$2">issue #$2</a>!g;
$release =~ s!(\(|\ )\@([-\w]+)!$1<a href="https://github.com/$2">\@$2</a>!g;

print $release;
