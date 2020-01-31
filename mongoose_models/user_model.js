
/********************
 * Import *
 ********************/

const mongoose = require('mongoose');

/********************
 * Setup *
 ********************/

const Schema = mongoose.Schema;

// what the user table looks like
const userSchema = new Schema({
    username: {type: String, default: null},
    googleDisplayName: String,
    googleId: String
});

const User = mongoose.model('user', userSchema);

module.exports = User;