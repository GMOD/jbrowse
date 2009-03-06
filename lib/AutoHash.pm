
=head1 NAME

AutoHash.pm

=head1 SYNOPSIS

Simple Perl module wrapping a hashref with AUTOLOAD-ed accessors.

=head1 EXAMPLES

  use AutoHash;

  # construct a hash with two key-value pairs
  my $autohash = AutoHash->new ( "key1" => "value1",
                                 "key2" => "value2" );

  # get a value
  print $autohash->key1, "\n";

  # set a value
  $autohash->key2 ("new value");
  print $autohash->key2, "\n";

=head1 GENERAL USAGE

An AutoHash object is a blessed hash reference.

Its only inbuilt method is the constructor, 'new'.

All other methods will be automatically interpreted as hash element accessors for the eponymous tag.

If the method is called with an argument, it's a setter; otherwise, it's a getter.

=head1 METHODS

=cut

package AutoHash;

use Exporter;
@ISA = qw (Exporter);
@EXPORT = qw (new AUTOLOAD);
@EXPORT_OK = @EXPORT;

use strict;
use vars '@ISA';

use Carp;


=head2 new

    my $autohash1 = AutoHash->new();
    my $autohash2 = AutoHash->new (%existing_hash);

Creates a new AutoHash object.

=cut

sub new {
    my ($class, @data) = @_;
    my $self = {@data};
    $class = ref($class) if ref($class);
    bless $self, $class;
    return $self;
}

=head2 Accessors (getters)

    $autohash->MYTAG()

Returns the hash value with tag "MYTAG".

=head2 Accessors (setters)

    $autohash->MYTAG ($MYVALUE)

Sets the value of hash tag "MYTAG" to $MYVALUE.
Returns $MYVALUE.

Creates a new AutoHash object.

=cut

# AUTOLOAD method
sub AUTOLOAD {
    my ($self, @args) = @_;
    my $sub = our $AUTOLOAD;
    $sub =~ s/.*:://;  # strip off module path

    # check for DESTROY
    return if $sub eq "DESTROY";

    # get or set
    return @args 
	? ($self->{$sub} = shift(@args))
	: $self->{$sub};
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
