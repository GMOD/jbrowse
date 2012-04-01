class MeanRenderer : public WiggleTileRenderer {
private:
    // colors
    png_color bgColor_;
    png_color fgColor_;
    // moment buffer
    deque<float> sumVals_;
    deque<int> valsPerPx_;
    // global bounds
    float globalMax_;
    float globalMin_;
    // image buffer
    png_bytep * buf_;

    //flag saying whether transparency is disabled
    bool no_transparency_;

public:

    MeanRenderer(int tileWidthBases, int tileWidthPixels,
                 int tileHeight, string baseDir,
                 png_color bgColor, png_color fgColor,
                 bool no_transparency,
                 float globalMax, float globalMin) :
        WiggleTileRenderer(tileWidthBases, tileWidthPixels,
                           tileHeight, baseDir),
        bgColor_(bgColor),
        fgColor_(fgColor),
        globalMax_(globalMax),
        globalMin_(globalMin),
        sumVals_(),
        valsPerPx_(),
        no_transparency_(no_transparency)
    {
        buf_ = new png_bytep[tileHeight];
        for (int y = 0; y < tileHeight; y++) 
            buf_[y] = new png_byte[tileWidthPixels];
    }

    ~MeanRenderer() {
        for (int y = 0; y < tileHeight_; y++)
            delete buf_[y];
        delete buf_;
    }
  
    void processValue(int base, float value) {
        //x is the x-pixel in the current tile onto which the given base falls.
        int x = ((((long long)base - (long long)curStart_)
                  * (long long)tileWidthPixels_)
	         / (long long)tileWidthBases_);
	extendTileTo(x);
        sumVals_[x] += value;
        valsPerPx_[x] += 1;

        //cerr << "mean["<<x<<"]="<<sumVals_[x]<<"/"<<valsPerPx_[x] << endl;
    }

    void extendTileTo(int pixel) {
        if (pixel >= 0)
            if ((size_t)pixel >= sumVals_.size()) {
                sumVals_.insert (sumVals_.end(), (size_t)pixel + 1 - sumVals_.size(), 0.0f);
                valsPerPx_.insert (valsPerPx_.end(), (size_t)pixel + 1 - valsPerPx_.size(), 0);
            }
    }

    void eraseTileTo(int pixel) {
        sumVals_.erase (sumVals_.begin(), sumVals_.begin() + pixel);
        valsPerPx_.erase (valsPerPx_.begin(), valsPerPx_.begin() + pixel);
    }

    void drawTile(string pngFile) {
        extendTileTo (tileWidthPixels_ - 1);

        png_color palette[] = {bgColor_, fgColor_};
        png_byte bgIndex = 0, fgIndex = 1;
        int num_colors = 2;
        int bitdepth = 1;

        int x, y;
        //scale: pixels per unit (whatever units from wig file)
        float scale = ((float)tileHeight_) / (globalMax_ - globalMin_);
        //zeroy: if globalMin_ is negative, we want to plot positive and
        //negative bars so that they go from zeroy to the plot point
        //(zeroy is in screen (y increases down) coordinates)
        int zeroy = tileHeight_ - 1;
        if (globalMin_ < 0) zeroy = (int)(globalMax_ * scale);
        int meany, ystart, yend;
        for (x = 0; x < tileWidthPixels_; x++) {
            if (0 == valsPerPx_[x]) {
                for (y = 0; y < tileHeight_; y++)
                    buf_[y][x] = bgIndex;
                continue;
            }

            meany = 
                tileHeight_ 
                - (int)((((sumVals_[x] / (float)valsPerPx_[x]) - globalMin_)
                         * scale));
            meany = max(0, meany);
            meany = min(tileHeight_ - 1, meany);

            ystart = min(meany, zeroy);
            yend = max(meany, zeroy);

            //cerr << "x="<<x<<" sumVals="<<sumVals_[x]<<" valsPerPx="<<valsPerPx_[x]<<" meany="<<meany << endl;

            for (y = 0; y < tileHeight_; y++)
                buf_[y][x] = bgIndex;
            for (y = ystart; y < yend; y++)
                buf_[y][x] = fgIndex;
        }

        write_png_file(pngFile.c_str(), tileWidthPixels_, tileHeight_, buf_, palette, num_colors, bitdepth, !no_transparency_);

	// erase tile data from buffers
        eraseTileTo(tileWidthPixels_ - 1);
    }
};

