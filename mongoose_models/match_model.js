
/********************
 * Import *
 ********************/

const mongoose = require('mongoose');

/********************
 * Setup *
 ********************/

const Schema = mongoose.Schema;

// what the match table looks like
const matchSchema = new Schema({
    players: {
        type: [{
            playerId: {
                type: String,
                required: true
            }, username: {
                type: String,
                required: true
            }, readyToPlay: {
                type: Boolean, 
                default: false, 
                required: true}}], 
        required: true },
    numberOfPlayer: {type: Number, default: 1} 
});

const Matches = mongoose.model('match', matchSchema);

module.exports = Matches;