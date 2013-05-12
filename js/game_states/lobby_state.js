LobbyState.prototype = new GameState

LobbyState.prototype.constructor = LobbyState

function LobbyState() {

  this.state = "waiting"

  this.players_connected = 1
}

LobbyState.prototype.draw = function(ctx, bg_ctx) {

   ctx.fillStyle = this.color
   ctx.font = "40px Muli"
   ctx.textAlign = "center"
   ctx.fillText("BATTLESHIP", canvasWidth/2, canvasHeight/2)
   ctx.font = "16px Muli"
   ctx.fillText(this.players_connected+" PLAYER(S) CONNECTED", canvasWidth/2, canvasHeight/2 + 50)


}

LobbyState.prototype.process = function(dt) {

}


