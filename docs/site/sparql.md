---
id: sparql
title: SPARQL configuration
---

# Data from a SPARQL Endpoint

Starting with version 1.10.0, JBrowse can display feature or quantitative data
directly from a SPARQL endpoint. The SPARQL data adaptor can be used with any of
the JBrowse track types.

To display annotations from a SPARQL endpoint, first write a SPARQL query that
fetches features for a given reference sequence region, given the reference
sequence name and the start and end coordinates of the region of interest, with
one feature returned per output row. JBrowse will run this query every time it
fetches features for a certain region. The reference sequence name, start, and
end, are interpolated into the query at every occurrance of "{ref}", "{start}",
or "{end}", respectively. This is the same variable interpolation syntax used in
other parts of the JBrowse configuration.

Queries used with JBrowse can have any number of output columns, but are
required to have at least 4: ?start, ?end, ?strand, and ?uniqueID (usually just
the URI of the feature). If the data includes subfeatures, a ?parentUniqueID
column can be added to the SPARQL query, and features will be attached as
subfeatures to any feature in the query with that ?uniqueID. Any number of
additional columns can be added, as well. Their contents will just be attached
to each feature as attributes, which will be visible in the default feature
detail dialog. If available, it's a good idea to add a ?name column, which would
be the feature's displayed name, and maybe a ?description column, which can be a
longer text description of the feature.

## Example SPARQL Configuration

The example configuration below displays complete gene models (with locations
represented using [FALDO](https://github.com/JervenBolleman/FALDO)) contained in
a SPARQL endpoint located at `/sparql` on the same server as JBrowse.

    [tracks.genes]
    label = genes
    key = SPARQL Genes
    storeClass = JBrowse/Store/SeqFeature/SPARQL
    type = JBrowse/View/Track/CanvasFeatures
    urlTemplate = /sparql
    queryTemplate =
      DEFINE sql:select-option "order"
      prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      prefix rdfs:   <http://www.w3.org/2000/01/rdf-schema#>
      prefix xsd:    <http://www.w3.org/2001/XMLSchema#>
      prefix obo:    <http://purl.obolibrary.org/obo/>
      prefix faldo:  <http://biohackathon.org/resource/faldo#>
      prefix idorg:  <http://rdf.identifiers.org/database/>
      prefix insdc:  <http://insdc.org/owl/>
      select ?start,
             ?end,
             IF( ?faldo_type = faldo:ForwardStrandPosition,
                 1,
                 IF( ?faldo_type = faldo:ReverseStrandPosition,
                     -1,
                      0
                   )
               ) as ?strand,
             str(?obj_type_name) as ?type,
             str(?label) as ?name,
             str(?obj_name) as ?description,
             ?obj as ?uniqueID,
             ?parent as ?parentUniqueID
      from <http://togogenome.org/refseq/>
      from <http://togogenome.org/so/>
      from <http://togogenome.org/faldo/>
      where {
        values ?faldo_type { faldo:ForwardStrandPosition faldo:ReverseStrandPosition faldo:BothStrandsPosition }
        values ?refseq_label { "{ref}" }
        #values ?obj_type {  obo:SO_0000704 }
        ?obj obo:so_part_of ?parent . filter( ?obj_type = obo:SO_0000704 || ?parent != ?seq )
        # on reference sequence
        ?obj obo:so_part_of+  ?seq .
        ?seq a ?seq_type.
        ?seq_type rdfs:label ?seq_type_label.
        ?seq rdfs:seeAlso ?refseq .
        ?refseq a idorg:RefSeq .
        ?refseq rdfs:label ?refseq_label .
        # get faldo begin and end
        ?obj faldo:location ?faldo .
        ?faldo faldo:begin/rdf:type ?faldo_type .
        ?faldo faldo:begin/faldo:position ?start .
        ?faldo faldo:end/faldo:position ?end .
        filter ( !(?start > {end} || ?end < {start}) )
        # feature type
        ?obj rdf:type ?obj_type .
        ?obj_type rdfs:label ?obj_type_name .
        optional {
          ?obj insdc:feature_locus_tag ?label .
        }
        # feature name is the feature product
        optional {
          ?obj insdc:feature_product ?obj_name .
        }
        #optional {
        #  ?obj rdfs:seeAlso ?obj_seealso .
        #}
      }

## Variable Interpolation

By default, only "{ref}", "{start}", and "{end}" are available for interpolating
into your query. However, starting with JBrowse 1.10.3, you can add additional
variables in the configuration by including a `variables` key containing
additional values. For example, you could add an "{organism_uri}" in your
queryTemplate that was set from the `variables` stanza, which would look like:

```{.javascript}

    {
        "label": 'genes',
        "key": "SPARQL Genes",
        "storeClass": "JBrowse/Store/SeqFeature/SPARQL",
        "type": 'JBrowse/View/Track/HTMLFeatures',
        "urlTemplate": "/sparql",
        "style": { "className": "transcript" },
        "queryTemplate": "... {organism_uri} ...",
        "variables": {
            "organism_uri": "<http://my.organism.authority/tyrannosaurus_rex>"
         }
    }
```

The variable interpolation can also be used to refer to functions that are
defined in external files (see
[Including external files and functions](#including-external-files-and-functions-in-tracklistjson 'wikilink')).
