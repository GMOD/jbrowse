JBrowse Events
==============

There are two layers of events, ''internal'' ones used by JBrowse
plugins and components to communicate among themselves, and
''external'' ones used by other software to communicate with JBrowse.

    external  <->  controller  <->  views

External
---------

### Commands

    /jbrowse/v1/cmd/*

### Notifications

    /jbrowse/v1/notify/*

Internal
---------

Internal events are named for where they originate.

`/jbrowse/v1/v`: messages from views, mostly notifying other components
of what logical commands the user is issuing through her actions with
the view.

`/jbrowse/v1/c`: messages from controllers, such as requests to turn
on certain tracks, highlight certain features, and so forth.



