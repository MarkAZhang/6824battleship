var canvasWidth, canvasHeight, sidebarWidth, boardWidth, boardHeight;
var ctx, canvas, bg_canvas, bg_ctx
var cur_game_state = null
var last_time

window.onload = function() {

  canvasWidth = 600;
  canvasHeight = 600;

  //size of the central battleship board
  boardWidth = canvasWidth;
  boardHeight = canvasHeight

  sidebarWidth = 200;



  // screen setup
  canvas = document.getElementById("canvas");
  canvas_container = document.getElementById("canvas_container");
  canvas.width = canvasWidth;
  canvas.height =  canvasHeight;
  canvas_container.style.width = canvasWidth + 'px'
  canvas_container.style.height = canvasHeight + 'px'

  bg_canvas = document.getElementById("bg_canvas");
  bg_canvas_container = document.getElementById("bg_canvas_container");
  bg_canvas.width = canvasWidth;
  bg_canvas.height =  canvasHeight;
  bg_canvas_container.style.width = canvasWidth + 'px'
  bg_canvas_container.style.height = canvasHeight + 'px'

  log_container =  document.getElementById("log_container");
  log_container.style.width = sidebarWidth + 'px';
  log_container.style.height = boardHeight + 'px';

  title_container =  document.getElementById("title_container");
  title_container.style.width = sidebarWidth + 'px';
  title_container.style.height = boardHeight + 'px';

  ctx = canvas.getContext('2d');
  bg_ctx = bg_canvas.getContext('2d');

  //event listeners

  window.addEventListener('mousemove', on_mouse_move, false);
  window.addEventListener('mouseup', on_mouse_up, false);
  window.addEventListener('mousedown', on_mouse_down, false);
  window.addEventListener('keydown', on_key_down, false);
  window.addEventListener('keyup', on_key_up, false);
  window.addEventListener('dblclick', on_mouse_dbl_click, true);

  centerCanvas()
  
  cur_game_state = new LobbyState()

  last_time = (new Date()).getTime()

  step()

}

function centerCanvas() {
  var dim = getWindowDimensions()

    if(canvasWidth < dim.w)
    {
      offset_left = (dim.w-canvasWidth)/2
      canvas_container.style.left =  Math.round(offset_left) + 'px'
      bg_canvas_container.style.left =  Math.round(offset_left) + 'px'
      log_container.style.left = (Math.round(offset_left)+boardWidth) + 'px'
      title_container.style.left = (Math.round(offset_left)-sidebarWidth) + 'px'
    }
    else
    {
      offset_left = 0
    }
    if(canvasHeight < dim.h)
    {
      offset_top = (dim.h-canvasHeight)/2
      canvas_container.style.top = Math.round(offset_top) + 'px'
      bg_canvas_container.style.top =  Math.round(offset_top) + 'px'
      log_container.style.top =  Math.round(offset_top) + 'px'
      title_container.style.top =  Math.round(offset_top) + 'px'
    }
    else
    {
      offset_top = 0
    }
}

function getWindowDimensions() {
  var winW = 800, winH = 600;
  if (document.body && document.body.offsetWidth) {
   winW = document.body.offsetWidth;
   winH = document.body.offsetHeight;
  }
  if (document.compatMode=='CSS1Compat' &&
      document.documentElement &&
      document.documentElement.offsetWidth ) {
   winW = document.documentElement.offsetWidth;
   winH = document.documentElement.offsetHeight;
  }
  if (window.innerWidth && window.innerHeight) {
   winW = window.innerWidth;
   winH = window.innerHeight;
  }

  return {w: winW, h: winH}
}

function step() {

  var cur_time = (new Date()).getTime()
  ctx.globalAlpha = 1;
  dt = cur_time - last_time

  cur_game_state.update(dt)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  cur_game_state.draw(ctx, bg_ctx);

  last_time = cur_time
  var temp_dt = (new Date()).getTime() - cur_time
  step_id = setTimeout('step()', Math.max(25 - temp_dt, 1))

}

function on_mouse_move(event) {
  var mPos = getCursorPosition(event)  
  cur_game_state.on_mouse_move(mPos)
}

function on_mouse_down(event) {
  var mPos = getCursorPosition(event)  
  cur_game_state.on_mouse_down(mPos)
}

function on_mouse_up(event) {
  var mPos = getCursorPosition(event)  
  cur_game_state.on_mouse_up(mPos)
}

function on_mouse_dbl_click(event) {
  var mPos = getCursorPosition(event)  
  cur_game_state.on_mouse_dbl_click(mPos)
}

function on_key_down(event) {
  var keyCode = event==null? window.event.keyCode : event.keyCode;
  cur_game_state.on_key_down(keyCode)
}


function on_key_up(event) {
  var keyCode = event==null? window.event.keyCode : event.keyCode;
  cur_game_state.on_key_up(keyCode)
}

function getCursorPosition(e){

    var x;
    var y;
    if (e.pageX || e.pageY) {
      x = e.pageX;
      y = e.pageY;
    }
    else {
      x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    x -= offset_left;
    y -= offset_top;
    return new Loc(x, y)

}

function switch_game_state(game_state) {
  cur_game_state.destroy()
  cur_game_state = game_state
}

