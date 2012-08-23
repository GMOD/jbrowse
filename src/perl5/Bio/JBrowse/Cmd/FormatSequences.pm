package Bio::JBrowse::Cmd::FormatSequences;
use strict;
use warnings;

use base 'Bio::JBrowse::Cmd';
use Pod::Usage;

use File::Spec::Functions qw/ catfile catdir /;
use File::Path 'mkpath';

use POSIX;

use JsonGenerator;
use FastaDatabase;

sub option_defaults {(
    out => 'data'
)}

sub option_definitions {(
    "out=s",
    "conf=s",
    "noseq",
    "gff=s",
    "fasta=s@",
    "refs=s",
    "refids=s",
    "compress",
    "help|h|?",
)}

my $chunkSize = 20000;

sub run {
    my ( $self ) = @_;
    my $seqTrackName = "DNA";

    my $refs = $self->opt('refs');
    my $compress = $self->opt('compress');

    pod2usage( 'must provide either a --fasta, --gff, or --conf option' )
        unless defined $self->opt('gff') || $self->opt('conf') || $self->opt('fasta');

    $chunkSize *= 4 if $compress;

    # $seqRel is the path relative to --out
    my $seqRel = "seq";
    my $seqDir = catdir( $self->opt('out'), $seqRel );

    mkpath( $self->opt('out') );
    mkpath( $seqDir ) unless $self->opt('noseq');

    my @refSeqs;

    if( $self->opt('gff') ) {
        my $gff = $self->opt('gff');
        open my $fh, '<', $gff or die "$! reading GFF file $gff";
        while( <$fh> ) {
            if( /^\#\#\s*sequence-region\s+(\S+)\s+(-?\d+)\s+(-?\d+)/i ) { # header line
                push @refSeqs, {
                    name => $1,
                    start => $2 - 1,
                    end => int($3),
                    length => ($3 - $2 + 1)
                    };
            }
        }
        @refSeqs or die "found no sequence-region lines in GFF file";
    }
    elsif( $self->opt('fasta') || $self->opt('conf') ) {
        my $db;
        if ( $self->opt('fasta') && @{$self->opt('fasta')} ) {
            $db = FastaDatabase->from_fasta( @{$self->opt('fasta')});

            die "IDs not implemented for FASTA database" if defined $self->opt('refids');

            if ( ! defined $refs && ! defined $self->opt('refids') ) {
                $refs = join (",", $db->seq_ids);
            }

            die "found no sequences in FASTA file" if ("" eq $refs);

        } elsif( $self->opt('conf') ) {
            my $config = JsonGenerator::readJSON( $self->opt('conf') );

            eval "require $config->{db_adaptor}; 1" or die $@;

            $db = eval {$config->{db_adaptor}->new(%{$config->{db_args}})}
        or warn $@;

            die "Could not open database: $@" unless $db;

            if (my $refclass = $config->{'reference class'}) {
                eval {$db->default_class($refclass)};
            }
            $db->strict_bounds_checking(1) if $db->can('strict_bounds_checking');
        }

        die "please specify which sequences to process using the --refs"
            ." or --refids command line parameters\n"
            unless ( defined $self->opt('refids') || defined $refs );

        if( defined $self->opt('refids') ) {
            foreach my $refid (split ",", $self->opt('refids')) {
                my $seg = $db->segment(-db_id => $refid);
                my $refInfo = {
                    name => $self->refName($seg),
                    id => $refid, #keep ID for later querying
                    start => $seg->start - 1,
                    end => $seg->end,
                    length => $seg->length
                    };

                unless( $self->opt('noseq') ) {
                    my $refDir = catdir($seqDir,$refInfo->{name});
                    $self->exportSeqChunks($refDir, $compress, $chunkSize, $db,
                                    [-db_id => $refid],
                                    $seg->start, $seg->end);
                    $refInfo->{"seqDir"} = $refDir;
                    $refInfo->{"seqChunkSize"} = $chunkSize;
                }

                push @refSeqs, $refInfo;
            }
        }

        if( defined $refs ) {
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
                    my $refDir = catdir( $seqDir, $refInfo->{"name"} );
                    $self->exportSeqChunks($refDir, $compress, $chunkSize, $db,
                                    [-name => $ref],
                                    $seg->start, $seg->end);
                    $refInfo->{"seqDir"} = catdir( $seqRel, $refInfo->{"name"} );
                    $refInfo->{"seqChunkSize"} = $chunkSize;
                }

                push @refSeqs, $refInfo;
            }
        }
    }

    unless( @refSeqs ) {
        warn "No reference sequences found, exiting.\n";
        exit;
    }

    JsonGenerator::modifyJsonFile( catfile( $self->opt('out'), 'seq', 'refSeqs.json' ),
                                   sub {
                                       #add new ref seqs while keeping the order
                                       #of the existing ref seqs
                                       my $old = shift;
                                       my %refs;
                                       $refs{$_->{name}} = $_ foreach (@refSeqs);
                                       for (my $i = 0; $i <= $#{$old}; $i++) {
                                           $old->[$i] =
                                       delete $refs{$old->[$i]->{name}}
                                   if $refs{$old->[$i]->{name}};

                                       }
                                       foreach my $newRef (@refSeqs) {
                                           push @{$old}, $newRef
                                       if $refs{$newRef->{name}};
                                       }
                                       return $old;
                                   });
    if ( $compress ) {
        # if we are compressing the sequence files, drop a .htaccess file
        # in the seq/ dir that will automatically configure users with
        # Apache (and AllowOverride on) to serve the .txt.gz files
        # correctly
        require GenomeDB;
        my $hta = catfile( $self->opt('out'), 'seq', '.htaccess' );
        open my $hta_fh, '>', $hta or die "$! writing $hta";
        $hta_fh->print( GenomeDB->precompression_htaccess('.txtz','.jsonz') );
    }

    unless( $self->opt('noseq') ) {
        JsonGenerator::modifyJsonFile( catfile( $self->opt('out'), "trackList.json" ),
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
                                           'chunkSize' => $chunkSize,
                                           'urlTemplate' => "$seqRel/{refseq}/",
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

sub exportSeqChunks {
    my ( $self, $dir, $compress, $len, $db, $segDef, $start, $end ) = @_;

    mkdir $dir unless -d $dir;
    $start = 1 if $start < 1;
    $db->absolute( 1 ) if $db->can('absolute');

    my $chunkStart = $start;
    while( $chunkStart <= $end ) {
        my $chunkEnd = $chunkStart + $len - 1;
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

        my $path = File::Spec->catfile( "$dir", "$chunkNum.txt" .( $compress ? 'z' : '' ));
        open my $chunkfile, '>'.($compress ? ':gzip' : ''), $path or die "$! writing $path";
        $chunkfile->print( $seg->seq->seq );
    }
}


1;
