//*************************************************
// Linked List implementation
//*************************************************

function List() {
    var start = null;
    var end = null;
    List.makeNode = function() {
        return {data:null,next:null}
    };
    this.add = function(data) {
        if (this.start === null) {
            this.start = List.makeNode();
            this.end = this.start;
        } else {
            this.end.next = List.makeNode();
            this.end = this.end.next;
        }
        this.end.data = data;
    };
    this.delNode = function(data) {
        var current = this.start;
        var previous = this.start;
        while (current !== null) {
            if (data === current.data) {
                if (current === this.start) {
                    this.start = current.next;
                    return;
                }
                if (current === this.end) {
                    this.end = previous;
                }
                previous.next = current.next;
                return;
            } 
            previous = current;
            current = current.next; 
        }
    };
    this.item = function(index) {
        var current = this.start;
        while (current !== null) {
            i -= 1;
            if (i === 0) {
                return current;
            }
            current = current.next;
        }
        return null;
    };
    this.each = function(f) {
        var current = this.start;
        while (current !== null) {
            f(current);
            current = current.next;
        }
    };

};

//*************************************************
// BSServer
//*************************************************

ActionObject = require("./client").ActionObject
GameState = require("./client").GameState

exports.BSServer = BSServer

function BSServer(gameBoard, ships) {
    // Server fields 
    this.log = new Array();  
    this.lastClientTimes = {};
    this.receivedActions = {};
    this.timeRef = new Date().getTime();
    this.DC_THRESHOLD = 100000000//10000;
    this.gameOver = false;
    this.winner = -1;
    this.initGame = initGame;
    this.unreliable = false;
    this.unreliablePercentage = 0;
    this.lag=false;
    this.lagTime = 0;

    // Server methods
    this.getLogIndex = getLogIndex;
    this.insertLogEntry = insertLogEntry; 
    this.isActionReceived = isActionReceived;  
    this.receiveDataFromClient = receiveDataFromClient;
    this.retrieveLogEntriesForClient = retrieveLogEntriesForClient;  
    this.replayLog = replayLog;
    this.updateGameState = updateGameState;
    this.apply = apply;
    this.invalidateActionObject = invalidateActionObject;
    this.setUnreliable = setUnreliable;
    this.setLag = setLag;

    this.initGame(gameBoard, ships);
}

function ServerPacket(entries, time, vector, gameState, shots_left) {
    this.actionObjectArray = entries;
    this.currentTime = time;
    this.versionVector = vector;
    this.gameState = gameState;
    this.shots_left = shots_left
}

function LogEntry(action, gameState) {
    this.action = action;
    this.gameState = gameState;
}

function Ship(topLeftLoc, length, dir) {
    this.topLeftLoc = topLeftLoc;
    this.length = length;
    this.dir = dir;
    this.isAlive = (1<<length) - 1;
}

//**************************************************
// BSServer Handlers
//**************************************************

//Questions: 
// 1) should the Server be implemented as an object or a static class?
//  -if object, then we need a second master process to initialize server
//  (or make server initialize itself)
// 2) should state be stored in lists or arrays
// 3) protocol for initalizing clients and starting the game
// 4) when exactly is a good point to use the nonblocking asynchronous method
// calls of node.js?  It seems that we don't have a lot of processes that can
// run in the background unless we don't mind returning stale information to
// the client (i.e. log)?

var setUnreliable = function(unreliable, percentage){
    this.unreliable = unreliable;
    this.unreliablePercentage = percentage;
}
var setLag = function(lag, lagTime){
    this.lag=lag;
    this.lagTime=lagTime;
}
var initGame = function(gameBoard, ships) {

    var shots_fired = {}
    var shipArray = {}
    //format gameboard[x][y] 15x15;

    for (var cID in ships) {
        var ship_set = ships[cID];
        for(var index in ship_set) {
          var ship = ship_set[index]
          shipArray[shipHash(ship.ship_id,cID)] = new Ship(ship.topLeftLoc, ship.length, ship.dir); 

        }
        shots_fired[cID] = 0
    }

    var action = new ActionObject(0, null, null, null);
    action.timestamp = -10;

    var gameState = new GameState(gameBoard, shipArray, shots_fired); 

    var entry = new LogEntry(action, gameState);
    this.log[0] = entry; 
}


