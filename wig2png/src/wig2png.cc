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

#include "functions.c"

#include "WiggleTileRenderer.cc"
#include "MeanRenderer.cc"

#include "WiggleParser.cc"
#include "WiggleRangeParser.cc"

int main(int argc, char **argv){

    INIT_OPTS_LIST (opts, argc, argv, 1, "[options] <input file>", "create a JBrowse quantitative track, broken into tile images, from a WIG file");

    string outdiropt = "";
    int width = 2000;
    int height = 100;
    string fgopt = "105,155,111";
    string bgopt = "255,255,255";
    string minopt, maxopt;
    bool no_transparency;

    opts.add ("od -outdir", outdiropt, "the directory for this track");
    opts.add ("tw -tile-width", width, "tile width in pixels");
    opts.add ("th -track-height", height, "track height in pixels");
    opts.add ("fg -foreground-color", fgopt, "foreground R,G,B color");
    opts.add ("bg -background-color", bgopt, "background R,G,B color");
    opts.add ("nt -no-transparency", no_transparency, "turn off background transparency");
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

    vector<string> outdirPath;
    outdirPath.push_back(outdiropt);
    ensurePath("", outdirPath);

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
                                       outdiropt,
                                       bg, fg, no_transparency, max, min));
    }

    p.processWiggle(wig_filename.c_str());

    set<string> chroms = p.getChroms();
    set<string>::iterator chrom;
    WiggleTileRenderer* r;
    for (chrom = chroms.begin(); chrom != chroms.end(); chrom++) {
        string jsonPath = outdiropt + "/" + *chrom + "/trackData.json";
        ofstream json(jsonPath.c_str());
        if (json.is_open()) {
            json << "{" << endl
                 << "   \"stats\" : { " << endl
                 << "       \"global_min\": " << min << "," << endl
                 << "       \"global_max\": " << max << endl
                 << "    }," << endl
                 << "   \"zoomLevels\" : [" << endl;
            for (int i = 0; i < p.rendererCount(); i++) {
                r = p.getRenderer(i);
                json << "      {" << endl
                     << "         \"urlPrefix\" : \""
                     << r->scale() << "/\"," << endl
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
