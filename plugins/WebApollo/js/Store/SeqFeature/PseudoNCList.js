/**
*   notes on PseudoNCList needed for porting Trellis data loading to jbrowse_1.7 branch
*   mostly need to override ID assignment based on position in NCList, 
*      and replace with unique IDs already present in feature arrays
*
*  inherit from jbrowse Store/NCList, but override:

_decorate_feature: function(accessors, feature, id, parent)  {
       feature.get = accessors.get;
       if (config.uniqueIdField)  {
           otherid = feature.get(uniqueIdField)
       }
       var uid;
       if (otherid)  { uid = otherid; }
       else  { uid = id; }
       this.inherited( accessors, feature, uid, parent );
}


*/


