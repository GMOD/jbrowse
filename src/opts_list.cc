#include <ctype.h>
#include "opts_list.h"

void Opts_list::print (const char* text)
{ options_help_text.append (text); }

void Opts_list::newline()
{ print ("\n"); }

void Opts_list::print_title (const char* text)
{
  sstring underline (strlen(text), '-');
  options_help_text << text << "\n" << underline << "\n";
}

sstring Opts_list::short_help() const
{
  sstring h = program_name;
  if (short_description.size()) h << " - " << short_description << '\n';
  if (syntax.size()) h << "Usage: " << program_name << " " << syntax << '\n';
  if (short_help_text.size()) h << short_help_text << '\n';
  return h;
}

Regexp help_tab_re ("^([^\t]+)\t+([^\t].*)$");
sstring Opts_list::help() const
{
  sstring h = program_name;
  if (short_description.size()) h << " - " << short_description << '\n';
  if (syntax.size()) h << "Usage: " << program_name << " " << syntax << '\n';
  if (options_help_text.size())
    {
      h << "\n";
      h << "Command-line options (righthandmost options\n";
      h << "--------------------    take precedence)\n";
      h << "\n";
      // split up the options_help_text by lines
      const vector<sstring> help_lines = options_help_text.split ("\n", FALSE);
      // split at tab, find max width of LHS
      int max_lhs_width = 0;
      for_const_contents (vector<sstring>, help_lines, line)
	if (help_tab_re.Match (line->c_str()))
	  max_lhs_width = max (max_lhs_width, (int) help_tab_re[1].size());
      // print out each line, again splitting tabs & aligning LHS
      for_const_contents (vector<sstring>, help_lines, line)
	if (help_tab_re.Match (line->c_str()))
	  {
	    const sstring lhs = help_tab_re[1];
	    const sstring rhs = help_tab_re[2];
	    h << lhs;
	    for (int i = (int) lhs.size(); i < max_lhs_width + 1; ++i)
	      h << ' ';
	    h << rhs << '\n';
	  }
	else
	  h << *line << '\n';
      h << "\n";
    }
  return h;
}

bool Opts_list::display_help (Opts_list* ol)
{ cout << ol->help(); exit(0); return 1; }

bool Opts_list::display_version (Opts_list* ol)
{
  cout << ol->program_name << ": a component of the " << PACKAGE_NAME << " package\n" << ol->version_info;
  exit(0);
  return 1;
}

Opts_list::Opts_list (int argc, char** argv)
  : argc(argc),
    argv(argv),
    alias_args(),
    next_alias_arg (alias_args.end()),
    init_argc(argc),
    init_argv(argv),
    expect_args(-1)
{
  if (argc > 0)
    program_name = next_string();
  add ("h help -help", &display_help, "\tdisplay this message");
  add ("v -version", &display_version, "\tdisplay version");
  short_help_text.clear();
  short_help_text << "(type \"" << program_name << " " << "--help\" for command-line options)";
  SET_VERSION_INFO(*this);
}

Opts_list::~Opts_list()
{ }

bool Opts_list::more_args() const
{
  return next_alias_arg != alias_args.begin() || argc > 0;
}

double Opts_list::next_double()
{
  if (next_alias_arg != alias_args.begin())
    {
      const sstring& next_arg = *--next_alias_arg;
      return next_arg.to_double();
    }
  if (--argc < 0) THROW Syntax_exception (*this, "missing double-precision argument");
  return atof(*argv++);
}

int Opts_list::next_int()
{
  if (next_alias_arg != alias_args.begin())
    {
      const sstring& next_arg = *--next_alias_arg;
      return next_arg.to_int();
    }
  if (--argc < 0) THROW Syntax_exception (*this, "missing integer argument");
  return atoi(*argv++);
}

