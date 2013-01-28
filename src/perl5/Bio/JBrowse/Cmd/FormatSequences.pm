package Bio::JBrowse::Cmd::FormatSequences;

=head1 NAME

Bio::JBrowse::Cmd::FormatSequences - script module to format reference
sequences (backend module for prepare-refseqs.pl)

=cut

use strict;
use warnings;

use base 'Bio::JBrowse::Cmd';
use Pod::Usage;

use File::Spec::Functions qw/ catfile catdir /;
use File::Path 'mkpath';

use POSIX;

use JSON 2;
use JsonFileStorage;
use FastaDatabase;

sub option_defaults {(
    out => 'data',
    chunksize => 20_000
)}

sub option_definitions {(
    "out=s",
    "conf=s",
    "noseq",
    "gff=s",
    "chunksize=s",
    "fasta=s@",
    "refs=s",
    "refids=s",
    "compress",
    "help|h|?",
    "nohash"
)}

sub run {
    my ( $self ) = @_;

    my $compress = $self->opt('compress');

    $self->{storage} = JsonFileStorage->new( $self->opt('out'), $self->opt('compress'), { pretty => 0 } );

    pod2usage( 'must provide either a --fasta, --gff, or --conf option' )
        unless defined $self->opt('gff') || $self->opt('conf') || $self->opt('fasta');

    {
        my $chunkSize = $self->opt('chunksize');
        $chunkSize *= 4 if $compress;
        $self->{chunkSize} = $chunkSize;
    }

    my $refs = $self->opt('refs');

    if ( $self->opt('fasta') && @{$self->opt('fasta')} ) {
        my $db = FastaDatabase->from_fasta( @{$self->opt('fasta')});

        die "IDs not implemented for FASTA database" if defined $self->opt('refids');

        if ( ! defined $refs && ! defined $self->opt('refids') ) {
            $refs = join (",", $db->seq_ids);
        }

        die "found no sequences in FASTA file" if "" eq $refs;

        $self->exportDB( $db, $refs, {} );
        $self->writeTrackEntry();
        #$self->exportFASTAFiles( $refs, $self->opt('fasta') );
    }
    elsif ( $self->opt('gff') ) {
        my $db;
        my $gff = $self->opt('gff');
        open my $fh, '<', $gff or die "$! reading GFF file $gff";
        my %refSeqs;
        while ( <$fh> ) {
            if ( /^\#\#\s*sequence-region\s+(\S+)\s+(-?\d+)\s+(-?\d+)/i ) { # header line
                $refSeqs{$1} = {
                    name => $1,
                    start => $2 - 1,
                    end => int($3),
                    length => ($3 - $2 + 1)
                    };
            }
            elsif( /^##FASTA\s*$/ ) {
                # start of the sequence block, pass the filehandle to our fasta database
                $db = FastaDatabase->from_fasta( $fh );
                last;
            }
            elsif( /^>/ ) {
                # beginning of implicit sequence block, need to seek
                # back
                seek $fh, -length($_), SEEK_CUR;
                $db = FastaDatabase->from_fasta( $fh );
                last;
            }
        }
        if ( $db && ! defined $refs && ! defined $self->opt('refids') ) {
            $refs = join (",", $db->seq_ids);
        }

        $self->exportDB( $db, $refs, \%refSeqs );
        $self->writeTrackEntry();

    } elsif ( $self->opt('conf') ) {
        my $config = decode_json( do {
            local $/;
            open my $f, '<', $self->opt('conf') or die "$! reading ".$self->opt('conf');
            scalar <$f>
        });

        eval "require $config->{db_adaptor}; 1" or die $@;

        my $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})}
                  or warn $@;

        die "Could not open database: $@" unless $db;

        if (my $refclass = $config->{'reference class'}) {
            eval {$db->default_class($refclass)};
        }
        $db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');

        $self->exportDB( $db, $refs, {} );
        $self->writeTrackEntry();
    }
}

sub exportDB {
    my ( $self, $db, $refs, $refseqs ) = @_;

    my $compress = $self->opt('compress');
    my %refSeqs = %$refseqs;

    unless ( defined $self->opt('refids') || defined $refs ) {
        die "please specify which sequences to process using the --refs"
             ." or --refids command line parameters\n";
    }


    if ( defined $self->opt('refids') ) {
        foreach my $refid (split ",", $self->opt('refids')) {
            my $seg = $db->segment(-db_id => $refid);
            unless( $seg ) {
                warn "WARNING: Reference sequence with -db_id '$refid' not found in input.\n";
                next;
            }

            my $refInfo = {
                name => $self->refName($seg),
                id => $refid,   #keep ID for later querying
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length
                };

            unless( $self->opt('noseq') ) {
                $self->exportSeqChunksFromDB( $refInfo, $self->{chunkSize}, $db,
                                       [-db_id => $refid],
                                       $seg->start, $seg->end);
                $refInfo->{"seqChunkSize"} = $self->{chunkSize};
            }

            $refSeqs{ $refInfo->{name} } = $refInfo;
        }
    }
    if ( defined $refs ) {
        foreach my $ref (split ",", $refs) {

            my ($seg) = my @segments = $db->segment(-name => $ref);

            if (! @segments ) {
                warn "WARNING: Reference sequence '$ref' not found in input.\n";
                next;
            } elsif ( @segments > 1 ) {
                warn "WARNING: multiple matches for '$ref' found in input, using only the first one.\n";
            }

            my $refInfo =  {
                name => $self->refName($seg),
                start => $seg->start - 1,
                end => $seg->end,
                length => $seg->length,
                ( $compress ? ( 'compress' => 1 ) : () ),
            };

            unless ($self->opt('noseq')) {
                $self->exportSeqChunksFromDB( $refInfo, $self->{chunkSize}, $db,
                                       [-name => $ref],
                                       $seg->start, $seg->end);
                $refInfo->{"seqChunkSize"} = $self->{chunkSize};
            }

            $refSeqs{ $refInfo->{name} } = $refInfo;
        }
    }

    unless( %refSeqs ) {
        warn "No reference sequences found, exiting.\n";
        exit;
    }

    $self->writeRefSeqsJSON( \%refSeqs );
}

