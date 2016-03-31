// (c) 2013 Baghera
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//true in dev mode
var _isDebug = false;

/***********************************************************************************************************************
 *
 * INITIALIZATION
 *
 **********************************************************************************************************************/

document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
	app.initialize();
}

/***********************************************************************************************************************
 *
 * GLOBAL VARIABLES
 *
 **********************************************************************************************************************/

//UUID of the connected device
var _uuid = 'offline';

//Maximum number of bytes that can be sent to RFDuino
var _MAXDATASIZE = 18;

//Maximum number of attempts to send data to RFDuino before giving up
var _MAXATTEMPTS = 20;

//True if device is found
var _found = false;

//True if device is connected
var _connected = false;

//Time (in seconds) allocated to search RFduino
var _searchDelay = 3; // in seconds

//Number of LEDs on X axis
var _nbLedX = 4;

//Number of LEDs on Y axis
var _nbLedY = 4;

//grid[nb][x][y]={pos,color}
var _grid = null;///[]; _grid[0] = [];

//leds[nb][pos]={x,y,color}
var _leds = []; _leds[0] = [];

//_layout[x][y]={nb}
var _layout = [];

//tile clicked in edit layout mode = {x,y,nb}
var _selectedTile = {};

//Number of _nbLedX x _nbLedY tiles
var _nbTiles = 1;

//Size of the Tiles layout (X)
var _nbTilesX = 1;

//Size of the Tiles layout (Y)
var _nbTilesY = 1;

//Color picked by user in colorPicker
var _pickedColor = '000000';

//true when RFDuino is processing data
var _processing = false;

//Time to wait before trying again to send data to RFDuino when processing (in ms)
var _sendDelay = 5;

//Number of attempts to send chunk of data to RFDuino
var _nbAttempts = 0;

//true when editing tiles layout
var _isEditMode = false;

//Tile that has been selected in layout to be moved
var _tileToMove = null;

//window height and width
var _windowHeight, _windowWidth;

/***********************************************************************************************************************
 *
 * UI INIT FUNCTIONS
 *
 **********************************************************************************************************************/

 function loadVars() {
 	try{
		_grid = JSON.parse(localStorage.getItem('bahgera.grid#' + _uuid));
		_layout = JSON.parse(localStorage.getItem('bahgera.layout#' + _uuid));
		_leds = JSON.parse(localStorage.getItem('bahgera.leds#' + _uuid));
		var tiles = JSON.parse(localStorage.getItem('bahgera.tiles#' + _uuid));
		_nbTiles = tiles.nbTiles;
		_nbTilesX = tiles.nbTilesX;
		_nbTilesY = tiles.nbTilesY;
	} catch(e){
		log('Failed to parse variables from storage');
	}
	if(!_grid || !_layout || !_leds || !_grid[0] || !_leds[0]) {
	    _grid = []; _grid[0] = [];
	    _leds = []; _leds[0] = [];
	    _layout = [];
		initGrid(0);
		initLayout();
	} else {
		log('Retrieved grid from local storage');
	}
 }

 function saveVars() {
	localStorage.setItem('bahgera.grid#' + _uuid, JSON.stringify(_grid));
	localStorage.setItem('bahgera.layout#' + _uuid, JSON.stringify(_layout));
	localStorage.setItem('bahgera.leds#' + _uuid, JSON.stringify(_leds));
	localStorage.setItem('bahgera.tiles#' + _uuid, JSON.stringify({ nbTiles: _nbTiles, nbTilesX: _nbTilesX, nbTilesY: _nbTilesY }));
 }

//Draws search bar when searching device
function buildSpinner() {
 	var square = new Sonic({
    width: 100,
    height: 100,
    fillColor: 'blue',
    path: [
        ['line', 10, 10, 90, 10],
        ['line', 90, 10, 10, 10]
    ]
	});
	square.play();
	$('#search').append(square.canvas);
}

//Compute the length of a tile (in pixels)
function getTileSize() {
	return Math.floor(Math.min(_windowHeight/2/_nbTilesY, _windowWidth/_nbTilesX)*0.8);
}

//Generates HTML for the color picker in the Test section
function drawColorPicker() {
	var colorTable = '<table id="colorTable">';
	var palette = ['000000','555555','AAAAAA','FFFFFF','FF0000','00FF00','0000FF','FFFF00',
		'FF00FF','00FFFF','0055AA','55AAFF','AAFF00','FF0055','AA5500','5500FF'];
	var colorHeight = Math.floor((_windowHeight*0.6-(getTileSize()+20)*_nbTilesY)/4);
	var width  = Math.floor((_windowWidth - 5) / 4);
	for(var i=0;i<4;i++) {
		colorTable+= '<tr>';
		for(var j=0;j<4;j++) {
			var color = palette[i*4+j];
			colorTable+='<td style="border-width:1px;border-color:black;border-style:solid;'
				+ 'width:' + width + 'px;height:' + colorHeight +'px;'
				+ 'background-color:#' + color + ';color:#' + color + '" '
				+ 'color="' + color + '">-</td>';
		}
		colorTable+= '</tr>';
	}
	colorTable+= '</table>';
	$("#colorPicker").html(colorTable);
	$('#colorPicker').on('tap', colorPicked);
	$('#colorPicker').on('taphold', switchColor);
}

