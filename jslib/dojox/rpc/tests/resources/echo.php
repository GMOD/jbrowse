<?php
	if (!$_REQUEST["message"]){
		print "ERROR: message property not found";
	}else{
		print $_REQUEST["message"];
	}
?>