// return hash of actionObjects
var actionHash = function(action) {
    var hash = 0;
    if (action === null) {
        return hash;
    }
    hash += action.timestamp & 0x0FFFFF;
    hash += action.clientID<<20;
    //hash = hash & 0x4FFFFFFF;
    //multiply by 2 for committed
    //multiply by 2 for revision
    //maybe need app specific data

    return hash;
}

function shipHash(shipID, cID) {
    return shipID + cID*5;
}
var shipReverseHash = function(hash) {
    return Math.floor(hash/5);
}

// Uses binary search to find the index of the log entry with value time
//
// return index
var getLogIndex = function(time, lo, hi) {
    console.log("GET LOG INDEX "+time+" "+lo+" "+hi);
    var i = Math.floor((lo + hi)/2);
    var midpoint = this.log[i]; 
    //console.log("LOG ENTRY INDEX="+i+" "+midpoint.action+" "+midpoint.gameState)
    if (midpoint.action.timestamp === time) {
        return i; 
    } else if ((hi-lo) === 1) {
        return lo;
    } else {
        if (midpoint.action.timestamp > time) {
            return this.getLogIndex(time, lo, i); 
        } else {
            return this.getLogIndex(time, i, hi); 
        }
    }
};

// inserts the LogEntry object into the appropriate index in the log
// ensures that log remains ordered after insertion operation. 
var insertLogEntry = function(entry) {
    var index = this.getLogIndex(entry.action.timestamp, 0, this.log.length);
    if (this.log[index].action.timestamp > entry.action.timestamp) {
        var log1 = this.log.slice(0, index);
        var log2 = this.log.slice(index, this.log.length);

        log1 = log1.concat(entry);
        log1 = log1.concat(log2);

        this.log = log1;

        if (entry.gameState === null) {
            this.log[index].gameState = this.log[index-1].gameState;
        }
    } else {
        var log1 = this.log.slice(0, index+1);
        var log2 = this.log.slice(index+1, this.log.length);

        log1 = log1.concat(entry);
        log1 = log1.concat(log2);

        this.log = log1;

        if (entry.gameState === null) {
            this.log[index+1].gameState = this.log[index].gameState; 
        }
    }
    
    return true;
}

var isActionReceived = function(action) {
    if (this.receivedActions[action.uuid]){
        return true;
    }
    return false;
}

var receiveDataFromClient = function(clientPacket, socket) {
    if (this.gameOver === true) {
        socket.emit("game over", {cid: this.winner});
    }   

    if (this.unreliable && Math.random() < this.unreliablePercentage){
        console.log("Dropped client packet");
        return false;
    }


    console.log("UNPACKING CLIENT PACKET")
    //unpack Client information
    var cID = clientPacket.cid;
    var actionObjArr = clientPacket.actionObjects;
    var clientTime = clientPacket.currentTime;
    var vector = clientPacket.versionVector;
    //make sure received actions gets updated

/*    //initialize shots fired
    if(!this.shotsFired.hasOwnProperty(cID)) {
      this.shotsFired[cID] = 0
    }*/

    //update Server state
    this.replayLog(clientTime, actionObjArr);
    this.lastClientTimes[cID] = clientTime;

    // note this is an array of [entries,version vector] objects
    var logEntries = this.retrieveLogEntriesForClient(vector, cID, clientTime);
    var date = new Date();
    var time = date.getTime() - this.timeRef;
    var i = this.getLogIndex(clientTime, 0, this.log.length);
    console.log("CHOSEN INDEX "+i)
    var packagedEntries = []

    for(var j in logEntries[0]){ 
      logEntry = logEntries[0][j]
      packagedEntries.push(logEntry.action)
    }

    //TODO: remove ship locs from gamestate below
    var srvPacket = new ServerPacket(packagedEntries, time, logEntries[1], this.log[i].gameState, Math.floor(clientTime/1000 - this.log[i].gameState.shotsFired[cID]));  
       
    //handle -1 case
    //send srvPacket to client

    console.log("SENDING RESPONSE TO CLIENT-------------------")

    if (this.unreliable && Math.random() < this.unreliablePercentage){
        console.log("Dropped response");
        return false;
    }
    if (this.lag){
        window.setTimeout(function(){
            socket.emit("server response", {
            serverPacket: srvPacket
        })

        },this.lagTime)
    }else{
        socket.emit("server response", {
          serverPacket: srvPacket
        })
    }
}