/**
 * Generates LED grid
 * @param {doEditLayout} true when editing the tiles layout
 */
function drawGrid(doEditLayout) {
	log('Draw grid');
	saveVars();
	var html = '<table id="gridTable"><tr><td></td>';
	var size = getTileSize();
	if(doEditLayout) { size = size * 0.8; }
	for(var x=0;x<_nbTilesX;x++) {
		if(doEditLayout) { html+='<td x="' + x + '" y="-1" class="addTile">+</td>'; }
		else { html+='<td x="' + x + '" y="-1"></td>'; }
	}
	html+='<td></td></tr>';
	for(var y=0;y<_nbTilesY;y++) {
		if(doEditLayout) { 
			html += '<tr><td style="width:' + size + 'px;height:' + size + 'px" x="-1" y="' + y +'" class="addTile">+</td>';
		} else {
			html += '<tr><td style="width:' + size + 'px;height:' + size + 'px" x="-1" y="' + y +'"></td>';
		}
		for(var x=0;x<_nbTilesX;x++) {
			var tile = _layout[x][y].nb - 1;
			html+= '<td x="' + x + '" y="' + y +'" nb="' + (tile+1)
				+ '" style="width:' + size + 'px;height:' + size + 'px"';
			if(tile >= 0) {
				html+= ' class="tile"><table class="tile" x="' + x + '" y="' + y +'" >';
				for(var lx=0;lx<_nbLedX;lx++) {
					html += '<tr>';
					for(var ly=0;ly<_nbLedY;ly++) {
						var color = _grid[tile][lx][ly].color;
						//log('grid['+tile+']['+lx+']['+ly+'].color=' + color);
						html+= '<td led="' + _grid[tile][lx][ly].pos + '" nb="' + (tile+1)
							+ '" style="width:' + size/_nbLedX + 'px;height:' + size/_nbLedY 
							+ 'px;background-color:#' + color + ';color:#' + color 
							+ '" x="' + x + '" y="' + y +'" class="ledCell">'
							+ '<img src="img/led.png"' + '" style="width:' + size/_nbLedX + 'px;height:' + size/_nbLedY 
							+ 'px"  class="led" led="' + _grid[tile][lx][ly].pos + '" nb="' + (tile+1) 
							+ '"  x="' + x + '" y="' + y +'"/>'
							+ '</td>';
					}
					html+= '</tr>';
				}
				html+='</table>';
			} else {
				if(doEditLayout) { html+= ' class="addTile">+'; }
				else { html+= '>'; }
			}
			html+='</td>';
		}
		if(doEditLayout) {
			html+= '<td style="width:' + size + 'px;height:' + size + 'px" x="' + _nbTilesX + '" y="' + y +'" class="addTile">+</td></tr>';
		} else {
			html+= '<td style="width:' + size + 'px;height:' + size + 'px" x="' + _nbTilesX + '" y="' + y +'"></td></tr>';
		}
	}
	html+='<tr><td></td>';
	for(var x=0;x<_nbTilesX;x++) {
		if(doEditLayout) { html+='<td x="' + x + '" y="' + _nbTilesY + '" class="addTile">+</td>'; }
		else { html+='<td x="' + x + '" y="' + _nbTilesY + '"></td>'; }
	}
	html+='<td></td></table>';
	$("#gridSelector").html(html);
	$('#gridSelector').unbind('click');
	if(doEditLayout) { 
		$('#gridSelector').on('click', layoutTapped); 
	} else { 
		$('#gridSelector').on('click', ledSelected);
		drawColorPicker(); 
	}
}


/***********************************************************************************************************************
 *
 * MAIN FUNCTIONS
 *
 **********************************************************************************************************************/

var app = { };

