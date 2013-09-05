package Bio::JBrowse::FeatureStream::Genbank::Parser;

use warnings;
use strict;
use Carp qw( croak );
use File::Spec::Functions;
use Parse::RecDescent;

my $GENBANK_RECORD_SEPARATOR = "//\n";

=pod

=head1 NAME

Bio::JBrowse::FeatureStream::Genbank::Parser - fork of kyclark's Bio::GenBankParser

=cut

=head1 SYNOPSIS

This module aims to improve on the BioPerl GenBank parser by using
a grammar-based approach with Parse::RecDescent.

    use Bio::GenBankParser;

    my $parser = Bio::GenBankParser->new();

    local $/ = "//\n";
    while ( my $rec = <$input> ) {
        my $gb_rec = $parser->parse( $rec );
    }

Or:

    my $parser = Bio::GenBankParser->new( file => $file );
    while ( my $seq = $parser->next_seq ) {
        ...
    }

=head1 METHODS

=cut

# ----------------------------------------------------------------
sub new {

=pod

=head2 new

  use Bio::GenBankParser;
  my $parser = Bio::GenBankParser->new;

=cut

    my $class = shift;
    my %args  = ( @_ && ref $_[0] eq 'HASH' ) ? %{ $_[0] } : @_;
    my $self  = bless \%args, $class;

    if ( $args{'file'} ) {
        $self->file( $args{'file'} );
    }

    return $self;
}

# ----------------------------------------------------------------
sub DESTROY {
    my $self = shift;

    if ( my $fh = $self->{'fh'} ) {
        close $fh;
    }
}

# ----------------------------------------------------------------
sub file {

=pod

=head2 file

    $parser->file('/path/to/file');

Informs the parser to read sequentially from a file.

=cut

    my $self = shift;

    if ( my $file = shift ) {
        $file = canonpath( $file );

        if ( -e $file && -s _ && -r _ ) { 
            open my $fh, '<', $file or croak("Can't read file '$file'; $!\n");

            $self->{'file'} = $file;
            $self->{'fh'}   = $fh;
        }
        else {
            croak("Non-existent, empty or unreadable file: '$file'");
        }
    }

    return 1;
}

# ----------------------------------------------------------------
sub current_record {

=pod

=head2 current_record

    my $genbank_record = $parser->current_record;

Returns the current unparsed GenBank record.

=cut

    my $self = shift;

    return $self->{'current_record'};
}

# ----------------------------------------------------------------
sub next_seq {

=pod

=head2 next_seq

    my $seq = $parser->next_seq;

Returns the next sequence from the C<file>.

=cut

    my $self = shift;

    if ( my $fh = $self->{'fh'} ) {
        local $/ = $GENBANK_RECORD_SEPARATOR; 

        my $rec;
        for (;;) {
            $rec = <$fh>;
            last if !defined $rec || $rec =~ /\S+/;
        }

        if ( defined $rec && $rec =~ /\S+/ ) {
	    # okay, parsing of coordinate info is broken because someone at Genbank decided to split join() coordinates across >1 line. 
	    # so, let's hack this to work by removing the newline inside of join() tokens
	    $rec =~ s/(^.*join\(.*\,)\n\s+(\d+.*\)$)/${1}${2}/mg;
            return $self->parse( $rec );
        }
        else {
            return undef;
        }
    }
    else {
        croak("Can't call 'next_seq' without a 'file' argument");
    }
}

# ----------------------------------------------------------------
sub parse {

=pod

=head2 parse

    my $rec = $parser->parse( $text );
    print $rec->{'ACCESSION'};

Parses a (single) GenBank record into a hash reference.

=cut

    my $self   = shift;
    my $text   = shift() or croak('No input to parse');
    my $parser = $self->parser or croak('No parser');

    $self->{'current_record'} = $text;

    return $parser->startrule( $text );
}

# ----------------------------------------------------------------
sub parser {

=pod

=head2 parser

Returns the Parse::RecDescent object.

=cut

    my $self = shift;

    if ( !defined $self->{'parser'} ) {
        my $grammar = $self->grammar or croak('No grammar');
        $self->{'parser'} = Parse::RecDescent->new( $grammar );
    }

    return $self->{'parser'};
}

