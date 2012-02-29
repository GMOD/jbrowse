#!/usr/bin/env perl
use strict;
use warnings;

use JSON 2;

use lib 'tests/perl_tests/lib';
use FakeFasta;
 
FakeFasta->fkfa_to_fasta( in_file => $_, out_fh => \*STDOUT )
   for @ARGV;


