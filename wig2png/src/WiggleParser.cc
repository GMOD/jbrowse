class ParseFailure {};

enum WiggleFormat {
    FIXED,
    VARIABLE,
    BED
};

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
                // cerr << "ignoring " << line 
                //      << " (line " << lineNum << ")" << endl;
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
