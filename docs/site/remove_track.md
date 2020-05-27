---
id: remove-track.pl
title: remove-track.pl
---

The remove track script operates on trackList.json files

    NAME
    	remove-track.pl - remove a formatted track from a JBrowse data directory

    USAGE
    	  remove-track.pl --trackLabel MyTrackLabel --dir path/to/data/dir

    DESCRIPTION
    	Removes a track from a JBrowse data directory. By default, only removes
    	the track configuration entry so that JBrowse will not display the track.
    	If the "--delete" option is passed, also removes the track data. By
    	default, this tool prints the track configuration JSON that it removed.
    	This can be turned of by passing the "--quiet" option.

    OPTIONS
    	--dir path/to/data/dir
    		Path to the JBrowse data directory to operate on.

    	--trackLabel MyLabel
    		Track label(s) to delete. This option may be specified multiple times
    		to delete multiple tracks.

    	--delete, -D
    		In addition to removing the track configuration so that JBrowse will
    		not display the track, delete the track data as well. Be careful!

    	-h, --help, -?
    		Display an extended help message.

    	-q, --quiet
    		Do not print any progress messages.