app.initialize = function() {
	log('Initializing');
	
	_windowHeight = $(document).height();
	_windowWidth = $(document).width();
	
	$.mobile.loading().hide();
	
	buildSpinner();

	loadVars();
	
	drawGrid();
	$('#canvas').attr('width',_nbLedX + 'px');
	$('#canvas').attr('height',_nbLedY + 'px');
	
  log('Adding deviceready listener');
	document.addEventListener('deviceready', searchDevice, false);
	
	$('#canceTile').click(closeTileMenu);
	$('#moveTile').click(moveTile);
	$('#rotateTile').click(rotateTile);
	$('#deleteTile').click(deleteTile);
	$('#pictureButton').click(getPicture);
	$('#takeNew').click(takeNewPhoto);
	$('#chooseExisting').click(chooseExistingPhoto);
	$('#cancelPhoto').click(closePhoto);
	$('#sendButton').click(send);
	$('#offButton').click(switchOff);
	$('#layoutButton').click(toggleLayoutMode);
	$('#settingsButton').click(showSettings);
	$('#clearLogsButton').click(clearLogs);
	$('#closeSettingButton').click(hideSettings);
	
	if(_isDebug) {
		$('#search').hide();
		$('#test').show();
		$('#toolbar').show();
		$('#settingsButton').show();
	}
};
	
app.onDiscoverDevice = function(device) {
	log('Discovered device ' + device.name);
	if(device.name === 'RFduino') {
		_found = true;
		log('About to connect with UUID='+device.uuid);
		doConnect(device.uuid);
	} else log('Found unknown device "' + device.name + '"');
};
	
app.disconnect = function() {
	log('Disconnecting');
	$("#test").hide();
	rfduino.disconnect(function(){
		log('Disconnected');
		_found = false;
		_connected = false;
		_processing = false;
		_nbAttempts = 0;
		$("#toolbar").hide();
		$("#settingsBar").hide();
		$("#search").html('Searching device...').show();
		buildSpinner();
		log('Searching device...');
		searchDevice();
	}, 
	app.onError);
};
	
app.onError = function(reason) {
	log('ERROR:' + reason);
	app.disconnect();
};


/***********************************************************************************************************************
 *
 * CAMERA FUNCTIONS
 *
 **********************************************************************************************************************/

//Launch the photo menu when the user clicks on the camera icon in the toolbar
function getPicture() {
	$('#toolbar').hide();
	$('#page').fadeTo(500, 0.5);
	$('#photoMenu').slideToggle();
}

//closes the photo menu when the user clicks on Cancel photo
function closePhoto() {
	$('#photoMenu').slideToggle();
	$('#toolbar').show();
	$('#page').fadeTo(500, 1);
}

//lets the user take a new photo
function takeNewPhoto() {
	var cameraOptions = { 
		quality : 50,
		destinationType : Camera.DestinationType.FILE_URI,
		sourceType : Camera.PictureSourceType.CAMERA,
		allowEdit : false,
		encodingType: Camera.EncodingType.PNG,
		targetWidth: _nbLedX * _nbTilesX,
		targetHeight: _nbLedY * _nbTilesY,
		saveToPhotoAlbum: true 
  	};
  	log('cameraOptions=' + JSON.stringify(cameraOptions));
	navigator.camera.getPicture(setGridFromPicture, onCameraError, cameraOptions);
}

//lets the user choose an existing photo
function chooseExistingPhoto() {
	var cameraOptions = { 
		quality : 50,
		destinationType : Camera.DestinationType.FILE_URI,
		sourceType : Camera.PictureSourceType.PHOTOLIBRARY,
		allowEdit : false,
		encodingType: Camera.EncodingType.PNG,
		targetWidth: _nbLedX * _nbTilesX,
		targetHeight: _nbLedY * _nbTilesY,
		saveToPhotoAlbum: false 
  	};
  	log('cameraOptions=' + JSON.stringify(cameraOptions));
	navigator.camera.getPicture(setGridFromPicture, onCameraError, cameraOptions);
}

//If there's an error taking/choosing a photo, we go back to the norma LED grid
function onCameraError(error) { 
	log('Error:' + error); 
	closePhoto();
}

