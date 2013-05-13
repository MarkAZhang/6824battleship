BattleshipGameState.prototype = new GameState

BattleshipGameState.prototype.constructor = BattleshipGameState

function BattleshipGameState(cid, numPlayers, cids, ships_placed, offset) {
  bg_initialized = false
  water_color = "#9999ff"
  this.board = new Board(15, 15, this)

  this.ship_lengths = [5, 4, 3, 3, 2]

  this.cid = cid

  this.other_player_colors = ["sienna", "mediumvioletred", "green", "orangered"]

  this.drag_start_loc = null

  this.show_opponent_markers = false;
  
  this.cids_to_color = {}

  this.generate_colors(cids)

  this.add_players_to_ui()
  this.shots_left = 0

  this.client=new Client(numPlayers, io, cid, cids, this);
  this.shot_reload_timer = 1000

  this.disconnect=false;

  print("Place ships by dragging and dropping. SPACEBAR to rotate ship. ENTER to confirm")

  title_container.style.display = "block"
  log_container.style.display = "block"
  disconnect_container.css("display" ,  "inline");
  //disconnect_button_container.style.display = "block";

  var _this = this;
  io.on("replace_ship", function(data) {replace_ship(data, _this)});
  io.on("play battleship", function(data) {
    print("THE BATTLE HAS BEGUN!")
    print("DOUBLE CLICK to fire. Hold SPACEBAR to show visible enemy attacks.")
    _this.client.setStartTime(0);
    _this.current_phase = "battle"
    _this.change_firing_ship(0)
      
  });

  //game has already begun
  if(ships_placed != null) {
    this.add_placed_ships(ships_placed)
    this.current_phase = "battle"
    this.change_firing_ship(0)
    this.client.setStartTime(offset);
  } else {
    this.current_phase = "placing_ships"
    this.add_ships_initial()
  }

  var _this = this;

  disconnect_container.click(function(){
    if($(this).html() == 'DISCONNECT'){
      $(this).html('RECONNECT');
    } else {
      $(this).html('DISCONNECT');
    }
    _this.client.change_disconnect()
  })

}

BattleshipGameState.prototype.generate_colors = function(cids) {

  for(var i in cids) {
    var cid = cids[i]
    if(cid < this.other_player_colors.length)
      this.cids_to_color[cid] = this.other_player_colors[cid]
    else {
      this.cids_to_color[cid] = "#"+Math.floor(Math.random()*242*256*256 + 16*256*256).toString(16)
    }
  }
}

BattleshipGameState.prototype.add_players_to_ui = function() {
  players_container.innerHTML = ""
  for(var cid in this.cids_to_color) {
    if(parseInt(cid) == this.cid) {
      players_container.innerHTML += "<div class='player' style='color:black; font-weight: bold'> ->Player "+cid+" </div>"

    } else {
      players_container.innerHTML += "<div class='player' style='color:"+this.cids_to_color[cid]+"'> Player "+cid+" </div>"
    }
  }

}

BattleshipGameState.prototype.opponent_fire = function() {
  var random_loc = new Loc(Math.floor(Math.random() * this.board.cols), Math.floor(Math.random() * this.board.rows))

  if(!this.board.board[random_loc.x][random_loc.y].opponent_status) {

    var angle = _atan({x: this.board.cols/2, y: this.board.rows/2}, {x: random_loc.x, y: random_loc.y})
    if(this.board.get_ship_at(random_loc)) {

      this.board.opponent_hit(random_loc, "Bob", angle)
    } else {
      this.board.opponent_miss(random_loc, "Bob", angle)
    }
    
  }
  var _this = this;

  setTimeout(function(){_this.opponent_fire()}, 1000)

}

BattleshipGameState.prototype.add_ships_initial = function() {

  for( i in this.ship_lengths) {
    this.board.add_ship(new Ship(new Loc(2*i, 0), this.ship_lengths[i], "vert", this.board, parseInt(i)+1))
  }
}

BattleshipGameState.prototype.add_placed_ships = function(ships_placed) {
  for(i in ships_placed) {
    var ship = ships_placed[i]
      var new_ship = new Ship(new Loc(ship.topLeftLoc.x, ship.topLeftLoc.y), ship.length, ship.dir, this.board, ship.ship_id);
    this.board.add_ship(new_ship)
    new_ship.status = "set"

  }
}

