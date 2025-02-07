require(['JBrowse/Browser', 'JBrowse/Store/SeqFeature/SPARQL'], function (
  Browser,
  SPARQLStore,
) {
  var testResults = {
    head: {
      link: [],
      vars: [
        'start',
        'end',
        'strand',
        'type',
        'name',
        'description',
        'uniqueID',
        'parentUniqueID',
      ],
    },
    results: {
      distinct: false,
      ordered: true,
      bindings: [
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '109911',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111062',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'gene' },
          name: { type: 'literal', value: 'Z0105' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:a13be970-7b65-4c19-ba02-6f4c70d6554c',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:75114bb8-2125-40f4-9f84-7b282947545a',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111163',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112080',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'gene' },
          name: { type: 'literal', value: 'Z0106' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:93363802-5b35-459f-aa50-156d0a903cb5',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:75114bb8-2125-40f4-9f84-7b282947545a',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112311',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112823',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'gene' },
          name: { type: 'literal', value: 'Z0107' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:0dd1db96-dc98-43db-869e-23d8a85acafc',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:75114bb8-2125-40f4-9f84-7b282947545a',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112311',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112823',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'CDS' },
          name: { type: 'literal', value: 'Z0107' },
          description: { type: 'literal', value: 'SecA regulator SecM' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:1067b2b7-2f61-40e4-a605-c47fbd413a04',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:0dd1db96-dc98-43db-869e-23d8a85acafc',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '109911',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111062',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'CDS' },
          name: { type: 'literal', value: 'Z0105' },
          description: { type: 'literal', value: 'cell division protein FtsZ' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:07e9f502-3697-4073-b09d-7b7bea16b6c4',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:a13be970-7b65-4c19-ba02-6f4c70d6554c',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111163',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112080',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'CDS' },
          name: { type: 'literal', value: 'Z0106' },
          description: {
            type: 'literal',
            value:
              'UDP-3-O-[3-hydroxymyristoyl] N-acetylglucosamine deacetylase',
          },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:7d2f4928-b995-4077-84ce-b34040ec6ed1',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:93363802-5b35-459f-aa50-156d0a903cb5',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '109911',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111062',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'gene' },
          name: { type: 'literal', value: 'Z0105' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:a13be970-7b65-4c19-ba02-6f4c70d6554c',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:75114bb8-2125-40f4-9f84-7b282947545a',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111163',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112080',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'gene' },
          name: { type: 'literal', value: 'Z0106' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:93363802-5b35-459f-aa50-156d0a903cb5',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:75114bb8-2125-40f4-9f84-7b282947545a',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112311',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112823',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'gene' },
          name: { type: 'literal', value: 'Z0107' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:0dd1db96-dc98-43db-869e-23d8a85acafc',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:75114bb8-2125-40f4-9f84-7b282947545a',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112311',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112823',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'CDS' },
          name: { type: 'literal', value: 'Z0107' },
          description: { type: 'literal', value: 'SecA regulator SecM' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:1067b2b7-2f61-40e4-a605-c47fbd413a04',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:0dd1db96-dc98-43db-869e-23d8a85acafc',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '109911',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111062',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'CDS' },
          name: { type: 'literal', value: 'Z0105' },
          description: { type: 'literal', value: 'cell division protein FtsZ' },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:07e9f502-3697-4073-b09d-7b7bea16b6c4',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:a13be970-7b65-4c19-ba02-6f4c70d6554c',
          },
        },
        {
          start: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '111163',
          },
          end: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '112080',
          },
          strand: {
            type: 'typed-literal',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
            value: '1',
          },
          type: { type: 'literal', value: 'CDS' },
          name: { type: 'literal', value: 'Z0106' },
          description: {
            type: 'literal',
            value:
              'UDP-3-O-[3-hydroxymyristoyl] N-acetylglucosamine deacetylase',
          },
          uniqueID: {
            type: 'uri',
            value: 'urn:uuid:7d2f4928-b995-4077-84ce-b34040ec6ed1',
          },
          parentUniqueID: {
            type: 'uri',
            value: 'urn:uuid:93363802-5b35-459f-aa50-156d0a903cb5',
          },
        },
      ],
    },
  }

  describe('SPARQL store', function () {
    var s
    beforeEach(function () {
      s = new SPARQLStore({
        baseUrl: '',
        browser: new Browser({ unitTestMode: true }),
        refSeq: { name: 'ctgA', start: 1, end: 500001 },
        queryTemplate: 'fake query',
        urlTemplate: '/sparql',
        variables: { foo: 42 },
      })
    })

    it('parses responses correctly', function () {
      var features = []
      s._resultsToFeatures(testResults, function (f) {
        features.push(f)
      })
      expect(features.length).toEqual(3)
    })
  })
})

// "DEFINE sql:select-option \"order\""
//     + "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>"+"prefix rdfs:   <http://www.w3.org/2000/01/rdf-schema#>"
//     + "prefix xsd:    <http://www.w3.org/2001/XMLSchema#>"+"prefix obo:    <http://purl.obolibrary.org/obo/>"+"prefix faldo:  <http://biohackathon.org/resource/faldo#>"
//     + "prefix idorg: <http://rdf.identifiers.org/database/>"
//     + "prefix insdc:  <http://insdc.org/owl/>"
//     + "select ?start,"+"       ?end,"+"       IF( ?faldo_type = faldo:ForwardStrandPosition,"+"           1,"+"           IF( ?faldo_type = faldo:ReverseStrandPosition,"+"               -1,"+"                0"+"             )"+"         ) as ?strand,"+"       str(?obj_type_name) as ?type,"+"       str(?label) as ?name,"+"       str(?obj_name) as ?description,"+"       ?obj as ?uniqueID,"+"       ?parent as ?parentUniqueID"+"from <http://togogenome.org/refseq/>"+"from <http://togogenome.org/so/>"+"from <http://togogenome.org/faldo/>"+"where {"+""+"  values ?faldo_type { faldo:ForwardStrandPosition faldo:ReverseStrandPosition faldo:BothStrandsPosition }"+"  values ?refseq_label { \"{ref}\" }"+"  #values ?obj_type {  obo:SO_0000704 }"+"  #filter( ?obj_type != obo:SO_0000704 )"+""+"  # on reference sequence"+"  ?obj obo:so_part_of+  ?seq ."+"  ?seq a ?seq_type."+"  ?seq_type rdfs:label ?seq_type_label."+"  ?seq rdfs:seeAlso ?refseq ."+"  ?refseq a idorg:RefSeq ."+"  ?refseq rdfs:label ?refseq_label ."+""+"  # get faldo begin and end"+"  ?obj faldo:location ?faldo ."+"  ?faldo faldo:begin/rdf:type ?faldo_type ."+"  ?faldo faldo:begin/faldo:position ?start ."+"  ?faldo faldo:end/faldo:position ?end ."+"  filter ( !(?start > {end} || ?end < {start}) )"+""+"  # feature type"+"  ?obj rdf:type ?obj_type ."+"  ?obj_type rdfs:label ?obj_type_name ."+"  optional {"+"    ?obj insdc:feature_locus_tag ?label ."+"  }"+""+"  # feature name is the feature product"+"  optional {"+"    ?obj insdc:feature_product ?obj_name ."+"  }"+""+"  #optional {"+"  #  ?obj rdfs:seeAlso ?obj_seealso ."+"  #}"+""+"  # faldo parent"+"  optional {"+"    ?obj obo:so_part_of ?parent ."+"   }"+"}"
