/**
 * Inspired by BlocksManager
 */

let SparseMap = require('./SparseMap.js').SparseMap;

// Keeps track of the dynamic position of a unit, as movement is not based, The value to store in sparse map will be the id of the unit
// While not important for now, there is potential use for it later once multiple classes are needed
class UnitsManager {
    constructor() {
        this.units = new SparseMap();
    }
}

// Batch load for potential future use
UnitsManager.prototype.populateUnits = function(unitsList) {
    if(!onServer) return;
    this.units.fromList(unitsList);
}

UnitsManager.prototype.listBlocks = function(){ // returns a list of all the units
    return this.units.toList();
};

UnitsManager.prototype.moveUnit = function(unit, end) {
    this.removeUnitFromSparseMap(unit.x, unit.y);
    this.insertUnitIntoSparseMap(end.x, end.y, unit.id);
}
UnitsManager.prototype.insertUnitIntoSparseMap = function(x,y,unitId){
    this.units.add(x,y,unitId);
};

UnitsManager.prototype.removeUnitFromSparseMap = function(x,y){
    this.units.delete(x,y);
};

// returns true if there is a unit on the given cell
UnitsManager.prototype.isUnitAt = function(x,y){  // x and y in cell coordinates, not px
    return (this.units.get(x,y) !== null); // a SparseMap returns null when nothing found at given coordinates
};

//Called only after isUnitAt is true
UnitsManager.prototype.unitValueAt = function(x, y) {
    return this.units.get(x,y);
};

// Returns true if there is at least one unit on one of the cells of the provided list
UnitsManager.prototype.isUnitAtList = function(list){  // list of cells to check
    for(let i = 0; i < list.length; i++){
        if(this.isUnitAt(list[i].x,list[i].y)) return true;
    }
    return false;
};

module.exports = UnitsManager;