# ----------------------------------------------------------------
sub grammar {

=pod

=head2 grammar

Returns the Parse::RecDescent grammar for a GenBank record.

=cut

    my $self = shift;
    return <<'END_OF_GRAMMAR';
{
    my $ref_num  = 1;
    my %record   = ();
    my %ATTRIBUTE_PROMOTE = map { $_, 1 } qw[ 
        mol_type 
        cultivar 
        variety 
        strain 
    ];

    $::RD_ERRORS; # report fatal errors
#    $::RD_TRACE  = 0;
#    $::RD_WARN   = 0; # Enable warnings. This will warn on unused rules &c.
#    $::RD_HINT   = 0; # Give out hints to help fix problems.
}

startrule: section(s) eofile 
    { 
        if ( !$record{'ACCESSION'} ) {
            $record{'ACCESSION'} = $record{'LOCUS'}->{'genbank_accession'};
        }

        if ( ref $record{'SEQUENCE'} eq 'ARRAY' ) {
            $record{'SEQUENCE'} = join('', @{ $record{'SEQUENCE'} });
        }

        $return = { %record };
        %record = ();
    }
    | <error>

section: commented_line
    | header
    | locus
    | dbsource
    | definition
    | accession_line
    | project_line
    | version_line
    | keywords
    | source_line
    | organism
    | reference
    | features
    | base_count
    | contig
    | origin
    | comment
    | record_delimiter
    | accession
    | primary
    | source
    | version
    | <error>

header: /.+(?=\nLOCUS)/xms

locus: /LOCUS/xms locus_name sequence_length molecule_type
    genbank_division(?) modification_date
    {
        $record{'LOCUS'} = {
            locus_name        => $item{'locus_name'},
            sequence_length   => $item{'sequence_length'},
            molecule_type     => $item{'molecule_type'},
            genbank_division  => $item{'genbank_division(?)'}[0],
            modification_date => $item{'modification_date'},
        }
    }

locus_name: /\w+/

space: /\s+/

sequence_length: /\d+/ /(aa|bp)/ { $return = "$item[1] $item[2]" }

molecule_type: /\w+/ (/[a-zA-Z]{4,}/)(?)
    { 
        $return = join(' ', map { $_ || () } $item[1], $item[2][0] ) 
    }

genbank_division: 
    /(PRI|CON|ROD|MAM|VRT|INV|PLN|BCT|VRL|PHG|SYN|UNA|EST|PAT|STS|GSS|HTG|HTC|ENV)/

modification_date: /\d+-[A-Z]{3}-\d{4}/

definition: /DEFINITION/ section_continuing_indented
    {
        ( $record{'DEFINITION'} = $item[2] ) =~ s/\n\s+/ /g;
    }

source: /SOURCE/ section_continuing_indented
    {
        ( $record{'SOURCE'} = $item[2] ) =~ s/\n\s+/ /g;
    }

section_continuing_indented: /.*?(?=\n[A-Z]+\s+)/xms

section_continuing_indented: /.*?(?=\n\/\/)/xms

accession_line: /ACCESSION/ section_continuing_indented
    {
        my @accs = split /\s+/, $item[2];
        $record{'ACCESSION'} = shift @accs;
        push @{ $record{'VERSION'} }, @accs;
    }

accession: /ACCESSION/ section_continuing_indented
    {
        my @accs = split /\s+/, $item[2];
        $record{'ACCESSION'} = shift @accs;
	if ( exists $item[3] ){
	    $record{'REGION'} = $item[3];
	    if ( my ($start, $end) = split(/\.\./, $item[3]) ){
		$record{'REGION_START'} = $start;
		$record{'REGION_END'} = $end;
	    }
	}
        push @{ $record{'VERSION'} }, @accs;
    }

version_line: /VERSION/ /(.+)(?=\n)/
    {
        push @{ $record{'VERSION'} }, split /\s+/, $item[2];
    }

version: /VERSION/ /(.+)(?=\n)/
    {
        push @{ $record{'VERSION'} }, split /\s+/, $item[2];
    }

project_line: /PROJECT/ section_continuing_indented
    {
        $record{'PROJECT'} = $item[2];
    }

keywords: /KEYWORDS/ keyword_value
    { 
        $record{'KEYWORDS'} = $item[2];
    }

keyword_value: section_continuing_indented
    { 
        ( my $str = $item[1] ) =~ s/\.$//;
        $return = [ split(/,\s*/, $str ) ];
    }
    | PERIOD { $return = [] }

dbsource: /DBSOURCE/ /\w+/ /[^\n]+/xms
    {
        push @{ $record{'DBSOURCE'} }, {
            $item[2], $item[3]
        };
    }

source_line: /SOURCE/ source_value 
    { 
        ( my $src = $item[2] ) =~ s/\.$//;
        $src =~ s/\bsp$/sp./;
        $record{'SOURCE'} = $src;
    }

source_value: /(.+?)(?=\n\s{0,2}[A-Z]+)/xms { $return = $1 }

organism: organism_line classification_line
    { 
        $record{'ORGANISM'} = $item[1];
        $record{'CLASSIFICATION'} = $item[2];
    }

organism_line: /ORGANISM/ organism_value { $return = $item[2] }

organism_value: /([^\n]+)(?=\n)/xms { $return = $1 }

classification_line: /([^.]+)[.]/xms { $return = [ split(/;\s*/, $1) ] }

word: /\w+/

reference: /REFERENCE/ NUMBER(?) parenthetical_phrase(?) authors(?) consrtm(?) title journal remark(?) pubmed(?) remark(?)
    {
        my $num    = $item[2][0] || $ref_num++;
        my $remark = join(' ', map { $_ || () } $item[8][0], $item[10][0]);
        $remark    = undef if $remark !~ /\S+/;

        push @{ $record{'REFERENCES'} }, {
            number  => $num,
            authors => $item{'authors(?)'}[0],
            title   => $item{'title'},
            journal => $item{'journal'},
            pubmed  => $item[9][0],
            note    => $item[3][0],
            remark  => $remark,
            consrtm => $item[5][0],
        };

    }

parenthetical_phrase: /\( ([^)]+) \)/xms
    {
        $return = $1;
    }

