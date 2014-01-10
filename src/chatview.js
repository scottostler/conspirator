var _ = require('underscore');
var util = require('./util.js');

function ChatView(socket) {
    this.socket = socket;
    this.$messageLog = $('.message-log');

    $('.message-input button').click(_.bind(this.sendMessage, this));
    util.onEnter($('.message-input input'), _.bind(this.sendMessage, this));

    var that = this;
    socket.on('log', _.bind(this.addMessage, this));
    socket.on('chat', function(data) {
        that.addMessage(data.name + ': ' + data.message);
    });
}

ChatView.prototype.addMessage = function(message) {
    this.$messageLog
        .append($('<div>').text(message))
        .scrollTop(this.$messageLog[0].scrollHeight);
};

ChatView.prototype.sendMessage = function() {
    var $input = $('.message-input input');
    var msg = $input.val();
    this.addMessage('me: ' + msg);
    $input.val('');

    this.socket.emit('chat', {
        text: msg
    });
};

module.exports = ChatView;