/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

import $ = require('jquery');
import _ = require('underscore');
import util = require('./util');

class ChatView {

    socket:any;
    $messageLog:any;

    constructor(socket:any) {
        this.socket = socket;
        this.$messageLog = $('.message-log');

        $('.message-input button').click(_.bind(this.sendMessage, this));
        util.onEnter($('.message-input input'), _.bind(this.sendMessage, this));

        socket.on('log', _.bind(this.addMessage, this));
        socket.on('chat', (data:any) => {
            this.addMessage(data.name + ': ' + data.message);
        });
    }

    addMessage(message:string) {
        this.$messageLog
            .append($('<div>').text(message))
            .scrollTop(this.$messageLog[0].scrollHeight);
    }

    sendMessage() {
        var $input = $('.message-input input');
        var msg = $input.val();
        this.addMessage('me: ' + msg);
        $input.val('');

        this.socket.emit('chat', {
            text: msg
        });
    }

}

export = ChatView;