authors: /AUTHORS/ author_value { $return = $item[2] }

author_value: /(.+?)(?=\n\s{0,2}[A-Z]+)/xms 
    { 
        $return = [ 
            grep  { !/and/ }      
            map   { s/,$//; $_ } 
            split /\s+/, $1
        ];
    }

title: /TITLE/ /.*?(?=\n\s{0,2}[A-Z]+)/xms
    { ( $return = $item[2] ) =~ s/\n\s+/ /; }

journal: /JOURNAL/ journal_value 
    { 
        $return = $item[2] 
    }

journal_value: /(.+)(?=\n\s{3}PUBMED)/xms 
    { 
        $return = $1; 
        $return =~ s/\n\s+/ /g; 
    }
    | /(.+?)(?=\n\s{0,2}[A-Z]+)/xms 
    { 
        $return = $1; 
        $return =~ s/\n\s+/ /g; 
    }

pubmed: /PUBMED/ NUMBER
    { $return = $item[2] }

remark: /REMARK/ section_continuing_indented
    { $return = $item[2] }

consrtm: /CONSRTM/ /[^\n]+/xms { $return = $item[2] }

features: /FEATURES/ section_continuing_indented
    { 
        my ( $location, $cur_feature_name, %cur_features, $cur_key );
        for my $fline ( split(/\n/, $item[2]) ) {
            next if $fline =~ m{^\s*Location/Qualifiers};
            next if $fline !~ /\S+/;

            if ( $fline =~ /^\s{21}\/ (\w+?) = (.+)$/xms ) {
                my ( $key, $value )   = ( $1, $2 );
                $value                =~ s/^"|"$//g;
                $cur_key              = $key;
                $cur_features{ $key } = $value;

                if ( $key eq 'db_xref' && $value =~ /^taxon:(\d+)$/ ) {
                    $record{'NCBI_TAXON_ID'} = $1;
                }

                if ( $ATTRIBUTE_PROMOTE{ $key } ) {
                    $record{ uc $key } = $value;
                }
            }
            elsif ( $fline =~ /^\s{5}(\S+) \s+ (.+)$/xms ) {
                my ( $this_feature_name, $this_location ) = ( $1, $2 );

                if ( $cur_feature_name ) {
                    push @{ $record{'FEATURES'} }, {
                        name     => $cur_feature_name,
                        location => delete $cur_features{location},
                        feature  => { %cur_features },
                    };

                    %cur_features = ();
                }

                $cur_key = 'location';
                $cur_features{location} = $this_location;
                $cur_feature_name = $this_feature_name;
            }
            elsif ( $fline =~ /^\s{21}([^"]+)["]?$/ ) {
                if ( $cur_key ) {
                    $cur_features{ $cur_key } .= 
                        $cur_key eq 'translation' 
                            ? $1
                            : ' ' . $1;
                }
            }
        }

        push @{ $record{'FEATURES'} }, {
            name     => $cur_feature_name,
            location => delete $cur_features{location},
            feature  => { %cur_features },
        };
    }

base_count: /BASE COUNT/ base_summary(s)
    {
        for my $sum ( @{ $item[2] } ) {
            $record{'BASE_COUNT'}{ $sum->[0] } = $sum->[1];
        }
    }

base_summary: /\d+/ /[a-zA-Z]+/
    {
        $return = [ $item[2], $item[1] ];
    }

origin: /ORIGIN/ origin_value 
    { 
        $record{'ORIGIN'} = $item[2] 
    }

origin_value: /(.*?)(?=\n\/\/)/xms
    {
        my $seq = $1;
        $record{'SEQUENCE'} = [];
        while ( $seq =~ /([actg]+)/gc ) {
            push @{ $record{'SEQUENCE'} }, $1;
        }

        $return = $seq;
    }

comment: /COMMENT/ comment_value

comment_value: /(.+?)(?=\n[A-Z]+)/xms
    { 
        $record{'COMMENT'} = $1;
    }

contig: /CONTIG/ section_continuing_indented 
    {
        $record{'CONTIG'} = $item[2];
    }

commented_line: /#[^\n]+/

NUMBER: /\d+/

PERIOD: /\./

record_delimiter: /\/\/\s*/xms

primary: /.*/

eofile: /^\Z/

END_OF_GRAMMAR
}

# ----------------------------------------------------------------
=pod

=head1 AUTHOR

Ken Youens-Clark E<lt>kclark at cpan.orgE<gt>.

=head1 BUGS

Please report any bugs or feature requests to C<bug-bio-genbankparser
at rt.cpan.org>, or through the web interface at
L<http://rt.cpan.org/NoAuth/ReportBug.html?Queue=Bio-GenBankParser>.
I will be notified, and then you'll automatically be notified of
progress on your bug as I make changes.

=head1 SUPPORT

You can find documentation for this module with the perldoc command.

    perldoc Bio::GenBankParser

=over 4

=item * RT: CPAN's request tracker

L<http://rt.cpan.org/NoAuth/Bugs.html?Dist=Bio-GenBankParser>

=item * AnnoCPAN: Annotated CPAN documentation

L<http://annocpan.org/dist/Bio-GenBankParser>

=item * CPAN Ratings

L<http://cpanratings.perl.org/d/Bio-GenBankParser>

=item * Search CPAN

L<http://search.cpan.org/dist/Bio-GenBankParser>

=back

=head1 ACKNOWLEDGEMENTS

Lincoln Stein, Doreen Ware and everyone at Cold Spring Harbor Lab.

=head1 COPYRIGHT & LICENSE

Copyright 2008 Ken Youens-Clark, all rights reserved.

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself.

=cut

1; # End of Bio::GenBankParser
