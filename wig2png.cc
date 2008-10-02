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


class WiggleTileRenderer {

public:

    WiggleTileRenderer(int pixelBases, int tileWidthPixels, int tileHeight,
                       string baseDir)
        : curTile_(numeric_limits<int>::min()),
          pixelBases_(pixelBases),
          tileWidthBases_(pixelBases * tileWidthPixels),
          tileWidthPixels_(tileWidthPixels),
          tileHeight_(tileHeight),
          baseDir_(baseDir) {
    }

    void addValue(int base, float value) {
        //cerr << "zoom " << pixelBases_ << " addValue: base: " << base << ", value: " << value <<endl;
        if (base > ((curTile_ + 1) * tileWidthBases_)) {
            renderTile();
            curTile_ = base / tileWidthBases_;
            newTile();
        }

        processValue(base, value);
    }
  
    void renderTile() {
        //cerr << "rendering" << endl;
        stringstream s;
        s << baseDir_ << "/" 
          << chrom_ << "/" 
          << pixelBases_ << "/"
          << curTile_ << ".png";
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
        chrom_ = chrom;
        curTile_ = base / tileWidthBases_;

        stringstream s;
        s << baseDir_ << "/" 
          << chrom_ << "/" 
          << pixelBases_ << "/";

        if (-1 == mkdir(s.str().c_str(), 0777)) {
            if (EEXIST != errno) {
                cerr << "failed to make directory" << s.str() << endl;
                exit(1);
            }
        }
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
    string chrom_;
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

class WiggleParser {
public:

    WiggleParser() :
          curBase_(numeric_limits<int>::min()),
          step_(1),
          span_(1),
          chrom_("") {
    }

    void addRenderer(WiggleTileRenderer* r) {
        renderers_.push_back(r);
    }

    void newSection(string chrom, string start, string step, string span) {
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

        for (int i = 0; i < renderers_.size(); i++)
            renderers_[i]->newSection(chrom_, curBase_);
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
        ss >> word;
        if ("fixedStep" == word) {
            //defaults
            params["span"] = "1";
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
        for (int i = 0; i < renderers_.size(); i++)
            renderers_[i]->addValue(base, value);
    }

    void processWiggle(const char* filename) {
        string line;
        ifstream wig(filename);
        if (wig.is_open()) {
            while (! wig.eof() ) {
                getline (wig,line);
                if (line.length() > 0) processLine(line);
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

private:
    vector<WiggleTileRenderer*> renderers_;

    int curBase_;
    int step_;
    int span_;
    string chrom_;
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

    //bases per pixel
    int zooms[] = {1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
                   2000, 5000, 10000, 20000, 50000, 100000};
    int num_zooms=16;

    WiggleParser p;

    for (int i = 0; i < num_zooms; i++) {
        p.addRenderer(new MeanRenderer(zooms[i], width, height, baseDir,
                                       bg, fg, max, min));
    }

    p.processWiggle(argv[1]);

    return 0;
}
