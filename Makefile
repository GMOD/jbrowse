default: bin/wig2png

bin/wig2png: src/wig2png.cc
	g++ -O3 -lpng -o bin/wig2png $<

.PHONY: clean

clean:
	rm bin/wig2png
