## object that opens and parses a JBrowse text-format configuration file
package Bio::JBrowse::ConfigurationFile;
use strict;
use warnings;

use Carp ();

use JSON 2;

sub new {
    my $class = shift;
    return bless { @_ }, $class;
}

sub to_hashref {
    my ( $self ) = @_;
    my $text = eval {
        local $/;
        open my $f, '<', $self->{path} or die "$! reading $self->{path}";
        <$f>
    };
    return $text ? $self->_regularize( $self->_parse( $text ) ) : {};
}

sub _regularize {
    my ( $self, $conf ) = @_;

    # change the tracks conf from a hashref to an arrayref if necessary
    if( ref $conf->{tracks} eq 'HASH' ) {
        my @tracks;
        while( my ( $label, $track_conf ) = each %{$conf->{tracks}} ) {
            $track_conf->{label} = $label;
            push @tracks, $track_conf;
        }
        $conf->{tracks} = \@tracks;
    }

    return $conf;
}

# this is a word-for-word port of the JS conf parser
# (JBrowse/ConfigAdaptor/conf.js).  makes for slightly odd Perl.
sub _parse {
    my ( $self, $text, $load_args ) = @_;

    my ( @section, @keypath, $operation, $value );
    my $data = {};
    my $lineNumber;
    my $json = JSON->new->relaxed;

    sub getObject {
        my ( $path, $data ) = @_;
        my @path = split /\./, $path;
        $data = $data->{ shift @path } while $data && @path;
        return $data;
    }

    sub setObject {
        my ( $path, $value, $data ) = @_;
        my @path = split /\./, $path;
        my $last = pop @path;
        $data = $data->{shift @path} ||= {} while @path;
        $data->{$last} = $value;
        return $value;
    }

    sub trim {
        my ( $a ) = @_;
        $a =~ s/^\s+|\s+$//g;
        return $a;
    }

    my $recordVal = sub {
        return if not defined $value;

        eval {
            # parse json
            if ( my ( $match ) = $value =~ /^json:(.+)/i ) {
                $value = $json->decode( $match );
            }
            # parse numbers if it looks numeric
            elsif ( $value =~ /^[\+\-]?[\d\.,]+([eE][\-\+]?\d+)?$/ ) {
                $value =~ s/,//g;
                $value += 0;
            }

            my $path = join '.', ( @section, @keypath );
            if ( $operation eq '+=' ) {
                my $existing = getObject( $path, $data );
                if ( $existing ) {
                    if ( ref $existing ne 'ARRAY' ) {
                        $existing = [$existing];
                    }
                } else {
                    $existing = [];
                }
                push @$existing, $value;
                $value = $existing;
            }
            setObject( $path, $value, $data );
        }; if( $@ ) {
            Carp::croak "syntax error".
               (($load_args->{config}||{})->{url} ? ' in '.$load_args->{config}{url} : '')
               . ( $lineNumber ? " at line ".($lineNumber-1) : '' );
        }
    };

    my @lines = split /\n/, $text;
    for ( my $i = 0; $i < @lines; $i++ ) {
        my $line = $lines[$i];
        #warn "$line\n";
        $lineNumber = $i+1;
        $line =~ s/^\s*#.+//g;

        # new section
        if ( my ( $match ) = $line =~ /^\s*\[([^\]]+)/ ) { # new section
            $recordVal->();
            @keypath = ();
            $value = undef;
            $match =~ s/^\s+|\s+$//g;
            @section = split /\s*\.\s*/, $match;
            if ( @section == 1 && lc( $section[0] ) eq 'general' ) {
                @section = ();
            }
        }
        # new value
        elsif ( $line =~ ( (defined $value) ? qr/^(\S[^\+=]+)(\+?=)(.*)/ : qr/^([^\+=]+)(\+?=)(.*)/ ) ) {
            $recordVal->();
            $operation = $2;
            $value = trim( $3 );
            @keypath = split /\s*\.\s*/, trim( $1 );
            if ( $self->_isAlwaysArray( join '.', ( @section, @keypath ))) {
                $operation = '+=';
            }
        }
        # add to existing array value
        elsif ( @keypath && ( $line =~ /^\s{0,4}\+\s*(.+)/ ) ) {
            $recordVal->();
            $operation = '+=';
            $value = trim( $1 );
        }
        # add to existing value
        elsif ( defined $value && ( $line =~ /^\s+(\S.*)/ ) ) {
            $value .= length( $value ) ? ' '.trim($1) : trim($1);
        }
        # done with last value
        else {
            $recordVal->();
            @keypath = ();
            $value = undef;
        }
    }

    $recordVal->();

    return $data;
}

sub _isAlwaysArray {
    my ( $self, $varname ) = @_;
    return $varname eq 'include';
}


1;
