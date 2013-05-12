LobbyState.prototype = new GameState

LobbyState.prototype.constructor = LobbyState

function LobbyState() {

  this.state = "waiting"

  this.players_connected = 1
  this.timers = {}
  this.intervals = {}
  this.intervals["query_players"] = 1000
  this.timers["query_players"] = 0
  this.intervals["request_game_start"] = 1000
  this.timers["request_game_start"] = 0
  var _this = this;
  io.on("status", function(data){process_num_players(data, _this)})
  this.state = "unknown"
}

LobbyState.prototype.destroy = function() {
  io.removeListener('status', process_players(data))
}

LobbyState.prototype.draw = function(ctx, bg_ctx) {

   ctx.fillStyle = "black"
   ctx.font = "40px Muli"
   ctx.textAlign = "center"
   ctx.fillText("BATTLESHIP", canvasWidth/2, canvasHeight/2)
   ctx.font = "12px Muli"
   ctx.fillText(this.players_connected+" PLAYER(S) CONNECTED", canvasWidth/2, canvasHeight/2 + 30)

   ctx.font = "16px Muli"
   if(this.state == "idle") {
     if(this.players_connected <= 1) {
      ctx.fillStyle = "gray"
     }
     ctx.fillText("START GAME", canvasWidth/2, canvasHeight/2 + 100)
   } else if(this.state == "starting_game") {
     ctx.fillStyle = "gray"
     ctx.fillText("INITIALIZING GAME", canvasWidth/2, canvasHeight/2 + 100)
   } else if(this.state == "game_in_progress") {
     ctx.fillStyle = "gray"
     ctx.fillText("GAME IN PROGRESS", canvasWidth/2, canvasHeight/2 + 100)
   }
}

LobbyState.prototype.update = function(dt) {

  for(var timer in this.timers) {
    this.timers[timer] -= dt
  }

  if(this.timers["query_players"] <= 0 && this.state != "starting_game") {
    console.log("QUERYING PLAYERS")
    this.query_players()
  }

  if(this.timers["request_game_start"] <= 0 && this.state == "starting_game") {
    console.log("REQUESTING GAME START")
    this.request_game_start()
  }

  for(var timer in this.timers) {
    if(this.timers[timer] <= 0) {
      this.timers[timer] = this.intervals[timer]
    }
  }
}

LobbyState.prototype.on_mouse_down = function(pos) {
  if(this.state == "idle" && this.players_connected > 1) {
    if(pos.x > canvasWidth/2 - 50 && pos.x < canvasWidth/2 + 50 &&
        pos.y > canvasHeight/2 + 75 && pos.y < canvasHeight/2 + 125)
      this.state == "starting_game"
  }

}

LobbyState.prototype.query_players = function() {
  io.emit("get status", {})
}

function process_num_players(data, lobbystate) {
  console.log("RECEIVED DATA "+data)
  lobbystate.players_connected = data.num_players
  if(this.state != "starting_game")
    lobbystate.state = data.state
}
