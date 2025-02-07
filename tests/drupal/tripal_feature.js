;(function ($) {
  Drupal.behaviors.tripal_featureBehavior = {
    attach: function (context, settings) {
      // the following function is used when viewing sequence alignments
      // on the feature page. When mousing over the feature type legend
      // it should highlight regions in the sequence
      $('.tripal_feature-legend-item').bind('mouseover', function () {
        var classes = $(this).attr('class').split(' ')
        var type_class = classes[1]

        $('.' + type_class).css('border', '1px solid red')
        $(this).bind('mouseout', function () {
          $('.' + type_class).css('border', '0px')
        })
      })
    },
  }
})(jQuery)
