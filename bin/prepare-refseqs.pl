#!/usr/bin/env perl

=head1 NAME

prepare-refseqs.pl - format reference sequences for use by JBrowse

=head1 USAGE

       prepare-refseqs.pl --gff <GFF file>  [options]
   # OR:
       prepare-refseqs.pl --fasta <file1> --fasta <file2>  [options]
   # OR:
       prepare-refseqs.pl --conf <JBrowse config file>  [options]

=head1 DESCRIPTION

This tool can read fasta files compressed with gzip, if they end in
.gz or .gzip.

You can use a GFF file to describe the reference sequences; or you can
use a JBrowse config file (pointing to a BioPerl database) or a FASTA
file, together with a list of refseq names or a list of refseq IDs.
If you use a GFF file, it should contain ##sequence-region lines as
described in the GFF specs.

If you use a JBrowse config file or FASTA file, you can either provide
a (comma-separated) list of refseq names, or (if the names aren't
globally unique) a list of refseq IDs; or (for FASTA files only) you
can omit the list of refseqs, in which case every sequence in the
database will be used.

=head1 OPTIONS

=over 4

=item --out <output directory>

Optional directory to write to.  Defaults to data/.

=item --noseq

Do not write out the actual sequence bases, just the sequence metadata.

=item --refs <list of refseq names> | --refids <list of refseq IDs>

Output only sequences with the given names or (database-dependent) IDs.

=item --compress

If passed, compress the reference sequences with gzip, making the
chunks be .txt.gz.  NOTE: this requires a bit of additional web server
configuration to be served correctly.

=back

=cut

use strict;
use warnings;

use File::Spec::Functions qw/ catfile catdir /;
use File::Path 'mkpath';

use FindBin qw($Bin);
use Pod::Usage;
use POSIX;
use Getopt::Long;

use lib "$Bin/../lib";
use JBlibs;

use JsonGenerator;
use FastaDatabase;

my ($confFile, $noSeq, $gff, @fasta, $refs, $refids);
my $chunkSize = 20000;
my $outDir = "data";
my $seqTrackName = "DNA";
my $help;
my $compress;
GetOptions("out=s" => \$outDir,
           "conf=s" => \$confFile,
           "noseq" => \$noSeq,
           "gff=s" => \$gff,
           "fasta=s" => \@fasta,
	   "refs=s" => \$refs,
           "refids=s" => \$refids,
           "compress" => \$compress,
           "help|h|?" => \$help,
           ) or pod2usage();
pod2usage( -verbose => 2 ) if $help;
pod2usage( 'must provide either a --fasta, --gff, or --conf option' )
    unless defined $gff || defined $confFile || @fasta;

$chunkSize *= 4 if $compress;

# $seqRel is the path relative to $outDir
my $seqRel = "seq";
my $seqDir = catdir( $outDir, $seqRel );

mkpath( $outDir );
mkpath( $seqDir ) unless $noSeq;

my @refSeqs;

if (defined($gff)) {
    open GFF, "<$gff"
      or die "couldn't open GFF file $gff: $!";
    while (<GFF>) {
        if (/^\#\#\s*sequence-region\s+(\S+)\s+(-?\d+)\s+(-?\d+)/i) { # header line
            push @refSeqs, {
                            name => $1,
                            start => $2 - 1, 
                            end => int($3), 
                            length => ($3 - $2 + 1)
                           };
        }
    }
    close GFF
      or die "couldn't close GFF file $gff: $!";

    die "found no sequence-region lines in GFF file" if ($#refSeqs < 0);

} elsif ( @fasta || defined($confFile)) {
    my $db;

    if ( @fasta ) {
        $db = FastaDatabase->from_fasta( @fasta );

        die "IDs not implemented for FASTA database" if defined($refids);

        if (!defined($refs) && !defined($refids)) {
            $refs = join (",", $db->seq_ids);
        }

        die "found no sequences in FASTA file" if ("" eq $refs);

    } elsif (defined($confFile)) {
        my $config = JsonGenerator::readJSON($confFile);

        eval "require $config->{db_adaptor}; 1" or die $@;

        $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})}
          or warn $@;

        die "Could not open database: $@" unless $db;

        if (my $refclass = $config->{'reference class'}) {
            eval {$db->default_class($refclass)};
        }
        $db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
    }

    die "please specify which sequences to process using the --refs or --refids command line parameters\n"
      unless (defined($refids) || defined($refs));

    if (defined($refids)) {
        foreach my $refid (split ",", $refids) {
            my $seg = $db->segment(-db_id => $refid);
            my $refInfo = {
                name => refName($seg),
                id => $refid, #keep ID for later querying
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length
            };

            unless ($noSeq) {
                my $refDir = catdir($seqDir,$refInfo->{name});
                exportSeqChunks($refDir, $compress, $chunkSize, $db,
                                [-db_id => $refid],
                                $seg->start, $seg->end);
                $refInfo->{"seqDir"} = $refDir;
                $refInfo->{"seqChunkSize"} = $chunkSize;
            }

            push @refSeqs, $refInfo;
        }
    }

    if (defined($refs)) {
        foreach my $ref (split ",", $refs) {

            my ($seg) = my @segments = $db->segment(-name => $ref);

            if(! @segments ) {
                warn "WARNING: Reference sequence '$ref' not found in input.\n";
                next;
            }
            elsif( @segments > 1 ) {
                warn "WARNING: multiple matches for '$ref' found in input, using only the first one.\n";
            }

            my $refInfo =  {
                name => refName($seg),
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length,
                ( $compress ? ( 'compress' => 1 ) : () ),
            };

            unless ($noSeq) {
                my $refDir = catdir( $seqDir, $refInfo->{"name"} );
                exportSeqChunks($refDir, $compress, $chunkSize, $db,
                                [-name => $ref],
                                $seg->start, $seg->end);
                $refInfo->{"seqDir"} = catdir( $seqRel, $refInfo->{"name"} );
                $refInfo->{"seqChunkSize"} = $chunkSize;
            }

            push @refSeqs, $refInfo;
        }
    }
}

