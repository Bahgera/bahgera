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

'use strict';

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

//Maximum number of bytes that can be sent to RFDuino
var _MAXDATASIZE = 18;

//Maximum number of attempts to send data to RFDuino before giving up
var _MAXATTEMPTS = 10;

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

//grid[x][y]={pos,color}
var _grid = [];

//leds[pos]={x,y,color}
var _leds = [];

//_layout[x][y]={nb}
var _layout = [];

//tile clicked in edit layout mode = {x,y,nb}
var _selectedTile = {};

//Number of 4x4 tiles
var _nbTiles = 1;

//Size of the Tiles layout (X)
var _nbTilesX = 1;

//Size of the Tiles layout (Y)
var _nbTilesY = 1;

//Color picked by user in colorPicker
var _pickedColor = '000000';

//Height of color cell in colorPicker
var _colorHeight = 10;

//height/width of a cell in the LED grid
var _size = 10;

//true when RFDuino is processing data
var _processing = false;

//Time to wait before trying again to send data to RFDuino when processing (in ms)
var _sendDelay = 100;

//Number of attempts to send chunk of data to RFDuino
var _nbAttempts = 0;

//true when editing tiles layout
var _isEditMode = false;

/***********************************************************************************************************************
 *
 * UI INIT FUNCTIONS
 *
 **********************************************************************************************************************/
 

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

//Generates HTML for LED grid in the Test section
// function buildGridSelector() {
// 	log('Building Test Grid Selector');
// 	var html = '<table id="gridTable">';
// 	_size = Math.min(Math.floor(($(document).height()-4)/3/(_nbLedY+1)), 
// 		Math.floor(($(document).width()-(_nbLedX+1)*5)/(_nbLedX+1)));
// 	log('Grid size = ' + _size);
// 	for(var x=0;x<_nbLedX;x++) {
// 		html += '<tr>';
// 		for(var y=0;y<_nbLedY;y++) {
// 			html+= '<td led="' + _grid[x][y].pos 
// 				+ '" style="width:' + _size + 'px;height:' + _size + 'px" class="ledCell">'
// 				+ '<img src="img/led.png"' + '" style="width:' + _size + 'px;height:' + _size 
// 				+ 'px"  class="led" led="' + _grid[x][y].pos + '"/>'
// 				+ '</td>';
// 		}
// 		html+= '</tr>';
// 	}
// 	html+='</table>';
// 	$("#gridSelector").html(html);
// }

//Generates HTML for the color picker in the Test section
function buildColorPicker() {
	log('H=' + $(document).height() + ' W=' + $(document).width());
	var colorTable = '<table id="colorTable">';
	var palette = ['000000','555555','AAAAAA','FFFFFF','FF0000','00FF00','0000FF','FFFF00',
		'FF00FF','00FFFF','0055AA','55AAFF','AAFF00','FF0055','AA5500','5500FF'];
	_colorHeight = Math.floor(($(document).height()-20) / 3 / (_nbLedY+1));
	var width  = Math.floor(($(document).width() - 5) / _nbLedX);
	log('Color picker height=' + _colorHeight);
	for(var i=0;i<4;i++) {
		colorTable+= '<tr>';
		for(var j=0;j<4;j++) {
			var color = palette[i*4+j];
			colorTable+='<td style="border-width:1px;border-color:black;border-style:solid;'
				+ 'width:' + width + 'px;height:' + _colorHeight +'px;'
				+ 'background-color:#' + color + ';color:#' + color + '" '
				+ 'color="' + color + '">-</td>';
		}
		colorTable+= '</tr>';
	}
	colorTable+= '</table>';
	$("#colorPicker").html(colorTable);
}

//Generates Tile grid for Settings
// function buildTilesLayoutSelector() {
// 	log('Building Tiles Layout Selector');
// 	var html = '<table id="tilesLayout"><tr><td></td>';
// 	var size = Math.min($(document).height(),$(document).width()) / Math.max(_nbTilesX,_nbTilesY) / 2;
// 	for(var x=0;x<_nbTilesX;x++) {
// 		html+='<td x="' + x + '" y="-1" class="addTile">+</td>';
// 	}
// 	html+='<td></td></tr>';
// 	for(var y=0;y<_nbTilesY;y++) {
// 		html += '<tr><td style="width:' + size + 'px;height:' + size + 'px" x="-1" y="' + y +'" class="addTile">+</td>';
// 		for(var x=0;x<_nbTilesX;x++) {
// 			html+= '<td x="' + x + '" y="' + y +'" nb="' + _layout[x][y].nb 
// 				+ '" style="width:' + size + 'px;height:' + size + 'px"';
// 			if(_layout[x][y].nb > 0) {
// 				html+= ' class="tile"><table>';
// 				for(var lx=0;lx<4;lx++) {
// 					html += '<tr>';
// 					for(var ly=0;ly<4;ly++) {
// 						html+= '<td style="width:' + size/5 + 'px;height:' + size/5 + 'px" class="ledCell">'
// 							+ '<img src="img/led.png"' + '" style="width:' + size/5 + 'px;height:' + size/5 
// 							+ 'px"  class="led" /></td>';
// 					}
// 					html+= '</tr>';
// 				}
// 				html+='</table>';
// 			} else html+= ' class="addTile">+';
// 			html+='</td>';
// 		}
// 		html+= '<td style="width:' + size + 'px;height:' + size + 'px" x="' + _nbTilesX + '" y="' + y +'" class="addTile">+</td></tr>';
// 	}
// 	html+='<tr><td></td>';
// 	for(var x=0;x<_nbTilesX;x++) {
// 		html+='<td x="' + x + '" y="' + _nbTilesY + '" class="addTile">+</td>';
// 	}
// 	html+='<td></td></table>';
// 	$("#tilesLayoutArea").html(html);
// }