BattleshipGameState.prototype.create_next_player_ship = function() {
  var num_ships = this.board.player_ships.length;
  return new Ship(new Loc(0,0), this.ship_lengths[num_ships], "vert", this.board)
}

BattleshipGameState.prototype.update = function(dt) {
 if(this.current_phase == "battle") {
   
  this.shot_reload_timer -= dt 
  if(this.shot_reload_timer < 0) {
    this.shot_reload_timer = 1000
    this.shots_left += 1
  }
  shots_left_container.innerHTML = this.shots_left
 }

}

BattleshipGameState.prototype.draw = function(ctx, bg_ctx) {

  if(!bg_initialized) {
    this.draw_bg_grid(bg_ctx)
    bg_initialized = true
  }

  this.board.draw(ctx, this.show_opponent_markers)
  ctx.globalAlpha = 1

  if(this.current_phase == "battle"){
   
  }
}

BattleshipGameState.prototype.draw_bg_grid = function(bg_ctx) {
  bg_ctx.save()
  this.board.draw_grid(bg_ctx)  
  bg_ctx.restore()
}


BattleshipGameState.prototype.on_mouse_move = function(pos) {
  if(this.current_phase == "placing_ships" && this.current_ship != null) {
    var diff = this.board.translate_coord_to_grid(pos).subtract(this.drag_last_loc)

    this.current_ship.topLeftLoc.Add(diff)
    if(!this.current_ship.valid()) {
      this.current_ship.topLeftLoc.Subtract(diff)
    } else {
      this.drag_last_loc = this.board.translate_coord_to_grid(pos)
    }
  }
}

BattleshipGameState.prototype.on_mouse_down = function(pos) {
  if(this.current_phase == "placing_ships") {
    this.current_ship = this.board.get_ship_at(this.board.translate_coord_to_grid(pos))
    if(this.current_ship && this.current_ship.status != "set") {
      if(this.current_ship.status == "conflict") {
        this.current_ship.status = "unknown"
      }
      this.drag_last_loc = this.board.translate_coord_to_grid(pos)
      
    }
  } else if(this.current_phase == "battle") {

/*    if(pos.x > sidebarWidth/2 - 50 && pos.x < sidebarWidth/2 + 50 &&
        pos.y > canvasHeight/2 + 75 && pos.y < canvasHeight/2 + 125){
      console.error('disconnect change');
      this.client.change_disconnect();
    }*/

  }
}

BattleshipGameState.prototype.on_mouse_up = function(pos) {
  if(this.current_phase == "placing_ships") {
    this.current_ship = null
  }
}

BattleshipGameState.prototype.on_key_down = function(keyCode) {
  if(this.current_phase == "placing_ships" && keyCode == 32 && this.current_ship) {
    this.current_ship.flip()
  }
  if(keyCode == 13 && this.current_phase == "placing_ships") {

    var _this = this;
    //setTimeout(function(){_this.opponent_fire()}, 1000)

    var ships = []

    for(i in this.board.player_ships) {
      var ship = this.board.player_ships[i];
      ships.push(ship.objectify())
      ship.status = "set"
    }

    io.emit('placing ships', {ships: ships})
    print("Placed ships. Waiting for other players.")
  }

  if(keyCode == 81) {
    
  }

  if(this.current_phase == "battle") {
    if(keyCode >= 49 && keyCode <= 53) {
      this.change_firing_ship(keyCode - 49)
    }

    if(keyCode == 32) {
      this.show_opponent_markers = true;
    }
  }
}

BattleshipGameState.prototype.on_key_up = function(keyCode) {

  if(this.current_phase == "battle") {
    if(keyCode == 32) {
      this.show_opponent_markers = false;
    }
  }

}