unless( @refSeqs ) {
    warn "No reference sequences found, exiting.\n";
    exit;
}

JsonGenerator::modifyJsonFile( catfile( $outDir, 'seq', 'refSeqs.json' ),
                              sub {
                                  #add new ref seqs while keeping the order
                                  #of the existing ref seqs
                                  my $old = shift;
                                  my %refs;
                                  $refs{$_->{name}} = $_ foreach (@refSeqs);
                                  for (my $i = 0; $i <= $#{$old}; $i++) {
                                      $old->[$i] =
                                        delete $refs{$old->[$i]->{name}}
                                        if $refs{$old->[$i]->{name}};

                                  }
                                  foreach my $newRef (@refSeqs) {
                                      push @{$old}, $newRef
                                        if $refs{$newRef->{name}};
                                  }
                                  return $old;
                              });
if( $compress ) {
    # if we are compressing the sequence files, drop a .htaccess file
    # in the seq/ dir that will automatically configure users with
    # Apache (and AllowOverride on) to serve the .txt.gz files
    # correctly
    require GenomeDB;
    my $hta = catfile( $outDir, 'seq', '.htaccess' );
    open my $hta_fh, '>', $hta or die "$! writing $hta";
    $hta_fh->print( GenomeDB->precompression_htaccess('.txtz','.jsonz') );
}


unless ($noSeq) {
    JsonGenerator::modifyJsonFile( catfile( $outDir, "trackList.json" ),
                                  sub {
                                      my $trackList = shift;
                                      unless (defined($trackList)) {
                                          $trackList =
                                            {
                                             'formatVersion' => 1,
                                             'tracks' => []
                                            };
                                      }
                                      my $tracks = $trackList->{'tracks'};
                                      my $i;
                                      for ($i = 0; $i <= $#{$tracks}; $i++) {
                                          last if ($tracks->[$i]->{'label'}
                                                   eq
                                                   $seqTrackName);
                                      }
                                    $tracks->[$i] =
                                      {
                                       'label' => $seqTrackName,
                                       'key' => $seqTrackName,
                                       'type' => "SequenceTrack",
                                       'chunkSize' => $chunkSize,
                                       'urlTemplate' => "$seqRel/{refseq}/",
                                       ( $compress ? ( 'compress' => 1 ): () ),
                                      };
                                    return $trackList;
                            });
}

exit;

###########################

sub refName {
    my $seg = shift;
    my $segName = $seg->name;
    $segName = $seg->{'uniquename'} if $seg->{'uniquename'};
    $segName =~ s/:.*$//; #get rid of coords if any
    return $segName;
}

sub exportSeqChunks {
    my ($dir, $compress, $len, $db, $segDef, $start, $end) = @_;

    mkdir $dir unless -d $dir;
    $start = 1 if $start < 1;
    $db->absolute( 1 ) if $db->can('absolute');

    my $chunkStart = $start;
    while ( $chunkStart <= $end ) {
        my $chunkEnd = $chunkStart + $len - 1;
        my $chunkNum = floor( ($chunkStart - 1) / $chunkSize );
        my ($seg) = $db->segment( @$segDef,
                                  -start    => $chunkStart,
                                  -end      => $chunkEnd,
                                  -absolute => 1,
                                );
        unless( $seg ) {
            die "Seq export query failed, please inform the developers of this error"
        }

        $seg->start == $chunkStart
          or die "requested $chunkStart .. $chunkEnd; got " . $seg->start . " .. " . $seg->end;

        $chunkStart = $chunkEnd + 1;
        next unless $seg && $seg->seq && $seg->seq->seq;

        my $path = File::Spec->catfile( "$dir", "$chunkNum.txt" .( $compress ? 'z' : '' ));
        open my $chunkfile, '>'.($compress ? ':gzip' : ''), $path or die "$! writing $path";
        $chunkfile->print( $seg->seq->seq );
    }
}

=head1 AUTHOR

Mitchell Skinner E<lt>mitch_skinner@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut
