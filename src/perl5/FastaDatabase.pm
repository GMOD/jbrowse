
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

use strict;
use warnings;

use File::Temp;

use Bio::Index::Fasta;

=head2 from_fasta

    my $db = FastaDatabase->from_fasta ( $filename, ... );

Creates a new FastaDatabase object, reading sequences from a FASTA
file or filehandle.  Automatically uncompresses fasta files whose
names end with .gz or .gzip.

=cut

sub from_fasta {
    my ($class, @files ) = @_;

    my $self = {
        index_file => File::Temp->new,
    };

    $self->{index} = Bio::Index::Fasta->new( -filename => $self->{index_file}, -write_flag => 1 );

    # uncompress any files that need it into temp files
    $self->{files} = [ map {
                                    ref $_ ? $class->_slurp_to_temp( $_ )  :
                              /\.gz(ip)?$/ ? $class->_unzip( $_ )          :
                                             $_
                       } @files
                     ];

    $self->{index}->make_index( map "$_", @{ $self->{files} } );

    return bless $self, $class;
}
sub _unzip {
    my ( $class, $filename ) = @_;
    open my $f, '<:gzip', $filename or die "$! reading $filename";
    $class->_slurp_to_temp( $f );
}
sub _slurp_to_temp {
    my ( $class, $fh ) = @_;
    my $tempfile = File::Temp->new;
    local $_;
    print $tempfile $_ while <$fh>;
    $tempfile->close;
    return $tempfile;
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
    shift->{index}->get_all_primary_ids;
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
    my %opt;
    if( $_[0] =~ /^-/ ) { # if we have args like -db_id, etc
        %opt = @_;
    }
    else { # if we have positional args
        @opt{ '-name', '-start', '-end' } = @_;
    }

    my $name  = defined $opt{'-name'}  ? $opt{'-name'}  : $opt{'-db_id'};
    my $start = defined $opt{'-start'} ? $opt{'-start'} : 1;

    my $seq_ref = $self->_fetch( $name );
    my $length  = length $$seq_ref;

    my $end = defined $opt{'-end'} && $opt{'-end'} <= $length
                  ? $opt{'-end'}
                  : $length;

    my $subseq = substr( $$seq_ref, $start-1, $end-$start+1 );

    # behold, the awesome redundancy of BioPerl ;-)
    return mock->new( %opt,
                      'name'   => $name,
                      'ref'    => $name,
                      'seq_id' => $name,
                      'start'  => $start,
                      'end'    => $end,
                      'length' => $length,
                      'seq'    => mock->new( 'primary_id' => $name,
                                             'length'     => $length,
                                             'seq'        => $subseq
                                           ),
                    );
}

# cache the last fetch from the index, which will cache the last
# sequence we fetched, and make repeated fetches of the same sequence
# fast.  returns a REFERENCE to a sequence string.
sub _fetch {
    my ( $self, $name ) = @_;
    no warnings 'uninitialized';
    if( $self->{_fetch_cache}{name} eq $name ) {
        return $self->{_fetch_cache}{seq};
    }
    else {
        my $seq = $self->{index}->fetch( $name )->seq;
        $self->{_fetch_cache} = { name => $name, seq => \$seq };
        return \$seq;
    }
}

package mock;

sub new {
    my $class = shift;
    bless { @_ }, $class
}

sub AUTOLOAD {
    my $self = shift;

    my $method_name = our $AUTOLOAD;
    $method_name =~ s/.*:://;  # strip off module path
    return if $method_name eq "DESTROY";

    return @_ ? ( $self->{ $method_name } = $_[0] )
              : $self->{ $method_name };
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