//Reset the LED grid to render the given picture
function setGridFromPicture(imageData){
	try { 
		var canvas = $('#canvas')[0];
		PNG.load(imageData, canvas);
		closePhoto();
		setTimeout(function() {
			var ctx=canvas.getContext("2d");
			//the picture is resized to the LED grid size
			var imgData=ctx.getImageData(0,0,_nbLedX * _nbTilesX,_nbLedY * _nbTilesY);
			var pixels = imgData.data;
			log('nbPixesl = ' + pixels.length + ' (expected ' + (_nbLedX * _nbTilesX * _nbLedY * _nbTilesY * 4) + ')');
			// for(var tile=0;tile<_nbTiles;tile++) {
				for(var y=0;y<_nbTilesY*_nbLedY;y++) {
					for(var x=0;x<_nbTilesX*_nbLedX;x++) {
						// log('x=' + x + ', y=' + y);
						var red =   pixels[(x+y*_nbTilesX*_nbLedX)*4].toString(16);   if(red.length   === 1) { red   = '0' + red;   }
						var green = pixels[(x+y*_nbTilesX*_nbLedX)*4+1].toString(16); if(green.length === 1) { green = '0' + green; }
						var blue =  pixels[(x+y*_nbTilesX*_nbLedX)*4+2].toString(16); if(blue.length  === 1) { blue  = '0' + blue;  }
						//We ignore the Alpha channel, only need the RGB values
						var color = red + green + blue;
						// log('color=' + color);
						var lx = Math.floor(x / _nbLedX);
						var ly = Math.floor(y / _nbLedY);
						var ledx = x % _nbLedX;
						var ledy = y % _nbLedY;
						// log('lx=' + lx + ', ly=' + ly);
						var tile = _layout[lx][ly].nb;
						log('_grid[' + (tile-1) + '][' + ledx + '][' + ledy + ']=pixels[' + (x+y*_nbTilesX*_nbLedX)*4 + ']=' + color);
						_grid[tile-1][ledy][ledx].color = color;
						var pos = _grid[tile-1][ledy][ledx].pos;
						// log('pos=' + pos);
						// log('_leds[' + (tile-1) + '][' + pos + '].color was ' + _leds[tile-1][pos].color);
						_leds[tile-1][pos].color = color;
						$('#gridTable tr td[led=' + pos + '][nb=' + tile + ']').css({'background-color': '#' + color});
					}
				}
			// }
		}, 200);
	} catch(e) {
		log(e);
	}
}


/***********************************************************************************************************************
 *
 * BLUETOOTH FUNCTIONS
 *
 **********************************************************************************************************************/


/**
 * Attempts to discover RFDuino devices 
 */
function searchDevice() {
	log('Searching device...');
	try{
		rfduino.discover(_searchDelay, app.onDiscoverDevice, app.onError);
	} catch(e) {
		log(e);
	}
	setTimeout(function(){
		if(!_found) { searchDevice(); }
	}, _searchDelay * 1000);
}
	
/**
 * Connects with the bluetooth device with the given UUID, hides the list of devices and show the Test page
 */
function doConnect(uuid) {
	log('Connecting');
	var onConnect = function() {
		log('Connected');
		_connected = true;
		_uuid = uuid;
		loadVars();
		drawGrid();
		$("#log").hide();
		$('#search').hide();
		rfduino.onData(onData, app.onError);
		$("#test").show();
		$("#toolbar").show();
	};
	try{
	rfduino.connect(uuid, onConnect, app.onError);
	}catch(e){log(e);}
	setTimeout(function(){
		if(!_connected) { doConnect(uuid); }
	}, _searchDelay * 1000);
}

/**
 * Processes data received from RFduino
 */
function onData(data) {
	var view = new Uint8Array(data);
	var sData = String.fromCharCode.apply(null, Array.prototype.slice.apply(view));
	if(sData.indexOf('done') === 0) {
		// log('Finished current job');
		_processing = false;
	} else log('Received: "' + sData + '"');
}

/**
 * Sends grid to RFDuino
 */
function send() {
	$('#sendButton').attr('style','color:blue');
	var start = (new Date()).valueOf();
	doWrite(getData(), function() {
		var totalTime = (new Date()).valueOf() - start;
		log('Sent all data in ' + totalTime + 'ms');
		$('#sendButton').removeAttr('style');
	});
}

/**
 * Sends grid to RFDuino
 */
function switchOff() {
	$('#offButton').css({'color':'blue'});
	doWrite('0', function() {
		log('Switched off');
		$('#offButton').css({'color':'black'});
		_processing = false;
	});
}

/**
 * Sends given data to RFDuino
 */
function doWrite(data, cb) {
	if(_isDebug) {
		log('DEBUG MODE: not sending data');
		return cb();
	}

	if(_processing) return setTimeout(function(){
			// log('Arduino still processing previous data (#' + (_nbAttempts+1) + '), waiting ' + _sendDelay + 'ms');
			if(_nbAttempts < _MAXATTEMPTS) {
				doWrite(data, cb);
				_nbAttempts++;
			} else {
				app.onError("Unable to send data to device after " + _nbAttempts + " attempts.");
				_nbAttempts = 0;
			}
		}, _sendDelay
	);

	_processing = true;
	_nbAttempts = 0;

	if(data.length < _MAXDATASIZE) {
		return rfduino.write(data, cb, 
			function(e) { log('ERROR:'+e); }
		);
	}

	var chunk = data.substring(0, _MAXDATASIZE);
	rfduino.write(chunk,
		function() { 
			if(data.length > _MAXDATASIZE) {
				doWrite(data.substring(_MAXDATASIZE), cb);
			} else cb();
		}, 
		function(e) { log('ERROR:'+e); }
	);
}


