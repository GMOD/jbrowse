package Bio::JBrowse::Cmd::IndexNames;

=head1 NAME

Bio::JBrowse::Cmd::IndexNames - script module to create or update a
JBrowse names index from source files.  Main script POD is in generate-names.pl.

=cut

use strict;
use warnings;

use base 'Bio::JBrowse::Cmd';

use File::Spec ();
use POSIX ();
use Storable ();
use File::Path ();
use File::Temp ();
use List::Util ();

use GenomeDB ();
use Bio::GFF3::LowLevel qw/gff3_parse_feature/;
use Bio::JBrowse::HashStore ();

sub option_defaults {(
    dir => 'data',
    completionLimit => 20,
    locationLimit => 100,
    mem => 256 * 2**20,
    tracks => [],
)}

sub option_definitions {(
"dir|out=s",
"completionLimit=i",
"locationLimit=i",
"verbose|v+",
"noSort",
"thresh=i",
"sortMem=i",
"mem=i",
"workdir=s",
'tracks=s@',
'hashBits=i',
'incremental|i',
"help|h|?",
'safeMode',
'compress'
)}

sub initialize {
    my ( $self ) = @_;

    # these are used in perf-critical tight loops, make them accessible faster
    $self->{max_completions} = $self->opt('completionLimit');
    $self->{max_locations} = $self->opt('locationLimit');

    $self->{stats} = {
        total_namerec_bytes => 0,
        namerecs_buffered   => 0,
        tracksWithNames => [],
        record_stream_estimated_count => 0,
        operation_stream_estimated_count => 0,
    };
}

sub run {
    my ( $self ) = @_;

    my $outDir = $self->opt('dir');
    -d $outDir or die "Output directory '$outDir' does not exist.\n";
    -w $outDir or die "Output directory '$outDir' is not writable.\n";

    my $gdb = GenomeDB->new( $outDir );

    my $refSeqs = $gdb->refSeqs;
    unless( @$refSeqs ) {
        die "No reference sequences defined in configuration, nothing to do.\n";
    }
    my @tracks = grep $self->track_is_included( $_->{label} ),
                      @{ $gdb->trackList || [] };
    unless( @tracks ) {
        die "No tracks. Nothing to do.\n";
    }

    $self->vprint( "Tracks:\n".join('', map "    $_->{label}\n", @tracks ) );

    # find the names files we will be working with
    my $names_files = $self->find_names_files( \@tracks, $refSeqs );
    unless( @$names_files ) {
        warn "WARNING: No feature names found for indexing,"
             ." only reference sequence names will be indexed.\n";
    }

    $self->load( $refSeqs, $names_files );

    # store the list of tracks that have names
    $self->name_store->meta->{track_names} = [
        $self->_uniq(
            @{$self->name_store->meta->{track_names}||[]},
            @{$self->{stats}{tracksWithNames}}
            )
    ];

    # record the fact that all the keys are lowercased
    $self->name_store->meta->{lowercase_keys} = 1;

    # set up the name store in the trackList.json
    $gdb->modifyTrackList( sub {
                               my ( $data ) = @_;
                               $data->{names}{type} = 'Hash';
                               $data->{names}{url}  = 'names/';
                               return $data;
                           });

    if ( $self->opt('compress') ) {
        # if we are compressing the sequence files, drop a .htaccess file
        # in the seq/ dir that will automatically configure users with
        # Apache (and AllowOverride on) to serve the .txt.gz files
        # correctly
        require GenomeDB;
        my $hta = File::Spec->catfile( $self->opt('dir'), 'names', '.htaccess' );
        open my $hta_fh, '>', $hta or die "$! writing $hta";
        $hta_fh->print( GenomeDB->precompression_htaccess('.txtz','.jsonz') );
    }
    return;
}

