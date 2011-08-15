var conf = {
    // popUpUrl can be an html file or a cgi script that produces html links
    'popUpUrl' : 'popup.html',
    // if a flag isn't present then it defaults to false
    //Current available flags:
    //     facetedOff = controls the creation of the Find Tracks tab
    //     trackCustomizationOff = removes track customization from the popup and sets trackCustomizationHidden to true
    //     trackCustomizationHidden = hides the Customization tab label from the left of the page
    //     elasticZoomsOff = sets both elasticZoomTopOff and elasticZoomMainOff to true
    //     elasticZoomTopOff = deactivates the elastic drag zoom over the overview area, will override elasticZoomsOff
    //     elasticZoomMainOff = deactivates the elastic drag zoom for the display area, will override elasticZoomsOff
    'flags': {
       'trackCustomizationHidden': true
    }
}