var retrieveLogEntriesForClient = function(verVector, cID, timestamp) {

    console.log("RETRIEVING LOG VERVECTOR="+verVector)
    console.log("LOG LENGTH "+this.log.length)
    var vector = {};
    var logEntries = new Array();
    for(var cid in verVector) {
      vector[cid] = verVector[cid]
    }

    var minTS = timestamp;
    for (var i in vector) {
        if (vector[i] < minTS) {
            minTS = vector[i];
        }
    }
    var index = this.getLogIndex(minTS, 0, this.log.length);
    var logEntry = this.log[index];
    while (logEntry && logEntry.action.timestamp <= timestamp) {
        if (vector[logEntry.action.cid] < logEntry.action.timestamp) {
            logEntries.push(logEntry);    
            vector[logEntry.action.cid] = logEntry.action.timestamp;
        }
        index++
        logEntry = this.log[index];
    }

    //make sure each version vector has a time no lower than the DC_Threshold 
    var d = new Date();
    var time = d.getTime() - this.timeRef - this.DC_THRESHOLD;
    for (var i in vector) {
        if (vector[i] < time) {
            vector[i] = time; 
        }
    } 

    console.log("RETRIEVED ENTRIES NUM="+logEntries.length+" VERVECTOR="+vector)

    return [logEntries, vector];
}   

var replayLog = function(clientTime, actionArray) {

    console.log("REPLAY LOG WITH ACTION ARRAY "+JSON.stringify(actionArray))
    console.log("LOG START LENGTH ="+this.log.length)

    //removes all actions that we have received already
    for(var i = actionArray.length-1; i >= 0 ;i--) {
      if(this.isActionReceived(actionArray[i])) {
        actionArray.splice(i, 1)
      } else {
        // say it's received
        this.receivedActions[actionArray[i].uuid] = true
      }
    }
    
    var date = new Date()
    var time = date.getTime();
    
    //if disconnected for too long
    if (clientTime < time - this.timeRef - this.DC_THRESHOLD) {
        for (var i = 0; i < actionArray.length; i++) {
            this.invalidateActionObject(actionArray[i]);
        }
        return
    } 
    var actionIndex = 0;
    //remove early/illegal objects
    console.log("REMOVING ILLEGAL OBJECTS")
    if(actionArray.length == 0) {
      return false
    }
    while (actionArray[actionIndex].timestamp <= this.lastClientTimes[actionArray[actionIndex].cid]) {
        //first check if already received
        console.log("REMOVED ILLEGAL OBJECT")
        this.invalidateActionObject(actionArray[actionIndex]);
        actionIndex += 1;
        
        if (actionIndex >= actionArray.length) {
            return false;
        }
    }

    //only legal objects left in array
    console.log("GETTING LOCATION IN LOG FOR FIRST LEGAL OBJECT")

    var minTS = actionArray[actionIndex].timestamp;
//    console.log("MINTS: "+minTS+ " clientTime " + clientTime + " diff "+ (time - this.timeRef))

    var disconnectedTooLong = false;
    if (minTS <= time - this.timeRef - this.DC_THRESHOLD) {
        disconnectedTooLong = true;
        minTS = clientTime;
    }

    var minTSindex = this.getLogIndex(minTS, 0, this.log.length);
    var currentGameState = this.log[minTSindex].gameState; 
    var logIndex = minTSindex+1;

    console.log("REPLAYING LOG")
    while (actionArray[actionIndex]  && actionArray[actionIndex].timestamp <= Math.min(clientTime, time - this.timeRef)) {
        console.log("actionArray.length "+actionArray.length)
      console.log("FAST FORWARDING, CURRENT INDEX="+actionIndex)

        if (disconnectedTooLong) {
            actionArray[actionIndex].timestamp = clientTime;
        }

        while (this.log[logIndex] && this.log[logIndex].action.timestamp < actionArray[actionIndex].timestamp) {
            // get proper syntax for revision checking
            if (this.log[logIndex].action.revision === false) {
                var ok = this.updateGameState(logIndex,currentGameState);
                currentGameState = this.log[logIndex].gameState;
            }
            logIndex += 1;
        }

        //now apply the current action object that we got out of the actionArray
        //and insert the new entry into that location
        console.log("APPLYING, CURRENT INDEX="+actionIndex)
        
        var appliedAction = this.apply(actionArray[actionIndex], currentGameState);
        var entry = new LogEntry(actionArray[actionIndex], appliedAction[1]);

        console.log("ADDING NEW LOG "+actionArray[actionIndex])
        console.log("logIndex+1 "+ (logIndex+1)+" log.length "+ this.log.length);
        console.log("ENTRY: "+entry);
        //this.log=this.log.splice(logIndex+1,0,entry);
        var log1 = this.log.slice(0, logIndex+1);
        var log2 = this.log.slice(logIndex+1, this.log.length);

        log1 = log1.concat(entry);
        log1 = log1.concat(log2);

        this.log = log1;
        console.log("LOG ENTRY "+ this.log[logIndex+1]);
        currentGameState = appliedAction[1];
        logIndex += 1;

        actionIndex += 1;
    } 

    console.log("FAST FORWARD TO END")
    while (logIndex < this.log.length) {
        if (this.log[logIndex].action.revision === false) {
            var ok = this.updateGameState(logIndex, currentGameState);
            currentGameState = this.log[logIndex].gameState;
            logIndex += 1;
        }
    }    

    console.log("REMOVING BAD OBJECTS AFTER LOG")
    for (var j = actionIndex; j < actionArray.length; j++) {
        this.invalidateActionObject(actionArray[j]);
        
        j += 1;
    }

    console.log("LOG END LENGTH "+this.log.length)
}

