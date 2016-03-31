/*
Bahgera
Copyright (c) 2012-2014 Bahgera, All Rights Reserved
*/
#include <RFduinoBLE.h>

#define  MY_FLASH_PAGE  251

struct data_t
{
  int a; //if a == 1, means that grid length is in Flash, defined by next 4 integers
  int b; 
  int c;
  int d;
  int e;
};

int dataPin  = 2;
int clockPin = 3;
int blankPin = 4;
int latchPin = 5;

int gridLen = 144; //dynamically retrieved from received data

int chunk = 1;

/**
 * Turn all LEDs to the given color
 * @param {color} RGB decmal value (0-255)
 */
void turnall(int color){
  RFduinoBLE.send("turnall", 8);
  digitalWrite(latchPin, LOW);
  digitalWrite(blankPin, HIGH);
  for (int j = 0; j < gridLen / 2; j++) { 
    shiftOut(dataPin, clockPin, LSBFIRST, color);
  }
  digitalWrite(latchPin, HIGH);
  digitalWrite(blankPin, LOW);
  
  digitalWrite(dataPin, LOW);
}
  
/**
 * Initial code when turning on
 */
void setup() {
  pinMode(dataPin, OUTPUT);
  pinMode(clockPin, OUTPUT);
  pinMode(blankPin, OUTPUT);
  pinMode(latchPin, OUTPUT);
  
  //Retrieve gridLen from Flash
  data_t *p = (data_t*)ADDRESS_OF_PAGE(MY_FLASH_PAGE);
  if(p->a == 1) {
    gridLen = ((p->b)-48)*16*16*16 + ((p->c)-48)*16*16 + ((p->d)-48)*16 + ((p->e)-48);
  }
  
  //Turn all LEDs to white
  turnall(255);

  // this is the data we want to appear in the advertisement
  // (the deviceName length plus the advertisement length must be <= 18 bytes
  RFduinoBLE.advertisementData = "bahgera";
  
  // start the BLE stack
  RFduinoBLE.begin(); 
  
  RFduinoBLE.send("ready", 6);
}

/**
 * Required function
 */
void loop() {
  RFduino_ULPDelay(INFINITE);
}


/**
 * Called when Bluetooth connection is started
 * Nothing to do here at this time
 */
//void RFduinoBLE_onConnect() {
//  RFduinoBLE.send("connected", 10);
//}

/**
 * Called when Bluetooth connection is lost
 * Nothing to do here at this time
 */
//void RFduinoBLE_onDisconnect() {    
//  RFduinoBLE.send("disconnecting", 14);
//}

/**
 * Called when data is received
 *
 */
void RFduinoBLE_onReceive(char *data, int len)
{
  int offset = 0;
  
  //The first 4 characters of the first chunk gives us the length of the data to expect
  if(chunk == 1) {
    if(len == 1 && data[0] == '0') { //switch off
      RFduinoBLE.send("off", 4);
      turnall(0);
      return;
    }
    
    if(len == 1 && data[0] == '1') { //reset
      RFduinoBLE.send("reset", 6);
      RFduino_systemReset();
      setup();
      return;
    }
    
    int newgridLen = (int(data[0])-48)*16*16*16 + (int(data[1])-48)*16*16 + (int(data[2])-48)*16 + (int(data[3])-48);
    if(newgridLen != gridLen) {
      gridLen = newgridLen;
      data_t *p = (data_t*)ADDRESS_OF_PAGE(MY_FLASH_PAGE);
      struct data_t value = { 1, int(data[0]), int(data[1]), int(data[2]), int(data[3]) };
      flashWriteBlock(p, &value, sizeof(value));
    }
    
    offset = 4;
    
//    RFduinoBLE.send("start", 6);
    digitalWrite(latchPin, LOW);
    digitalWrite(blankPin, HIGH);
  }
  
  //Send data
  for (int j = 0 + offset; j < (len-1); j+=2) { 
    int dVal = int(data[j]);
    if(dVal > 0) dVal+= int(data[j+1]) + 1;
    else dVal = int(data[j+1]);
    shiftOut(dataPin, clockPin, LSBFIRST, dVal);
  }
  
  //Process last chunk of data
  if(chunk > (gridLen) / 18) { 
     digitalWrite(latchPin, HIGH);
     digitalWrite(blankPin, LOW);
     digitalWrite(dataPin, LOW);
     chunk = 1;
  } else {
    chunk++;
  }
  
  //Return 'done' when finished processing
  RFduinoBLE.send("done", 5);
}
