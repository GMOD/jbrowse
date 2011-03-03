#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/types.h>

#include <string>
#include <vector>
#include <deque>
#include <map>
#include <set>
#include <iostream>
#include <fstream>
#include <limits>
#include <algorithm>

#include "opts_list.h"

using namespace std;

#define PNG_DEBUG 3
#include <png.h>

#define MAX_PATH_LEN 2048

//this part comes from when this program used to be in C
//TODO: rewrite with exceptions?  make write_png_file into a method of WiggleRenderer?
void abort_(const char * s, ...)
{
    va_list args;
    va_start(args, s);
    vfprintf(stderr, s, args);
    fprintf(stderr, "\n");
    va_end(args);
    abort();
}

void write_png_file(const char* file_name, int width, int height, png_bytep imgbuf[], png_color palette[], int num_colors, int bitdepth) {
    FILE *fp = fopen(file_name, "wb");
    if (!fp)
        abort_("[write_png_file] File %s could not be opened for writing", file_name);

    //png_ptr holds overall libpng state
    png_structp png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
	
    if (!png_ptr)
        abort_("[write_png_file] png_create_write_struct failed");

    //info_ptr holds libpng state for this particular image
    png_infop info_ptr = png_create_info_struct(png_ptr);
    if (!info_ptr) {
        png_destroy_write_struct(&png_ptr, (png_infopp)NULL);
        fclose(fp);
        abort_("[write_png_file] png_create_info_struct failed");
    }

    if (setjmp(png_jmpbuf(png_ptr))) {
        png_destroy_write_struct(&png_ptr, &info_ptr);
        fclose(fp);
        abort_("[write_png_file] writing failed");
    }

    png_init_io(png_ptr, fp);

    //set image header info
    png_set_IHDR(png_ptr, info_ptr, width, height, bitdepth,
                 PNG_COLOR_TYPE_PALETTE, PNG_INTERLACE_NONE,
                 PNG_COMPRESSION_TYPE_BASE, PNG_FILTER_TYPE_BASE);

    //set palette info
    png_set_PLTE(png_ptr, info_ptr, palette, num_colors);

    //set actual image data
    png_set_rows(png_ptr, info_ptr, imgbuf);

    //the "up" filter encodes each pixel as the difference between it
    //and the pixel above it (makes the most sense for wiggle images, I think)
    png_set_filter(png_ptr, 0, PNG_FILTER_VALUE_UP);
    png_set_compression_level(png_ptr, 5);

    //actually write the file
    //PNG_TRANSFORM_PACKING shrinks the bit depth down
    png_write_png(png_ptr, info_ptr, PNG_TRANSFORM_PACKING, NULL);

    png_destroy_write_struct(&png_ptr, &info_ptr);

    if (fclose(fp) != 0)
        abort_("failed to close file %s: %d", file_name, errno);

    return;
}

string ensurePath(string basePath, vector<string> pathElems) {
    // if basePath is non-empty, it must already exist
    string path;
    string relPath;
    if (basePath.length() > 0) path += basePath + "/";
    struct stat st;
    for (int i = 0; i < pathElems.size(); i++) {
        path += pathElems[i] + "/";
        relPath += pathElems[i] + "/";
        if (!((stat(path.c_str(), &st) == 0) && S_ISDIR(st.st_mode))) {
            if (-1 == mkdir(path.c_str(), 0777)) {
                cerr << "failed to make directory " << path 
                     << " (error " << errno << ")" << endl;
                exit(1);
            }
        }
    }
    // leave trailing slash off of the return value
    return relPath.substr(0, relPath.size() - 1);
}

class WiggleTileRenderer {

public:

    WiggleTileRenderer(int pixelBases, int tileWidthPixels, int tileHeight,
                       string baseDir, string relDir)
        : curTile_(numeric_limits<int>::min()),
	  curStart_(0),
	  curEnd_(numeric_limits<int>::min()),
          pixelBases_(pixelBases),
          tileWidthBases_(pixelBases * tileWidthPixels),
          tileWidthPixels_(tileWidthPixels),
          tileHeight_(tileHeight),
          baseDir_(baseDir),
          relDir_(relDir),
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
            stringstream s;
            string scale;

