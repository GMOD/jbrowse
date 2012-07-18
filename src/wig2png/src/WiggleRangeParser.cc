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
