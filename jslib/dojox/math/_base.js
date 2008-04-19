if(!dojo._hasResource["dojox.math._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.math._base"] = true;
dojo.provide("dojox.math._base");

dojo.mixin(dojox.math, {
	degreesToRadians: function(/* Number */n){
		//	summary
		//	Convert the passed number to radians.
		return (n*Math.PI)/180;	// Number
	},
	radiansToDegrees: function(/* Number */n){
		//	summary
		//	Convert the passed number to degrees.
		return (n*180)/Math.PI;	//	Number
	},

	factoral: function(/* Number */n){
		//	summary
		//	Return the factoral of n.
		if(n<1){ 
			return 0;	// Number
		}
		var ret=1;
		for(var i=1; i<=n; i++){
			ret*=i;
		}
		return ret;	// Number
	},
	permutations: function(/* Number */n, /* Number */k){
		//	summary
		//	TODO
		if(n==0 || k==0){ 
			return 1; 	// Number
		}
		return (this.factoral(n)/this.factoral(n-k));
	},
	combinations: function(/* Number */n, /* Number */r){
		//	summary
		//	TODO
		if(n==0 || r==0){ 
			return 1; 	//	Number
		}
		return (this.factoral(n)/(this.factoral(n-r)*this.factoral(r)));	// Number
	},
	bernstein: function(/* Number */t, /* Number */n, /* Number */ i){
		//	summary
		//	TODO
		return (this.combinations(n, i)*Math.pow(t, i)*Math.pow(1-t, n-i));	//	Number
	},
	gaussian: function(){
		//	summary
		//	Return a random number based on the Gaussian algo.
		var k=2;
		do{
			var i=2*Math.random()-1;
			var j=2*Math.random()-1;
			k = i*i+j*j;
		}while(k>=1);
		return (i * Math.sqrt((-2*Math.log(k))/k));	//	Number
	},

	//	basic statistics
	sd: function(/* Array */a){
		//	summary
		//	Returns the standard deviation of the passed arguments.
		return Math.sqrt(this.variance(a));	//	Number
	},
	variance: function(/* Array */a){
		//	summary
		//	Find the variance in the passed array of numbers.
		var mean=0, squares=0;
		dojo.forEach(a, function(item){
			mean+=item;
			squares+=Math.pow(item,2);
		});
		return (squares/a.length)-Math.pow(mean/a.length, 2);	//	Number
	},

	//	create a range of numbers
	range: function(/* Number */a, /* Number? */b, /* Number? */step){
		//	summary
		//	Create a range of numbers based on the parameters.
		if(arguments.length<2){
			b=a,a=0;
		}
		var s=step||1;
		var range=[];
		if(s>0){
			for(var i=a; i<b; i+=s){
				range.push(i);
			}
		}else{
			if(s<0){
				for(var i=a; i>b; i+=s){
					range.push(i);
				}
			}else{
				throw new Error("dojox.math.range: step must not be zero.");
			}
		}
		return range; 	// Array
	},
	distance: function(/* Array */a, /* Array */b){
		//	summary
		//	Calculate the distance between point A and point B
		return Math.sqrt(Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2));	//	Number
	},
	midpoint: function(/* Array */a, /* Array */b){
		//	summary
		//	Calculate the midpoint between points A and B.  A and B may be multidimensional.
		if(a.length!=b.length){
			console.error("dojox.math.midpoint: Points A and B are not the same dimensionally.", a, b);
		}
		var m=[];
		for(var i=0; i<a.length; i++){
			m[i]=(a[i]+b[i])/2;
		}
		return m;	//	Array
	}
});

}
