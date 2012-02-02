use strict;
use warnings;

use lib "install_util";
use File::Spec;
use File::Basename;
use FindBin;
use Module::Build;
use Test::More 'no_plan';

use Capture::Tiny qw/ capture /;

compiles_ok( $_ ) for files_to_check();

############# subs ################

sub files_to_check {
    unless( -d 'cgi-bin' && -d 'bin' ) {
        chdir File::Spec->catfile( $FindBin::Bin, File::Spec->updir, File::Spec->updir );
    }

    return
        map { glob "$_/*.p{m,l}" }
        'lib', 'bin';
}

sub compiles_ok {
    my @abspath  = @_;
    my $basename = $abspath[-1];
    my $cat_path = File::Spec->catfile( @abspath );

  SKIP: {
        skip "explicitly skipping $cat_path", 1 if skip_file($cat_path);

        my ($stdout, $stderr) = capture {
            system $^X, '-cw', $cat_path
        };
        if ( $? == 0 ) {
            ok( 1, "$cat_path compiled ok" )
                or diag $stderr;
            like( $stderr, qr/syntax OK\n$/, qq|$cat_path stderr said "syntax OK"| )
                or diag $stderr;
        } elsif ( $stderr =~ /^Can't locate (\S+) in \@INC/ && missing_recommend($1) ) {
            ok( 1, "$cat_path does not compile due to missing recommend" );
        } else {
            ok( 0, "$cat_path compiled ok" );
            diag "stdout: $stdout";
            diag "stderr: $stderr";
        }
	chomp $stdout;
        is( $stdout, '', "$cat_path nothing on stdout" );
    }
}

my $missing_recommends;
sub missing_recommend {
    my $modname = shift;
    $modname =~ s/\.pm$//;
    $modname =~ s![\\/]!::!g;

    $missing_recommends 
	||= Module::Build->current->prereq_failures ?  Module::Build->current->prereq_failures->{recommends} 
                                                    :  {};
    return $missing_recommends->{$modname};
}


sub skip_file {
    my $file = shift;
    my %skip = map { $_ => 1 }
        qw(
           gbrowse_netinstall.pl
           gbrowse_netinstall2.pl
	   process_wormbase.pl
	   gbrowse_gmap
	   make_das_conf.pl
          );

    return $skip{ basename($file) };
}