            s << pixelBases_;
            scale = s.str();

            const string path[] = {relDir_, chrom, scale};
            tileRel_ = ensurePath(baseDir_, vector<string>(path, path + sizeof(path)/sizeof(*path)));
            chromRels_[chrom] = tileRel_;
        }

        chrom_ = chrom;
        curTile_ = base / tileWidthBases_;
    }

    string chromRel(string chrom) {
        return chromRels_[chrom];
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
    string relDir_;
    string tileRel_;
    string chrom_;
    map<string, string> chromRels_;
};

class MeanRenderer : public WiggleTileRenderer {

public:

    MeanRenderer(int tileWidthBases, int tileWidthPixels,
                 int tileHeight, string baseDir, string relDir,
                 png_color bgColor, png_color fgColor,
                 float globalMax, float globalMin) :
        WiggleTileRenderer(tileWidthBases, tileWidthPixels,
                           tileHeight, baseDir, relDir),
        bgColor_(bgColor),
        fgColor_(fgColor),
        globalMax_(globalMax),
        globalMin_(globalMin),
        sumVals_(),
        valsPerPx_()
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

        write_png_file(pngFile.c_str(), tileWidthPixels_, tileHeight_, buf_, palette, num_colors, bitdepth);

	// erase tile data from buffers
        eraseTileTo(tileWidthPixels_ - 1);
    }

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
};

enum WiggleFormat {
    FIXED,
    VARIABLE,
    BED
};

class ParseFailure {};

class WiggleParser {
public:

    WiggleParser() :
        curBase_(numeric_limits<int>::min()),
        step_(1),
        span_(1),
        chrom_(""),
        format_(BED) {
    }

    void addRenderer(WiggleTileRenderer* r) {
        renderers_.push_back(r);
    }

    WiggleTileRenderer* getRenderer(int index) {
        return renderers_[index];
    }
    
    int rendererCount() {
        return renderers_.size();
    }

    void variableSection(string chrom, string span) {
        chrom_ = chrom;
        allChroms_.insert(chrom);
        format_ = VARIABLE;

        if(!from_string<int>(span_, span, dec)) throw ParseFailure();
    }

    void fixedSection(string chrom, string start, string step, string span) {
        chrom_ = chrom;
        allChroms_.insert(chrom);
        format_ = FIXED;

        if(!from_string<int>(curBase_, start, dec)) throw ParseFailure();
        if(!from_string<int>(step_,    step,  dec)) throw ParseFailure();
        if(!from_string<int>(span_,    span,  dec)) throw ParseFailure();

        newSection(chrom_, curBase_);
    }

    void handleParams(stringstream& ss, map<string,string>& params) {
        string setting;
        size_t found;
        while (ss >> setting) {
            found = setting.find("=");
            if (string::npos == found) continue;
            params[setting.substr(0, found)] = setting.substr(found + 1);
        }
    }

