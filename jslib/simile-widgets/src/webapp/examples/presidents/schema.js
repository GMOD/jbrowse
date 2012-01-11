{
    types: {
        'President': {
            pluralLabel: 'Presidents'
        },
        'Precidency': {
            pluralLabel: 'Presidencies'
        }
    },
    properties: {
        'imageURL': {
            valueType: "url"
        },
        'url': {
            valueType: "url"
        },
        'presidency': {
            valueType:              "item"
        },
        'term': {
            valueType:              "number"
        },
        'inDate': {
            valueType:              "date",
            label:                  "in office"
        },
        'outDate': {
            valueType:              "date",
            label:                  "out office"
        },
        'birth': {
            valueType:              "date"
        },
        'death': {
            valueType:              "date"
        }
    }
}