var updateGameState = function(index, currentGameState) {
    var appliedAction = this.apply(this.log[index].action, currentGameState);

    //take a second look at this revision append to the end of the log

    if (appliedAction[0] !== null) {
        // get proper syntax for revision checking
        appliedAction[0].revision = true;
        this.log[index].action = appliedAction[0];
        
        var date = new Date();
        appliedAction[0].timestamp = date.getTime() - this.timeRef;
        var entry = new LogEntry(appliedAction[0], appliedAction[1]);
        this.log.concat(entry);
    }            

    this.log[index].gameState = appliedAction[1];
    return true;
} 

function clone_gamestate(gameState) {
  var new_game_board = []
  for(var i = 0; i < 15; i++) {
    var row = []
    for(var j = 0; j < 15; j++) {
      var sq = gameState[i][j]
      row.push({
        cid: sq.cid,
        shipid: sq.shipid,
        hit: sq.hit,
        shotLocX: sq.shotLocX,
        shotLocY: sq.shotLocY,
        shotcid: sq.shotcid
      })
    }
    new_game_board.push(row)
  }
  var new_shots_fired = clone_shots_fired(gameState.shotsFired);
  var new_ship_array = clone_ship_array(gameState.shipArray);
  
  var new_game_state = new GameState(new_game_board,new_ship_array,new_shots_fired);
  return new_game_state

}

function clone_shots_fired(shots_fired) {
  var new_shots_fired = {}
    //format gameboard[x][y] 15x15;

    for (var cID in shots_fired) {
        new_shots_fired[cID] = shots_fired[cID]
    }
    return new_shots_fired
}

function clone_ship_array(shipArray) {
    var newShipArray = {};

    for (var shipid in shipArray) {
        newShipArray[shipid] = shipArray[shipid];   
    }
    return newShipArray; 
}

