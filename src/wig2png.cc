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
#include <map>
#include <set>
#include <iostream>
#include <fstream>
#include <sstream>
#include <limits>
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

template <class T>
bool from_string(T& t, 
                 const std::string& s, 
                 std::ios_base& (*f)(std::ios_base&))
{
  std::istringstream iss(s);
  return !(iss >> f >> t).fail();
}

string ensure_path(vector<string> pathelems) {
    string path;
    struct stat st;
    for (int i = 0; i < pathelems.size(); i++) {
        path += pathelems[i] + "/";
        if (!((stat(path.c_str(), &st) == 0) && S_ISDIR(st.st_mode))) {
            if (-1 == mkdir(path.c_str(), 0777)) {
               cerr << "failed to make directory " << path  << " (error " << errno << ")" << endl;
               exit(1);
            }
        }
    }
    return path;
}

class WiggleTileRenderer {

public:

    WiggleTileRenderer(int pixelBases, int tileWidthPixels, int tileHeight,
                       string baseDir)
        : curTile_(numeric_limits<int>::min()),
          pixelBases_(pixelBases),
          tileWidthBases_(pixelBases * tileWidthPixels),
          tileWidthPixels_(tileWidthPixels),
          tileHeight_(tileHeight),
          baseDir_(baseDir),
          tileDir_(baseDir) {
    }

    void addValue(int base, float value) {
        //cerr << "zoom " << pixelBases_ << " addValue: base: " << base << ", value: " << value <<endl;
        if ((long long)base > 
            ((long long)(curTile_ + 1) * (long long)tileWidthBases_)) {
            renderTile();
            curTile_ = base / tileWidthBases_;
            newTile();
        }

        processValue(base, value);
    }
  
    void renderTile() {
        //cerr << "rendering" << endl;
        stringstream s;
        s << tileDir_ << curTile_ << ".png";
        drawTile(s.str());
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
            renderTile();
            newTile();
        }

        //if this is a new chrom, make a directory for it
        if (chrom != chrom_) {
            stringstream s;
            string scale;

            s << pixelBases_;
            scale = s.str();

            const string path[] = {baseDir_, chrom, scale};
            tileDir_ = ensure_path(vector<string>(path, path + sizeof(path)/sizeof(*path)));
            chromDirs_[chrom] = tileDir_;
        }

        chrom_ = chrom;
        curTile_ = base / tileWidthBases_;
    }

    string chromDir(string chrom) {
        return chromDirs_[chrom];
    }

    int getTileBases() const {
        return tileWidthBases_;
    }

    //render the current tile to file
    virtual void drawTile(string pngFile) = 0;
    //initialize data (e.g., set counts/sums to zero)
    virtual void newTile() = 0;
    //handle sample
    virtual void processValue(int base, float value) = 0;

protected:

    int pixelBases_;
    int tileWidthBases_;
    int tileWidthPixels_;
    int tileHeight_;
    int curTile_;
    string baseDir_;
    string tileDir_;
    string chrom_;
    map<string, string> chromDirs_;
};

class MeanRenderer : public WiggleTileRenderer {

public:

    MeanRenderer(int tileWidthBases, int tileWidthPixels,
                 int tileHeight, string baseDir,
                 png_color bgColor, png_color fgColor,
                 float globalMax, float globalMin) :
        WiggleTileRenderer(tileWidthBases, tileWidthPixels,
                           tileHeight, baseDir),
        bgColor_(bgColor),
        fgColor_(fgColor),
        globalMax_(globalMax),
        globalMin_(globalMin),
        sumVals_(tileWidthPixels),
        valsPerPx_(tileWidthPixels)
    {
        newTile();
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
        int x = (((long long)(base % tileWidthBases_)
                  * (long long)tileWidthPixels_)
                 / (long long)tileWidthBases_);
        sumVals_[x] += value;
        valsPerPx_[x] += 1;
    }
  
    void newTile() {
        int i;
        for (i = 0; i < tileWidthPixels_; i++) {
            //maxVals_[i] = 0.0f;
            //minVals_[i] = numeric_limits<float>::max();
            sumVals_[i] = 0.0f;
            valsPerPx_[i] = 0;
        }
    }