sub writeRefSeqsJSON {
    my ( $self, $refseqs ) = @_;

    $self->{storage}->modify( 'seq/refSeqs.json',
                                   sub {
                                       #add new ref seqs while keeping the order
                                       #of the existing ref seqs
                                       my $old = shift || [];
                                       my %refs = %$refseqs;
                                       for (my $i = 0; $i < @$old; $i++) {
                                           if( $refs{$old->[$i]->{name}} ) {
                                               $old->[$i] = delete $refs{$old->[$i]->{name}};
                                           }
                                       }
                                       foreach my $name (sort keys %refs) {
                                           push @{$old}, $refs{$name};
                                       }
                                       return $old;
                                   });

    if ( $self->opt('compress') ) {
        # if we are compressing the sequence files, drop a .htaccess file
        # in the seq/ dir that will automatically configure users with
        # Apache (and AllowOverride on) to serve the .txt.gz files
        # correctly
        require GenomeDB;
        my $hta = catfile( $self->opt('out'), 'seq', '.htaccess' );
        open my $hta_fh, '>', $hta or die "$! writing $hta";
        $hta_fh->print( GenomeDB->precompression_htaccess('.txtz','.jsonz') );
    }
}

sub writeTrackEntry {
    my ( $self ) = @_;

    my $compress = $self->opt('compress');

    my $seqTrackName = "DNA";
    unless( $self->opt('noseq') ) {
        $self->{storage}->modify( 'trackList.json',
                                       sub {
                                           my $trackList = shift;
                                           unless (defined($trackList)) {
                                               $trackList =
                                           {
                                               'formatVersion' => 1,
                                               'tracks' => []
                                               };
                                           }
                                           my $tracks = $trackList->{'tracks'};
                                           my $i;
                                           for ($i = 0; $i <= $#{$tracks}; $i++) {
                                               last if ($tracks->[$i]->{'label'}
                                                    eq
                                                $seqTrackName);
                                           }
                                           $tracks->[$i] =
                                       {
                                           'label' => $seqTrackName,
                                           'key' => $seqTrackName,
                                           'type' => "SequenceTrack",
                                           'chunkSize' => $self->{chunkSize},
                                           'urlTemplate' => $self->seqUrlTemplate,
                                           ( $compress ? ( 'compress' => 1 ): () ),
                                       };
                                           return $trackList;
                                       });
    }

    return;
}

###########################

sub refName {
    my ( $self, $seg ) = @_;
    my $segName = $seg->name;
    $segName = $seg->{'uniquename'} if $seg->{'uniquename'};
    $segName =~ s/:.*$//; #get rid of coords if any
    return $segName;
}

sub openChunkFile {
    my ( $self, $refInfo, $chunkNum ) = @_;

    my $compress = $self->opt('compress');

    my ( $dir, $file ) = $self->opt('nohash')
        # old style
        ? ( catdir( $self->opt('out'), 'seq',
                    $refInfo->{name}
                    ),
            "$chunkNum.txt"
          )
        # new hashed structure
        : ( catdir( $self->opt('out'), 'seq',
                    $self->_crc32_path( $refInfo->{name} )
                  ),
            "$refInfo->{name}-$chunkNum.txt"
          );

    $file .= 'z' if $compress;

    mkpath( $dir );
    open my $fh, '>'.($compress ? ':gzip' : ''), catfile( $dir, $file )
        or die "$! writing $file";
    return $fh;
}

sub _crc32_path {
    my ( $self, $str ) = @_;
    my $crc = ( $self->{crc} ||= do { require Digest::Crc32; Digest::Crc32->new } )
                ->strcrc32( $str );
    my $hex = lc sprintf( '%08x', $crc );
    return catdir( $hex =~ /(.{1,3})/g );
}

sub seqUrlTemplate {
    my ( $self ) = @_;
    return $self->opt('nohash')
        ? "seq/{refseq}/"                   # old style
        : "seq/{refseq_dirpath}/{refseq}-"; # new hashed structure
}


sub exportSeqChunksFromDB {
    my ( $self, $refInfo, $chunkSize, $db, $segDef, $start, $end ) = @_;

    $start = 1 if $start < 1;
    $db->absolute( 1 ) if $db->can('absolute');

    my $chunkStart = $start;
    while( $chunkStart <= $end ) {
        my $chunkEnd = $chunkStart + $chunkSize - 1;
        my $chunkNum = floor( ($chunkStart - 1) / $chunkSize );
        my ($seg) = $db->segment( @$segDef,
                                  -start    => $chunkStart,
                                  -end      => $chunkEnd,
                                  -absolute => 1,
                                );
        unless( $seg ) {
            die "Seq export query failed, please inform the developers of this error"
        }

        $seg->start == $chunkStart
          or die "requested $chunkStart .. $chunkEnd; got " . $seg->start . " .. " . $seg->end;

        $chunkStart = $chunkEnd + 1;
        next unless $seg && $seg->seq && $seg->seq->seq;

        $self->openChunkFile( $refInfo, $chunkNum )
             ->print( $seg->seq->seq );
    }
}

1;
