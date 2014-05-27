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

//Color picked by user in colorPicker
var _pickedColor = '000000';

//Height of color cell in colorPicker
var _colorHeight = 10;

//height/width of a cell in the LED grid
var _size = 10;

//true when RFDuino is processing data
var _processing = false;

//Time to wait before trying again to send data to RFDuino when processing (in ms)
var _sendDelay = 1000;

//Number of attempts to send chunk of data to RFDuino
var _nbAttempts = 0;

/***********************************************************************************************************************
 *
 * UI INIT FUNCTIONS
 *
 **********************************************************************************************************************/
 

//Draws search bar when searching device
function buildSpinner() {
	$('#search').text('1');
 	var square = new Sonic({
    width: 100,
    height: 100,
    fillColor: 'blue',
    path: [
        ['line', 10, 10, 90, 10],
        ['line', 90, 10, 10, 10]
    ]
	});
	$('#search').text('2');
	square.play();
	$('#search').text('3');
	$('#search').append(square.canvas);
	$('#search').text('4');
}

//Generates HTML for LED grid in the Test section
function buildGridSelector() {
	log('Building Test Grid Selector');
	var html = '<table id="gridTable">';
	_size = Math.min(Math.floor($(document).height()/3/_nbLedY), Math.floor(($(document).width()-(_nbLedX+1)*5)/_nbLedX));
	for(var x=0;x<_nbLedX;x++) {
		html += '<tr>';
		for(var y=0;y<_nbLedY;y++) {
			html+= '<td led="' + _grid[x][y].pos 
				+ '" style="width:' + _size + 'px;height:' + _size + 'px" class="ledCell">'
				+ '<img src="img/led.png"' + '" style="width:' + _size + 'px;height:' + _size 
				+ 'px"  class="led" led="' + _grid[x][y].pos + '"/>'
				+ '</td>';
		}
		html+= '</tr>';
	}
	html+='</table>';
	$("#gridSelector").html(html);
}

//Generates HTML for the color picker in the Test section
function buildColorPicker() {
	var colorTable = '<table id="colorTable">';
	var palette = ['000000','555555','AAAAAA','FFFFFF','FF0000','00FF00','0000FF','FFFF00',
		'FF00FF','00FFFF','0055AA','55AAFF','AAFF00','FF0055','AA5500','5500FF'];
	for(var i=0;i<4;i++) {
		colorTable+= '<tr>';
		for(var j=0;j<4;j++) {
			var color = palette[i*4+j];
			_colorHeight = Math.floor($(document).height() / 3 / _nbLedY);
			var width  = Math.floor(($(document).width() - 5) / _nbLedX);
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
	
	buildGridSelector();
	buildColorPicker();
	$('#canvas').attr('width',_nbLedX + 'px');
	$('#canvas').attr('height',_nbLedY + 'px');
	
	document.addEventListener('deviceready', searchDevice, false);
	
	$('#colorPicker').on('tap', colorPicked);
	$('#colorPicker').on('taphold', switchColor);
	$('#gridSelector').on('tap', ledSelected);
	$('#pictureButton').click(getPicture);
	$('#takeNew').click(takeNewPhoto);
	$('#chooseExisting').click(chooseExistingPhoto);
	$('#cancelPhoto').click(closePhoto);
	$('#sendButton').click(send);
	$('#offButton').click(switchOff);
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
		//$("#toolbar").hide();
		$("#settingsBar").hide();
		$("#search").show();
		searchDevice();
	}, 
	app.onError);
};
	
app.onError = function(reason) {
	log('ERROR:' + reason);
	$("#test").hide();
	_found = false;
	_connected = false;
	try{
	navigator.notification.alert(reason, app.disconnect);
	}catch(e){log(e);}
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
					$('#gridTable tr td[led=' + pos + ']').css('background-color': '#' + color);
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
	log('Searching device...');
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
	log('_size='+_size);
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
			var isReverse = false;
			var posDiv = Math.floor(pos/4);
			if(posDiv/2 !== Math.floor(posDiv/2)) isReverse = true;
			var ledPos = pos;
			if(isReverse) {
				ledPos = (posDiv+1)*4-(pos%4)-1;
			}
			var led = { pos:ledPos, color:_pickedColor };
			gridY.push({ pos:ledPos, color:_pickedColor });
			_leds.push({ x: x, y: y, color:_pickedColor });
			$('#search').text('hello');
			if($('#gridTable tr td')) { $('#gridTable tr td').css({'background-color': '#' + _pickedColor}); }
			pos++;
		}
		_grid.push(gridY);
	}
} 


/***********************************************************************************************************************
 *
 * DATA FUNCTIONS
 *
 **********************************************************************************************************************/


//Generates the HEX data to send to RFduino
//For 4x4=16 LEDs, needs to be 72 hex characters (12 bits per color * 3 colors * 16 LEDs = 576 bits = 72 hex characters
function getData() {
	var data = "";
// 	return "FF";
// 	for(var i=0;i<144;i++) data+="F";
// 	return data;
	for(var i=0;i<_nbLedX*_nbLedY;i++) {
		var isReverse = false;
		var posDiv = Math.floor(i/4);
		if(posDiv/2 !== Math.floor(posDiv/2)) isReverse = true;
		var color = convertColor(_leds[i].color, isReverse);
		//log('Color['+i+'] before='+_leds[i].color+' after='+color+' ('+color.length+' bits)');
		data+= color;
	}
	return convertToBytes(data);
}

//Converts given binary string to hexadecimal string of 2 characters.
//This function is not expected to work for binaries with more than 8 bits.
function binToHex(bin) {
	var dec = 0;
	for(var i=bin.length-1;i>=0;i--){
		dec+= bin[i]*Math.pow(2,i);
	}
	//log('Converted ' + bin + ' to ' + char(dec));
	//return String.fromCharCode(dec);
	var hex = dec.toString(16);
	if(hex.length == 1) hex = "0" + hex;
	//log('Converted ' + bin + ' to ' + hex);
	return hex;
}

//Converts given binary string where each character is one bit to hexadecimal string
function convertToBytes(data) {
	//log(data.length + ' bits in ' + data);
	var bData = "";
	for(var i=0;i<data.length/8;i++) {
		var thisByte = data.substring(i*8,(i+1)*8);
		bData+= binToHex(thisByte);
	}
// 	var len = bData.length.toString(16);
// 	bData = len + bData;
// 	for(var i=0;i<4-len.length;i++) bData = "0"+bData;
	log(bData.length + ' char in ' + bData);
	return bData;
}

//Convert HTML color (3 bytes) to Baghera (36 bits)
function convertColor(color, doReverse) {
	//log('HEX='+color.substring(0,2));
	//log('DEC='+parseInt(color.substring(0,2),16));
	var hr = Math.round(parseInt(color.substring(0,2),16) * 4095 / 255);
	var hg = Math.round(parseInt(color.substring(2,4),16) * 4095 / 255);
	var hb = Math.round(parseInt(color.substring(4,6),16) * 4095 / 255);
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