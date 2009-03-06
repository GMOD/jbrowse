
=head1 NAME

FastaDatabase.pm

=head1 SYNOPSIS

Lightweight module to wrap a FASTA sequence database with
stripped-down, feature-free versions of BioPerl's
Bio::DB::SeqFeature::Store methods for returning subsequences.

=head1 EXAMPLES

  use FastaDatabase;

  # read sequences from FASTA file
  my $db = FastaDatabase->from_fasta ( "sequences.fasta" );

  # get sequence IDs (i.e. names)
  my @ids = $db->seq_ids;

  # get all sequences
  my @seqs = map ($db->segment->($_)->seq->seq, @ids);

  # get a segment
  my $seg = $db->segment (-db_id => $refs[0]);

  # print sequence of segment
  print $seg->seq->seq;

=head1 METHODS

=cut

package FastaDatabase;

use Exporter;
use AutoHash;
@ISA = qw (Exporter AutoHash);
@EXPORT = qw (new from_fasta seq_ids segment AUTOLOAD);
@EXPORT_OK = @EXPORT;

use strict;
use vars '@ISA';

use Carp;

=head2 from_fasta

    my $db = FastaDatabase->from_fasta ( $filename );

Creates a new FastaDatabase object, reading sequences from a FASTA file.

=cut

sub from_fasta {
    my ($class, $filename) = @_;

    my $seqdata = {};

    my $sep = $/;
    local *FILE;
    open FILE, "<$filename" or die "Couldn't open '$filename': $!";

    $/ = ">";
    my $dummy = <FILE>;
    my $name;
    while (($/ = "\n", $name = <FILE>)[1]) {
	chomp $name;
	$name =~ s/^\s*(\S+).*$/$1/;  # throw away description metadata after name
	$/ = ">";
	my $seq = <FILE>;
	chomp $seq;
	$/ = $sep;
	$seq =~ s/\s//g;
	$seqdata->{$name} = $seq;
    }

    close FILE;
    $/ = $sep;

    my $self = $class->new ('seqdata' => $seqdata);
    return $self;
}

=head2 seq_ids

 Title   : seq_ids
 Usage   : @ids = $db->seq_ids()
 Function: Return all sequence IDs contained in database
 Returns : list of sequence Ids
 Args    : none
 Status  : public

=cut

sub seq_ids {
    my $self = shift;
    return keys %{$self->seqdata};
}

=head2 segment

 Title   : segment
 Usage   : $segment = $db->segment($seq_id [,$start] [,$end])
 Function: restrict the database to a sequence range
 Returns : an AutoHash that's similar to a Bio::DB::SeqFeature::Segment
           (i.e. it has {name,start,end,seq,length} member variables)
 Args    : sequence id, start and end ranges (optional)
 Status  : public

This is a method for returning subsequences that mimics the syntax of
Bio::DB::SeqFeature::Store.
Specify the ID of a sequence in the database
and optionally a start and endpoint relative to that sequence. The
method will look up the region and return an object that spans it.
The object is not an Bio::DB::SeqFeature::Segment
(as would be returned by Bio::DB::SeqFeature::Store),
but it has similar member variables and can be used
to find the sequence of the sub-region that you identified.

Note that the 'seq' method of the returned segment object
returns something analogous to a Bio::PrimarySeq object.
To get the actual sequence as a text string, you need to
call 'seq' on this object as well, e.g.

    print
      "Sequence $name has the following sequence:\n",
      $db->segment($name)->seq->seq, "\n";

Example:

 $segment = $db->segment('contig23',1,1000);  # first 1000bp of contig23
 print $segment->seq->seq;

 $segment = $db->segment ( -db_id => 'contig23',
			   -start => 1,
			   -end => 1000);  # alternate syntax

=cut

sub segment {
    my $self = shift;
    my (@arg, %opt);
    while (@_) {
	my $arg = shift;
	if ($arg =~ /^-(.+)$/) {
	    my $key = $1;
	    my $val = shift;
	    $opt{$key} = $val;
	} else {
	    push @arg, $arg;
	}
    }
    $opt{'name'} = $arg[0] if @arg > 0;
    $opt{'start'} = $arg[1] if @arg > 1;
    $opt{'end'} = $arg[2] if @arg > 2;

    my $name = defined($opt{'name'}) ? $opt{'name'} : $opt{'db_id'};
    my $start = defined($opt{'start'}) ? $opt{'start'} : 1;
    my $end = defined($opt{'end'}) ? $opt{'end'} : length ($self->seqdata->{$name});

    my $subseq = substr ($self->seqdata->{$name}, $start - 1, $end + 1 - $start);
    my $length = length ($subseq);

    # behold, the awesome redundancy of BioPerl ;-)
    return AutoHash->new (%opt,
			  'name'   => $name,
			  'ref'    => $name,
			  'seq_id' => $name,
			  'start'  => $start,
			  'end'    => $end,
			  'length' => $length,
			  'seq' => AutoHash->new ('primary_id' => $name,
						  'length'     => $length,
						  'seq'        => $subseq));
}

=head1 AUTHOR

Ian Holmes E<lt>ihh@berkeley.eduE<gt>

Copyright (c) 2007-2009 The Evolutionary Software Foundation

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

=cut

1;
