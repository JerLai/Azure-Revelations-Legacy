# Azure Revelations API Documentation

## Error Event
- Description: backend error event will be send to the frontend using
- Response: `ErrorEvent`
    - body: err

## Sign-in/Sign-up/Authorization

- Description: getting the username and userId for the current user
- Request: `GET /api/auth/currentUser/`
    - body: null
- Response: 200
    - body: object
        - username: the username of the user
        - databaseId: the id of the user


- Description: login using google auth
- Request: `GET /auth/goolge`
    - body: null
- Response: 200
    - redirect to `GET /auth/google/redirect`


- Description: logout using google auth
- Request: `GET /auth/logout`
    - body: null
- Response: 200
    - redirect to index page `/`


- Description: google redirect after successfuly loging in
- Request: `GET /auth/google/redirect`
    - body: null
- Response: 200
    - redirect to index page `/`


- Description: set the username of the current player
- Socket Request: `new player signup`
    - newUsername: the username the player like to use
- Socket Response: `new player signup`
    - status: the wether the new name is accepted or not

## Lobby/Match-making

- Description: set the username and userId for the player in the game
- Socket Request: `setup userId and username`
    - body: object
        - userId
        - username
- Socket Response: null

- Description: get the current room information, players and etc....
- Socket Request: `get match info`
    - matchId
    - toAllPlayer
- Socket Response: `match info`
    - body: object
        - players: player information in the room

- Description: current player is going to leave the current room
- Socket Request: `leaveMatch`
    - body: doCallback: true/false if you want to notify all players
- Socket Request: `otherLeftMatch`
    - body: null

- Description: player is setting the ready or not ready button
- Socket Request: `player change status`
    - body: object
        - matchId
        - newStatus: the player is ready or not

## Match Setup

- Description: get the colour that belong to the player from the server
- Socket Request: `get player colour`
    - body: object
        - matchId
- Socket Response: `player colour`
    - body: colour


- Description: get the map information; collidable blocks, map size etc....
- Socket Request: `get map info`
    - body: object
        - mapSelected: name of the map
        - matchId
- Socket Response: `map info`
    - body: object
        - p1Base: the base of player 1
        - p2Base: the base of player 2
        - collideTileMap: the coordinates of the map where player unit can not go through
        - mapSize: size of the map
        - playerTerritory: the coordinates of the map where the player can place unit

- Description: get the setup information for the current match
- Socker Request: `get match setup info`
    - body: matchId
- Socket Response: `match setup info`
    - body: object
        - players: each player and their units; unit will contain their unit information such as their coordinates and status

- Description: get information on the number of unit the player can place
- Socket Request: `get initial unit space`
    - body: matchId
- Socket Response: `initial unit space`
    - body: object
        - initialUnitSpace: the space that repersent the amount of unit that can be placed

- Description: reset the ready to play button to false, since it is set to true after the room scene
- Socket Request: `reset readyToPlay`
    - body: object
        - matchId
- Socket Response: null

- Description: send information about the unit placed and the player to to the server
- Socket Request: `instantiate game`
    - body: object
        - matchId
        - units: coordinate and class of the units being placed
- Socket Response: `game setup completed`
    - body: null

## Game Operations

- Description: request to leave socket room
- Socket Request: `request to leave room`
  - body: string
    - matchId
- Socket Response: `null`
  - socket connection no longer will be connected to the room

- Description: get the map information; collidable blocks, map size etc....
- Socket Request: `get game server match`
  - body: object
    - matchId
- Socket Response: `game server match`
  - body: object
    - matchId
    - playerIds: player IDs of the match
    - playerColour: the colours the players can be assigned
    - unitInfo: unit roster of the players
    - isPlayerTurn: is it the current turn of the one who called
    - playerUsernameTurn: username of the player who has the current turn

- Description: end the current player's turn
- Socket Request: `end turn`
  - body: object
    - matchId
- Socket Response: `next turn`
  - body: object
    - playerIdTurn: player ID that now holds the turn
    - playerUsernameTurn: username of player that holds the turn
    - updatedUnitInfo: reset partial attributes of the units of the player whose turn ended

- Description: move a select unit for a player's turn
- Socket Request: `move unit`
  - body: object
    - matchId
    - unitId: the specific unit to move
    - moveAngle: the direction to move in
- Socket Response: `update units position`
  - body: object
    - the unit object with updated coordinates

- Description: attack a selected enemy unit, from current player's selected unit
- Socket Request: `attack unit`
  - body: object
    - matchId
    - atkId: the specific unit to attack with
    - defId: the specific unit to attack
- Socket Response: `update units status`
  - body: object
    - the two units who have attributes modified
      - attacking unit can no longer attack this turn
      - attacked unit with (potentially) changed stats

- Description: capture enemy player's base
- Socket Request: `capture base`
  - body: string
    - matchId
- Socket Response: `player victory`
  - body: string
    - message: playerUsername has won!
- Socket Response: `invalid capture`
  - body: string
    - message: Need to be in victory area and have no enemy units in area