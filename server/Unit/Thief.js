let Unit = require("./Unit.js").Unit;

class Thief extends Unit {
    constructor(unitClass, display, x, y) {
        super(unitClass, display, x, y, 8/*initEnergy*/,
            85/*accuracy*/, 20/*dodgeChance*/, 30/*critChance*/, 
            5/*parryChance*/, 70/*hp*/, 15/*atk*/, 5/*def*/);
    }
}
module.exports.Thief = Thief;