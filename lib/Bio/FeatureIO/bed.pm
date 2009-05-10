=pod

=head1 NAME

Bio::FeatureIO::bed - read/write features from UCSC BED format

=head1 SYNOPSIS

  my $in = Bio::FeatureIO(-format => 'bed', -file => 'file.bed');
  for my $feat ($in->next_feature) {
    # do something with $feat (a Bio::SeqFeature::Annotated object)
  }

  my $out = Bio::FeatureIO(-format=>'bed');
  for my $feat ($seq->get_seqFeatures) {
    $out->write_feature($feat);
  }

=head1 DESCRIPTION

See L<http://www.genome.ucsc.edu/goldenPath/help/customTrack.html#BED>.

Currently for read and write only the first 6 fields (chr, start, end, name,
score, strand) are supported.

=head1 FEEDBACK

=head2 Mailing Lists

User feedback is an integral part of the evolution of this and other
Bioperl modules. Send your comments and suggestions preferably to
the Bioperl mailing list.  Your participation is much appreciated.

  bioperl-l@bioperl.org                  - General discussion
  http://bioperl.org/wiki/Mailing_lists  - About the mailing lists

=head2 Reporting Bugs

Report bugs to the Bioperl bug tracking system to help us keep track
of the bugs and their resolution. Bug reports can be submitted via
the web:

  http://bugzilla.open-bio.org/

=head1 AUTHOR - Allen Day

Email allenday@ucla.edu

=head1 CONTRIBUTORS

Sendu Bala, bix@sendu.me.uk

=head1 APPENDIX

The rest of the documentation details each of the object methods.
Internal methods are usually preceded with a _

=cut


# Let the code begin...


package Bio::FeatureIO::bed;

use strict;
use base qw(Bio::FeatureIO);
use Bio::SeqFeature::Annotated;
use Bio::Annotation::SimpleValue;
use Bio::OntologyIO;
use Scalar::Util qw(looks_like_number);

=head2 _initialize

 Title   : _initialize
 Function: initializes BED for reading/writing
 Args    : all optional:
           name          description
           ----------------------------------------------------------
           -name         the name for the BED track, stored in header
                         name defaults to localtime()
           -description  the description for the BED track, stored in
                         header.  defaults to localtime().
           -use_score    whether or not the score attribute of
                         features should be used when rendering them.
                         the higher the score the darker the color.
                         defaults to 0 (false)



=cut

sub _initialize {
  my($self,%arg) = @_;

  $self->SUPER::_initialize(%arg);

  $self->name($arg{-name} || scalar(localtime()));
  $self->description($arg{-description} || scalar(localtime()));
  $self->use_score($arg{-use_score} || 0);

  $self->_print(sprintf('track name="%s" description="%s" useScore=%d',
                        $self->name,
                        $self->description,
                        $self->use_score ? 1 : 0
                       )."\n") if $self->mode eq 'w';
}

=head2 use_score

 Title   : use_score
 Usage   : $obj->use_score($newval)
 Function: should score be used to adjust feature color when rendering?  set to true if so.
 Example : 
 Returns : value of use_score (a scalar)
 Args    : on set, new value (a scalar or undef, optional)


=cut

sub use_score{
    my $self = shift;

    return $self->{'use_score'} = shift if @_;
    return $self->{'use_score'};
}

=head2 name

 Title   : name
 Usage   : $obj->name($newval)
 Function: name of BED track
 Example : 
 Returns : value of name (a scalar)
 Args    : on set, new value (a scalar or undef, optional)


=cut

sub name{
    my $self = shift;

    return $self->{'name'} = shift if @_;
    return $self->{'name'};
}

=head2 description

 Title   : description
 Usage   : $obj->description($newval)
 Function: description of BED track
 Example : 
 Returns : value of description (a scalar)
 Args    : on set, new value (a scalar or undef, optional)


=cut

sub description{
    my $self = shift;

    return $self->{'description'} = shift if @_;
    return $self->{'description'};
}


sub write_feature {
  my($self,$feature) = @_;
  $self->throw("only Bio::SeqFeature::Annotated objects are writeable") unless $feature->isa('Bio::SeqFeature::Annotated');

  my $chrom       = $feature->seq_id    || '';
  my $chrom_start = $feature->start     || 0; # output start is supposed to be 0-based
  my $chrom_end   = ($feature->end + 1) || 1; # output end is supposed to not be part of the feature

  #try to make a reasonable name
  my $name        = undef;
  my @v;
  if (@v = ($feature->annotation->get_Annotations('Name'))){
    $name = $v[0];
    $self->warn("only using first of feature's multiple names: ".join ',', map {$_->value} @v) if scalar(@v) > 1;
  } elsif (@v = ($feature->annotation->get_Annotations('ID'))){
    $name = $v[0];
    $self->warn("only using first of feature's multiple IDs: ".join ',', map {$_->value} @v) if scalar(@v) > 1;
  } else {
    $name = 'anonymous';
  }
  
  if (ref($name)) {
    $name = $name->value;
  }
  if (ref($chrom)) {
    $chrom = $chrom->value;
  }

  my $score = $feature->score || 0;
  my $strand = $feature->strand == 0 ? '-' : '+'; #default to +
  my $thick_start = '';  #not implemented, used for CDS
  my $thick_end = '';    #not implemented, used for CDS
  my $reserved = 0;
  my $block_count = '';  #not implemented, used for sub features
  my $block_sizes = '';  #not implemented, used for sub features
  my $block_starts = ''; #not implemented, used for sub features

  $self->_print(join("\t",($chrom,$chrom_start,$chrom_end,$name,$score,$strand,$thick_start,$thick_end,$reserved,$block_count,$block_sizes, $block_starts))."\n");
  $self->write_feature($_) foreach $feature->get_SeqFeatures();
}

sub next_feature {
  my $self = shift;
  my $line = $self->_readline || return;
  
  my ($seq_id, $start, $end, $name, $score, $strand) = split(/\s+/, $line);
  $strand ||= '+';
  
  unless (looks_like_number($start) && looks_like_number($end)) {
    # skip what is probably a header line
    return $self->next_feature;
  }
  
  my $feature = Bio::SeqFeature::Annotated->new(-start  => $start, # start is 0 based
                                                -end    => --$end, # end is not part of the feature
                                                $score  ? (-score  => $score) : (),
                                                $strand ? (-strand => $strand eq '+' ? 1 : -1) : ());
  
  $feature->seq_id($seq_id);
  if ($name) {
    my $sv = Bio::Annotation::SimpleValue->new(-tagname => 'Name', -value => $name);
    $feature->annotation->add_Annotation($sv);
  }
  
  return $feature;
}

1;
