let Unit = require("./Unit.js").Unit;

class Knight extends Unit {
    constructor(unitClass, display, x, y) {
        super(unitClass, display, x, y, 3,
            80/*accuracy*/, 3/*dodgeChance*/, 4/*critChance*/, 
            12/*parryChance*/, 100/*hp*/, 25/*atk*/, 10/*def*/);
    }
}
module.exports.Knight = Knight;