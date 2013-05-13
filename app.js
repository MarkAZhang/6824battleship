var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    sio = require('socket.io').listen(server)

var cookie = require('cookie');
var connect = require('connect');

server.listen(8080)

app.configure(function () {
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret', key: 'express.sid'}));
    app.use("/js", express.static(__dirname + '/js'));
    app.use("/", express.static(__dirname));
});



var clients = {}

var game_players = {}

var state = "idle"

var game_status = "none"

var game_state = {}
 
// Listen for incoming connections from clients
sio.sockets.on('connection', function (socket) {
    if(!clients.hasOwnProperty(socket.handshake.sessionID)) {
      clients[socket.handshake.sessionID] = []
    }
    clients[socket.handshake.sessionID].push(socket.id)

    // Start listening for mouse move events
    socket.on('send action', receiveDataFromClient);

    socket.on("get status", function(data) {
      socket.emit("status", {state: state, num_players: get_num_players_in_lobby()})
    })

    socket.on("start game", function(data) {
      if(state == "idle") {
        state = "game_in_progress"
        game_status = "placing_ships"
        start_game()
      }
    })

    socket.on("placing ships", function(data) {
      if(state == "game_in_progress" && game_status == "placing_ships") {
        process_place_ships(data, socket.handshake.sessionID)
      }
    })

    socket.on('disconnect', function () {
      clients[socket.handshake.sessionID].pop(socket.handshake.sessionID);
      console.log('DISCONNESSO!!! '+socket.handshake.sessionID);
    });
});

function start_game() {
  game_players = {}
  
  var id_counter = 1
  
  for(var sessionid in clients) {
    game_players[sessionid] = {
      cid: id_counter,
      ships: [null, null, null, null, null]
    }
    id_counter += 1
  }

  /*game_state = {
    board: []
  }
  for(var i = 0; i < 15; i++) {
    var row = []
    for(var j = 0; j < 15; j++) {
      row.push({
        cid: -1,
        shipid: -1
      })
    }
    game_state.board.push(row)
  }*/
  send_start_game_to_players()
}

function start_battle() {
  game_status = "battle"
  game_state = {
    board: []
  }
  for(var i = 0; i < 15; i++) {
    var row = []
    for(var j = 0; j < 15; j++) {
      row.push({
        cid: -1,
        shipid: -1
      })
    }
    game_state.board.push(row)
  }
  for(sessionid in game_players) {
    for(j in game_players[sessionid].ships) {
      var ship = game_players[sessionid].ships[j]
      var locs = get_ship_locs(ship)

      for(var i in locs) {
        var loc = locs[i]
        game_state.board[loc.x][loc.y] = {
          cid:  game_players[sessionid].cid,
          shipid: ship.ship_id
        }
      }
    }
  }
  //initialize server

  /*sio.sockets.clients().forEach(function (socket) {
    console.log("EMITTING START BATTLE TO CLIENT")
    socket.emit("play battleship", {
  });*/
}

}

function process_place_ships(data, this_sessionid) {
  var ships_to_be_redone = {

  }

  for(var sessionid in game_players) {
    ships_to_be_redone[sessionid] = []
  }

  if(game_players.hasOwnProperty(this_sessionid)) {
    console.log("PLACING SHIPS")
    for(i in data.ships) {
      var this_ship = data.ships[i]
      var valid = true
      for(sessionid in game_players) {
        for(j in game_players[sessionid].ships) {
          var ship = game_players[sessionid].ships[j]
          // if it intersects a ship
          if(ship != null && intersects_ship(ship, this_ship)) {
            console.log("COLLISION BETWEEN "+JSON.stringify(ship)+" "+JSON.stringify(this_ship))
            ships_to_be_redone[sessionid].push(j)
            ships_to_be_redone[this_sessionid].push(i)
            // invalidate the ship
            game_players[sessionid].ships[j] = null
            valid = false
          }
        }
      }
      if(valid) {
        game_players[this_sessionid].ships[i] = this_ship
      }
    }
  }

  var done = true

  for(var sessionid in game_players) {
    if(ships_to_be_redone[sessionid].length > 0) {
      send_message_to_client_with_id(sessionid, "replace_ship", {bad_ship_ids: ships_to_be_redone[sessionid]})
    }
  }


}

function intersects_ship(ship_one, ship_two) {
  var loc_one = get_ship_locs(ship_one)
  var loc_two = get_ship_locs(ship_two)

  for(var i in loc_one) {
    for(var j in loc_two) {
      if(loc_one[i].x == loc_two[j].x && loc_one[i].y == loc_two[j].y) {
        return true
      }
    }
  }
  return false
}

function get_ship_locs(ship) {
  var locs = []
  if(ship.dir == "vert") {
    for(var i = 0; i < ship.length; i++) {
      locs.push({x:ship.topLeftLoc.x,y: ship.topLeftLoc.y + i})
    }
  } else if(ship.dir == "horiz") {
    for(var i = 0; i < ship.length; i++) {
      locs.push({x:ship.topLeftLoc.x + i,y: ship.topLeftLoc.y})
    }
  }
  return locs;
}



function send_message_to_client_with_id(sessionid, type, data) {
  sio.sockets.clients().forEach(function (socket) {

    if(socket.handshake.sessionID == sessionid) {
      socket.emit(type, data)
    }
  });

}

function send_start_game_to_players() {
  sio.sockets.clients().forEach(function (socket) {
    console.log("EMITTING TO CLIENT")
    socket.emit("new game", {
      cid: game_players[socket.handshake.sessionID].cid,
      num_players: get_num_players()
    });
  });
}

function get_num_players() {
  var num = 0
  for(var sessionid in game_players) {
    num++
  }
  return num

}

function get_num_players_in_lobby() {
  var num = 0
  for(var sessionid in clients) {
    if(clients[sessionid].length > 0) {
      num++
    }
  }
  return num
}

sio.set('log level', 1);

sio.set('authorization', function (data, accept) {
    // check if there's a cookie header
    if (data.headers.cookie) {
        // if there is, parse the cookie
        data.cookie = connect.utils.parseSignedCookies(cookie.parse(data.headers.cookie),'secret');
        // note that you will need to use the same key to grad the
        // session id, as you specified in the Express setup.
        data.sessionID = data.cookie['express.sid'];
    } else {
       // if there isn't, turn down the connection with a message
       // and leave the function.
       return accept('No cookie transmitted.', false);
    }
    // accept the incoming connection
    accept(null, true);
});

function receiveDataFromClient(data) {
//  socket.emit('server response', data)
}
