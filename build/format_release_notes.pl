#!/usr/bin/env perl
use strict;
use warnings;

use Text::Markdown 'markdown';

local $/;
my $html = markdown( scalar <> );
$html =~ s!issue \#(\d+)!<a href="https://github.com/gmod/jbrowse/issues/$1">issue #$1</a>!g;
$html =~ s!pull ( request)?\#(\d+)!<a href="https://github.com/gmod/jbrowse/pull/$2">issue #$2</a>!g;
$html =~ s!(\W)\@([-\w]+)!$1<a href="https://github.com/$2">\@$2</a>!g;
print $html;
