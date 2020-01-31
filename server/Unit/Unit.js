/**
 * Constructor for the Base Unit Class
 * @param {*} unitClass unit class type, magic, ranged, melee, future implementation
 * @param {*} display the front display of the unit
 * @param {*} x x coordinate in tile position
 * @param {*} y y coordinate in tile position
 */
class Unit {
    constructor(unitClass, display, x, y, initEnergy,
        accuracy, dodgeChance, critChance, parryChance, hp, atk, def) {
        this.id = (Math.random()+1).toString(36).slice(2, 18);
        this.unitClass = unitClass;
        this.display = display;
        this.x = x;
        this.y = y;
        this.hasAttacked = false;
        this.initEnergy = initEnergy;  // in tile units
        this.currentEnergy = initEnergy;
        this.accuracy = accuracy; // chance to successfully land a hit
        this.dodgeChance = dodgeChance; // chance to successfully dodge a hit
        this.critChance = critChance; // chance to crit (x1.5 damage rounded down)
        this.parryChance = parryChance // chance to parry (x1.5 def rounded down)
        this.hp = hp;
        this.atk = atk;
        this.def = def;
    }


}


Unit.prototype.resetValues = function() {
    this.currentEnergy = this.initEnergy;
    this.hasAttacked = false;
}

Unit.prototype.moveTo = function(x, y) {
    if (this.currentEnergy > 0) {
        this.currentEnergy--;
    }
    this.x = x;
    this.y = y;
}
Unit.prototype.getNutshell = function() {
    return {id: this.id, x: this.x, y:this.y, energy: this.currentEnergy};
}


Unit.prototype.receiveDamage = function(dmg) {
    if (dmg > this.hp) {
        this.hp = 0;
    } else {
        this.hp -=dmg;
    }
}

Unit.prototype.attacked = function() {
    this.hasAttacked = true;
}

Unit.prototype.getBattleStats = function() {
    return {atk: this.atk, def: this.def, acc: this.accuracy, dodge: this.dodgeChance, crit: this.critChance, parry: this.parryChance};
}
module.exports.Unit = Unit;