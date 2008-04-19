<?php
	$jsonp = false;
	$result = "";

	if ($_REQUEST["testCallbackParam"]){
		$jsonp=true;
		$result .= $_REQUEST['testCallbackParam'] . "('";
	}

	if (!$_REQUEST["message"]){
		$result .= "ERROR: message property not found";
	}

	$result .= $_REQUEST["message"];

	if ($jsonp) {
		$result .= "');";
	}

	print $result;


?>
