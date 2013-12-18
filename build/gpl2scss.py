import argparse, os, re

parser = argparse.ArgumentParser()
parser.add_argument('in_file', type=file)
parser.add_argument('out_file')
args = parser.parse_args()
in_path = os.path.abspath(args.in_file.name)
out_path = os.path.abspath(args.out_file)

#                              num     num     num    name
colour_match = re.compile('\s*(\d*)\s*(\d*)\s*(\d*)\s+(.*)')

f = open(in_path, 'r')
gpl_file = f.read().split('\n')

scss = ''
for line in gpl_file:
    colour = colour_match.match(line)
    if colour:
        R = colour.group(1)
        G = colour.group(2)
        B = colour.group(3)
        RGB_name = re.sub('[\W]+', '_', colour.group(4))
        scss += '$'+RGB_name+': rgb('+R+','+G+','+B+');\n'

f_out = open(out_path, 'w')
f_out.write(scss)

print "wrote scss to "+out_path
