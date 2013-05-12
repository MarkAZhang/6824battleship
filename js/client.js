//<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
//<script src="/socket.io/socket.io.js"></script>

//OBJECTS
function ClientPacket(startTime, actionObjects, versionVector, cid){
  var time=new Date.getTime()/1000;
  this.currentTime=time-startTime;
  this.actionObjects=actionObjects;
  this.versionVector;
  this.cid=cid;
}


function ActionObject(cid, type, data, committed){
  this.data=data;
  this.cid=cid;
  this.objType=type;
  this.committed=committed;

  function setTimestamp(startTime){
    var time=new Date.getTime()/1000;
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
  this.serverTime=currentTime;
  
  this.versionVector=new Array();
  //initialize version vector
  for (var i=0; i<this.numPlayers; i++){
    this.versionVector[i]=0;
  }
  function setStartTime(){
    this.startTime=new Date().getTime()/1000;
  }
  
  //Adds actionobject to client queue with uuid and sets timestamp of action
  function sendAction(object, uuid){
    object.uuid=uuid;
    object.setTimestamp(this.startTime);
    this.queue.push(object);
  }

  //If the server has not yet responded, actions returns the same object that was passed into sendAction(). If the server has responded, the object will be modified. The object may change several times if the action changes several times on the server due to reconnects.
  function getUpdatedActionObject(uuid){
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
  function getMessageQueue(){
    return this.queue;
  }

  //returns all log entries that have been added to the log since the last call to getNewLogEntries()

  function getNewLogEntries() {
    temp=this.lastCall;
    this.lastCall=this.log.length;
    
    return this.log.slice(temp, this.lastCall);
  }

  //    returns the most recent n log entries. If n<0 or n>log.length, all log entries are returned.
  //Note that the client does not necessarily receive log entries from the server in chronological order (due to re-connects). If a new log entry is inserted into the middle of the log, getLastLogEntries might not return it, but getNewLogEntries definitely will.


  function getLastLogEntries(n) {
    if( n<0 || n> this.log.length){
      return this.log;
    }
    return this.log.slice(0,n);
  }



  //    this method is called once every second. It creates a client-packet (see below) containing the actions that need to be sent and other relevant info, and then sends it to the server.

  function sendActionsToServer() {
    var data=new ClientPacket(this.startTime, this.queue, this.versionVector, this.cid)
    this.io.emit('send action', data)

  }
  //    this method is called whenever a client receives a server-packet containing data from the server. The method will update all the client data structures based on the new info from the server.
  function receiveDataFromServer(serverPacket) {
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
    this.serverTime=serverPacket.currentTime;
  }

  function getGameState(){
    return this.gameState;
  }

  this.io.on('server response', function(data){receiveDataFromServer(data)})
  var tick=setInterval(function(){sendActionsToServer()},1000);
  
}
