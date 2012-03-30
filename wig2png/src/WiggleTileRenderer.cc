class WiggleTileRenderer {

public:

    WiggleTileRenderer(int pixelBases, int tileWidthPixels, int tileHeight,
                       string baseDir)
        : curTile_(numeric_limits<int>::min()),
	  curStart_(0),
	  curEnd_(numeric_limits<int>::min()),
          pixelBases_(pixelBases),
          tileWidthBases_(pixelBases * tileWidthPixels),
          tileWidthPixels_(tileWidthPixels),
          tileHeight_(tileHeight),
          baseDir_(baseDir),
          tileRel_(baseDir) {
    }

    void addValue(int base, float value) {
        //cerr << "zoom " << pixelBases_ << " addValue: base: " << base << ", value: " << value <<endl;
        curEnd_ = max(curEnd_, base);
        processValue(base, value);
    }
  
    void renderTile() {
      //cerr << "rendering tile " << curTile_ << " chrom " << chrom_ << " pixelBases " << pixelBases_ << endl;
        stringstream s;
        s << baseDir_ << "/" << tileRel_ << "/" << curTile_ << ".png";
        drawTile(s.str());
    }

    void flushTilesBefore(int base) {
      //cerr << "flushTilesBefore " << base << " chrom " << chrom_ << " pixelBases " << pixelBases_ << endl;

        // flush tiles up to, but not including, base #base
        if (curTile_ != numeric_limits<int>::min())
            while (curTile_ < base / tileWidthBases_) {
                renderTile();
                curTile_++;
                curStart_ += tileWidthBases_;
            }
        curTile_ = base / tileWidthBases_;
        curStart_ = (long long)curTile_ * (long long)tileWidthBases_;
    }

    void flushAllTiles() {
      //cerr << "flushAllTiles\n";
        // render previous tiles
        flushTilesBefore(curEnd_);
        // render last tile
        if (curEnd_ >= curStart_)
            renderTile();
	// reset curTile_ and curEnd_ to indicate that there is now no pending data
	curTile_ = curEnd_ = numeric_limits<int>::min();
    }

    void newSection(const string chrom, const int base) {
        //cerr << "newSection: chrom: " << chrom << ", base: " << base << endl;
        //we have to finish off the current tile if:
        // a) there is a current tile (i.e., we're not at the beginning), and
        // b) we're on a new chromosome, or
        // c) we've skipped past the end of this tile
        if ((curTile_ != numeric_limits<int>::min())
            && ((chrom != chrom_)
                || (curTile_ != base / tileWidthBases_))) {
            flushAllTiles();
        }

        //if this is a new chrom, make a directory for it
        if (chrom != chrom_) {
            const string path[] = {chrom, scale()};
            tileRel_ = ensurePath(baseDir_, vector<string>(path, path + sizeof(path)/sizeof(*path)));
        }

        chrom_ = chrom;
        curTile_ = base / tileWidthBases_;
    }

    string scale() {
        stringstream s;
        s << pixelBases_;
        return s.str();
    }

    int getTileBases() const {
        return tileWidthBases_;
    }

    //render the current tile to file, and erase its info from private
    //buffers in subclass
    virtual void drawTile(string pngFile) = 0;
    //handle sample
    virtual void processValue(int base, float value) = 0;

protected:

    int pixelBases_;
    int tileWidthBases_;
    int tileWidthPixels_;
    int tileHeight_;
    // index of next tile to render, or numeric_limits<int>::min()
    // if no information has been added
    int curTile_;
    // first base of the next tile
    int curStart_;
    // last base for which information has been added,
    // or numeric_limits<int>::min() if no info added
    int curEnd_;
    string baseDir_;
    string tileRel_;
    string chrom_;
};