sub load {
    my ( $self, $ref_seqs, $names_files ) = @_;

    # convert the stream of name records into a stream of operations to do
    # on the data in the hash store
    my $operation_stream = $self->make_operation_stream( $self->make_name_record_stream( $ref_seqs, $names_files ), $names_files );

    # hash each operation and write it to a log file
    $self->name_store->stream_do(
        $operation_stream,
        sub {
            my ( $operation, $data ) = @_;
            my %fake_store = ( $operation->[0] => $data );
            $self->do_hash_operation( \%fake_store, $operation );
            return $fake_store{ $operation->[0] } ;
        },
        $self->{stats}{operation_stream_estimated_count},
        );

}

sub _hash_operation_freeze { $_[1] }
sub _hash_operation_thaw   { $_[1] }

sub _uniq {
    my $self = shift;
    my %seen;
    return grep !($seen{$_}++), @_;
}

sub _mergeIndexEntries {
    my ( $self, $a, $b ) = @_;

    # merge exact
    {
        my $aExact = $a->{exact} ||= [];
        my $bExact = $b->{exact} || [];
        no warnings 'uninitialized';
        my %exacts = map { join( '|', @$_ ) => 1 } @$aExact;
        while ( @$bExact &&  @$aExact < $self->{max_locations} ) {
            my $e = shift @$bExact;
            if( ! $exacts{ join('|',@$e) }++ ) {
                push @{$aExact}, $e;
            }
        }
    }

    # merge prefixes
    {
        my $aPrefix = $a->{prefix} ||= [];
        # only merge if the target prefix is not already full
        if( ref $aPrefix->[-1] ne 'HASH' ) {
            my $bPrefix = $b->{prefix} || [];
            my %prefixes = map { $_ => 1 } @$aPrefix; #< keep the prefixes unique
            while ( @$bPrefix && @$aPrefix < $self->{max_completions} ) {
                my $p = shift @$bPrefix;
                if ( ! $prefixes{ $p }++ ) {
                    push @{$aPrefix}, $p;
                }
            }
        }
    }

    return $a;
}

sub make_file_record {
    my ( $self, $track, $file ) = @_;
    -f $file or die "$file not found\n";
    -r $file or die "$file not readable\n";
    my $gzipped = $file =~ /\.(txt|json|g)z(\.\d+)?$/;
    my $type = $file =~ /\.txtz?$/                ? 'txt'  :
               $file =~ /\.jsonz?$/               ? 'json' :
               $file =~ /\.vcf(\.gz)?$/           ? 'vcf'  :
               $file =~ /\.gff3?(\.gz)?(\.\d+)?$/ ? 'gff'  :
                                                    undef;
    if( $type ) {
        return {
            gzipped => $gzipped,
            nameAttributes => $track->{nameAttributes},
            indexedFeatures => $track->{indexedFeatures},
            fullpath => $file,
            type => $type,
            trackName => $track->{label}
        };
    }
    return;
}

sub track_is_included {
    my ( $self, $trackname ) = @_;
    my $included = $self->{included_track_names} ||= do {
        my @tracks = @{ $self->opt('tracks') };
        my $inc = { map { $_ => 1 } map { split ',', $_ } @tracks };
        @tracks ? sub { $inc->{ shift() } } : sub { 1 };
    };
    return $included->( $trackname );
}

sub name_store {
    my ( $self ) = @_;
    unless( $self->{name_store} ) {
        $self->{name_store} = tie my %tied_hash, 'Bio::JBrowse::HashStore', (
                dir   => File::Spec->catdir( $self->opt('dir'), "names" ),
                work_dir => $self->opt('workdir'),
                mem => $self->opt('mem'),
                empty => ! $self->opt('incremental'),
                compress => $self->opt('compress'),

                hash_bits => $self->requested_hash_bits,

                verbose => $self->opt('verbose')
        );
        $self->{name_store_tied_hash} = \%tied_hash;
    }
    return $self->{name_store};
}
sub name_store_tied_hash {
    my ( $self ) = @_;
    $self->name_store;
    return $self->{name_store_tied_hash};
}


