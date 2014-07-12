/*
Bahgera
*/

#include <RFduinoBLE.h>

int dataPin  = 2;
int clockPin = 3;
int blankPin = 4;
int latchPin = 5;

int gridLen = 144; //dynamically retrieved from received data

int chunk = 1;

void setup() {
  pinMode(dataPin, OUTPUT);
  pinMode(clockPin, OUTPUT);
  pinMode(blankPin, OUTPUT);
  pinMode(latchPin, OUTPUT);
  
  digitalWrite(latchPin, LOW);
  digitalWrite(blankPin, HIGH);
  digitalWrite(dataPin, LOW);
  digitalWrite(clockPin, LOW);

  // this is the data we want to appear in the advertisement
  // (the deviceName length plus the advertisement length must be <= 18 bytes
  RFduinoBLE.advertisementData = "bahgera";
  
  // start the BLE stack
  RFduinoBLE.begin(); 
}

void loop() {
  RFduino_ULPDelay(INFINITE);
}

void RFduinoBLE_onDisconnect() {
}

void RFduinoBLE_onReceive(char *data, int len)
{
  int offset = 0;
  
  if(chunk == 1) {
    gridLen = int(data[0])*16*16*16+int(data[1])*16*16+int(data[2])*16+int(data[3]);
    if(gridLen == 0) { //switch off
      digitalWrite(dataPin, LOW);
      digitalWrite(clockPin, LOW);
      RFduinoBLE.send(gridLen);
      return;
    }
    RFduinoBLE.send(gridLen);
    offset = 4;
    digitalWrite(latchPin, LOW);
    digitalWrite(blankPin, HIGH);
  }
  
  for (int j = 0 + offset; j < (len-1); j+=2) { 
    
    int dVal = int(data[j]);
    if(dVal > 0) dVal+= int(data[j+1]) + 1;
    else dVal = int(data[j+1]);
    
    shiftOut(dataPin, clockPin, LSBFIRST, dVal);
  }
  
  if(chunk >= (gridLen) / 18) { 
     digitalWrite(latchPin, HIGH);
     digitalWrite(blankPin, LOW);
//     RFduinoBLE.send("last", 5);
     chunk = 1;
  } else chunk++;
  
  RFduinoBLE.send("done", 5);
}
