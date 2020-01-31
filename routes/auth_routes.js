/* jshint esversion: 6 */

/************************
 * Import *
 ************************/

const router = require('express').Router();
const passport = require('passport');

/************************
 * Set up *
 ************************/

// no need the 'auth' that is going to be in app.js
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

// no need the 'auth' that is going to be in app.js
router.get('/login', function(req, res) {
    res.redirect('/login.html');
});

router.get('/google', passport.authenticate('google', {
    // scope is what u want to retrieve
    scope: ['profile']
}));

// callback for google to redirect
// take the google code with profile info
router.get('/google/redirect', passport.authenticate('google'), function(req, res) {
    res.redirect('/');
});

module.exports = router;