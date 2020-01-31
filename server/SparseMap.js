/**
 * Take from https://github.com/Jerenaux/ensemble/blob/master/game/js/shared/SpaceMap.js
 * Created by Jerome on 23-04-17
 */
var onServer = (typeof window === 'undefined'); // Checks to see if the window object exists

// A space map is a custom data struture, similar to a sparse 2D array. Entities are stored according to their coordinates;
// that is, two keys are needed to fetch entities, the x position and the y position. This allows fast look-up based on position,
// e.g. var objectAtSomePosition = mySpaceMap.get(x,y);
// calling it a sparse map in recognition of what it is similar to
function SparseMap(){}

SparseMap.prototype.add = function(x,y,object){
    if(!this.hasOwnProperty(x))this[x] = {};
    if(!this[x].hasOwnProperty(y))this[x][y] = [];
    this[x][y] = object; // replaces any existing object
};

SparseMap.prototype.get = function(x,y){
    if(!this.hasOwnProperty(x)) return null;
    if(!this[x].hasOwnProperty(y)) return null;
    return this[x][y];
};

SparseMap.prototype.delete = function(x,y){
    if(!this.hasOwnProperty(x)) return;
    if(!this[x].hasOwnProperty(y)) return;
    delete this[x][y];
    if(Object.keys(this[x]).length == 0) delete this[x];
};

SparseMap.prototype.toList = function(){ // serialize to a list representation
    var list = [];
    for(x in this){
        if(this.hasOwnProperty(x)){
            for(y in this[x]){
                if(this[x].hasOwnProperty(y)) list.push({
                    x: x,
                    y: y,
                    v: this[x][y]
                });
            }
        }
    }
    return list;
};

// Modified to have it take the object's id, not value, synonymous
SparseMap.prototype.fromList = function(list) { // unserialize from list representation
    for(var i = 0; i < list.length; i++){
        var item = list[i];
        this.add(item.x,item.y,(item.id || {}));
    }
};

if (onServer) module.exports.SparseMap = SparseMap;