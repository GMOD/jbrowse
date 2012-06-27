#!/usr/bin/env perl -w

use TiledImage;

# create a new image
my $im = new TiledImage('-width'=>100,'-height'=>100);
$im->verbose(2);

# allocate some colors
my $white = $im->colorAllocate(255,255,255);
my $black = $im->colorAllocate(0,0,0);
my $red = $im->colorAllocate(255,0,0);
my $blue = $im->colorAllocate(0,0,255);

# make the background transparent and interlaced
$im->transparent($white);
$im->interlaced('true');

# Put a black frame around the picture
$im->rectangle(0,0,99,99,$black);

# Draw a blue oval
$im->arc(50,50,95,75,0,360,$blue);

# Can't fill it with red, since fill doesn't work if started offscreen
# $im->fill(50,50,$red);

# draw a polygon
my $poly = GD::Polygon->new;
$poly->addPt(15,15);
$poly->addPt(85,15);
$poly->addPt(50,85);
$im->filledPolygon ($poly, $red);

# draw strings
$im->string(GD::gdLargeFont, 10, 10, "hi world", $blue);

# stringFT doesn't seem to work (TrueType installed?)
# $im->stringFT($blue,"Times",9,0,10,10,"hello world");

# save one big tile
#open TILE, ">BIGTILE.png";
#print TILE $im->png;
#close TILE;
#exit;

# create a dummy brush image & call setBrush() & copy() to test image storage
my $dummyBrush = new GD::Image (20,20);
my $white2 = $dummyBrush->colorAllocate(255,255,255);
my $black2 = $dummyBrush->colorAllocate(0,0,0);
my $red2 = $dummyBrush->colorAllocate(255,0,0);
my $blue2 = $dummyBrush->colorAllocate(0,0,255);
$dummyBrush->transparent($white2);
$dummyBrush->interlaced('true');
$dummyBrush->filledRectangle(4,4,16,16,$black2);
$dummyBrush->arc(10,10,8,8,0,360,$blue2);

$im->setBrush ($dummyBrush);
$im->line (40, 30, 90, 80, GD::gdBrushed);   # libgd bug: lines are clipped
$im->copy ($dummyBrush, 75, 40, 0, 0, 20, 20);

# render and save four tiles
my ($tileWidth, $tileHeight) = (50, 50);
for ($x = 0; $x < $im->width; $x += $tileWidth) {
    for ($y = 0; $y < $im->height; $y += $tileHeight) {

	my $tile = $im->renderTile ($x, $y, $tileWidth, $tileHeight);
	my $file = "TILE.$x.$y.png";
	open TILE, ">$file" or die "Couldn't write $file: $!";
	print TILE $tile->png;
	close TILE or die "Couldn't close $file: $!";
	warn "Wrote tile to $file";
    }
}