    void processLine(string line, int lineNum) {
        string word;
        float sample;
        stringstream ss(line);
        map<string,string> params;
        try {
            ss >> word;
            if ("fixedStep" == word) {
                //defaults
                params["span"] = "1";
                handleParams(ss, params);
                fixedSection(params["chrom"],
                             params["start"],
                             params["step"],
                             params["span"]);
            } else if ("variableStep" == word) {
                //defaults
                params["span"] = "1";
                handleParams(ss, params);
                variableSection(params["chrom"],
                                params["span"]);
                newsection_done_ = false;
            } else if ("track" == word) {
                cerr << "ignoring " << line 
                     << " (line " << lineNum << ")" << endl;
            } else {
                switch (format_) {
                case FIXED:
                    if(from_string<float>(sample, word, dec)) {
		      //cerr << "FIXED: ";
			flushTilesBefore(curBase_);
                        for (int i = 0; i < span_; i++)
                            //wiggle fixed and variable formats are 1-based
                            addValue(curBase_ + i - 1, sample);
                        curBase_ += step_;
                    } else {
                        throw ParseFailure();
                    }
                    break;
                case VARIABLE:
                    if(from_string<int>(curBase_, word, dec)) {
                        //after a variable section is declared,
                        //we don't know the first base of the new section
                        //until we hit the first data line.
                        if (!newsection_done_) {
                            newSection(chrom_, curBase_);
                            newsection_done_ = true;
                        }
                        ss >> word;
                        if(from_string<float>(sample, word, dec)) {
			  //cerr << "VARIABLE: ";
  			    flushTilesBefore(curBase_);
                            for (int i = 0; i < span_; i++)
                                //wiggle fixed and variable formats are 1-based
                                addValue(curBase_ + i - 1, sample);
                        } else {
                            throw ParseFailure();
                        }
                    } else {
                        throw ParseFailure();
                    }
                    break;
                case BED: {
                    bool ok = true;
                    int startBase, endBase;
                    chrom_ = word;
                    allChroms_.insert(chrom_);
                    if (ok) {
                        ss >> word;
                        ok = from_string<int>(startBase, word, dec);
                    }
                    if (ok) {
                        ss >> word;
                        ok = from_string<int>(endBase, word, dec);
                    }
                    if (ok) {
                        ss >> word;
                        ok = from_string<float>(sample, word, dec);
                    }
                    if (!ok)
                        throw ParseFailure();

                    newSection(chrom_, startBase);

		    flushTilesBefore(startBase + 1);
                    for (int i = startBase; i < endBase; i++) {
                        //wiggle bed format is 0-based
		      //cerr << "BED: ";
                        addValue(i, sample);
                    }

                    //curBase is 1-based, endBase is 0-based half-open,
                    //we want curBase to be equivalent to endBase in
                    //1-based coords, because the span doesn't include endBase.
                    curBase_ = endBase + 1;
                    //cerr << "parsed line\t" << line << "\n";
                    break;
                }
                }
            }
        } catch (ParseFailure) {
            cerr << "wig parsing failed on: \""
                 << line << "\" (line " << lineNum << ")" << endl;
            exit(1);
        }
    }

    void newSection(const string& chrom, int base) {
        for (int i = 0; i < renderers_.size(); i++)
            renderers_[i]->newSection(chrom_, base);
    }

    virtual void addValue(int base, float value) {
        for (int i = 0; i < renderers_.size(); i++)
            renderers_[i]->addValue(base, value);
    }

    virtual void flushTilesBefore(int base) {
        for (int i = 0; i < renderers_.size(); i++)
            renderers_[i]->flushTilesBefore(base);
    }

    void processWiggle(const char* filename) {
        string line;
        int lineNum = 1;
        ifstream wig(filename);
        if (wig.is_open()) {
            while (! wig.eof() ) {
                getline (wig,line);
                if (line.length() > 0) processLine(line, lineNum);
                lineNum++;
            }
            wig.close();
            //finish off last tile
            for (int i = 0; i < renderers_.size(); i++)
                renderers_[i]->flushAllTiles();
        }  else {
            cerr << "Unable to open file " << filename << endl;
            exit(1);
        }
    }

    set<string> getChroms() {
        return allChroms_;
    }

private:
    vector<WiggleTileRenderer*> renderers_;

    WiggleFormat format_;
    int curBase_;
    int step_;
    int span_;
    string chrom_;
    set<string> allChroms_;
    bool newsection_done_;
};

class WiggleRangeParser : public WiggleParser {
public:
    WiggleRangeParser() :
        max_(-numeric_limits<float>::max()),
        min_(numeric_limits<float>::max()) {
    }

    void addValue(int base, float value) {
        max_ = max(value, max_);
        min_ = min(value, min_);
    }

    float getMax() { return max_; }
    float getMin() { return min_; }

private:
    float max_;
    float min_;
};

int main(int argc, char **argv){
  
    INIT_OPTS_LIST (opts, argc, argv, 1, "[options] <input file>", "create a JBrowse quantitative track, broken into tile images, from a WIG file");

    string outdiropt = "data";
    string pngrelopt = "tiles";
    string jsondiropt = "data/tracks";
    string tracklabel = "wigtrack";
    int width = 2000;
    int height = 100;
    string fgopt = "105,155,111";
    string bgopt = "255,255,255";
    string minopt, maxopt;


    opts.add ("od -outdir", outdiropt, "the data directory");
    opts.add ("pd -png-dir", pngrelopt, "PNG output directory, relative to the data directory");
    opts.add ("jd -json-dir", jsondiropt, "JSON output directory");
    opts.add ("tl -track-label", tracklabel, "track label");
    opts.add ("tw -tile-width", width, "tile width in pixels");
    opts.add ("th -track-height", height, "track height in pixels");
    opts.add ("fg -foreground-color", fgopt, "foreground R,G,B color");
    opts.add ("bg -background-color", bgopt, "background R,G,B color");
    opts.add ("min -min-value", minopt, "minimum value to show (default is minimum value in WIG file)", false);
    opts.add ("max -max-value", maxopt, "maximum value to show (default is maximum value in WIG file)", false);

    try {
        opts.parse();
    } catch (Opts_list::Syntax_exception e) {
        cerr << opts.short_help() << e.what();
        exit(1);
    }

    string wig_filename = opts.args[0];

    png_color bg = {
        atoi(strtok((char*) bgopt.c_str(), ",")),   // cast away const
        atoi(strtok(NULL, ",")), 
        atoi(strtok(NULL, ","))
    };

    png_color fg = {
        atoi(strtok((char*) fgopt.c_str(), ",")),   // cast away const
        atoi(strtok(NULL, ",")), 
        atoi(strtok(NULL, ","))
    };

    vector<string> relPath;
    //basePath.push_back(outdiropt);
    relPath.push_back(pngrelopt);
    relPath.push_back(tracklabel);
    string relDir = ensurePath(outdiropt, relPath);

    float max = 1.0f;
    float min = 0.0f;
    if (!minopt.empty()) {
        if (! (from_string<float>(min, minopt, dec)
               &&
               from_string<float>(max, maxopt, dec))) {
            cerr << "couldn't parse min and max arguments: "
                 << minopt << " " << maxopt << endl;
            exit(1);
        }
    } else {
        WiggleRangeParser rp;
        rp.processWiggle(wig_filename.c_str());

        max = rp.getMax();
        min = rp.getMin();
    }

    //bases per pixel
    const int zooms[] = {1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
                         2000, 5000, 10000, 20000, 50000, 100000};
    int num_zooms=sizeof(zooms)/sizeof(*zooms);

    WiggleParser p;

    for (int i = 0; i < num_zooms; i++) {
        p.addRenderer(new MeanRenderer(zooms[i], width, height,
                                       outdiropt, relDir,
                                       bg, fg, max, min));
    }

    p.processWiggle(wig_filename.c_str());

    set<string> chroms = p.getChroms();
    set<string>::iterator chrom;
    vector<string> jsonDir;
    jsonDir.push_back(jsondiropt);
    WiggleTileRenderer* r;
    for (chrom = chroms.begin(); chrom != chroms.end(); chrom++) {
        jsonDir.push_back(*chrom);
        string jsonPath = ensurePath("", jsonDir) + "/" + tracklabel + ".json";
        ofstream json(jsonPath.c_str());
        jsonDir.pop_back();
        if (json.is_open()) {
            json << "{" << endl;
            json << "   \"zoomLevels\" : [" << endl;
            for (int i = 0; i < p.rendererCount(); i++) {
                r = p.getRenderer(i);
                json << "      {" << endl
                     << "         \"urlPrefix\" : \""
                     << r->chromRel(*chrom) << "/\"," << endl
                     << "         \"height\" : "
                     << height << "," << endl
                     << "         \"basesPerTile\" : "
                     << r->getTileBases() << endl;

                if (i < p.rendererCount() - 1)
                    json << "      }," << endl;
                else
                    json << "      }" << endl;
            }
            json << "   ]," << endl
                 << "   \"tileWidth\" : " << width << endl
                 << "}" << endl;
        } else {
            cerr << "failed to open json file \"" << jsonPath << "\"" << endl;
            exit(1);
        }
    }

    return 0;
}

/*

  Copyright (c) 2007-2009 The Evolutionary Software Foundation

  Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

  This package and its accompanying libraries are free software; you can
  redistribute it and/or modify it under the terms of the LGPL (either
  version 2.1, or at your option, any later version) or the Artistic
  License 2.0.  Refer to LICENSE for the full license text.

*/
