GRANT ALL ON gdtile.* TO ''@'localhost';
CREATE DATABASE gdtile;
USE gdtile;

CREATE TABLE tiledimage (
	tiledimage_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	tiledimage_name TEXT,
	width INT UNSIGNED,
	height INT UNSIGNED,
	PRIMARY KEY (tiledimage_id)
);

CREATE TABLE primitive (
	tiledimage_id INT UNSIGNED,
	command_order INT UNSIGNED NOT NULL,
	command TEXT,
	x0 INT UNSIGNED NOT NULL,
	y0 INT UNSIGNED NOT NULL,
	x1 INT UNSIGNED NOT NULL,
	y1 INT UNSIGNED NOT NULL,
	PRIMARY KEY (tiledimage_id, command_order)
);
CREATE INDEX primitive_track_bbox ON primitive (tiledimage_id,x0,x1,y0,y1);

CREATE TABLE global_primitive (
	tiledimage_id INT UNSIGNED,
	command_order INT UNSIGNED NOT NULL,
	command TEXT,
	PRIMARY KEY (tiledimage_id, command_order)
);
CREATE INDEX global_primitive_track ON global_primitive (tiledimage_id);

CREATE TABLE image (
	image_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	image_data BLOB,
	PRIMARY KEY (image_id)
);

SHOW tables;
DESCRIBE tiledimage;
DESCRIBE primitive;
DESCRIBE global_primitive;
DESCRIBE image;
