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

function BSServer() {
    // Server fields 
    this.log = new Array();  
    this.lastClientTimes = new Array();
    this.receivedActions = new Array();
    this.timeRef = null;
    this.DC_THRESHOLD = 10000;

    // Server methods
    this.actionHash = actionHash;
    this.getLogIndex = getLogIndex;
    this.insertLogEntry = insertLogEntry; 
    this.isActionReceived = isActionReceived;  
    this.receiveDataFromClient = receiveDataFromClient;
    this.retrieveLogEntriesForClient = retrieveLogEntriesForClient;  
    this.replayLog = replayLog;
    this.updateGameState = updateGameState;
}

function ServerPacket(entries, time, vector, gameState) {
    this.logEntries = entries;
    this.time = time;
    this.verVector = vector;
    this.gameState = gameState;
}

function LogEntry(action, gameState) {
    this.action = action;
    this.gameState = gameState;
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


var startNewGame = function() {

    //when we start a new game, input the first entry into the log
    //which should be the initial game state and a null actionObject
    //with a timestamp of -10,000 so that no action can precede
    //it. we use that value because it is always less than
    //serverTime - DC_THRESHOLD 

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

// Uses binary search to find the index of the log entry with value time
//
// return index
var getLogIndex = function(time, lo, hi) {
    var i = Math.floor((lo + hi)/2);
    var midpoint = this.log[i]; 
    if (midpoint.action.timestamp === time) {
        return i; 
    } else if ((lo-hi) === 1) {
        return lo;
    } else {
        if (midpoint.action.timestamp > time) {
            return this.getLogIndex(time, lo, midpoint); 
        } else {
            return this.getLogIndex(time, midpoint, hi); 
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
    var hash = this.actionHash(action);
    for (var i = 0; i < this.receivedActions.length; i++) {
        if (this.receivedActions[i] === hash) {
            return true;
        }
    }
    return false;
}

var receiveDataFromClient = function(clientPacket) {
    //unpack Client information
    var cID = clientPacket.clientID;
    var actionObjArr = clientPacket.actionObjectArray;
    var clientTime = clientPacket.clientCurrentTime;
    var vector = clientPacket.versionVector;
//make sure received actions gets updated

    //update Server state
    this.lastClientTimes[cID] = clientTime;
    this.replayLog(clientTime, actionObjArr);

    // note this is an array of [entries,version vector] objects
    var logEntries = this.retrieveLogEntriesForClient(vector, cID, clientTime);
    var date = new Date();
    var time = date.getTime() - this.timeRef;
    var i = this.getLogIndex(clientTime, 0, this.log.length);
    if (i !== -1) {
        var srvPacket = new ServerPacket(logEntries[0], time, logEntries[1], logEntries[i-1].gameState);  
    }
       
    //handle -1 case
    //send srvPacket to client
}

var retrieveLogEntriesForClient = function(verVector, cID, timestamp) {
    var vector = new Array();
    var logEntries = new Array();
    for (var i = 0; i < verVector.length; i++) {
        vector = vector.concat(verVector[i]); 
    }       

    var minTS = timestamp;
    for (var i in vector) {
        if (vector[i] < minTS) {
            minTS = vector[i];
        }
    }
    var index = this.getLogIndex(minTS, 0, this.log.length);
    var logEntry = this.log[index];
    while (logEntry.action.timestamp <= timestamp) {
        if (vector[logEntry.action.cID] <= logEntry.action.timestamp) {
            if (this.isRelevantToClient(logEntry, cid)) {
                logEntries.concat(logEntry);    
            }
            vector[logEntry.action.clientID] = logEntry.action.timestamp;
        }
        logEntry = this.log[index + 1];
    }

    //make sure each version vector has a time no lower than the DC_Threshold 
    var d = new Date();
    var time = d.getTime() - this.timeRef - this.DC_THRESHOLD;
    for (var i = 0; i < vector.length; i++) {
        if (vector[i] < time) {
            vector[i] = time; 
        }
    } 

    return [logEntries, vector];
}   

var replayLog = function(clientTime, actionArray) {
    var date = new Date()
    var time = date.getTime();
    
    if (clientTime < time - this.timeRef - this.DC_THRESHOLD) {
        for (var i = 0; i < actionArray.length; i++) {
            actionArray[i].timestamp = time - this.timeRef;
            this.invalidateActionObject(actionArray[i]);
            var entry = new LogEntry(actionArray[i], null);
            var ok = this.insertLogEntry(entry);
            this.receivedActions = this.receivedActions.concat(this.actionHash(actionArray[i]));
        }
    } 
    var actionIndex = 0;
    //remove early/illegal objects
    while (actionArray[actionIndex].timestamp <= this.lastClientTimes[actionArray[actionIndex].clientID]) {
        if (this.isActionReceived(actionArray[actionIndex]) {
            actionIndex += 1;
            continue;
        } 
        actionArray[actionIndex].timestamp = date.getTime() - this.timeRef;
        this.invalidateActionObject(actionArray[actionIndex]);
        var entry = new LogEntry(actionArray[actionIndex], null);
        var ok = this.insertLogEntry(entry);
        this.receivedActions = this.receivedActions.concat(this.actionHash(actionArray[actionIndex]));
        
        actionIndex += 1;
        
        if (actionIndex >= actionArray.length) {
            return false;
        }
    }

    //only legal objects left in array

    var minTS = actionArray[actionIndex].timestamp;

    if (minTS > Math.min(clientTime, time - this.timeRef)) {
        return false;
    }

    var disconnectedTooLong = false;
    if (minTS <= time - this.timeRef - this.DC_THRESHOLD) {
        disconnectedTooLong = true;
        minTS = clientTime;
    }

    var minTSindex = this.getLogIndex(minTS, 0, this.log.length);
    var currentGameState = this.log[minTSindex-1].gameState; 
    var logIndex = minTSindex;

    while (actionArray[actionIndex].timestamp <= Math.min(clientTime, time - this.timeRef)) {
        if (this.isActionReceived(actionArray[actionIndex])) {
            actionIndex += 1;
            continue;
        }

        if (disconnectedTooLong) {
            actionArray[actionIndex].timestamp = clientTime;
        }

        while (this.log[logIndex].action.timestamp < actionArray[actionIndex].timestamp) {
            // get proper syntax for revision checking
            if (this.log[logIndex].action.revision === false) {
                var ok = this.updateGameState(logIndex,currentGameState);
                currentGameState = this.log[logIndex].gameState;
                logIndex += 1;
            }
        }
        //now apply the current action object that we got out of the actionArray
        //and insert the new entry into that location
        
        var appliedAction = this.apply(actionArray[actionIndex], currentGameState);
        var entry = new LogEntry(appliedAction[0], appliedAction[1]);
        
        var log1 = this.log.slice(0, logIndex+1);
        var log2 = this.log.slice(logIndex+1, this.log.length);
        log1 = log1.concat(entry);
        log1 = log1.concat(log2);
      
        this.log = log1;
        currentGameState = appliedAction[1];
        logIndex += 1;

        actionIndex += 1;
    } 
    while (logIndex < this.log.length) {
        if (this.log[logIndex].action.revision === false) {
            var ok = this.updateGameState(logIndex, currentGameState);
            currentGameState = this.log[logIndex].gameState;
            logIndex += 1;
        }
    }    
    for (var j = actionIndex; j < actionArray.length; j++) {
        if (this.isActionReceived(actionArray[j]) {
            j += 1;
            continue;
        } 
        actionArray[j].timestamp = date.getTime() - this.timeRef;
        this.invalidateActionObject(actionArray[j]);
        var entry = new LogEntry(actionArray[j], null);
        var ok = this.insertLogEntry(entry);
        this.receivedActions = this.receivedActions.concat(this.actionHash(actionArray[j]));
        
        j += 1;
    }
}

var updateGameState = function(index, currentGameState) {
    var appliedAction = this.apply(this.log[logIndex].action, currentGameState);


    //take a second look at this revision append to the end of the log

    if (appliedAction[0] !== null) {
        // get proper syntax for revision checking
        //appliedAction[0].revision = true;
        var entry = new LogEntry(appliedAction[0], appliedAction[1]);
        //this.insertLogEntry(entry);
        this.log.concat(entry);
        this.log[index].action = appliedAction[0];
    }            

    this.log[index].gameState = appliedAction[1];
    return true;
} 

var shipHash(shipID, cID) {
    return shipID + cID<<3;
}

var apply = function(action, gameState) {
    if (action.invalidated === true) {
        return;
    }
    var targetX = action.target.x
    var targetY = action.target.y
    var sourceX = action.source.x
    var sourceY = action.source.y 

    var source = gameState[sourceY][sourceX];
    var sourceID = shipHash(source.shipID, source.clientID);
    

    //check if source is even still alive

}
