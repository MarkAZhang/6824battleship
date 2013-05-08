var Loc = function(x, y) {
  this.x = x
  this.y = y
}

Loc.prototype.subtract = function(loc) {
  return new Loc(this.x - loc.x, this.y - loc.y)
}

Loc.prototype.Add = function(loc) {
  this.x += loc.x
  this.y += loc.y
}

Loc.prototype.Subtract=  function(loc) {
  this.x -= loc.x
  this.y -= loc.y
}