var apply = function(action, gameState, shots_fired) {
    console.log("APPLYING")
    var rtnArray = new Array();
    var newGameState = clone_gamestate(gameState);

    if (action.result === "invalidated") {
        rtnArray[0] = null;
        rtnArray[1] = newGameState;
        return rtnArray;
    }
    var targetX = action.data.loc.x
    var targetY = action.data.loc.y

    var sourceID = shipHash(action.data.ship_id, action.cid);
    var source = gameState.shipArray[sourceID];
    
    //check if source is even still alive
    if (source.isAlive === 0) {
        action.result = "invalidated";
        rtnArray[0] = action;
        rtnArray[1] = newGameState;
        return rtnArray;
    }   
    
    var target = gameState.gameBoard[targetX][targetY];
    if (target.cid === action.cid) {
        action.result = "invalidated";
        rtnArray[0] = null;
        rtnArray[1] = newGameState;
        return rtnArray;
    }


    //fired too many shots
    if(new_shots_fired[action.cid] + 1 > action.timestamp/1000) {
        action.result = "invalidated";
        rtnArray[0] = null;
        rtnArray[1] = newGameState;
        return rtnArray;
    }
    if (target.shipid !== null) {
        //a ship has been hit
        action.result = "hit"
        var targetID = shipHash(target.shipid, target.cid);
        var ship = gameState.shipArray[targetID];
        if (ship.isAlive !== 0) {
            //target is not dead, determine if it's a true hit
            //or if square has already been hit
            
            var offset = 10;
            if (ship.dir === "vert") {
                offset = targetY - ship.topLeftLoc.y;
            } else {
                offset = targetX - ship.topLeftLoc.x;
            }
            
            var mask = 1<<offset;
            var beenHit = ship.isAlive & mask;
            ship.isAlive = ship.isAlive & (~mask);
          
            if (beenHit !== 0) {
                newGameState.gameBoard[targetX][targetY].hit = true;
                newGameState.gameBoard[targetX][targetY].shotLocX = source.topLeftLoc.x;
                newGameState.gameBoard[targetX][targetY].shotLocY = source.topLeftLoc.y;
                if(source.dir == "vert") {
                  newGameState.gameBoard[targetX][targetY].shotLocY += source.length/2;
                } else if(source.dir == "horiz") {
                  newGameState.gameBoard[targetX][targetY].shotLocX += source.length/2;
                }
                newGameState.gameBoard[targetX][targetY].shotcid= action.cid;
            }

            this.gameOver = true;

            if (ship.isAlive === 0) {
                //ship died, check if game over 
                this.winner = -1;
                for (var hash in gameState.shipArray) {
                    if (gameState.shipArray[hash].isAlive !== 0) {
                        //a ship that's alive
                        if (this.winner !== -1 && this.winner !== shipReverseHash(hash)) {
                            this.gameOver = false;
                            break;
                        }
                        this.winner = shipReverseHash(hash); 
                    }
                }
            }
            //record the hit in the gamestate
            //also possible that this square was already hit
            //but ship not sunk
            //what do we do - hit or miss?
        }
    } else {
      action.result = "miss"
      newGameState.gameBoard[targetX][targetY].hit = false;

      newGameState.gameBoard[targetX][targetY].shotLocX = source.topLeftLoc.x;
      newGameState.gameBoard[targetX][targetY].shotLocY = source.topLeftLoc.y;
      if(source.dir == "vert") {
        newGameState.gameBoard[targetX][targetY].shotLocY += source.length/2;
      } else if(source.dir == "horiz") {
        newGameState.gameBoard[targetX][targetY].shotLocX += source.length/2;
      }
      newGameState.gameBoard[targetX][targetY].shotcid= action.cid;

    }
    newGameState.shotsFired[action.cid] += 1
    console.log("SHOTS FIRED FOR CID="+action.cid+" SHOTS="+newGameState.shotsFired[action.cid]+" TIME="+(action.timestamp/1000))
    
    rtnArray[0] = null;
    rtnArray[1] = newGameState;

    return rtnArray;
}

var invalidateActionObject = function(action) {
    action.result = "invalidated";
    action.revision = true
    action.timestamp = new Date().getTime() - this.timeRef // set to serverTime
    var entry = new LogEntry(action, null);
    var ok = this.insertLogEntry(entry);
}
