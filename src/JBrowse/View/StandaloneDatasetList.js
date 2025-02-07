define(['dojo/_base/declare', 'dijit/_WidgetBase'], function (
  declare,

  _WidgetBase,
) {
  return declare(_WidgetBase, {
    baseClass: 'jbrowseStandaloneDatasetSelector',

    buildRendering: function () {
      this.inherited(arguments)

      var bdy = this.domNode
      var h2 = bdy.appendChild(document.createElement('h2'))
      h2.innerHTML = 'Available Datasets'
      this.containerNode = bdy.appendChild(document.createElement('ul'))
      var datasets = this.get('datasets')
      var ul = bdy.appendChild(document.createElement('ul'))
      for (var spp in datasets) {
        if (!/^_/.test(spp)) {
          var sppData = datasets[spp]
          var li = document.createElement('li')
          var a = document.createElement('a')
          a.setAttribute('href', sppData.url)
          // eslint-disable-next-line xss/no-mixed-html
          a.innerHTML = dompurify.sanitize(sppData.name)
          li.appendChild(a)
          ul.appendChild(li)
        }
      }
    },
  })
})
