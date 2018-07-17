require([
            'JBrowse/View/FileDialog/TrackList/BAMDriver',
            'JBrowse/View/FileDialog/TrackList/GFF3TabixDriver'
        ], function( BAMDriver, GFF3TabixDriver ) {

describe( 'FileDialog BAM driver', function() {


    it( 'can match a simple BAM URL with its BAI URL', function( ) {
        var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } };
        expect( (new BAMDriver()).tryResource( confs, { type: 'bam', url: 'zee.bam' } ) ).toBeTruthy();
        expect( confs.foo.bam.url ).toEqual( 'zee.bam' );
    });

    it( 'can match a simple BAM file with its BAI URL', function( ) {
        var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } };
        expect( (new BAMDriver()).tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) ).toBeTruthy();
        expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
    });

    it( 'can match a simple BAM file with its BAI XHRBlob', function( ) {
        var confs = { foo: { bai: { url: 'zee.bam.bai'} } };
        expect( (new BAMDriver()).tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) ).toBeTruthy();
        expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
    });

    it( 'can match a simple BAM file with its CSI XHRBlob', function( ) {
        var confs = { foo: { csi: { url: 'zee.bam.csi'} } };
        expect( (new BAMDriver()).tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) ).toBeTruthy();
        expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
    });

    it( 'can remove singleton BAM file', function( ) {
        var confs = {};
        var driver = new BAMDriver();
        expect( driver.tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) ).toBeTruthy();
        driver.finalizeConfiguration(confs);
        expect(confs).toEqual({});
    });
    it( 'can remove singleton CSI file', function( ) {
        var confs = {};
        var driver = new BAMDriver();
        driver.tryResource( confs, { type: 'bam.csi', file: { name: 'zee.bam.csi'} } );
        driver.finalizeConfiguration(confs);
        expect(confs).toEqual({});
    });


    it( 'can finalize with CSI+BAM file', function( ) {
        var confs = { foo: { csi: { url: 'zee.bam.csi'} } };
        var driver = new BAMDriver();
        expect( driver.tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) ).toBeTruthy();
        driver.finalizeConfiguration(confs);
        expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
        expect( confs.foo.csi.url ).toEqual( 'zee.bam.csi' );
    });


    it( 'can finalize with opposite order, BAM+CSI file', function( ) {
        var confs = { foo: { bam: { url: 'zee.bam'} } };
        var driver = new BAMDriver();
        expect( driver.tryResource( confs, { type: 'bam.csi', file: { name: 'zee.bam.csi'} } ) ).toBeTruthy();
        driver.finalizeConfiguration(confs);
        expect( confs.foo.csi.blob.name ).toEqual( 'zee.bam.csi' );
        expect( confs.foo.bam.url ).toEqual( 'zee.bam' );
    });

    it( 'can finalize with opposite order, both blobs', function( ) {
        var confs = { foo: { bam: { blob: { name :'zee.bam'} } } };
        var driver = new BAMDriver();
        expect( driver.tryResource( confs, { type: 'bam.csi', file: { name: 'zee.bam.csi'} } ) ).toBeTruthy();
        driver.finalizeConfiguration(confs);
        expect( confs.foo.csi.blob.name ).toEqual( 'zee.bam.csi' );
        expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
    });

    it( 'GFF3 tabix file extension test with .gff3', function( ) {
        var confs = { foo: { file: { blob: { name :'zee.gff3.gz'} } } };
        var driver = new GFF3TabixDriver();
        expect( driver.tryResource( confs, { type: 'gff3.gz.tbi', file: { name: 'zee.gff3.gz.tbi'} } ) ).toBeTruthy();
        driver.finalizeConfiguration(confs);
        expect( confs.foo.tbi.blob.name ).toEqual( 'zee.gff3.gz.tbi' );
        expect( confs.foo.file.blob.name ).toEqual( 'zee.gff3.gz' );
    });

    it( 'GFF3 tabix file extension test with .gff', function( ) {
        var confs = { foo: { file: { blob: { name :'zee.gff.gz'} } } };
        var driver = new GFF3TabixDriver();
        expect( driver.tryResource( confs, { type: 'gff3.gz.tbi', file: { name: 'zee.gff.gz.tbi'} } ) ).toBeTruthy();
        driver.finalizeConfiguration(confs);
        expect( confs.foo.tbi.blob.name ).toEqual( 'zee.gff.gz.tbi' );
        expect( confs.foo.file.blob.name ).toEqual( 'zee.gff.gz' );
    });
});
});

