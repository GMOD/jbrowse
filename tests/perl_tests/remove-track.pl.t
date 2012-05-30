use strict;
use warnings;

use lib 'tests/perl_tests/lib';
use JBlibs;

use File::Temp;
use Test::More;

use File::Copy::Recursive 'dircopy';


use FileSlurping 'slurp';

use Bio::JBrowse::Cmd::RemoveTrack;

sub remove_track {
    Bio::JBrowse::Cmd::RemoveTrack->new( '--quiet',  @_ )->run
}

{
    my $tempdir = File::Temp->newdir;
    dircopy( 'tests/data/volvox_formatted_refseqs', $tempdir );
    remove_track( '--trackLabel' => 'DNA', '--dir' => $tempdir );

    is_deeply( slurp( $tempdir, 'trackList.json' ),
               { tracks => [], formatVersion => 1 },
               'deleted the DNA track' );
}

{
    my $tempdir = File::Temp->newdir;
    dircopy( 'tests/data/hg19_formatted', $tempdir );

    my $before = slurp( $tempdir, 'trackList.json' );

    remove_track( '--trackLabel' => 'nonexistent!', '--dir' => $tempdir );

    my $after = slurp( $tempdir, 'trackList.json' );
    is_deeply( $before, $after, 'delete on nonexistent track does nothing' );

    remove_track( '--trackLabel' => 'knownGene', '--dir' => $tempdir );

    is_deeply( slurp( $tempdir, 'trackList.json' ),
               { tracks => [], formatVersion => 1 },
               'deleted the knownGenes track' );

}

{
    my $tempdir = File::Temp->newdir;
    dircopy( 'tests/data/hg19_formatted', $tempdir );

    ok( -d "$tempdir/tracks/knownGene", 'track data dir is there' );
    remove_track( '--delete', '--trackLabel' => 'knownGene', '--dir' => $tempdir );

    is_deeply( slurp( $tempdir, 'trackList.json' ),
               { tracks => [], formatVersion => 1 },
               'deleted the knownGenes track' );
    ok( ! -d "$tempdir/tracks/knownGene", 'track data dir is no longer there' );

}

done_testing;