/***********************************************************************************************************************
 *
 * GRID FUNCTIONS
 *
 **********************************************************************************************************************/


/**
 * Set the current color to the one picked in the palette
 */
function colorPicked(e) {
	_pickedColor = e.target.getAttribute('color');
	// log('Picked color ' + _pickedColor);
	$('#colorTable tr td[selected="true"]').removeAttr('selected').css({'border-color':'black' });
	e.target.style.borderColor = 'white';
	e.target.setAttribute('selected','true');
}

/**
 * Set all LEDs to the color on which the user clicked and hold
 */
function switchColor(e) {
	_pickedColor = e.target.getAttribute('color');
	// log('Switch to ' + _pickedColor);
	for(var tile=0;tile<_nbTiles;tile++) {
		initGrid(tile);
	}
}
	
/**
 * Set current color to selected LED
 */
function ledSelected(e) {
	var ledPos = e.target.getAttribute('led');
	var tile = e.target.getAttribute('nb');
	if(ledPos === null || tile === null) { return log('Clicked outside of LED'); }
	// log('Selected led ' + ledPos + ' of tile ' + tile);
	var led = _leds[tile-1][ledPos];
	e.target.parentNode.removeAttribute('style');
	var size = getTileSize();
	e.target.parentNode.setAttribute('style', 'width:' + size/_nbLedX + 'px;height:' + size/_nbLedY + 'px;' 
		+ 'background-color:#' + _pickedColor + ';color:#' + _pickedColor);
	led.color = _pickedColor;
	_grid[tile-1][led.x][led.y].color = _pickedColor;
	saveVars();
}

/**
 * Initializes _grid. In grid[x][y], we put an object { pos, color } where pos is the ID of the LED, ie its position as
 * far as the Baghera system understands it, e.g. for a 4x4 grid:
 *  0  1  2  3  
 *  7  6  5  4
 *  8  9 10 11
 * 15 14 13 12
 * and where color is the color for the LED at this position, i.e. black by default
 */
function initGrid(tile) {
	// log('Initializing grid with color='+_pickedColor + ' for tile=' + tile);
	var pos = 0;
  // log('Init _leds');
	_leds[tile] = [];_leds[tile].length = _nbLedX * _nbLedY;
  // log('Init _grid');
	_grid[tile] = [];
  // log('Start initGrid');
	for(var x=0;x<_nbLedX;x++) {
		var gridY=[];
		for(var y=0;y<_nbLedY;y++) {
			// log('('+(x+1)+','+(y+1)+')=>'+pos);

			/** Original Baghera LED mapping
			 *  0  1  2  3  
			 *  7  6  5  4
			 *  8  9 10 11
			 * 15 14 13 12
 			 */
			// var isReverse = true;
			// var posDiv = Math.floor(pos/_nbLedX);
			// if(posDiv/2 !== Math.floor(posDiv/2)) isReverse = false;
			// var ledPos = pos;
			// if(isReverse) {
			// 	ledPos = (posDiv+1)*_nbLedX-(pos%_nbLedX)-1;
			// }

			/** New Baghera LED mapping
			 *  0  1  2  3  
			 *  4  5  6  7
			 *  8  9 10 11
			 * 12 13 14 15
 			 */
			var ledPos = pos;

			//Update grid 
			var led = { pos:ledPos, color:_pickedColor };
			gridY.push({ pos:ledPos, color:_pickedColor });
			_leds[tile][ledPos] = { x: x, y: y, color:_pickedColor };
			if($('.tile tr td')) { $('.tile tr td').css({'background-color': '#' + _pickedColor}); }
			pos++;
		}
		_grid[tile].push(gridY);
	}
} 


/***********************************************************************************************************************
 *
 * LAYOUT FUNCTIONS
 *
 **********************************************************************************************************************/

//Show settings
function toggleLayoutMode() {
	_isEditMode = !_isEditMode;
	if(_isEditMode) { 
		$('#layoutButton').attr('style','color:red'); 
		$('#colorPicker').hide();
	} else { 
		$('#layoutButton').removeAttr('style'); 
		$('#colorPicker').show();
	}
	drawGrid(_isEditMode);
}

function initLayout() {
  log('Initializing layout');
	_layout.push([{nb:1}]);
}

