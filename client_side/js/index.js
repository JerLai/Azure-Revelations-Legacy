/* jshint esversion: 6 */

(function() {
    "use strict";

    window.addEventListener('load', function() {

        /* ====================Error Dialog========================= */
        api.onError(function(err){
            console.error("[error]", err);
        });

        api.onError(function(err){
            var error_box = document.querySelector('#error_box');
            error_box.innerHTML = err;
            error_box.style.visibility = "visible";
        });

        /* ===========================User=============================== */
        api.onUserUpdate(function(player) {
            let isLogin = null;
            if(player) isLogin = true;

            // When you login successfuly, the error message should be clean
            let error_box = document.querySelector('#error_box');
            error_box.innerHTML = "";
            error_box.style.visibility = "hidden";

            // signin, signout
            document.querySelector("#login").style.visibility = (isLogin)? 'hidden' : 'visible';
            document.querySelector("#logout").style.visibility = (isLogin)? 'visible' : 'hidden';
            document.querySelector("#login_status").innerHTML = (isLogin)? ((player.username)? "Logged in as " + player.username : "Logged in as First Time User") : "Not logged in";
        });


        /* ===========================Main=============================== */

        // move canvas into the game div
        let gameWrapper = document.querySelector('#game-wrapper');
        let gameCanvas = document.querySelector('canvas');
        gameWrapper.appendChild(gameCanvas);
        
        api.onChatCreation(function() {
            if (!document.querySelector('#chat-container')) {
                createChatContainer();
            }
        });

        api.onChatDeletion(function() {
            let chatContainer = document.querySelector('#chat-container');
            if (chatContainer) {
                chatContainer.parentNode.removeChild(chatContainer);
            }
        });

        // listener for creating chat bubbles
        socket.on('emitMessage', function(messages) {   // messages = [{author, message}]
            cleanChatLog();
            messages.forEach(function(content) {
                addChatBubble(content.author, content.message);
            });
        });

        /* ===========================Helper Functions=============================== */

        function createChatContainer() {
            let elmt = document.createElement("div");
            elmt.id = "chat-container";
            elmt.innerHTML = `
                <div id="chat-title-bar">Chat</div>
                <div id="chat-content">
                    <div id="chat-log-wrapper">
                        <div id="chat-log"></div>
                    </div>
                    <div id="chat-input">
                        <textarea rows="2" id="input-text-bar" type="text" placeholder="Enter your message...."></textarea>
                        <button type="button" id="send-btn">Send</button>
                    </div>
                </div>
            `;

            elmt.querySelector('#send-btn').addEventListener('click', function(e) {
                e.preventDefault();
                let inputText = elmt.querySelector('#input-text-bar');
                let content = inputText.value;
                inputText.value = "";
                api.emitMessage(match.matchId, content);
            });

            gameWrapper.append(elmt);
        }

        function cleanChatLog() {
            let log = document.querySelector('#chat-log');
            log.innerHTML = "";
        }

        function addChatBubble(author, content) {
            let elmt = document.createElement("div");
            elmt.className = "chat-bubble";
            elmt.innerHTML = `
                <div class="sender-name">${author}:</div>
                <div class="sender-message">${content}</div>
            `;

            let log = document.querySelector('#chat-log');
            log.append(elmt);
        }
    });
}());