char* Opts_list::next_string()
{
  if (next_alias_arg != alias_args.begin())
    {
      const sstring& next_arg = *--next_alias_arg;
      return (char*) next_arg.c_str();  // cast away const... hacky
    }
  if (--argc < 0) THROW Syntax_exception (*this, "missing string argument");
  return *argv++;
}

void Opts_list::new_opt (const sstring& s)
{
  if (all_opts.find(s) != all_opts.end())
    {
      // print directly to cerr, as this exception is often thrown outside a clean handler
      cerr << "Duplicate option: -" << s << "; about to throw an exception...\n";
      cerr.flush();
      THROWEXPR ("Duplicate option: -" << s);
    }
  all_opts.insert(s);
}

sstring Opts_list::neg_opt (const sstring& s)
{
  sstring neg;
  sstring::const_iterator i = s.begin();
  while (i < s.end())
    {
      if (*i == '-') { neg << *i++; continue; }
      neg << "no";
      neg.append (i, s.end());
      break;
    }
  return neg;
}

void Opts_list::add(const char*opt,bool&var,const char*desc, bool show_default, const char* negopt, const char* negdesc)
{
  sstring tmp (opt);
  vector<sstring> v = tmp.split();
  vector<sstring> negv;
  if (negopt)
    {
      tmp = negopt;
      negv = tmp.split();
    }
  else
    for_contents (vector<sstring>, v, s)
      negv.push_back (neg_opt (*s));
  if (desc)
    {
      options_help_text << "-" << sstring::join (v,",-") << "\t";
      int i = 0;
      int desc_len = strlen(desc);
      while (i < desc_len) if (isspace(desc[i])) options_help_text << desc[i++]; else break;
      if (show_default && var) options_help_text << "(default) ";
      while (i < desc_len) options_help_text << desc[i++];
      const sstring& neg = negv.back();
      if (show_default && var) options_help_text << " (-" << neg << " to disable)";
      else if (negdesc) options_help_text << " (opposite of -" << neg << ")";
      options_help_text << "\n";
    }
  if (negdesc)
    {
      options_help_text << " -" << sstring::join (negv,",-") << "\t ";
      int i = 0;
      int desc_len = strlen(negdesc);
      while (i < desc_len) if (isspace(negdesc[i])) options_help_text << negdesc[i++]; else break;
      if (show_default && !var) options_help_text << "(default) ";
      while (i < desc_len) options_help_text << negdesc[i++];
      const sstring& pos = v.back();
      if (show_default && !var) options_help_text << " (-" << pos << " to disable)";
      else if (desc) options_help_text << " (opposite of -" << pos << ")";
      options_help_text << "\n";
    }
  for_contents (vector<sstring>, v, i)
    {
      new_opt (*i);
      bool_opts[*i] = &var;
    }
  for_contents (vector<sstring>, negv, i)
    {
      new_opt (*i);
      bool_no_opts[*i] = &var;
    }
}

void Opts_list::add(const char*opt,int&var,const char*desc, bool show_default)
{
  sstring tmp (opt);
  vector<sstring> v = tmp.split();
  if (desc)
    {
      options_help_text << "-" << sstring::join (v,",-") << " <integer>\t" << desc;
      if (show_default)
	{
	  char buf[100];
	  sprintf (buf, "%d", var);
	  options_help_text << " (default is " << buf << ")";
	}
      options_help_text << "\n";
    }
  for_contents (vector<sstring>, v, i)
    {
      new_opt (*i);
      int_opts[*i] = &var;
    }
}

void Opts_list::add(const char*opt,double&var,const char*desc, bool show_default)
{
  sstring tmp (opt);
  vector<sstring> v = tmp.split();
  if (desc)
    {
      options_help_text << "-" << sstring::join (v,",-") << " <real>\t" << desc;
      if (show_default)
	{
	  char buf[100];
	  sprintf (buf, "%g", var);
	  options_help_text << " (default is " << buf << ")";
	}
      options_help_text << "\n";
    }
  for_contents (vector<sstring>, v, i)
    {
      new_opt (*i);
      double_opts[*i] = &var;
    }
}

