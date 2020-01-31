/* jshint esversion: 6 */

/************************
 * Import *
 ************************/

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

// Routes
const authRoutes = require('./routes/auth_routes');

// Run google strategy
const passportSetup = require('./config/passport_setup');

// mongo database
const mongoose = require('mongoose');
const keys = require('./config/keys');
const Users = require('./mongoose_models/user_model');
const Matches = require('./mongoose_models/match_model');

// cookies session
const cookieSession = require('cookie-session');
const passport = require('passport');

/****************
 * Set up Server *
 ****************/
// app
const app = express();
const PORT = 3000;
let server = http.createServer(app);

const io = require('socket.io').listen(server);

let GameServer = require('./server/GameServer.js');
/************************
 * Set up *
 ************************/
app.use(bodyParser.json());

app.use(express.static('client_side'));

// The code below is from
// https://jaketrent.com/post/https-redirect-node-heroku/
if(process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https')
        res.redirect(`https://${req.header('host')}${req.url}`);
      else
        next();
    });
}

// cookie session
app.use(cookieSession({
    maxAge: 24* 60 * 60 * 1000,
    keys: [keys.session.cookieKey] // to encript our cookie
}));

// initialize passport
app.use(passport.initialize());
app.use(passport.session());  // user the passport session to control login

// set up Routes
app.use('/auth', authRoutes);

// connect to mongodb
mongoose.connect(keys.mongodb.dbURI, { useNewUrlParser: true }, function() {
    console.log("Connected to mongodb");
});

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});


/****************
 * Commands *
 ****************/

app.get('/api/auth/currentUser/', function (req, res, next) {
    if (!req.user) return res.json(null);
    else return res.json({username: req.user.username, databaseId: req.user._id});
});


// Most socket and instance code taken from https://www.codementor.io/codementorteam/socketio-player-matchmaking-system-pdxz4apty
// GitHub repo of code: https://github.com/Frankenmint/mmserver

/******************
 * Set up sockets *
 ******************/
let playersOnline = {}; // this can be set up here? just not sure of concurrency issues

// wait for a connection, if connection is made
// excute the function.
// essentially the server, the io listens for any connection requests from a client/user
// if so, server establishes a concurrent connection, and based on what socket request
// we handle it here
io.on('connection', function(socket) {
    console.log("made socket connection", socket.id);

    // add to players online
    playersOnline[socket.id] = {
        playerId: socket.id
    }

    socket.on('disconnect', function () {
        console.log('user disconnected');
        delete playersOnline[socket.id];
        io.emit('disconnect', socket.id);
    });
    /*Lobby socket functions */

    socket.on("setup userId and username", function(data) {
        socket.userId = data.userId;
        socket.username = data.username;
    });

    socket.on('new player signup', function(data) {
        // data = {newUsername}
        let newUsername = data.newUsername;
        // check if the username is valid
        Users.findOne({
            "username": newUsername
        }, function(err, result) {
            if(err) {
                socket.emit("ErrorEvent", err);

            } else {
                // if the result is not found the accept the new username
                if(!result) {
                    Users.updateOne({
                        _id: socket.userId
                    }, {
                        $set: {username: newUsername}
                    }, function(err, res) {
                        if(err) socket.emit("ErrorEvent", err);
                        else {
                            // notify the new username is accepted
                            socket.username = newUsername;
                            socket.emit('new player signup', "accepted");
                        }
                    });

                // someone else is already using the given username
                // then reject the given username
                } else {
                    socket.emit('new player signup', "rejected");
                }
            }
        });
    });

    GameServer.initServer(io, socket);
});

/****************
 * Start Server *
 ****************/

server.listen(process.env.PORT || PORT, function (err) {
    if (err) console.log(err);
});

/***************
 * Export
 ***************/

module.exports.io = io;
module.exports.server = server;