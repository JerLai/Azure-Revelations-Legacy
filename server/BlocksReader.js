/**
 * Taken from https://github.com/Jerenaux/ensemble/blob/master/game/js/shared/BlocksReader.js
 * Created by Jerome on 01-05-17.
 */

let SparseMap = require('./SparseMap.js').SparseMap;


// Object responsible for managing the addition and removal of blocks, and keeping the clients and database up to date, in this case blocks are the collidable tiles
BlocksReader = {
    blocks: new SparseMap() // SparseMap storing the block object located at given coordinates, e.g. blockObject = blocks[x][y]; (the block object is a Block() on the client, an empty object {} on the app)
};

// Given a list of blocks, populates this map
BlocksReader.loadBlocks = function(collideList) {
    BlocksReader.blocks.fromList(collideList);
}
BlocksReader.listBlocks = function(){ // returns a list of all the blocks
    return BlocksReader.blocks.toList();
};

// Loading function that populates map based on a given list
BlocksReader.insertBlockIntoSparseMap = function(x,y,block){
    BlocksReader.blocks.add(x,y,block);
};

BlocksReader.removeBlockFromSparseMap = function(x,y){
    BlocksReader.blocks.delete(x,y);
};

// returns true if there is a block on the given cell
BlocksReader.isBlockAt = function(x,y){  // x and y in cell coordinates, not px
    return (BlocksReader.blocks.get(x,y) !== null); // a SparseMap returns null when nothing found at given coordinates
};

// Returns true if there is at least one block on one of the cells of the provided list
BlocksReader.isBlockAtList = function(list){  // list of cells to check
    for(let i = 0; i < list.length; i++){
        if(BlocksReader.isBlockAt(list[i].x,list[i].y)) return true;
    }
    return false;
};

if(typeof window === 'undefined') module.exports.BlocksReader = BlocksReader;