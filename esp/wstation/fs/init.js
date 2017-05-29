/*
 * Copyright (c) 2014-2017 Cesanta Software Limited
 * All rights reserved
 *
 * This example demonstrates how to use mJS Arduino Adafruit_SSD1306
 * library API.
 */

// Load Mongoose OS API
load('api_timer.js');
load('api_arduino_ssd1306.js');
load('api_arduino_bme280.js');

// Initialize Adafruit_SSD1306 library (I2C)
let d = Adafruit_SSD1306.create_i2c(4 /* RST GPIO */, Adafruit_SSD1306.RES_128_64);
// Initialize the display.
d.begin(Adafruit_SSD1306.SWITCHCAPVCC, 0x3C, true /* reset */);
d.display();
//d.setTextSize(1);
d.setTextColor(Adafruit_SSD1306.WHITE);

// Initialize Adafruit_BME280 library
let has_bme = false;
// Sensors address
let sens_addr = 0x76;
let bme = Adafruit_BME280.create();
// Initialize the sensor
if (bme.begin(sens_addr) === 0) {
  print('Cant find a sensor');
} else {
  has_bme = true;
}

let temp = -273.0;
let humid = 0.0;
let pressure = 0.0;

Timer.set(5000 /* milliseconds */, true /* repeat */, function() {
	if (has_bme) {
	  d.clearDisplay();
		temp = bme.readTemperature();
		humid = bme.readHumidity();
		pressure = bme.readPressure();
		    print('Humidity:', humid, '%RH');
    print('Pressure:',pressure, 'hPa');
		print('Temperature:', temp, '*C');
	  //showStr(d, "T: " + JSON.stringify(temp) + '*C');
	  d.setTextSize(2);
	 d.setCursor(0, 0);
    d.write(JSON.stringify(temp) + ' *C');
    d.setTextSize(1);
     d.setCursor(0, 32);
    d.write("H: " + JSON.stringify(humid) + '%');
     d.setCursor(0, 48);
    d.write("P: " + JSON.stringify(pressure) + 'hPa');

    d.display();
	}
}, null);

