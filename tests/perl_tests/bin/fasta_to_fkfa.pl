#!/usr/bin/env perl
use strict;
use warnings;

use JSON 2;

use lib 'tests/perl_tests/lib';
use FakeFasta;

my @seqs;
for ( @ARGV ) {
    push @seqs, @{ FakeFasta->fasta_to_fkfa( $_ ) || [] };
}

print to_json( \@seqs );

