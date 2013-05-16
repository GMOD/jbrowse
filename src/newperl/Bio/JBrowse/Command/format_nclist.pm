package Bio::JBrowse::Command::format_nclist;
use Bio::JBrowse -command;

use Bio::GFF3::LowLevel::Parser;

use Bio::JBrowse::Store::NCList;
use Bio::JBrowse::FeatureStream::GFF3;

sub command_names { 'format-nclist' }

sub opt_spec {
    return (
        [ "format=s",  "format of all input data items" ],
        [ "out|o=s",   "output location.  will make a new directory here" ],
        [ "presorted", "input is already sorted by reference sequence and start coordinate" ],
        [ "force|f", "overwrite any existing output" ]
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

    my @streams = $self->_open_all( @$args );
    my $store = Bio::JBrowse::Store::NCList->new({
        path => $opt->{out}
    });
    $store->${\( $opt->{presorted} ? 'insert_presorted' : 'insert' )}( @streams );
}

sub _open_all {
    my ( $self, @paths ) = @_;

    my @streams = map {
        my $path = $_;

        my $format = $self->{format} || $self->_guess_format( $path )
            or die "cannot guess format for '$path', and --format option not given\n";

        $self->${\"_open_$format"}( $path );
    } @paths;

    return @streams;
    # return sub {} unless @streams;

    # my $curr_stream = shift @streams;
    # return sub {
    #     return $curr_stream->() || do {
    #         my $i;
    #         until( $i ) {
    #             $curr_stream = shift @streams
    #                 or return;
    #             $i = $curr_stream->();
    #         }
    #         $i
    #     };
    # };
}

sub _open_gff3 {
    my ( $self, $file ) = @_;
    open my $f, '<', $file or die "$! reading $file\n";
    my $p = Bio::GFF3::LowLevel::Parser->open( $f );
    return Bio::JBrowse::FeatureStream::GFF3->new( $p );
}

1;

