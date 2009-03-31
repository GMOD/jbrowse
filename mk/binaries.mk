GCC_INC_ARGS =
GCC_LIB_ARGS =
GCC_ARGS = $(GCC_LIB_ARGS) $(GCC_INC_ARGS)

binaries: bin/wig2png

bin/wig2png: src/wig2png.cc
	g++ $(GCC_ARGS) -O3 -lpng -o bin/wig2png $<

binaries-clean:
	rm bin/wig2png

.PHONY: clean default binaries $(DELEGATED_PHONIES)

.SECONDARY:
