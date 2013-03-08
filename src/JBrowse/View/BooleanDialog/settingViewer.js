define( [
			'dojo/_base/declare'
		],
		function( declare ) {

return declare( null, {

	constructor: function (args) {
		this.can = dojo.create('canvas', { height: 130, width: 400 } );
	},

	drawOR: function() {
		var canvas = this.can;
		var c = canvas.getContext('2d');
		var height = canvas.height;
		var width = canvas.width;

		c.clearRect( 0 , 0 , width , height );

		c.globalAlpha = 1;
		c.fillStyle = 'black';
		c.font = '12px Arial';
		c.fillText('display', 10, 3*height/16 - 3 );
		c.fillText('mask', 10, 7*height/16 - 3 );
		c.fillText('inverse mask', 10, 11*height/16 - 3 );
		c.fillText('result', 10, 15*height/16 - 3 );
		c.fillStyle = '#DCDCDC';
		c.fillRect( 100, 0, 1, height );
		c.fillRect( 0, 0, 1, height );
		c.fillRect( width-1, 0, 1, height );
		c.fillRect( 0, 0, width, 1 );
		c.fillRect( 0, height-1, width, 1 );
		// draw "display"
		c.fillStyle = 'tomato';
		c.fillRect( 130, height/16+2, 80, 5 );
		c.fillRect( 200, height/16+8, 40, 5 );
		c.fillRect( 290, height/16+2, 80, 5 );
		// draw "mask"
		c.fillStyle = 'MediumSlateBlue';
		c.fillRect( 110, 5*height/16+4, 40, 5 );
		c.fillRect( 230, 5*height/16+4, 80, 5 );
		c.fillRect( 350, 5*height/16+4, 10, 5 );
		// draw "inverse mask"
		c.fillStyle = 'Chartreuse';
		c.fillRect( 140, 10*height/16-3, 40, 5 );
		c.fillRect( 275, 10*height/16-3, 45, 5 );
		// draw "result"
		c.fillStyle = 'tomato';
		c.fillRect( 150, 15*height/16-16, 30, 5 );
		c.fillRect( 310, 15*height/16-16, 10, 5 );
		c.globalAlpha = 0.2;
		c.fillRect( 130, 15*height/16-16, 20, 5 );
		c.fillRect( 180, 15*height/16-16, 30, 5 );
		c.fillRect( 200, 15*height/16-10, 40, 5 );
		c.fillRect( 290, 15*height/16-16, 20, 5 );
		c.fillRect( 320, 15*height/16-16, 50, 5 );
	},

	drawAND: function() {
		var canvas = this.can;
		var c = canvas.getContext('2d');
		var height = canvas.height;
		var width = canvas.width;

		c.clearRect( 0 , 0 , width , height );

		c.globalAlpha = 1;
		c.fillStyle = 'black';
		c.font = '12px Arial';
		c.fillText('display', 10, 3*height/16 - 3 );
		c.fillText('mask', 10, 7*height/16 - 3 );
		c.fillText('inverse mask', 10, 11*height/16 - 3 );
		c.fillText('result', 10, 15*height/16 - 3 );
		c.fillStyle = '#DCDCDC';
		c.fillRect( 100, 0, 1, height );
		c.fillRect( 0, 0, 1, height );
		c.fillRect( width-1, 0, 1, height );
		c.fillRect( 0, 0, width, 1 );
		c.fillRect( 0, height-1, width, 1 );
		// draw "display"
		c.fillStyle = 'tomato';
		c.fillRect( 130, height/16+2, 80, 5 );
		c.fillRect( 200, height/16+8, 40, 5 );
		c.fillRect( 290, height/16+2, 80, 5 );
		// draw "mask"
		c.fillStyle = 'MediumSlateBlue';
		c.fillRect( 110, 5*height/16+4, 40, 5 );
		c.fillRect( 230, 5*height/16+4, 80, 5 );
		c.fillRect( 350, 5*height/16+4, 10, 5 );
		// draw "inverse mask"
		c.fillStyle = 'Chartreuse';
		c.fillRect( 140, 10*height/16-3, 40, 5 );
		c.fillRect( 275, 10*height/16-3, 45, 5 );
		// draw "result"
		c.fillStyle = 'tomato';
		c.fillRect( 140, 15*height/16-16, 70, 5 );
		c.fillRect( 200, 15*height/16-10, 30, 5 );
		c.fillRect( 290, 15*height/16-16, 60, 5 );
		c.fillRect( 360, 15*height/16-16, 10, 5 );
		c.globalAlpha = 0.2;
		c.fillRect( 130, 15*height/16-16, 80, 5 );
		c.fillRect( 200, 15*height/16-10, 40, 5 );
		c.fillRect( 290, 15*height/16-16, 80, 5 );
	}

	
})
})