/**
 * parses a JSON map file to identify specific things needed for backend representation of a battlefield
 */
let fs = null;
let path = null;
if(typeof window === 'undefined') {
    fs = require('fs');
    path = require('path');
}

let TileMapParser =  {
    //collidable : [], //List of collidable tiles by id
    mapData : {}
}

TileMapParser.parseJSON = function() {
    let mapInfo = JSON.parse(fs.readFileSync(path.join(__dirname,'..', "client_side", 'assets', 'game','Final_Map.json')).toString());
    //TileMapParser.collidable = mapInfo.tilesets.tiles; // Later implementation will check for correct tileset and tile properties
    mapInfo.layers.forEach(function(layer) { // Go through each layer
        if (layer.name === "Base and Spawn") { // Find the objects and get the victory area
            layer.objects.forEach(function(obj) {
                if (obj.name === "Player 1 Base") {
                    TileMapParser.mapData.p1Base = {name: obj.name, id: obj.id, x: Math.floor(obj.x / 48), y: Math.floor(obj.y/48), xwidth: Math.floor(obj.width/48), yheight: Math.floor(obj.height/48)};
                }
                if (obj.name === "Player 2 Base") {
                    TileMapParser.mapData.p2Base = {name: obj.name, id: obj.id, x: Math.floor(obj.x / 48), y: Math.floor(obj.y/48), xwidth: Math.floor(obj.width/48), yheight: Math.floor(obj.height/48)};
                }
            });
        }
        if (layer.name === "World") {// Same rendering level as player, also the tiles that can be collidable, get the locations of all of them
            let parsedTiles = [];
            for (let i = 0; i < layer.data.length; i ++) {
                let currTile = layer.data[i];
                if (currTile != 0) {// a value of 0 means no tile
                    parsedTiles.push({id: currTile - 1, x: i % layer.width, y: Math.floor(i/layer.height)}); //width and height correspond to how many tiles long and high the map is
                }
            }
            TileMapParser.mapData.collideTileMap = parsedTiles;

            // record the height and width of the map
            TileMapParser.mapData.size = {x: layer.width, y: layer.height};
        }
    });
}

TileMapParser.getP1Base = function() {
    let retObj = TileMapParser.mapData.p1Base;
    retObj.colour = 0xff4f78;
    return retObj;
}

TileMapParser.getP2Base = function() {
    let retObj = TileMapParser.mapData.p2Base;
    retObj.colour = 0x0fd2ee;
    return retObj;
}

TileMapParser.getCollideTilePositions = function() {
    let retObj = TileMapParser.mapData.collideTileMap;
    return retObj;
}

TileMapParser.getMapSize = function() {
    return TileMapParser.mapData.size;
}

if(typeof window === 'undefined') module.exports.TileMapParser = TileMapParser;