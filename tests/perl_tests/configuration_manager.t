use strict;
use warnings;

use Test::More;
use JBlibs;
use lib 'tests/perl_tests/lib';
use FileSlurping 'slurp';

use Data::Dumper;

use_ok( 'Bio::JBrowse::ConfigurationManager' );

my $config = Bio::JBrowse::ConfigurationManager
  ->new(
      conf => {
        include => [ 'tests/data/conf/includes.json', 'tests/data/conf/tracks.conf' ],
        baseUrl => '.',
        overrideMe => 'rootConfig',
        foo => 1,
        tracks => [
            { label => "zoo", zonk => "quux"},
            { label => "zaz", honk => "beep" => root => "root!"}
        ]
    })
  ->get_final_config;


is($config->{foo}, 1);
is($config->{bar}, 42);
is($config->{overrideMe}, 'rootConfig');
is($config->{override2}, 'no_includes.json');
is($config->{zoz}, 42);

is(@{$config->{tracks}}, 6);

is($config->{tracks}[4]{label}, 'zaz');
is($config->{tracks}[4]{honk}, 'beep');
is($config->{tracks}[4]{noinclude}, 'also here');
is($config->{tracks}[4]{root}, 'root!');
is($config->{tracks}[4]{quux}, 'foo');

is($config->{tracks}[0]{label}, 'includes');
is($config->{tracks}[1]{label}, 'noinclude');
is($config->{tracks}[5]{label}, 'zoo');

# print Dumper($config);

{
    eval {
        my $errorConfig = Bio::JBrowse::ConfigurationManager
        ->new(
            conf => {
                include => [ 'tests/data/conf/malformed.json' ],
                baseUrl => '.',
                overrideMe => 'rootConfig',
                foo => 1,
                tracks => [
                    { label => "zoo", zonk => "quux"},
                    { label => "zaz", honk => "beep" => root => "root!"}
                ]
            })
        ->get_final_config;
    };
    my $error = $@;
    like($error, qr/^syntax error in/, 'thrown error is explicitly a syntax error');
    like($error, qr/malformed\.json\b/, 'thrown error contains malformed JSON file name');
}

done_testing;
