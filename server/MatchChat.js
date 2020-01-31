/**
 * Keeps track of the chatroom for a match
 */
class MatchChat {
    constructor(matchId) {
        this.matchId = matchId,
        this.chatHistory = []; // the list will keep a "chronological" order of chat messages sent, sans timestamp, so {author: Jeremy, message: Hi}
    }
}

/**
 * Adds a new message to the chat history for this match
 */
MatchChat.prototype.addMessage = function(author, message) {
    this.chatHistory.push({author: author, message: message});
};

/**
 * returns the latest 10 messages
 */
MatchChat.prototype.getAllMessages = function() {
    return this.chatHistory;
}

module.exports = MatchChat;