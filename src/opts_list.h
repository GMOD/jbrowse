#ifndef OPTS_LIST_INCLUDED
#define OPTS_LIST_INCLUDED

#include <math.h>
#include <iostream>
#include <sstream>
#include <set>
#include <map>
#include <list>
#include <string>
#include <vector>
#include <exception>

using namespace std;

// parser class for command line options & arguments of an executable
struct Opts_list {

  class Syntax_exception: public exception
  {
    const Opts_list&  opts;  // pointer to parent class
    string temp;  // temporary variable used by what() method
    string info;  // used to hold the error message

  public:
    Syntax_exception (const Opts_list& opts, const char* msg) :
      exception(), opts(opts), info(msg)
    { }

    Syntax_exception (const Opts_list& opts, const string& msg) :
      exception(), opts(opts), info(msg)
    { }

    virtual ~Syntax_exception() throw ()
    { }

    virtual const char* what() const throw()
    {
      (string&) temp = "";
      ((string&) temp).append("While parsing command line: ").append(info).append("\n");
      return temp.c_str();
    }
  };

  // typedef for "option handlers" (callback member functions)
  typedef bool (*Option_handler) (Opts_list*);  // returns TRUE if parsed OK, FALSE if error

  // member variables

  // "current" argc and argv - these are used as pointers and are changed by the option parse code
  int    argc;
  char** argv;

  // aliased arguments
  list<string> alias_args;
  list<string>::iterator next_alias_arg;

  // method to check if there are more args remaining
  bool more_args() const;

  // initial values of argc and argv
  int    init_argc;
  char** init_argv;

  int expect_args;   // expected number of args: -1 for "any", otherwise will complain if not equal to this

  // all options
  set<string> all_opts;
  void new_opt (const string& s);
  static string neg_opt (const string& s);  // puts a "no" in front of an option

  // options by type
  map <string, bool*>          bool_opts;
  map <string, bool*>          bool_no_opts;
  map <string, int*>           int_opts;
  map <string, double*>        double_opts;
  map <string, string*>       string_opts;
  map <string, Option_handler> callback_opts;
  map <string, string>        alias_opts;

  // post-parse callback hooks
  vector <Option_handler>       post_parse_callback;

  // various bits of help text
  string program_name;
  string short_description;
  string version_info;
  string syntax;
  string short_help_text;
  string options_help_text;

  // arguments (extracted from the command line & stuck into this vector by the option-parsing code)
  vector<string> args;

  // member functions

  // constructor
  Opts_list (int argc, char** argv);

  // virtual destructor
  virtual ~Opts_list();

  // builder methods to add options, with comments in help text
  void add (const char* opt, bool& var, const char* desc = 0, bool show_default = 1, const char* negopt = 0, const char* negdesc = 0);
  void add (const char* opt, int& var,     const char* desc = 0, bool show_default = true);
  void add (const char* opt, double& var,  const char* desc = 0, bool show_default = true);
  void add (const char* opt, string& var, const char* desc = 0, bool show_default = true);
  void add (const char* opt, const char* alias, const char* desc = 0, bool show_alias = true);
  void add (const char* opt, Option_handler callback, const char* desc = 0);

  // builder methods to add comments to help text
  void print (const char* text);
  void newline();
  void print_title (const char* text);

  // parser methods
  bool parse();  // returns TRUE if parsed OK
  void parse_or_die();

  // virtual parse method
  enum Parse_status { UNPARSED = 0, PARSE_OK = 1, PARSE_NOT_OK = 2 };
  virtual Parse_status parse_opt (const string& opt);

  // parser helper methods
  double next_double();
  int    next_int();
  char*  next_string();

  // help text accessors
  virtual string short_help() const;  // prints program_name/short_description/syntax, short_help_text
  virtual string help() const;  // prints program_name/short_description/syntax, options_help_text

  // option handler functions to display various bits of help text
  static bool display_help (Opts_list* ol);
  static bool display_version (Opts_list* ol);
};


// Perl-style split & join
vector<string> split (const string& s, const char* split_chars = " \t\n", int max_fields = 0, bool skip_empty_fields = true);

string join (const vector<string>& v, const char* separator = " ");

// to_string and from_string

template< class T>
inline std::string to_string( const T & Value)
{
  std::stringstream oss;
  oss << Value;
  return oss.str();
}

template <class T>
inline bool from_string(T& t, 
			const std::string& s, 
			std::ios_base& (*f)(std::ios_base&))
{
  std::istringstream iss(s);
  return !(iss >> f >> t).fail();
}



// build macros
#define SET_VERSION_INFO(OPTS) (OPTS).version_info.clear(); (OPTS).version_info = (OPTS).version_info + PACKAGE_NAME + " version " + PACKAGE_VERSION + " compiled " + __DATE__ + " " + __TIME__ + "\n";

#define INIT_CONSTRUCTED_OPTS_LIST(OPTS,ARGS,SYNTAX,SHORTDESC) OPTS.short_description = (SHORTDESC); OPTS.syntax = (SYNTAX); OPTS.expect_args = (ARGS); SET_VERSION_INFO(OPTS); OPTS.newline();

#define INIT_TYPED_OPTS_LIST(OPTS_TYPE,OPTS,ARGC,ARGV,ARGS,SYNTAX,SHORTDESC) OPTS_TYPE OPTS(ARGC,ARGV); INIT_CONSTRUCTED_OPTS_LIST(OPTS,ARGS,SYNTAX,SHORTDESC)

#define INIT_OPTS_LIST(OPTS,ARGC,ARGV,ARGS,SYNTAX,SHORTDESC) INIT_TYPED_OPTS_LIST(Opts_list,OPTS,ARGC,ARGV,ARGS,SYNTAX,SHORTDESC)

#endif
