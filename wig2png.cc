#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#include <errno.h>

#include <string>
#include <vector>
#include <map>
#include <iostream>
#include <fstream>
#include <sstream>
using namespace std;

#define PNG_DEBUG 3
#include <png.h>

#define MAX_PATH_LEN 2048

//this comes from when this used to be in C
//TODO: rewrite with exceptions?
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
    /* create file */
    FILE *fp = fopen(file_name, "wb");
    if (!fp)
        abort_("[write_png_file] File %s could not be opened for writing", file_name);

    png_structp png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
	
    if (!png_ptr)
        abort_("[write_png_file] png_create_write_struct failed");

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

    png_set_IHDR(png_ptr, info_ptr, width, height, bitdepth,
                 PNG_COLOR_TYPE_PALETTE, PNG_INTERLACE_NONE,
                 PNG_COMPRESSION_TYPE_BASE, PNG_FILTER_TYPE_BASE);

    png_set_PLTE(png_ptr, info_ptr, palette, num_colors);

    png_set_rows(png_ptr, info_ptr, imgbuf);

    png_set_filter(png_ptr, 0, PNG_FILTER_VALUE_UP);
    png_set_compression_level(png_ptr, 5);

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


class WiggleTileRenderer {

public:

    WiggleTileRenderer(int tileWidthBases, int tileWidthPixels, int tileHeight,
                       string baseDir)
        : curTile_(0),
          tileWidthBases_(tileWidthBases),
          tileWidthPixels_(tileWidthPixels),
          tileHeight_(tileHeight),
          curBase_(numeric_limits<int>::min()),
          step_(1),
          span_(1),
          chrom_(""),
          baseDir_(baseDir) {
    }

    void newSection(string chrom, string start, string step, string span) {
        //cerr << "chrom: " << chrom << ", start: " << start << ", step: " << step << ", span: " << span << endl;
        chrom_ = chrom;
        if(!from_string<int>(curBase_, start, dec)) {
            cerr << "wig parsing failed on start \"" << start << "\"" << endl;
            exit(1);
        }
        if(!from_string<int>(step_, step, dec)) {
            cerr << "wig parsing failed on step \"" << step << "\"" << endl;
            exit(1);
        }
        if(!from_string<int>(span_, span, dec)) {
            cerr << "wig parsing failed on span \"" << span << "\"" << endl;
            exit(1);
        }
        //TODO: handle chromosome switching, generate blank tiles?
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

    void processLine(string line) {
        string word;
        float sample;
        stringstream ss(line);
        map<string,string> params;
        //defaults
        params["span"] = "1";
        ss >> word;
        if ("fixedStep" == word) {
            handleParams(ss, params);
            newSection(params["chrom"],
                       params["start"],
                       params["step"],
                       params["span"]);
        } else if ("variableStep" == word) {
            cerr << "variableStep not yet implemented";
            exit(1);
        } else {
            if(from_string<float>(sample, word, dec)) {
                if (1 == span_) {
                    addValue(curBase_, sample);
                } else {
                    for (int i = 0; i < span_; i++)
                        addValue(curBase_ + i, sample);
                }
                curBase_ += step_;
            } else {
                cerr << "wig parsing failed on: \"" << line << "\"" << endl;
                exit(1);
            }
        }
    }

    void addValue(int base, float value) {
        if (base > ((curTile_ + 1) * tileWidthBases_)) {
            renderTile();
            curTile_ = base / tileWidthBases_;
            newTile();
        }

        processValue(base, value);
    }
  
    void renderTile() {
        stringstream s;
        s << baseDir_ << "/" << curTile_ << ".png";
        drawTile(s.str());
    }
    
    virtual void drawTile(string pngFile) = 0;
    virtual void newTile() = 0;
    virtual void processValue(int base, float value) = 0;

protected:

    int tileWidthBases_;
    int tileWidthPixels_;
    int tileHeight_;
    int curBase_;
    int step_;
    int span_;
    string chrom_;
    int curTile_;
    string baseDir_;
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
        int x = (int) (((base % tileWidthBases_) / (double) tileWidthBases_) * tileWidthPixels_);
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
        float scale = ((float)tileHeight_) * (globalMax_ - globalMin_);
        int meany;
        for (x = 0; x < tileWidthPixels_; x++) {
            if (0 == valsPerPx_[x]) {
                for (y = 0; y < tileHeight_; y++)
                    buf_[y][x] = bgIndex;
                continue;
            }

            meany = tileHeight_ 
                - (int)((
                         (sumVals_[x] / (float)valsPerPx_[x]) * scale)
                        + globalMin_);

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



int main(int argc, char **argv){
    if (argc != 7)
        abort_("Usage: %s <input file> <output dir> <width> <height> <bg red>,<bg green>,<bg blue> <fg red>,<fg green>,<fg blue>", argv[0]);

    png_color bg = {
        atoi(strtok(argv[5], ",")), 
        atoi(strtok(NULL, ",")), 
        atoi(strtok(NULL, ","))
    };

    png_color fg = {
        atoi(strtok(argv[6], ",")), 
        atoi(strtok(NULL, ",")), 
        atoi(strtok(NULL, ","))
    };

    int width = atoi(argv[3]);
    int height = atoi(argv[4]);
    string baseDir(argv[2]);

    float max = 1.0f;
    float min = 0.0f;

/*
  //bases per pixel
  int[] zooms = {1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
                 2000, 5000, 10000, 20000, 50000, 100000,
                 200000, 500000, 1000000, 2000000, 5000000};
  
*/

    MeanRenderer r(2000, width, height, baseDir,
                   bg, fg, max, min);

    string line;
    ifstream wig(argv[1]);
    if (wig.is_open()) {
        while (! wig.eof() ) {
            getline (wig,line);
            if (line.length() > 0) r.processLine(line);
        }
        wig.close();
    }  else {
        cerr << "Unable to open file " << argv[1];
        return 1;
    }

    return 0;
}
