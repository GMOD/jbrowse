
//#define PNG_DEBUG 3
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

void write_png_file(const char* file_name, int width, int height, png_bytep imgbuf[], png_color palette[], int num_colors, int bitdepth, bool transparent_background ) {
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
#ifdef PNG_tRNS_SUPPORTED
    if( transparent_background ) {
      png_byte trans[1];
      trans[0] = 0;
      png_set_tRNS(png_ptr, info_ptr, trans, 1, NULL);
    }
#endif

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