    void drawTile(string pngFile) {
        png_color palette[] = {bgColor_, fgColor_};
        png_byte bgIndex = 0, fgIndex = 1;
        int num_colors = 2;
        int bitdepth = 1;

        int x, y;
        //scale: pixels per unit (whatever units from wig file)
        float scale = ((float)tileHeight_) / (globalMax_ - globalMin_);
        int meany;
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
            meany = (meany < 0) ? 0 : meany;
            meany = (meany >= tileHeight_) ? tileHeight_ - 1 : meany;

            //cerr << "min: " << min << ", max: " << max << ", mean: " << mean << ", tileHeight_: " << tileHeight_ << endl;

            for (y = 0; y < meany; y++)
                buf_[y][x] = bgIndex;
            for (y = meany; y < tileHeight_; y++)
                buf_[y][x] = fgIndex;
        }

        write_png_file(pngFile.c_str(), tileWidthPixels_, tileHeight_, buf_, palette, num_colors, bitdepth);
    }

private:
    png_color bgColor_;
    png_color fgColor_;
    vector<float> sumVals_;
    vector<int> valsPerPx_;
    float globalMax_;
    float globalMin_;

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
                    float value;
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
                        ok = from_string<float>(value, word, dec);
                    }
                    if (!ok)
                        throw ParseFailure();

                    newSection(chrom_, startBase);

                    for (int i = startBase; i < endBase; i++) {
                        //wiggle bed format is 0-based
                        addValue(i, sample);
                    }

                    //curBase is 1-based, endBase is 0-based half-open,
                    //we want curBase to be equivalent to endBase in
                    //1-based coords, because the span doesn't include endBase.
                    curBase_ = endBase + 1;
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
              renderers_[i]->renderTile();
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
        max_ = (value > max_) ? value : max_;
        min_ = (value < min_) ? value : min_;
    }

    float getMax() { return max_; }
    float getMin() { return min_; }

private:
    float max_;
    float min_;
};

int main(int argc, char **argv){
    if (argc != 9)
        abort_("Usage: %s <input file> <output dir> <json dir> <track label> <width> <height> <bg red>,<bg green>,<bg blue> <fg red>,<fg green>,<fg blue>", argv[0]);

    png_color bg = {
        atoi(strtok(argv[7], ",")), 
        atoi(strtok(NULL, ",")), 
        atoi(strtok(NULL, ","))
    };

    png_color fg = {
        atoi(strtok(argv[8], ",")), 
        atoi(strtok(NULL, ",")), 
        atoi(strtok(NULL, ","))
    };

    int width = atoi(argv[5]);
    int height = atoi(argv[6]);
    vector<string> basePath;
    basePath.push_back(string(argv[2]));
    basePath.push_back(string(argv[4]));
    string baseDir = ensure_path(basePath);

    WiggleRangeParser rp;
    rp.processWiggle(argv[1]);

    float max = rp.getMax();
    float min = rp.getMin();

    //bases per pixel
    const int zooms[] = {1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
                   2000, 5000, 10000, 20000, 50000, 100000};
    int num_zooms=sizeof(zooms)/sizeof(*zooms);

    WiggleParser p;

    for (int i = 0; i < num_zooms; i++) {
        p.addRenderer(new MeanRenderer(zooms[i], width, height, baseDir,
                                       bg, fg, max, min));
    }

    p.processWiggle(argv[1]);

    set<string> chroms = p.getChroms();
    set<string>::iterator chrom;
    vector<string> jsonDir;
    jsonDir.push_back(string(argv[3]));
    WiggleTileRenderer* r;
    for (chrom = chroms.begin(); chrom != chroms.end(); chrom++) {
        jsonDir.push_back(*chrom);
        string jsonPath = ensure_path(jsonDir) + string(argv[4]) + ".json";
        ofstream json(jsonPath.c_str());
        jsonDir.pop_back();
        if (json.is_open()) {
            json << "{" << endl;
            json << "   \"zoomLevels\" : [" << endl;
            for (int i = 0; i < p.rendererCount(); i++) {
                r = p.getRenderer(i);
                json << "      {" << endl
                     << "         \"urlPrefix\" : \""
                     << r->chromDir(*chrom) << "\"," << endl
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
