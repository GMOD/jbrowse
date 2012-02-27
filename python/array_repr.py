class ArrayRepr:
    """
    class for operating on indexed representations of objects

    For example, if we have a lot of objects with similar attributes, e.g.:
        [
            {start: 1, end: 2, strand: -1},
            {start: 5, end: 6, strand: 1},
            ...
        ]
    we can represent them more compactly (e.g., in JSON) something like this:
        class = ["start", "end", "strand"]
        [
            [1, 2, -1],
            [5, 6, 1],
            ...
        ]

    If we want to represent a few different kinds of objects in our big list,
    we can have multiple "class" arrays, and tag each object to identify
    which "class" array describes it.

    For example, if we have a lot of instances of a few types of objects,
    like this:
        [
            {start: 1, end: 2, strand: 1, id: 1},
            {start: 5, end: 6, strand: 1, id: 2},
            ...
            {start: 10, end: 20, chunk: 1},
            {start: 30, end: 40, chunk: 2},
            ...
        ]
    We could use the first array position to indicate the "class" for the
    object, like this:
        classes = [["start", "end", "strand", "id"], ["start", "end", "chunk"]]
        [
            [0, 1, 2, 1, 1],
            [0, 5, 6, 1, 2],
            ...
            [1, 10, 20, 1],
            [1, 30, 40, 1]
        ]
    Also, if we occasionally want to add an ad-hoc attribute, we could just
    stick an optional dictionary onto the end:
        classes = [["start", "end", "strand", "id"], ["start", "end", "chunk"]]
        [
            [0, 1, 2, 1, 1],
            [0, 5, 6, 1, 2, {foo: 1}]
        ]

    Given that individual objects are being represented by arrays, generic
    code needs some way to differentiate arrays that are meant to be objects
    from arrays that are actually meant to be arrays.
    So for each class, we include a dict with <attribute name>: true mappings
    for each attribute that is meant to be an array.

    Also, in cases where some attribute values are the same for all objects
    in a particular set, it may be convenient to define a "prototype"
    with default values for all objects in the set

    In the end, we get something like this:

        classes=[
            {'attributes': ['Start', 'End', 'Subfeatures'],
             'proto': {'Chrom': 'chr1'},
             'isArrayAttr': {Subfeatures: true}}
            ]

    That's what this class facilitates.
    """
        
    def __init__(self, classes):
        self.classes = classes
        self.fields = [(dict((v, k + 1)
                             for k, v
                             in enumerate(c['attributes'])) )
                       for c in classes]

    def attrIndices(self, attr):
        return [(l['attributes'].index(attr) + 1
                 if (attr in l['attributes'])
                 else None)
                for l in self.classes]

    def get(self, obj, attr):
        if attr in self.fields[obj[0]]:
            return obj[self.fields[obj[0]][attr]]
        else:
            adhocIndex = len(self.classes[obj[0]]['attributes']) + 1
            if ( (adhocIndex >= len(obj))
                or (not (attr in obj[adhocIndex])) ):
                if (('proto' in self.classes[obj[0]])
                    and (attr in self.classes[obj[0]]['proto']) ):
                    return self.classes[obj[0]]['proto'][attr]
                return None 
            return obj[adhocIndex][attr]

    def fastGet(self, obj, attr):
        """
        this method can be used if the attribute is guaranteed to be in
        the attributes array for the object's class
        """
        return obj[self.fields[obj[0]][attr]]

    def set(self, obj, attr, val):
        if attr in self.fields[obj[0]]:
            obj[self.fields[obj[0]][attr]] = val
        else:
            adhocIndex = len(self.classes[obj[0]]['attributes']) + 1
            if adhocIndex >= len(obj):
                obj += ([None] * (len(self.classes[obj[0]]['attributes'])
                                  - len(obj) + 2))
                obj[adhocIndex] = {}
            obj[adhocIndex][attr] = val

    def fastSet(self, obj, attr, val):
        """
        this method can be used if the attribute is guaranteed to be in
        the attributes array for the object's class
        """
        obj[self.fields[obj[0]][attr]] = val
    
    def makeSetter(self, attr):
        return lambda obj, val: self.set(obj, attr, val)

    def makeGetter(self, attr):
        return lambda obj: self.get(obj, attr)

    def makeFastSetter(self, attr):
        """
        this method can be used if the attribute is guaranteed to be in
        the attributes array for the object's class
        """
        indices = self.attrIndices(attr)
        def setter(obj, val):
            if indices[obj[0]] is not None:
                obj[indices[obj[0]]] = val
            else:
                raise KeyError(attr)
        return setter

    def makeFastGetter(self, attr):
        """
        this method can be used if the attribute is guaranteed to be in
        the attributes array for the object's class
        """
        indices = self.attrIndices(attr)
        def getter(obj):
            if indices[obj[0]] is not None:
                return obj[indices[obj[0]]]
            else:
                raise KeyError(attr)
        return getter

    def construct(self, dct, klass):
        result = [klass] + ([None] * (len(self.classes[klass]['attributes'])))
        for attr in dct:
            self.set(result, attr, dct[attr])
        return result
