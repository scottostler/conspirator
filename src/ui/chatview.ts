import * as $ from 'jquery';

class ChatView {

    $messageLog: JQuery;

    constructor() {
        this.$messageLog = $('.message-log');
    }

    addMessage(message: string) {
        this.$messageLog
            .append($('<div>').text(message))
            .scrollTop(this.$messageLog[0].scrollHeight);
    }
}

export default ChatView;
