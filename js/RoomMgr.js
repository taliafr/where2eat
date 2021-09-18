class RoomMgr {
  constructor() {
    this.socket = io.connect("https://where2eat.net");
    this.messageReceived = function(){};
    this.serverMessageReceived = function(){};
    this.errorMessageReceived = function(){};

    //set color
    let roomMgr = this;
    this.socket.on("userData", function(data) {
      roomMgr.displayName = data.displayName;
    });

    //socket.io events
    this.lastAuthor = undefined;
    this.socket.on("message", function(msgData) {
      roomMgr.messageReceived(msgData);
      roomMgr.lastAuthor = msgData.name;
    });
    this.socket.on("serverMsg", function(msg) {
      roomMgr.serverMessageReceived(msg);
    });
    this.socket.on("errorMsg", errorMessageReceived);
  }
  onMessageReceived(func) {
    this.messageReceived = func;
  }
  onServerMessageReceived(func) {
    this.serverMessageReceived = func;
  }
  onErrorMessageReceived(func) {
    this.errorMessageReceived = func;
  }
  createRoom(displayName) {
    this.socket.emit("createRoom", displayName);
  }
  joinRoom(roomID, displayName) {
    this.socket.emit("joinRoom", {room: roomID, name: displayName});
  }
  sendVote(vote) {
    this.socket.emit("vote", vote);
  }
  leaveChat() {
    this.socket.emit("leaveRoom");
  }
  getLastAuthor() {
    return this.lastAuthor;
  }
}