//Handles tap on layout
function layoutTapped(e) {
	var x = parseInt(e.target.getAttribute('x')); 
	var y = parseInt(e.target.getAttribute('y'));
	var lx = parseInt(e.target.getAttribute('lx')); 
	var ly = parseInt(e.target.getAttribute('ly'));
	var cellClass = e.target.getAttribute('class');
	log('Tapped ' + cellClass + ' at (' + x + ',' + y + '), _nbTilesX=' + _nbTilesX + ', nbTilesY=' + _nbTilesY);
	if(cellClass === 'addTile') {
		if(x === -1) {
			var newRow = [];
			for(var i=0;i<_layout[_layout.length-1].length;i++) { newRow.push({nb:_layout[_layout.length-1][i].nb}); }
			_layout.push(newRow);
			for(var i=_layout.length-2;i>0;i--) {
				var movedRow = [];
				for(var j=0;j<_layout[i-1].length;j++) { movedRow.push({nb:_layout[i-1][j].nb}); }
				_layout[i] = movedRow;
			}
			_layout[0]=[];
			for(var i=0;i<_nbTilesY;i++) { _layout[0].push({nb:0}); }
			_layout[0][y].nb = _nbTiles + 1;
			_nbTilesX++;
		} else if(y === -1) {
			for(var i=0;i<_nbTilesX;i++) {
				_layout[i].push({nb: _layout[i][_layout[i].length-1].nb});
				for(var j=_layout[i].length-2;j>0;j--) {
					_layout[i][j].nb = _layout[i][j-1].nb;
				}
				_layout[i][0].nb = 0; 
			}
			_layout[x][0].nb = _nbTiles + 1;
			_nbTilesY++;
		} else if(x === _nbTilesX) {
			var newCol = [];
			for(var i=0;i<_nbTilesY;i++) { newCol.push({nb:0}); }
			_layout.push(newCol);
			_layout[x][y].nb = _nbTiles + 1;
			_nbTilesX++;
		} else if(y === _nbTilesY) {
			for(var i=0;i<_nbTilesX;i++) { _layout[i].push({nb:0}); }
			_layout[x][y].nb = _nbTiles + 1;
			_nbTilesY++;
		} else {
			_layout[x][y].nb = _nbTiles + 1;
		}
		_nbTiles++;
		// log('New layout: ' + JSON.stringify(_layout));
		_grid.push([]);
		_leds.push([]);
		initGrid(_nbTiles - 1);
		drawGrid(true);
		//$('#tilesLayout').on('tap', layoutTapped);
	} else if(cellClass === 'tile' || cellClass === 'led' || cellClass === 'ledCell') {
		log('Clicked tile (' + x + ',' + y +')');
		_selectedTile = {x:x,y:y,nb:_layout[x][y].nb};
		if(_tileToMove) {
			switchTiles(_selectedTile);
			_tileToMove = null;
			$('#toolbar').show();
			$('#message').hide();
		} else {
			$('#toolbar').hide();
			$('#page').fadeTo(500, 0.5);
			if(_nbTiles === 1) { $('#deleteTile').hide(); }
			else { $('#deleteTile').show(); }
			$('#tileMenu').slideToggle();
		}
	} else {
		log('Unexpected class "' + cellClass + '"');
	}
}

//closes the tile menu when the user clicks on Cancel
function closeTileMenu() {
	$('#tileMenu').slideToggle();
	$('#toolbar').show();
	$('#page').fadeTo(500, 1);
}

//When user clicks on Move, closes the menu, show message, and keep selected tile for next action
function moveTile() {
	log('Move tile ' + JSON.stringify(_selectedTile));
	_tileToMove = _selectedTile;
	closeTileMenu();
	$('#toolbar').hide();
	$('#message').text('Tap the target tile').show();
}

//Switch the previously tapped tile with the tile just tapped
function switchTiles(tileDest) {
	log('Switch tile ' + JSON.stringify(_tileToMove) + ' with tile ' + JSON.stringify(tileDest));

	//Switch in _grid
	for(var x=0;x<_nbLedX;x++) {
		for(var y=0;y<_nbLedY;y++) {
			var gridDestBefore = _grid[tileDest.nb-1][x][y];
			_grid[tileDest.nb-1][x][y] = _grid[_tileToMove.nb-1][x][y];
			_grid[_tileToMove.nb-1][x][y] = gridDestBefore;
		}
	}

	//Switch in _leds
	for(var pos=0;pos<_nbLedX*_nbLedY;pos++) {
		var ledDest = _leds[tileDest.nb-1][pos];
		_leds[tileDest.nb-1][pos] = _leds[_tileToMove.nb-1][pos];
		_leds[_tileToMove.nb-1][pos] = ledDest;
	}

	//Refresh UI
	drawGrid(true);
}