/**
 * Generates LED grid
 * @param {doEditLayout} true when editing the tiles layout
 */
function drawGrid(doEditLayout) {
	log('Draw grid');
	var html = '<table id="gridSelector"><tr><td></td>';
	var size = Math.min($(document).height(),$(document).width()) / Math.max(_nbTilesX,_nbTilesY) / 2;
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
			html+= '<td x="' + x + '" y="' + y +'" nb="' + _layout[x][y].nb 
				+ '" style="width:' + size + 'px;height:' + size + 'px"';
			if(_layout[x][y].nb > 0) {
				html+= ' class="tile"><table class="tile" x="' + x + '" y="' + y +'" >';
				for(var lx=0;lx<4;lx++) {
					html += '<tr>';
					for(var ly=0;ly<4;ly++) {
						html+= '<td led="' + _grid[lx][ly].pos 
							+ '" style="width:' + size/5 + 'px;height:' + size/5 + 'px" x="' + x + '" y="' + y +'" class="ledCell">'
							+ '<img src="img/led.png"' + '" style="width:' + size/5 + 'px;height:' + size/5 
							+ 'px"  class="led" led="' + _grid[lx][ly].pos + '"  x="' + x + '" y="' + y +'"/>'
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
	$('#gridSelector').unbind('tap');
	if(doEditLayout) { $('#gridSelector').on('tap', layoutTapped); }
	else { $('#gridSelector').on('tap', ledSelected); }
}


/***********************************************************************************************************************
 *
 * MAIN FUNCTIONS
 *
 **********************************************************************************************************************/

var app = { };

app.initialize = function() {
	log('Initializing');
	
	$.mobile.loading().hide();
	
	buildSpinner();
	
	initGrid();
	initLayout();
	
	//buildGridSelector();
	buildColorPicker();
	//buildTilesLayoutSelector();
	drawGrid();
	$('#canvas').attr('width',_nbLedX + 'px');
	$('#canvas').attr('height',_nbLedY + 'px');
	
	document.addEventListener('deviceready', searchDevice, false);
	
	$('#colorPicker').on('tap', colorPicked);
	$('#colorPicker').on('taphold', switchColor);
	//$('#tilesLayout').on('tap', layoutTapped);
	//$('#gridSelector').on('tap', ledSelected);
	$('#canceTile').click(closeTileMenu);
	$('#testTile').click(testTile);
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
		log('Disonnected');
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
		allowEdit : true,
		encodingType: Camera.EncodingType.PNG,
		targetWidth: _nbLedX,
		targetHeight: _nbLedY,
		saveToPhotoAlbum: true 
  };
	navigator.camera.getPicture(setGridFromPicture, onCameraError, cameraOptions);
}

//lets the user choose an existing photo
function chooseExistingPhoto() {
	var cameraOptions = { 
		quality : 50,
		destinationType : Camera.DestinationType.FILE_URI,
		sourceType : Camera.PictureSourceType.PHOTOLIBRARY,
		allowEdit : true,
		encodingType: Camera.EncodingType.PNG,
		targetWidth: _nbLedX,
		targetHeight: _nbLedY,
		saveToPhotoAlbum: false 
  };
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
			var imgData=ctx.getImageData(0,0,_nbLedX,_nbLedY);
			var pixels = imgData.data;
			for(var y=0;y<_nbLedY;y++) {
				for(var x=0;x<_nbLedX;x++) {
					var red =   pixels[((_nbLedX*x)+y)*4].toString(16);   if(red.length   === 1) { red   = '0' + red;   }
					var green = pixels[((_nbLedX*x)+y)*4+1].toString(16); if(green.length === 1) { green = '0' + green; }
					var blue =  pixels[((_nbLedX*x)+y)*4+2].toString(16); if(blue.length  === 1) { blue  = '0' + blue;  }
					//We ignore the Alpha channel, only need the RGB values
					var color = red + green + blue;
					var pos = _grid[x][y].pos;
					_grid[x][y].color = color;
					_leds[pos].color = color;
					$('#gridTable tr td[led=' + pos + ']').css({'background-color': '#' + color});
				}
			}
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
	//log('Searching device...');
	rfduino.discover(_searchDelay, app.onDiscoverDevice, app.onError);
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
		log('Finished current job');
		_processing = false;
	} else log('Received: "' + sData + '"');
}

/**
 * Sends grid to RFDuino
 */
function send() {
	$('#sendButton').attr('style','color:blue');
	doWrite(getData(), function() {
		log('Finished writing to RFDuino');
		$('#sendButton').removeAttr('style');
	});
}

/**
 * Sends grid to RFDuino
 */
function switchOff() {
	$('#offButton').css({'color':'blue'});
	doWrite('0000', function() {
		log('Finished writing to RFDuino');
		$('#offButton').css({'color':'black'});
		_processing = false;
	});
}

/**
 * Sends given data to RFDuino
 */
function doWrite(data, cb) {
	var chunk = data.substring(0, _MAXDATASIZE);
	log('Trying to send "' + chunk + '" (' + chunk.length + ' of ' + data.length + ' bytes)');
	if(_processing) setTimeout(function(){
			log('Still processing...');
			if(_nbAttempts < _MAXATTEMPTS) {
				doWrite(data, cb);
				_nbAttempts++;
			} else {
				app.onError("Unable to send data to device after " + _nbAttempts + " attempts.");
				_nbAttempts = 0;
			}
		}, _sendDelay
	);
	else {
		_processing = true;
		_nbAttempts = 0;
		log('RFDuino ready, now sending "' + chunk + '" (' + chunk.length + ' of ' + data.length + ' bytes)');
		rfduino.write(chunk,
			function() { 
				if(data.length > _MAXDATASIZE) {
					doWrite(data.substring(_MAXDATASIZE), cb);
				} else cb();
			}, 
			function(e) { log('ERROR:'+e); }
		);
	}
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
	log('Picked color ' + _pickedColor);
	$('#colorTable tr td[selected="true"]').removeAttr('selected').css({'border-color':'black' });
	e.target.style.borderColor = 'white';
	e.target.setAttribute('selected','true');
}

/**
 * Set all LEDs to the color on which the user double clicked
 */
function switchColor(e) {
	_pickedColor = e.target.getAttribute('color');
	log('Switch to ' + _pickedColor);
	initGrid();
}
	
/**
 * Set current color to selected LED
 */
function ledSelected(e) {
	var ledPos = e.target.getAttribute('led');
	var led = _leds[ledPos];
	e.target.parentNode.removeAttribute('style');
	e.target.parentNode.setAttribute('style','width:' + _size + 'px;height:' + _size 
		+ 'px;background-color:#' + _pickedColor + ';color:#' + _pickedColor);
	led.color = _pickedColor;
	_grid[led.x][led.y].color = _pickedColor;
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
function initGrid() {
	log('Initializing grid with color='+_pickedColor);
	var pos = 0;
	_leds = [];
	_grid = [];
	for(var x=0;x<_nbLedX;x++) {
		var gridY=[];
		for(var y=0;y<_nbLedY;y++) {
			//log('('+(x+1)+','+(y+1)+')=>'+pos);
			var isReverse = true;
			var posDiv = Math.floor(pos/4);
			if(posDiv/2 !== Math.floor(posDiv/2)) isReverse = false;
			var ledPos = pos;
			if(isReverse) {
				ledPos = (posDiv+1)*4-(pos%4)-1;
			}
			var led = { pos:ledPos, color:_pickedColor };
			gridY.push({ pos:ledPos, color:_pickedColor });
			_leds.push({ x: x, y: y, color:_pickedColor });
			if($('#gridTable tr td')) { $('#gridTable tr td').css({'background-color': '#' + _pickedColor}); }
			pos++;
		}
		_grid.push(gridY);
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
	_layout.push([{nb:1}]);
}

/**
 * Set all LEDs to the color on which the user double clicked
 */
function layoutTapped(e) {
	var x = parseInt(e.target.getAttribute('x')); 
	var y = parseInt(e.target.getAttribute('y'));
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
		log('New layout: ' + JSON.stringify(_layout));
		drawGrid(true);
		//$('#tilesLayout').on('tap', layoutTapped);
	} else if(cellClass === 'tile' || cellClass === 'led' || cellClass === 'ledCell') {
		log('Clicked tile (' + x + ',' + y +')');
		_selectedTile = {x:x,y:y,nb:_layout[x][y].nb};
		$('#toolbar').hide();
		$('#page').fadeTo(500, 0.5);
		$('#tileMenu').slideToggle();
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

function testTile() {
	log('Test tile ' + JSON.stringify(_selectedTile));
}

function deleteTile() {
	log('Delete tile ' + JSON.stringify(_selectedTile));
}

function rotateTile() {
	log('Rotate tile ' + JSON.stringify(_selectedTile));
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
	for(var i=0;i<_nbLedX*_nbLedY;i++) {
// 		var isReverse = false;
		var posDiv = Math.floor(i/4);
// 		if(posDiv/2 !== Math.floor(posDiv/2)) isReverse = true;
		var color = convertColor(_leds[i].color, false);//isReverse);
// 		log('Color['+i+'] before='+_leds[i].color+' after='+color+' ('+color.length+' bits)');
		data+= color;
	}
	return convertToBytes(data);
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
	log(bData.length + ' char in ' + bData);
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


//Clear logs
function clearLogs(e) {
	$("#log").html('');
}

//For debugging, logs given text in Log section
function log(text) {
	console.log(text);
	$("#log").append('<br>'+text);
}