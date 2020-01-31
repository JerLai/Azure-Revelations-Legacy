# <u>Azure Revelations</u>

## Team Members:

- Jeremy Lai
- Wen Jie Xie

## Website URLs
- Public URL: https://azure-revelations.me
- Heroku URL: https://azure-revelations.herokuapp.com
- Demo Video: https://youtu.be/9xUTcrPukr8

## How to run the game with localhost
- Go to the project-azure-revelation directory and open terminal and type in "npm install" to install all the packages that are needed to run the server
- Run app.js using either node or nodemon (i.e. "node app.js")
- The server should run on PORT 3000, so use the URL: localhost:3000 to view the game locally

## Web Application Description:

The scope of the project is to create a web application game inspired by the Tactical RPG series “Valkyria Chronicles” by SEGA and the mobile application “Fire Emblem Heroes” co-produced by Nintendo and Intelligent Systems. The main basis is to create a military tactical warfare game in the same vein of both series with PvP (Player vs Player) elements. Users are able to search for any available matches and join a lobby to play against another player, or create their own lobby if a game doesn't exist. Players can then ready up from the lobby and from there are able to see a battlefield and place units in a designated spawn space, marked by coloured boxes. Once units have been placed and both players ready up again, the game starts which follows a Turn-based Real-Time-Strategy gameplay format. Players can move units up to a specified movement limit per unit type, and each unit can attack once per turn. The goal of the game is to reach the opposing player's base while not having any of the opposing player's units on the base and capturing it to secure victory.

## Beta Version Key Features:

- Users:
  - Sign-in/Sign-up: creating your own account to keep track of various things such as:
    - Ability to match against other players
    - Track your own match history
- Matchmaking:
  - Able to create a lobby or search for a lobby to start a match with a player
- UI:
  - Interactive Graphical User Interface:
    - Sign-in/Sign-up: able to create an account and sign up through an interface
    - Lobby: Able to see the other player(s) in the lobby, start the match and prepare for the match
- Gameplay:
  - Turn management and synchronization
    - Able to decide who gets to select commands/turn determining
    - Able to display in real-time, gameplay changes
- Database:
  - User Accounts:
    - Tracking personal information (Username and Password)
  - Match:
    - Match info for each on going game matches
      - Players info
      - Unit info

## Final Version Key Features:

- Users:
  - Be able to see other player's units
- UI:
  - Game Instance: Able to select commands, control units on the Game Instance battlefield/game map
  - Notify player(s) of the result of the game and redirection to proper screens
- Improved Map Design/Gameplay:
  - Add methods of winning the game:
    - Capture enemy base while there is no enemy unit in their base
  - Game Mechanics:
    - Terrain interaction:
      - Obstacles/Impassable Terrain
    - Multiple Unit Classes:
      - Units with different specializations suited to accomplish different tasks (i.e. Thief, Knight)
    - Units interaction:
      - Allied units should not be able to attack each other
      - Player should be able to command their units to attack the enemy units
      - Player should be able to see the range attack for each of their units
      - Player should be able to command their unit to try and capture the enemy base

## Additional/Optional Stretch Goals:

- Music:
  - Composed by Jeremy Lai
- Matchmaking:
  - Connect to a lobby of more than 2 players to play using different match rules
- Story Mode:
  - A fun updateable aside

## Utilized Technologies:

### Frontend

- Phaser:
  - Game framework and front-end renderer of graphics
- RPG Maker:
  - For open-source game assets and GUI assets
- API to communicate with the backend for gameplay, matchmaking and authentication
  - Using Google OAuth with Passport

### Backend and Middleware

- Node.js
- Express
- Passport:
  - Google OAuth
- Cookie Sessions
- Web Connection:
  - socket.io: websocket library
- Database:
  - MongoDB

## Top 5 Technical Challenges

1. Learning all the separate technologies and APIs and integration
2. Ensuring Real-Time Synchronization for both lobby/match-making and gameplay
3. Having an intuitive UI/UX design
4. Having a secure connection to the application to prevent unwanted access
5. Adhering to good Software Development Principles:
   1. REST API
   2. Modifiable/Expandable Code Structure
   3. Flexible Usage: Working cross-browsers