function deleteTile() {
	log('Delete tile ' + JSON.stringify(_selectedTile));
	_grid.splice(_selectedTile.nb-1,1);
	_layout[_selectedTile.x][_selectedTile.y].nb = 0;
	if(_selectedTile.x == 0) {
		var isEmptyColumn = true;
		for(var i=0;i<_nbTilesY && isEmptyColumn;i++) {
			if(_layout[0][i].nb !== 0) { isEmptyColumn = false; }
		}
		if(isEmptyColumn) {
			_layout.splice(0, 1);
			_nbTilesX--;
		}
	}
	if(_selectedTile.x == _nbTilesX-1) {
		var isEmptyColumn = true;
		for(var i=0;i<_nbTilesY && isEmptyColumn;i++) {
			if(_layout[_nbTilesX-1][i].nb !== 0) { isEmptyColumn = false; }
		}
		if(isEmptyColumn) {
			_layout.splice(_nbTilesX-1, 1);
			_nbTilesX--;
		}
	}
	if(_selectedTile.y == 0) {
		var isEmptyRow = true;
		for(var i=0;i<_nbTilesX && isEmptyRow;i++) {
			if(_layout[i][0].nb !== 0) { isEmptyRow = false; }
		}
		if(isEmptyRow) {
			for(var i=0;i<_nbTilesX;i++) {
				_layout[i].splice(0, 1);
			}
			_nbTilesY--;
		}
	}
	if(_selectedTile.y == _nbTilesY-1) {
		var isEmptyRow = true;
		for(var i=0;i<_nbTilesX && isEmptyRow;i++) {
			if(_layout[i][_nbTilesY-1].nb !== 0) { isEmptyRow = false; }
		}
		if(isEmptyRow) {
			for(var i=0;i<_nbTilesX;i++) {
				_layout[i].splice(_nbTilesY-1, 1);
			}
			_nbTilesY--;
		}
	}
	for(var x=0;x<_nbTilesX;x++) {
		for(var y=0;y<_nbTilesY;y++) {
			if(_layout[x][y].nb > _selectedTile.nb) {
				_layout[x][y].nb = _layout[x][y].nb - 1;
			}
		}
	}
	_nbTiles--;
	drawGrid(true);
	closeTileMenu();
}

function rotateTile() {
	log('Rotate tile ' + JSON.stringify(_selectedTile));
	logGrid('before rotate');
	logLeds('before rotate');

	var newGrid = [];
	newGrid.length = _nbLedX;
	for(var i=0;i<_nbLedY;i++) { newGrid[i]=[]; newGrid[i].length=_nbLedY; }
	for(var i=0;i<_nbLedX*_nbLedY;i++) {
	    //convert to x/y
	    var x = i % _nbLedX;
	    var y = Math.floor(i / _nbLedY);

	    //find new x/y
	    var newX = _nbLedX - y - 1;
	    var newY = x;

	    //convert back to index
	    var newPosition = newY * _nbLedX + newX;
	    newGrid[newX][newY] = _grid[_selectedTile.nb-1][x][y];
	}
	for(var x=0;x<_nbLedX;x++) {
		for(var y=0;y<_nbLedY;y++) {
			_grid[_selectedTile.nb-1][x][y] = newGrid[x][y];
			_leds[_selectedTile.nb-1][_grid[_selectedTile.nb-1][x][y].pos] = { x:y, y:y, color:newGrid[x][y].color };
		}
	}

	// for(var i=0;i<_nbLedX*_nbLedY;i++) {
	// 	_leds[_selectedTile.nb-1][i].color = newGrid[_leds[_selectedTile.nb-1][i].x][_leds[_selectedTile.nb-1][i].y].color;
	// 	_grid[_selectedTile.nb-1][x][y].pos = i;
	// }
	logGrid('after rotate');
	logLeds('after rotate');
	drawGrid(true);
	closeTileMenu();
}


/***********************************************************************************************************************
 *
 * DATA FUNCTIONS
 *
 **********************************************************************************************************************/


/**
 * Generates the data to send to RFduino
 *
 * For 4x4=16 LEDs, needs to be 144 characters (12 bits per color * 3 colors * 16 LEDs = 576 bits = 144 x 4)
 * The string passed to RFDuino is converted to an array of characters. When converted to integers, those characters
 * are converted based on their ASCII value. This means that sending "0" corresponds to int 48 (see
 * http://arduino.cc/en/Reference/ASCIIchart#.Uw6E-vRdX2k). This table is limited to 128 values and we need to send 
 * values between 0 and 257, so we need to send 2 characters: The first character is either the ASCII value of '0' 
 * (if the decimal value we need to send is less than 128) or '127' otherwise, while the second character is the rest.
 */
 function getData() {
 	//First we get the data as a binary string
	var data = "";
	for(var tile=0;tile<_nbTiles;tile++) {
		for(var i=0;i<_nbLedX*_nbLedY;i++) {
			//var isReverse = false;
			var posDiv = Math.floor(i/_nbLedX);
			//if(posDiv/2 !== Math.floor(posDiv/2)) isReverse = true;
			var color = convertColor(_leds[tile][i].color, false);//isReverse);
			//log('Color['+i+'] before='+_leds[i].color+' after='+color+' ('+color.length+' bits)');
			data+= color;
		}
	}
	data = convertToBytes(data);
	var size = data.length.toString(16);
	if(size.length == 2) { size = '00' + size; }
	if(size.length == 3) { size = '0' + size; }
	// log('size=' + size);
	data = size + data;
	return data;
}

