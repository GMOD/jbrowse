#!/usr/bin/env perl
use strict;
use warnings;

use Text::Markdown 'markdown';

local $/;
my $html = markdown( scalar <> );
$html =~ s!issue \#(\d+)!<a href="https://github.com/gmod/jbrowse/issues/$1">issue #$1</a>!g;
print $html;
