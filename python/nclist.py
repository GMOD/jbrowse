#After
#Alekseyenko, A., and Lee, C. (2007).
#Nested Containment List (NCList): A new algorithm for accelerating
#   interval query of genome alignment and interval databases.
#Bioinformatics, doi:10.1093/bioinformatics/btl647
#http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

class NCList:
    def __init__(self, start, end, addSublist):
        self.start = start
        self.end = end
        self.addSublist = addSublist
        self.sublistStack = []
        self.count = 0
        self.lastAdded = None
        self.minStart = None
        self.maxEnd = None
        self.curList = []
        self.topList = self.curList
        self.ID = None

    def addFeatures(self, features):
        start = self.start
        end = self.end
        
        if self.lastAdded is None:
            self.lastAdded = features[0]
            del(features[0])
            self.minStart = start(self.lastAdded)
            self.maxEnd = end(self.lastAdded)
            self.curList.append(self.lastAdded)

        for feat in features:
            # check if the input is sorted by the NCList sort
            # (increasing on start, decreasing on end)
            if ( (start(self.lastAdded) > start(feat))
                 or ( (start(self.lastAdded) == start(feat))
                      and
                      (end(self.lastAdded) < end(feat)) ) ):
                raise InputNotSortedError

            self.maxEnd = max(self.maxEnd, end(feat))
            self.curList = self._addSingle(feat, self.lastAdded,
                                           self.sublistStack, self.curList,
                                           end, self.addSublist)
            self.lastAdded = feat

    def _addSingle(self, feat, lastAdded, sublistStack,
                   curList, end, addSublist):
        # if this interval is contained in the previous interval,
        if end(feat) < end(lastAdded):
            # create a new sublist starting with this interval
            sublistStack.append(curList)
            curList = [feat]
            addSublist(lastAdded, curList)
        else:
            # find the right sublist for this interval
            while True:
                # if we're at the top level list,
                if len(sublistStack) == 0:
                    # just add the current feature to the current list
                    curList.append(feat)
                    break
                else:
                    # if the last interval in the last sublist in sublistStack
                    # ends after the end of the current interval,
                    if sublistStack[-1][-1][end] > feat[end]:
                        # then curList is the first(deepest) sublist
                        # that the current feature fits into, and
                        # we add the current feature to curList
                        curList.append(feat)
                        break
                    else:
                        # move on to the next shallower sublist
                        curList = sublistStack.pop()

        return curList

    @property
    def nestedList(self):
        return self.topList


class LazyNCList:
    def __init__(self, start, end, addSublist, makeLazy,
                 measure, output, sizeThresh):
        self.start = start
        self.end = end
        self.addSublist = addSublist
        self.makeLazy = makeLazy
        self.measure = measure
        self.output = output
        self.sizeThresh = sizeThresh
        self.topList = []
        self.levels = [LazyLevel()]
        self.chunkNum = 0

    def nestedList(self):
        return self.topList

    def addSorted(self, feat):
        start = self.start
        end = self.end

        if self.lastAdded is not None:
            if start(self.lastAdded) > start(feat):
                raise InputNotSortedError
            if ( (start(self.lastAdded) == start(feat))
                 and (end(self.lastAdded) < end(feat)) ):
                raise InputNotSortedError

        self.lastAdded = feat

        chunkSizes = self.chunkSizes

        for level in self.levels:
            featSize = self.measure(feat)
            level.chunkSize += featSize

            # If:
            #   * this partial chunk is full, or
            #   * this chunk starts at the same place as the feature
            #     immediately before it, and this feature would extend this
            #     chunk beyond that feature
            if ( (level.chunkSize > self.sizeThresh)
                 or ( (level.precedingFeat is not None)
                      and ( start(level.precedingFeat)
                            == start(level.current[0]) )
                      and ( end(level.precedingFeat) < end(feat) ) ) ):
                # then we're finished with the current "partial" chunk (i.e.,
                # it's now a "complete" chunk rather than a partial one), so
                # create a new NCList to hold all the features in this chunk.
                newNcl = self.makeNcl(level)

                # set the previous feature at this level to the last feature in
                # the partialstack for this level
                level.precedingFeat = level.current[-1]

                # start a new partial chunk with the current feature
                level.current = [feat]
                level.chunkSize = featSize

                # create a lazy ("fake") feature to represent this chunk
                lazyFeat = self.makeLazy(newNcl.minStart, newNcl.maxEnd,
                                         newNcl.ID)

                feat = level.findContainingNcl(self.output, newNcl, lazyFeat)

                # If $lazyFeat was contained in a feature in
                # level.ncls, then findContainingNcl will place lazyFeat
                # within that container feature and return undef.
                # That means we don't have to proceed to higher levels of the
                # NCL stack to try and find a place to stick $feat.
                if feat is None:
                    return

                # if $feat is defined, though, then we do have to keep going to
                # find a place for $feat

            else:
                # we're still filling up the partial chunk at this level, so
                # add the feature there
                level.current.append(feat)
                return

        # if we get through all the levels and still have a feature to place,
        # we create a new highest level and put the feature there
        newToplevel = LazyLevel()
        newToplevel.current.append(feat)
        self.levels.append(newToplevel)

    def makeNcl(self, level):
        result = NCList(self.startIndex, self.endIndex, self.sublistIndex)
        result.ID(self.chunkNum)
        self.chunkNum += 1
        result.addFeatures(level.current)
        return result

    def finish(self):
        lazyFeat = None
        for level in self.levels[0:len(self.levels) - 1]:
            if lazyFeat is not None:
                level.current.append(lazyFeat)

            newNcl = self.makeNcl(level)
            lazyFeat = self.makeLazy(newNcl.minStart, newNcl.maxEnd, newNcl.ID)
            # if lazyFeat doesn't get consumed by findContainingNcl, it'll be
            # added to the next highest level on the next loop iteration
            lazyFeat = level.findContainingNcl(self.output, newNcl, lazyFeat)

            for ncl in level.ncls:
                self.output(ncl.nestedList, ncl.ID)

        # make sure there's a top-level NCL
        level = self.levels[-1]
        if lazyFeat is not None:
            level.current.append(lazyFeat)

        newNcl = self.makeNcl(level)
        self.topLevel = newNcl


class InputNotSortedError(Exception):
    pass


class LazyLevel:
    def __init__(self):
        self.precedingFeat = None
        self.current = []
        self.chunkSize = 0
        self.ncls = []

    def findContainingNcl(self, output, newNcl, lazyFeat):
        """
        finds a place in the nclStack to put the given lazyFeat and newNcl

        takes: function for outputting chunks
               new NCL
               lazy feat for the new NCL
        this sub starts at the end of the array and iterates toward the front,
           examining each NCL in it.  For each of the existing NCLs it
           encounters, it checks to see if that existing NCL contains the new
           NCL.  If it does, then the lazy feat is added to the containing NCL,
           and the new NCL is added to the array; otherwise, the existing NCL
           is popped off of the array, and outputted.
        returns: the lazy feat, if it wasn't consumed by this sub
        """
        while len(self.ncls) > 0:
            existingNcl = self.ncls[-1]
            if newNcl.maxEnd < existingNcl.maxEnd:
                # add the lazy feat to the existing NCL
                existingNcl.addFeatures([lazyFeat])
                # and add the new NCL to the stack
                self.ncls.append(newNcl)
                # and we're done
                return
            else:
                # write out the existing NCL
                output(existingNcl.nestedList, existingNcl.ID)
                self.ncls.pop()

        self.ncls.append(newNcl)
        return lazyFeat
