define( ['dojo/_base/declare',
         'dojo/_base/array',
         'dojox/form/uploader/FileList'
        ],
        function( declare, array, FileList ) {

return declare( FileList,

{
    _onUploaderChange: function(fileArray){
        var seenFile = {};
        var allFiles = [].concat( this._files||[] );
        array.forEach( this.uploader._files, function(f) {
            allFiles.unshift( f );
        });
        this._files = array.filter( allFiles, function( file ) {
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

        this.onChange();
    },

    getFiles: function() {
        return array.map( this._files || [], function(f) {
          return { file: f,
                   type: (this.getFileType(f.name)||'').toLowerCase()
                 };
        },this);
    },

    // change event stub
    onChange: function() {}

});
});