//Converts given binary string to a string of 2 characters, from which ASCCI values RFDuino can retrieve the original
//decimal value. See description of getData() for more details.
//This function is not expected to work for binaries with more than 8 bits, but we're supposed to get 8 bits at a time
function binToASCII(bin) {
	var dec = 0;
	for(var i=bin.length-1;i>=0;i--){
		dec+= bin[i]*Math.pow(2,i);
	}
	var ascii;
	if(dec < 128) { ascii = String.fromCharCode(0)   + String.fromCharCode(dec);     }
	else {          ascii = String.fromCharCode(127) + String.fromCharCode(dec-128); }
	return ascii;
}

//Converts given binary string where each character is one bit to hexadecimal string
function convertToBytes(data) {
	//log(data.length + ' bits in ' + data);
	var bData = "";
	//we parse the given data 8 bits at a time
	for(var i=0;i<data.length/8;i++) {
		var thisByte = data.substring(i*8,(i+1)*8);
		bData+= binToASCII(thisByte);
	}
	// log(bData.length + ' char in ' + data);
	return bData;
}

//Convert HTML color (3 bytes) to Baghera (36 bits)
function convertColor(color, doReverse) {
	var hr = Math.round(parseInt(color.substring(4,6),16) * 4095 / 255);
	var hg = Math.round(parseInt(color.substring(2,4),16) * 4095 / 255);
	var hb = Math.round(parseInt(color.substring(0,2),16) * 4095 / 255);
	//log('Red dec = ' + hr + ' bin = ' + extendTo12bits(hr.toString(2)));
	var bin = extendTo12bits(hr.toString(2))+extendTo12bits(hg.toString(2))+extendTo12bits(hb.toString(2));
	if(doReverse) bin = extendTo12bits(hr.toString(2))+extendTo12bits(hb.toString(2))+extendTo12bits(hg.toString(2));
	return bin;
}

//Adds 0 to given binary string so that it has exactly 12 characters
function extendTo12bits(data){
	var res = data;
	for(var i=0;i<12-data.length;i++) res = "0" + res;
	return res;
}


/***********************************************************************************************************************
 *
 * SETTINGS FUNCTIONS
 *
 **********************************************************************************************************************/


//Show settings
function showSettings() {
	$("#test").hide();
	$("#toolbar").hide();
	$("#log").show();
	$("#settings").show();
	$("#settingsBar").show();
}

//Hide setting
function hideSettings() {
	$("#settings").hide();
	$("#settingsBar").hide();
	$("#test").show();
	$("#toolbar").show();
}


/***********************************************************************************************************************
 *
 * DEBUG FUNCTIONS
 *
 **********************************************************************************************************************/

//Log _grid
function logGrid(text) {
	var html = '<br>' + text;
	for(var t=0;t<_nbTiles;t++) {
		html+= '<br>Tile #' + t + '<table>';
		for(var y=0;y<_nbLedY;y++) {
			html+='<tr>';
			for(var x=0;x<_nbLedX;x++) {
				html+='<td>'+_grid[t][x][y].pos+'|'+_grid[t][x][y].color+'</td>';
			}
			html+='</tr>';
		} 
		html+='</table>';
	}
	$("#log").append(html);
}

//Log _leds
//leds[nb][pos]={x,y,color}
function logLeds(text){
	var html = '<br>' + text + '<table><tr>';
	for(var t=0;t<_nbTiles;t++) {
		html+= '<td>' + t + '</td>';
	}
	html+= '</tr><tr>';
	for(var t=0;t<_nbTiles;t++) {
		html+='<td>';
		for(var pos=0;pos<_leds[t].length;pos++) {
			html+= '(' + _leds[t][pos].x + ',' + _leds[t][pos].y + ')|' + _leds[t][pos].color+'<br>';
		}
		html+='</td>';
	}
	html+='</tr></table>'
	$("#log").append(html);
}

//Clear logs
function clearLogs(e) {
	$("#log").html('');
}

//For debugging, logs given text in Log section
function log(text) {
	console.log(text);
	$("#log").append('<br>'+text);
}