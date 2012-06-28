#!/usr/bin/env perl

use FindBin '$RealBin';
use lib "$RealBin/../src/perl5";
use JBlibs;

use Bio::JBrowse::Cmd::RemoveTrack;

exit Bio::JBrowse::Cmd::RemoveTrack->new(@ARGV)->run;

__END__

=head1 NAME

remove-track.pl - remove a formatted track from a JBrowse data directory

=head1 USAGE

  remove-track.pl --trackLabel MyTrackLabel --dir path/to/data/dir

=head1 DESCRIPTION

Removes a track from a JBrowse data directory.  By default, only
removes the track configuration entry so that JBrowse will not display
the track.  If the C<--delete> option is passed, also removes the
track data.  By default, this tool prints the track configuration JSON
that it removed.  This can be turned of by passing the C<--quiet>
option.

=head1 OPTIONS

=over 4

=item --dir path/to/data/dir

Path to the JBrowse data directory to operate on.

=item --trackLabel MyLabel

Track label(s) to delete.  This option may be specified multiple times
to delete multiple tracks.

=item --delete, -D

In addition to removing the track configuration so that JBrowse will
not display the track, delete the track data as well.  Be careful!

=item -h, --help, -?

Display an extended help message.

=item -q, --quiet

Do not print any progress messages.

=back

=cut

