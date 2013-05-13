if(typeof exports === "undefined") {
  exports = this
}

exports.ActionObject = ActionObject


//<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
//<script src="/socket.io/socket.io.js"></script>

//OBJECTS
function ClientPacket(startTime, actionObjects, versionVector, cid){

  var time=new Date().getTime();
  this.currentTime=time-startTime;
  this.actionObjects=actionObjects;
  this.versionVector = versionVector;
  this.cid=cid;
}


function ActionObject(cid, type, data, committed){
  this.data=data;
  this.cid=cid;
  this.objType=type;
  this.committed=committed;

  function setTimestamp(startTime){
    var time=new Date().getTime();
    this.timestamp=time-startTime;
  }
}


//function Client(numPlayers, io, cid){
// we don't need other servers. The central server will handle that for us. We only communicate with central server.

function Client(numPlayers, io, cid){
  //const values for client
  
  this.cid=cid;
  this.io=io;
  this.numPlayers=numPlayers;

  //array of actionObject's
  this.log=new Array();
  this.queue=new Array();
  this.responses={};
  this.lastCall=0;
  this.lastCommitted=0;
    
  this.gameState=null;
  this.startTime = 0;
  
  this.versionVector=new Array();

  //initialize version vector
  for (var i=0; i<this.numPlayers; i++){
    this.versionVector[i]=0;
  }
  function setStartTime(){
    this.startTime=new Date().getTime();
  }
  
  //Adds actionobject to client queue with uuid and sets timestamp of action
  this.sendAction = function(object, uuid){
    object.uuid=uuid;
    object.setTimestamp(this.startTime);
    this.queue.push(object);
  }

  //If the server has not yet responded, actions returns the same object that was passed into sendAction(). If the server has responded, the object will be modified. The object may change several times if the action changes several times on the server due to reconnects.
  this.getUpdatedActionObject = function(uuid){
    if (responses[uuid]==false){
      for(var i=0; i<this.queue.length; i++){
        if(this.queue[i].uuid==auuid){
          return this.queue[i];
        }
      }
    }else{
      for(var i=0; i<this.log.length; i++){
        if(this.log[i].uuid==uuid){
          return this.log[i];
        }
      }

    }
  }
  //Returns an array of all objects that are in the message queue. Allows the application to access actions that have not been recognized by the server yet.
  this.getMessageQueue = function(){
    return this.queue;
  }

  //returns all log entries that have been added to the log since the last call to getNewLogEntries()

  this.getNewLogEntries = function() {
    temp=this.lastCall;
    this.lastCall=this.log.length;
    
    return this.log.slice(temp, this.lastCall);
  }

  //    returns the most recent n log entries. If n<0 or n>log.length, all log entries are returned.
  //Note that the client does not necessarily receive log entries from the server in chronological order (due to re-connects). If a new log entry is inserted into the middle of the log, getLastLogEntries might not return it, but getNewLogEntries definitely will.


  this.getLastLogEntries = function(n) {
    if( n<0 || n> this.log.length){
      return this.log;
    }
    return this.log.slice(0,n);
  }



  //    this method is called once every second. It creates a client-packet (see below) containing the actions that need to be sent and other relevant info, and then sends it to the server.

  this.sendActionsToServer = function(client) {
    var data=new Object();

    data.clientPacket=new ClientPacket(client.startTime, client.queue, client.versionVector, client.cid)
    console.log(data.clientPacket)
    data.clientPacket=new ClientPacket(client.startTime, client.queue, client.versionVector, client.cid);
    client.io.emit('send action', data);

  }
  //    this method is called whenever a client receives a server-packet containing data from the server. The method will update all the client data structures based on the new info from the server.
  this.receiveDataFromServer = function(serverPacket) {
    console.log('Start processing server response');
    this.versionVector=serverPacket.versionVector;
    this.gameState=serverPacket.gameState;
    
    for (actionObject in serverPacket.actionObjectArray){
      responses[actionObject.uuid]=true;
      if (actionObject.objType=='initial'){
        for(var i=0; i<this.queue.length; i++){
          if(this.queue[i].uuid==actionObject.uuid){
            this.queue.splice(i);
            break;
          }
        }
        this.log.push(actionObject);
      } else if (actionObject.objType=='revision'){
        for(var i=0; i<this.log.length; i++){
          if(this.log[i].uuid==actionObject.uuid){
            this.log.splice(i);
            break;
          }
        }
        this.log.push(actionObject);

      }
    }
    for(var i=this.lastCommitted; i< this.log.length; i++){
      if (this.log[i].timestamp < serverPacket.currentTime){
        this.log[i].committed=true;
      }else{
        this.lastCommitted=i;
        break;
      }

    }

    if (serverPacket.currentTime<this.serverTime){
      for(var i=this.queue.length-1; i>=0; i--){
        if (this.queue[i].timestamp>serverPacket.currentTime){
          this.queue.splice(i,1);
        }
      }
    }
    //this.serverTime=serverPacket.currentTime;
  }

  this.getGameState = function(){
    return this.gameState;
  }

  var _this = this
  this.io.on('server response', function(data){
    _this.receiveDataFromServer(data.serverPacket);
  })

  var tick=setInterval(function(){_this.sendActionsToServer(_this)},1000);
  
}
