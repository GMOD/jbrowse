define([
           'dojo/_base/declare',

           './ContinuousLinear',
           './_CanonicalZoomLevelsMixin'
       ],
       function(
           declare,

           LinearProjection,
           _CanonicalZoomLevelsMixin
       ) {

return declare(
    'JBrowse.Projection.CanonicalContinuousLinear',
    [ LinearProjection, _CanonicalZoomLevelsMixin ],
    {}
);
});