define([
			'dojo/_base/declare'
		],
		function(declare) {

			return declare(null, {
				constructor: function(args) {
					this.Value = args.Value;
					if(args.leftChild) this.leftChild = args.leftChild;
					if(args.rightChild) this.rightChild = args.rightChild;
					this.leaf = args.leaf || false;
				},

				addLeft: function(child) {
					if(!this.leaf && this.leftChild === undefined) {
						this.leftChild = child;
						return true;
					}
					return false;
				},

				addRight: function(child) {
					if(!this.leaf && this.rightChild === undefined) {
						this.rightChild = child;
						return true;
					}
					return false;
				},

				add: function(child) {
					var added = this.addLeft(child) || this.addRight(child);
					return added;
				},

				isLeaf: function() {
					return this.leaf || (this.leftChild === undefined && this.rightChild === undefined);
				},

				get: function() {
					return this.Value;
				},

				set: function(value) {
					this.Value = value;
				},

				left: function() {
					return this.leftChild;
				},

				right: function() {
					return this.rightChild;
				},

				hasLeft: function() {
					return !(this.leftChild === undefined);
				},

				hasRight: function() {
					return !(this.rightChild === undefined);
				},

				removeLeft: function() {
					this.leftChild = undefined;
				},

				removeRight: function() {
					this.rightChild = undefined;
				},

				removeAll: function() {
					this.removeLeft();
					this.removeRight();
				},

				destroy: function() {
					if(this.leftChild) {
						leftChild.destroy();
						this.removeLeft();
					}
					if(this.rightChild) {
						rightChild.destroy();
						this.removeRight;
					}
					this.Value = undefined;
				},

				getLeaves: function() {
					if(this.isLeaf()) {
						var retArray = new Array();
						retArray[0] = this.Value;
						return retArray;
					} else if(this.leftChild === undefined)	return this.rightChild.getLeaves();
					else if(this.rightChild === undefined) return this.leftChild.getLeaves();
					
					return this.leftChild.getLeaves().concat(this.rightChild.getLeaves());
				}


			});


		});