BattleshipGameState.prototype.on_mouse_dbl_click  = function(pos) {

  if(this.current_phase == "battle") {

    var loc = this.board.translate_coord_to_grid(pos)

    // if not already fired
    if(!this.board.board[loc.x][loc.y].status) {

      this.board.fired(loc)
      print("FIRED at ("+loc.x+","+loc.y+"). Awaiting result.");
      var data=new Object();
      data.ship_id=this.current_ship.ship_id;
      data.loc=loc;
      data.cid=this.client.cid;
      data.result = "fired"

      var actionObject=new ActionObject(this.client.cid, false,data,false);
      this.client.sendAction(actionObject, Math.random())


      var _this = this;
      /*
      setTimeout(function() {
        if(Math.random() < 0.5) {
          _this.board.hit(loc, "Fred")
          print("HIT opponent at ("+loc.x+","+loc.y+")");

        } else {
          _this.board.miss(loc)
          print("MISS at ("+loc.x+","+loc.y+")");
        }
      }, 1000)*/
    }
  }
}

BattleshipGameState.prototype.change_firing_ship = function(index) {
  if(index >= 0 && index <= this.ship_lengths.length) {
    if(this.current_ship != null) {
      this.current_ship.color = "#333333"
      this.current_ship.bcolor = "black"
    }
    this.current_ship = this.board.player_ships[index]
    this.current_ship.color = "#999999"
    this.current_ship.bcolor = "#4b4b4b"
  }
}

BattleshipGameState.prototype.update_ui = function() {

  //Make the board look like the gamestate
  this.board.clear_actions()
  
  var gamestate = this.client.gameState;

  for(var i = 0; i < 15; i++) {
    for(var j = 0; j < 15; j++) {
      if(gamestate[i][j].shotcid != null) {
        if(gamestate[i][j].shotcid == this.cid) {
          if(gamestate[i][j].hit) {
            this.board.hit(new Loc(i, j), gamestate[i][j].shotcid)
          } else {
            this.board.miss(new Loc(i, j))
          }
        } else if(gamestate[i][j].shotcid != this.cid) {
          var angle = _atan({x: i, y: j}, {x: gamestate[i][j].shotLocX, y: gamestate[i][j].shotLocY})
          if(gamestate[i][j].hit) {
            this.board.opponent_hit(new Loc(i, j), gamestate[i][j].shotcid, angle)
          } else {
            this.board.opponent_miss(new Loc(i, j), gamestate[i][j].shotcid, angle)

          }
        }

      }
    }
  }

  this.update_log_container()
}

BattleshipGameState.prototype.update_log_container = function() {
  var newLogEntries = this.client.getNewLogEntries();
  for(var i in newLogEntries) {
    var newLogEntry = newLogEntries[i];
    if(newLogEntry.cid == this.cid) {
      if(newLogEntry.result == "hit") {
        print("You have HIT at ("+newLogEntry.data.loc.x+","+newLogEntry.data.loc.y+")")
      } else if(newLogEntry.result == "miss") {
        print("You have MISSED at ("+newLogEntry.data.loc.x+","+newLogEntry.data.loc.y+")")
      } else if(newLogEntry.result == "invalidated") {
        print("Your shot at ("+newLogEntry.data.loc.x+","+newLogEntry.data.loc.y+") has been invalidated. Your ship had been killed before it fired that shot.")
      }
    } else {
      if(newLogEntry.result == "hit") {
        print("Player "+newLogEntry.cid+" has HIT at ("+newLogEntry.data.loc.x+","+newLogEntry.data.loc.y+")")
      } else if(newLogEntry.result == "miss") {
        print("Player "+newLogEntry.cid+" has MISSED at ("+newLogEntry.data.loc.x+","+newLogEntry.data.loc.y+")")
      }
    }
  }
}

function replace_ship(data, gamestate) {
  print("Someone's ships overlapped with yours. You've both been asked to re-place your ships. ")
  print("Place re-place the red ships")
  console.log("ASKED TO REPLACE SHIP "+data.bad_ship_ids)
  for(var i in data.bad_ship_ids) {
    var index = data.bad_ship_ids[i];
    var ship = gamestate.board.player_ships[index];
    ship.status = "conflict"
  }
}

var _atan = function(center, ray) {
  var angle
  if(center.x == ray.x)
  {
    if(center.y > ray.y)
    {
      angle = -Math.PI/2
    }
    else
    {
      angle = Math.PI/2
    }
    return angle
  }
  angle = Math.atan((center.y-ray.y)/(center.x-ray.x))
  if(center.x > ray.x)
  {
    angle +=Math.PI
  }
  return angle
}
