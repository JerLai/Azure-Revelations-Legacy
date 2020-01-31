
/*********************
 * Import *
 *********************/

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const keys = require('./keys');
const User = require('../mongoose_models/user_model');

/*********************
 * Set up *
 *********************/

// find the id of the user and pass it to the next stage
// which is the browser
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

// when the browser sent us the id of the user
// change it back to a user and pass it to the next
// stage
passport.deserializeUser(function(id, done) {
    User.findById(id).then(function(user) {
        done(null, user);
    });
});

passport.use(
    new GoogleStrategy({
        clientID: keys.google.clientID,
        clientSecret: keys.google.clientSecret,
        callbackURL: '/auth/google/redirect'
    
    }, function(accessToken, refreshToken, profile, done) {
        // check if user already exist in database
        User.findOne({
            googleId: profile.id
        }).then(function(oldUser) {
            if(oldUser) {
                // user found
                done(null, oldUser);
            } else {
                new User({
                    username: null,  // this is the default placeholder
                    googleDisplayName: profile.displayName,
                    googleId: profile.id
                
                // saving takes time
                }).save().then(function(newUser) {
                    done(null, newUser);
                })
            }
        });
    })
)