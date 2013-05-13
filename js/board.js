var Board = function(rows, cols, gamestate) {
  this.rows = rows
  this.cols = cols
  this.gamestate = gamestate
  this.player_ships = []

  this.squareWidth = boardWidth/this.cols;
  this.squareHeight = boardHeight/this.rows;

  this.clear_actions()
}

Board.prototype.draw_grid = function(ctx) {
  ctx.fillStyle = water_color
  ctx.fillRect(0, 0, boardWidth, boardHeight);
  ctx.beginPath()
  for(var i = 0; i <= this.cols; i++) {
    ctx.moveTo(boardWidth*i/this.cols, 0)
    ctx.lineTo(boardWidth*i/this.cols, boardHeight)
  }
  for(var j = 0; j <= this.rows; j++) {
    ctx.moveTo(0, boardHeight*j/this.rows)
    ctx.lineTo(boardWidth, boardHeight*j/this.rows)
  }
  ctx.strokeStyle = "blue"
  ctx.stroke()
}

Board.prototype.translate_coord_to_grid = function(pos) {
  return (new Loc(Math.floor((pos.x)/this.squareWidth), Math.floor(pos.y/this.squareHeight)))
}

Board.prototype.draw = function(ctx, show_opponent_markers) {
  for(i in this.player_ships) {
    if(this.player_ships[i].valid())
      this.player_ships[i].draw(ctx)
  }

  for(var i = 0; i < this.rows; i++) {
    for(var j = 0; j < this.cols; j++) {
      var boardSquare = this.board[i][j];
      if(boardSquare.status) {
        
        if(boardSquare.status == "hit") {
          if(boardSquare.opponent_player) {
            ctx.beginPath()
            ctx.rect(i * this.squareWidth, j * this.squareHeight, this.squareWidth, this.squareWidth);
            ctx.fillStyle = this.get_player_color(boardSquare.opponent_player)
            ctx.fill()
          }
          if(!show_opponent_markers) {

            ctx.beginPath()
            ctx.arc(i * this.squareWidth + this.squareWidth/2, j * this.squareHeight + this.squareWidth/2, this.squareWidth/4, 0, Math.PI * 2, false);
            ctx.fillStyle = "red"
            ctx.fill()
          }

        } else if(boardSquare.status == "miss"){

          if(!show_opponent_markers) {
            ctx.beginPath()
            ctx.arc(i * this.squareWidth + this.squareWidth/2, j * this.squareHeight + this.squareWidth/2, this.squareWidth/4, 0, Math.PI * 2, false);
            ctx.fillStyle = "white"
            ctx.fill()
          }
        } else if(boardSquare.status == "fired") {
          if(!show_opponent_markers) {
            ctx.fillStyle = "black"
            ctx.font = "20px Century Gothic"
            ctx.fillText("?", i*this.squareWidth + this.squareWidth/2, j*this.squareHeight + this.squareHeight/2*1.35);
            ctx.beginPath()
            ctx.arc(i * this.squareWidth + this.squareWidth/2, j * this.squareHeight + this.squareWidth/2, this.squareWidth/4, 0, Math.PI * 2, false);
            ctx.lineWidth = 2
            ctx.strokeStyle = "black"
            ctx.stroke()
          }
        }
      }

      if(boardSquare.opponent_player) {

        if(boardSquare.opponent_status == "hit") {
          ctx.beginPath()
          ctx.rect(i * this.squareWidth, j * this.squareHeight, this.squareWidth, this.squareWidth);
          ctx.fillStyle = "red"
          ctx.fill()
        }

        if(show_opponent_markers) {
          ctx.beginPath()

          var x = i * this.squareWidth + this.squareWidth/2
          var y = j * this.squareHeight + this.squareWidth/2
          var dir = boardSquare.opponent_dir

          ctx.moveTo(x + this.squareWidth/4*Math.cos(dir), y + this.squareWidth/4*Math.sin(dir))
          ctx.lineTo(x + this.squareWidth/4*Math.cos(dir+Math.PI*5/6), y + this.squareWidth/4*Math.sin(dir+Math.PI*5/6))
          ctx.lineTo(x + this.squareWidth/4*Math.cos(dir+Math.PI*7/6), y + this.squareWidth/4*Math.sin(dir+Math.PI*7/6))
          ctx.lineTo(x + this.squareWidth/4*Math.cos(dir), y + this.squareWidth/4*Math.sin(dir))
          ctx.lineWidth = 3;
           if(boardSquare.opponent_player) {
             ctx.strokeStyle = this.get_player_color(boardSquare.opponent_player)
           } else {
             ctx.strokeStyle = "red"
           }
           ctx.stroke()
        }
      }
    }
  }
}

Board.prototype.add_ship = function(ship) {
  this.player_ships.push(ship)
}

Board.prototype.get_ship_at = function(loc) {
  var ship = null;
  for(i in this.player_ships) {
    if(this.player_ships[i].intersects(loc)) {
      ship = this.player_ships[i]
    }
  }

  return ship
}

Board.prototype.hit = function(loc, player) {
  this.board[loc.x][loc.y].status = "hit"
  this.board[loc.x][loc.y].opponent_player = player
}

Board.prototype.miss = function(loc) {
  this.board[loc.x][loc.y].status = "miss"
}

Board.prototype.fired = function(loc) {
  this.board[loc.x][loc.y].status = "fired"
}

Board.prototype.opponent_hit = function(loc, player, dir) {
  var ship = this.get_ship_at(loc)

  if(ship) {
    this.board[loc.x][loc.y].opponent_status = "hit"
    this.board[loc.x][loc.y].opponent_player = player
    this.board[loc.x][loc.y].opponent_dir = dir
  }
}

Board.prototype.opponent_miss = function(loc, player, dir) {

  var ship = this.get_ship_at(loc)

  if(!ship) {
    this.board[loc.x][loc.y].opponent_status = "miss"
    this.board[loc.x][loc.y].opponent_player = player
    this.board[loc.x][loc.y].opponent_dir = dir
  }
}

Board.prototype.clear_actions = function() {
  this.board = []
  for(var i = 0; i < this.rows; i++) {
    var row = []
    for(var j = 0; j < this.cols; j++) {
      row.push({})
    }
    this.board.push(row)
  }
}

Board.prototype.get_player_color = function(player) {
  return this.gamestate.cids_to_color[player]
}