void Opts_list::add (const char* opt, const char* alias, const char* desc, bool show_alias)
{
  sstring tmp (opt);
  vector<sstring> v = tmp.split();
  const sstring alias_str (alias);
  if (desc)
    {
      options_help_text << '-' << sstring::join (v,",-") << '\t' << desc;
      if (show_alias)
	options_help_text << " (same as '" << alias << "')";
      options_help_text << '\n';
    }
  for_contents (vector<sstring>, v, i)
    {
      new_opt (*i);
      alias_opts[*i] = alias_str;
    }
}

void Opts_list::add(const char*opt,Option_handler callback,const char*desc)
{
  sstring tmp (opt);
  vector<sstring> v = tmp.split();
  if (desc)
    options_help_text << "-" << sstring::join (v,",-") << desc << "\n";
  for_contents (vector<sstring>, v, i)
    {
      new_opt (*i);
      callback_opts[*i] = callback;
    }
}

void Opts_list::add(const char*opt,sstring&var,const char*desc, bool show_default)
{
  sstring tmp (opt);
  vector<sstring> v = tmp.split();
  if (desc)
    {
      options_help_text << "-" << sstring::join (v,",-") << " <string>\t" << desc;
      if (show_default) options_help_text << " (default is \"" << var << "\")";
      options_help_text << "\n";
    }
  for_contents (vector<sstring>, v, i)
    {
      new_opt (*i);
      string_opts[*i] = &var;
    }
}

bool Opts_list::parse()
{
  args.clear();
  while (more_args())
    {
      sstring opt = next_string();

      if (opt[0] != '-')
	args.push_back (opt);
      else
	{
	  opt.erase (opt.begin());
	  opt.to_lower();

	  const Parse_status stat = parse_opt (opt);
	  if (stat == PARSE_OK || stat == PARSE_NOT_OK)
	    return stat == PARSE_OK;

	  else if (bool_opts.find(opt) != bool_opts.end())
	    *bool_opts[opt] = 1;
	  
	  else if (bool_no_opts.find(opt) != bool_no_opts.end())
	      *bool_no_opts[opt] = 0;
	  
	  else if (int_opts.find(opt) != int_opts.end())
	    *int_opts[opt] = next_int();
	  
	  else if (double_opts.find(opt) != double_opts.end())
	    *double_opts[opt] = next_double();
	  
	  else if (string_opts.find(opt) != string_opts.end())
	    *string_opts[opt] = next_string();
	  
	  else if (alias_opts.find(opt) != alias_opts.end())
	    {
	      const vector<sstring> alias_opts_vec = alias_opts[opt].split();
	      alias_args.insert (alias_args.begin(), alias_opts_vec.rbegin(), alias_opts_vec.rend());
	    }
	  
	  else if (callback_opts.find(opt) != callback_opts.end())
	    {
	      if (!(*callback_opts[opt]) (this))
		return 0;
	    }
	  
	  else
	    {
	      THROW Syntax_exception (*this, "unknown option: -", opt.c_str());
	      return 0;
	    }
	}
    }

  if (expect_args >= 0 && (int) args.size() != expect_args)
    THROWEXPR ("Expected " << expect_args << " arguments, got " << args.size());

  //  cerr << "Parsed command line: ";
  //  for (int i = 0; i < init_argc; i++) cerr << init_argv[i] << (i < init_argc - 1 ? " " : "\n");

  bool parsed_ok = 1;
  for_contents (vector<Option_handler>, post_parse_callback, callback) parsed_ok &= (*callback) (this);
  
  return parsed_ok;
}

void Opts_list::parse_or_die()
{
  try
    {
      if (!parse()) { cout << short_help(); exit(1); }
    }
  catch (const exception& e)
    {
      cerr << short_help();
      cerr << e.what();
      exit(1);
    }
}

Opts_list::Parse_status Opts_list::parse_opt (const sstring& opt)
{
  return UNPARSED;
}
