<?php
	$fn = preg_replace("/\W/","",$_REQUEST["location"]);	
	switch ($_SERVER["REQUEST_METHOD"]) {
		case "GET" : 
			$fh = fopen($fn, 'r');
			print(fread($fh, filesize($fn)));
			break;
		case "PUT" : 
			$fh = fopen($fn, 'w');
			$contents = file_get_contents('php://input');
			print($contents);
			fwrite($fh, $contents);
			break;
		case "POST" : 
			$fh = fopen($fn, "a+");
			fwrite($fh, file_get_contents('php://input'));
			break;
		case "DELETE" : 
			$fh = fopen($fn, 'w');
			fwrite($fh, "deleted");
			break;
	}
	fclose($fh);
?>
