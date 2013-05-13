var Ship = function Ship(topLeftLoc, length, dir, board, id) {
  this.topLeftLoc = topLeftLoc
  this.length = length
  this.dir = dir // vert or horiz
  this.board = board
  this.color = "#333333"
  this.bcolor = "black"
  this.ship_id = id
}

Ship.prototype.draw = function(ctx, color, bColor) {

  ctx.fillStyle = this.color
  ctx.strokeStyle = this.bColor
  ctx.lineWidth = 3
  ctx.beginPath()

  if(this.dir == "horiz")
    ctx.rect(this.board.squareWidth * this.topLeftLoc.x, this.board.squareHeight * this.topLeftLoc.y, this.length * this.board.squareWidth, this.board.squareHeight)
  else if(this.dir == "vert")
    ctx.rect(this.board.squareWidth * this.topLeftLoc.x, this.board.squareHeight * this.topLeftLoc.y, this.board.squareWidth, this.length * this.board.squareHeight)
  ctx.fill()
  ctx.stroke()
}

Ship.prototype.valid = function() {
  if(this.dir == "vert")
    return this.topLeftLoc.x >= 0 && this.topLeftLoc.x < this.board.cols && this.topLeftLoc.y >= 0 && this.topLeftLoc.y + this.length <= this.board.rows

  if(this.dir == "horiz")
    return this.topLeftLoc.x >= 0 && this.topLeftLoc.x + this.length <= this.board.cols && this.topLeftLoc.y >= 0 && this.topLeftLoc.y < this.board.rows

}

Ship.prototype.intersects = function(loc) {
  if(this.dir == "vert") {
    return loc.x == this.topLeftLoc.x && loc.y >= this.topLeftLoc.y && loc.y < this.topLeftLoc.y + this.length
  } else if(this.dir == "horiz") {
    return loc.y == this.topLeftLoc.y && loc.x >= this.topLeftLoc.x && loc.x < this.topLeftLoc.x + this.length
  }
}

Ship.prototype.get_locs = function() {
  var locs = []
  if(this.dir == "vert") {
    for(var i = 0; i < this.length; i++) {
      locs.push(new Loc(this.topLeftLoc.x, this.topLeftLoc.y + i))
    }
  } else if(this.dir == "horiz") {
    for(var i = 0; i < this.length; i++) {
      locs.push(new Loc(this.topLeftLoc.x + i, this.topLeftLoc.y))
    }
  }
  return locs;
}

Ship.prototype.intersects_ship = function(other_ship) {
  var other_locs = other_ship.get_locs()

  for(var i in other_locs) {
    if(this.intersects(other_locs[i])) {
      return true
    }
  }

  return false
}

Ship.prototype.objectify = function() {
  return {
    topLeftLoc: this.topLeftLoc,
    length: this.length,
    dir: this.dir,
    ship_id: this.ship_id
  }
}

Ship.prototype.flip = function() {
  if(this.dir == "vert" && this.topLeftLoc.x + this.length <= this.board.rows) {
    this.dir = "horiz"
  } else if(this.dir == "horiz" && this.topLeftLoc.y + this.length <= this.board.cols) {
    this.dir = "vert"
  }
}