sub close_name_store {
    my ( $self ) = @_;
    delete $self->{name_store};
    delete $self->{name_store_tied_hash};
}

sub requested_hash_bits {
    my $self = shift;
    # set the hash size to try to get about 5-10KB per file, at an
    # average of about 500 bytes per name record, for about 10 records
    # per file (uncompressed). if the store has existing data in it,
    # this will be ignored.
    return $self->{hash_bits} ||= $self->opt('hashBits')
      || do {
          if( $self->{stats}{record_stream_estimated_count} ) {
              my $records_per_bucket = $self->opt('compress') ? 40 : 10;
              my $bits = 4*int( log( $self->{stats}{record_stream_estimated_count} / $records_per_bucket )/ 4 / log(2));
              # clamp bits between 4 and 32
              sprintf( '%0.0f', List::Util::max( 4, List::Util::min( 32, $bits ) ));
          }
          else {
              12
          }
      };
}

sub make_name_record_stream {
    my ( $self, $refseqs, $names_files ) = @_;
    my @names_files = @$names_files;

    my $name_records_iterator = sub {};
    my @namerecord_buffer;

    # insert a name record for all of the reference sequences
    for my $ref ( @$refseqs ) {
        $self->{stats}{name_input_records}++;
        $self->{stats}{namerecs_buffered}++;
        my $rec = [ @{$ref}{ qw/ name length name seqDir start end seqChunkSize/ }];
        $self->{stats}{total_namerec_bytes} += length join(",",$rec);
        push @namerecord_buffer, $rec;
    }


    my %trackHash;
    my $trackNum = 0;

    my $names_dir = File::Spec->catdir( $self->opt('dir'), "names" );
    if( -e File::Spec->catfile( $names_dir,'meta.json' ) ) {

        # read meta.json data into a temp HashStore
        my $temp_store = tie my %temp_hash, 'Bio::JBrowse::HashStore', (
                    dir   => $names_dir,
                    empty => 0,
                    compress => 0,
                    verbose => 0);

        # initialize the track hash with an index
        foreach (@{$temp_store->meta->{track_names}}) {
            $trackHash{$_}=$trackNum++;
        }

        untie $temp_store;
    }


    return sub {
        while( ! @namerecord_buffer ) {
            my $nameinfo = $name_records_iterator->() || do {
                my $file = shift @names_files;
                return unless $file;
                $name_records_iterator = $self->make_names_iterator( $file );
                $name_records_iterator->();
            } or return;

            # expand each name record into its aliases
            my @aliases = map { ref($_) ? @$_ : $_ }  @{$nameinfo->[0]};
            foreach my $alias ( @aliases ) {
                    my $track = $nameinfo->[1];
                    unless ( defined $trackHash{$track} ) {
                        $trackHash{$track} = $trackNum++;
                        push @{$self->{stats}{tracksWithNames}}, $track;
                    }
                    $self->{stats}{namerecs_buffered}++;
                    push @namerecord_buffer, [
                        $alias,
                        $trackHash{$track},
                        @{$nameinfo}[2..$#{$nameinfo}]
                        ];
            }
        }
        return shift @namerecord_buffer;
    };
}



sub find_names_files {
    my ( $self, $tracks, $refseqs ) = @_;

    my @files;
    for my $track (@$tracks) {
        for my $ref (@$refseqs) {
            my $dir = File::Spec->catdir(
                $self->opt('dir'),
                "tracks",
                $track->{label},
                $ref->{name}
                );

            # read either names.txt or names.json files
            my $name_records_iterator;
            my $names_txt  = File::Spec->catfile( $dir, 'names.txt'  );
            if( -f $names_txt ) {
                push @files, $self->make_file_record( $track, $names_txt );
            }
            else {
                my $names_json = File::Spec->catfile( $dir, 'names.json' );
                if( -f $names_json ) {
                    push @files, $self->make_file_record( $track, $names_json );
                }
            }
        }

        # try to detect VCF tracks and index their VCF files
        if( $track->{urlTemplate} && $track->{urlTemplate} =~ /\.vcf\.gz/
             || ($track->{storeClass}||'') =~ /VCFTabix$/
            ) {
            my $path = File::Spec->catfile( $self->opt('dir'), $track->{urlTemplate} );
            if( -r $path ) {
                push @files, $self->make_file_record( $track, $path );
            }
            else {
                warn "VCF file '$path' not found, or not readable.  Skipping.\n";
            }
        }

        # try to detect GFF3 tracks and index their GFF3 files
        if( $track->{urlTemplate} && $track->{urlTemplate} =~ /\.gff3?\.gz(\.\d+)?/
             || ($track->{storeClass}||'') =~ /GFF3Tabix$/
            ) {
            my $path = File::Spec->catfile( $self->opt('dir'), $track->{urlTemplate} );
            if( -r $path ) {
                push @files, $self->make_file_record( $track, $path );
            }
            else {
                warn "GFF file '$path' not found, or not readable.  Skipping.\n";
            }
        }

    }

    return \@files;
}

sub make_operation_stream {
    my ( $self, $record_stream, $names_files ) = @_;

    $self->{stats}{namerecs_converted_to_operations} = 0;
    my @operation_buffer;
    # try to fill the operation buffer a bit to estimate the number of operations per name record
    {
        while( @operation_buffer < 50000 && ( my $name_record = $record_stream->()) ) {
            $self->{stats}{namerecs_converted_to_operations}++;
            push @operation_buffer, $self->make_operations( $name_record );
        }
    }

    # estimate the total number of name records we probably have based on the input file sizes
    #print "sizes: $self->{stats}{total_namerec_bytes}, buffered: $namerecs_buffered, b/rec: ".$total_namerec_sizes/$namerecs_buffered."\n";
    $self->{stats}{avg_record_text_bytes} = $self->{stats}{total_namerec_bytes}/($self->{stats}{namerecs_buffered}||1);
    $self->{stats}{total_input_bytes} = List::Util::sum(
        map { my $s = -s $_->{fullpath};
              $s *= 8 if $_->{fullpath} =~ /\.(g|txt|json)z$/;
              $s;
          } @$names_files ) || 0;
    $self->{stats}{record_stream_estimated_count} = int( $self->{stats}{total_input_bytes} / ($self->{stats}{avg_record_text_bytes}||1));;
    $self->{stats}{operation_stream_estimated_count} = $self->{stats}{record_stream_estimated_count} * int( @operation_buffer / ($self->{stats}{namerecs_converted_to_operations}||1) );

    if( $self->opt('verbose') ) {
        print "Sampled input stats:\n";
        while( my ($k,$v) = each %{$self->{stats}} ) {
            next if ref $v;
            $k =~ s/_/ /g;
            printf( '%40s'." $v\n", $k );
        }
    }

    return sub {
        unless( @operation_buffer ) {
            while( (my $name_record = $record_stream->()) && @operation_buffer < 5000) {
                push @operation_buffer, $self->make_operations($name_record);
            }
        }
        return shift @operation_buffer;
    };
}

my $OP_ADD_EXACT  = 1;
my $OP_ADD_PREFIX = 2;

# given a name record, return zero or more operations to perform on the hash store
# to load it into the store
sub make_operations {
    my ( $self, $record ) = @_;

    my $lc_name = lc $record->[0];
    unless( defined $lc_name ) {
        unless( $self->{already_warned_about_blank_name_records} ) {
            warn "WARNING: some blank name records found, skipping.\n";
            $self->{already_warned_about_blank_name_records} = 1;
        }
        return;
    }

    # if the name of the thing is the same as its reference
    # sequence (i.e. this is a reference sequence),
    # then skip it, because we treat ref seqs separately.
    {
        no warnings 'uninitialized';
        return if $record->[0] eq $record->[3];
    }

    my @ops = ( [ $lc_name, $OP_ADD_EXACT, $record ] );

    if( $self->{max_completions} > 0 ) {
        # generate all the prefixes
        my $l = $lc_name;
        chop $l;
        while ( $l ) {
            push @ops, [ $l, $OP_ADD_PREFIX, $record->[0] ];
            chop $l;
        }
    }

    $self->{stats}{operations_made} += scalar @ops;

    return @ops;
}

my %full_entries;
sub do_hash_operation {
    my ( $self, $store, $op ) = @_;

    my ( $lc_name, $op_name, $record ) = @$op;

    if( $op_name == $OP_ADD_EXACT ) {
        my $r = $store->{$lc_name};
        $r = $r ? $self->_hash_operation_thaw($r) : { exact => [], prefix => [] };

        my $exact = $r->{exact};
        if( @$exact < $self->{max_locations} ) {
            # don't insert duplicate locations
            no warnings 'uninitialized';
            if( ! grep {
                      $record->[1] == $_->[1] && $record->[3] eq $_->[3] && $record->[4] == $_->[4] && $record->[5] == $_->[5]
                  } @$exact
              ) {
                push @$exact, $record;
                $store->{$lc_name} = $self->_hash_operation_freeze( $r );
            }
        }
        # elsif( $verbose ) {
        #     print STDERR "Warning: $name has more than --locationLimit ($self->{max_locations}) distinct locations, not all of them will be indexed.\n";
        # }
    }
    elsif( $op_name == $OP_ADD_PREFIX && ! exists $full_entries{$lc_name} ) {
        my $r = $store->{$lc_name};
        $r = $r ? $self->_hash_operation_thaw($r) : { exact => [], prefix => [] };

        my $name = $record;

        my $p = $r->{prefix};
        if( @$p < $self->{max_completions} ) {
            if( ! grep $name eq $_, @$p ) { #< don't insert duplicate prefixes
                push @$p, $name;
                $store->{$lc_name} = $self->_hash_operation_freeze( $r );
            }
        }
        elsif( @$p == $self->{max_completions} ) {
            push @$p, { name => 'too many matches', hitLimit => 1 };
            $store->{$lc_name} = $self->_hash_operation_freeze( $r );
            $full_entries{$lc_name} = 1;
        }
    }
}

# each of these takes an input filename containing names to be indexed,
# and returns a subroutine that, when called repeatedly, returns name
# records until there are no more (returning undef to signal the end)
sub make_names_iterator {
    my ( $self, $file_record ) = @_;
    if( $file_record->{type} eq 'txt' ) {
        my $input_fh = $self->open_names_file( $file_record );
        # read the input json partly with low-level parsing so that we
        # can parse incrementally from the filehandle.  names list
        # files can be very big.
        return sub {
            my $t = <$input_fh>;
            if( $t ) {
                $self->{stats}{name_input_records}++;
                $self->{stats}{total_namerec_bytes} += length $t;
                return eval { JSON::from_json( $t ) };
            }
            return undef;
        };
    }
    elsif( $file_record->{type} eq 'json' ) {
        # read old-style names.json files all from memory
        my $input_fh = $self->open_names_file( $file_record );

        my $data = JSON::from_json(do {
            local $/;
            my $text = scalar <$input_fh>;
            $self->{stats}{total_namerec_bytes} += length $text;
            $text;
        });

        $self->{stats}{name_input_records} += scalar @$data;

        return sub { shift @$data };
    }
    elsif( $file_record->{type} eq 'vcf' ) {
        my $input_fh = $self->open_names_file( $file_record );
        no warnings 'uninitialized';
        return sub {
            my $line;
            while( ($line = <$input_fh>) =~ /^#/ ) {}
            return unless $line;

            $self->{stats}{name_input_records}++;
            $self->{stats}{total_namerec_bytes} += length $line;

            my ( $ref, $start, $name, $basevar ) = split "\t", $line, 5;
            $start--;
            my @names = split /\s*;\s*/, $name;
            return [\@names,$file_record->{trackName},$name,$ref, $start, $start+length($basevar)];
        };
    }
    elsif( $file_record->{type} eq 'gff' ) {
        my $input_fh = $self->open_names_file( $file_record );
        no warnings 'uninitialized';
        return sub {
            # find the next feature in the file that has a name
            my $line;
            my $feature;
            my @names;
            while(my $line = <$input_fh>) {
                if( $line !~ /^#/ ) {
                    chomp $line;
                    $feature = gff3_parse_feature($line);
                    my $type = $feature->{type} || [];
                    my @featureTypes;
                    if(ref(\$file_record->{indexedFeatures}) eq 'ARRAY') {
                        @featureTypes = $file_record->{indexedFeatures}
                    } elsif(ref(\$file_record->{indexedFeatures}) eq 'SCALAR') {
                        @featureTypes = split /\s*,\s*/, $file_record->{indexedFeatures};
                    }
                    if( (!@featureTypes) || (@featureTypes && (grep $_ eq $type, @featureTypes)) ) {
                        my $Name = $feature->{attributes}{Name} || [];
                        my $ID = $feature->{attributes}{ID} || [];
                        my $Alias = $feature->{attributes}{Alias} || [];
                        my @fields;
                        my @computedFields;
                        if(ref(\$file_record->{nameAttributes}) eq 'ARRAY') {
                            @fields = $file_record->{nameAttributes}
                        } elsif(ref(\$file_record->{nameAttributes}) eq 'SCALAR') {
                            @fields = split /\s*,\s*/, $file_record->{nameAttributes};
                        }
                        if(@fields) {
                            @computedFields = map { $feature->{attributes}{$_} || [] } @fields;
                        }
                        @names = @fields ? @computedFields : $Name->[0] ? (@$Name, @$ID) : @$ID;
                    }
                    last if scalar @names;
                }
            }

            # end the stream by returning undef if there are no more features
            return unless $feature;

            # keep stats
            $self->{stats}{name_input_records}++;
            $self->{stats}{total_namerec_bytes} += length $line + 1;

            my $names = $feature->{attributes}{Name} || $feature->{attributes}{ID};
            return [
                \@names,
                $file_record->{trackName},
                $names->[0],
                $feature->{seq_id},
                $feature->{start}-1,
                $feature->{end}+0
            ];
        };
    }
    else {
        warn "ignoring names file $file_record->{fullpath}.  unknown type $file_record->{type}.\n";
        return sub {};
    }
}

sub open_names_file {
    my ( $self, $filerec ) = @_;
    my $infile = $filerec->{fullpath};
    if( $filerec->{gzipped} ) {
        # can't use PerlIO::gzip, it truncates bgzipped files
        my $z;
        eval {
            require IO::Uncompress::Gunzip;
            $z = IO::Uncompress::Gunzip->new( $filerec->{fullpath }, -MultiStream => 1 )
                or die "IO::Uncompress::Gunzip failed: $IO::Uncompress::Gunzip::GunzipError\n";
        };
        if( $@ ) {
            # fall back to use gzip command if available
            if( `which gunzip` ) {
                open my $fh, '-|', 'gzip', '-dc', $filerec->{fullpath}
                   or die "$! running gunzip";
                return $fh;
            } else {
                die "cannot uncompress $filerec->{fullpath}, could not use either IO::Uncompress::Gunzip or gzip";
            }
        }
        else {
            return $z;
        }
    }
    else {
        open my $fh, '<', $infile or die "$! reading $infile";
        return $fh;
    }
}


1;
