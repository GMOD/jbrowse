define( ['dojo/_base/declare',
         'dojo/_base/array',
         'dojox/form/uploader/FileList'
        ],
        function( declare, array, FileList ) {

return declare( FileList,

{
    _onUploaderChange: function(fileArray){
        var seenFile = {};
        this._files = array.filter( ( this._files || [] ).concat( fileArray ).reverse(), function( file ) {
            var key = file.name;
            if( seenFile[key] ) {
                return false;
            }
            seenFile[key] = true;
            return true;
        }).reverse();

	this.reset();
	array.forEach( this._files, function(f, i){
			  this._addRow(i+1, this.getFileType(f.name), f.name, f.size);
		      }, this);
    },

    getFiles: function() {
        return this._files || [];
    }
});
});