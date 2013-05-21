package Bio::JBrowse::Command::format_nclist;
use strict;
use warnings;

use Bio::JBrowse -command;

use Bio::JBrowse::Store::NCList;

sub command_names { 'format-nclist' }

sub opt_spec {
    return (
        [ "format=s",  "Format of (all) input data.  If not specified, will guess at format of each source." ],
        [ "out|o=s",   "Output location.  Will make a new directory." ],
        [ "presorted", "Input is already sorted by reference sequence and start coordinate." ],
        [ "type=s@", "Format only features of the given type.  For multiple types, may be specified multiple times, or with comma-separated types" ],
        [ "force|f", "Overwrite any existing output." ],
        );
}

sub validate_args {
    my ($self, $opt, $args) = @_;

    exists $opt->{out} or die "--out or -o required\n";
    -e $opt->{out} && ! $opt->{force}
        and die "'$opt->{out}' exists, and --force not specified\n";

    no warnings 'uninitialized';
    if( exists $opt->{format} ) {
        $self->{format} = {qw(
                                 gff   gff3
                                 gff3  gff3
                             )}->{ lc $opt->{format} }
            or die "unknown format '$opt->{format}'\n";
    }
}

sub execute {
    my ($self, $opt, $args) = @_;

    my $stream = $self->_open_all( @$args );

    if( $opt->{type} ) {
        require Bio::JBrowse::FeatureStream::Filter;
        my @types = map {split /,/, $_ } @{ $opt->{type} || [] };
        $stream = Bio::JBrowse::FeatureStream::Filter->new(
            $stream,
            sub {
                no warnings 'uninitialized';
                my ($f) = @_;
                for my $t (@types) {
                    return 1 if $f->{type} eq $t;
                }
                return 0;
            });
    }

    my $store = Bio::JBrowse::Store::NCList->new({
        path => $opt->{out}
    });
    $store->${\( $opt->{presorted} ? 'insert_presorted' : 'insert' )}( $stream );
}

sub _open_all {
    my ( $self, @paths ) = @_;

    my @streams = map {
        my $path = $_;

        my $format = $self->{format} || $self->_guess_format( $path )
            or die "cannot guess format for '$path', and --format option not given\n";

        $self->${\"_open_$format"}( $path );
    } @paths;

    return sub {} unless @streams;

    my $curr_stream = shift @streams;
    return sub {
        return $curr_stream->() || do {
            my $i;
            until( $i || !@streams ) {
                $curr_stream = shift @streams;
                $i = $curr_stream->();
            }
            $i
        };
    };
}

sub _guess_format {
    my ( $self, $path ) = @_;

    if( -f $path ) {
        if( $path =~ /\.([^\.]+)$/ ) {
            return {qw(
                          gff   gff3
                          gff3  gff3
                      )}->{lc $1};
        }
    }
    return;
}

sub _open_gff3 {
    my ( $self, $file ) = @_;

    require Bio::JBrowse::FeatureStream::GFF3;
    require Bio::GFF3::LowLevel::Parser;

    open my $f, '<', $file or die "$! reading $file\n";
    my $p = Bio::GFF3::LowLevel::Parser->open( $f );
    return Bio::JBrowse::FeatureStream::GFF3->new( $p );
}

1;

