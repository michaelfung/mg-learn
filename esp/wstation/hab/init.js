/*
 * Read Sensors and send via MQTT (to openHAB2)
 */

// Load Mongoose OS API
load('api_log.js');
load('api_config.js');
load('api_timer.js');
load('api_gpio.js');
load('api_sys.js');
load('api_arduino_ssd1306.js');
load('api_arduino_bme280.js');
load('api_mqtt.js');
load('api_math.js');

/* vars declare */
let thing_id = Cfg.get('mqtt.client_id');
let pir_pin = 13;
let motion_count = 0;
let inactivity = 0;  // no motion detected for n ms
let has_bme = false;
let read_interval = 5000;  // read sensors every n ms
let tickcount = 0;  // for periodic reading
let tick_300s = 300000 / read_interval;  // ticks per 5 mins
let tick_60s = 60000 / read_interval; // ticks per 60s
let display_enabled = true;
let localts= 0;
let hour = 0;
let hab_update_topic = 'hab2/sensors/' + thing_id + '/state';
let readings = {
	temp: -273,
	humid: 0,
	pressure: 0,
	inactivity: 0
};

/* hardware setup */
GPIO.set_mode(pir_pin, GPIO.MODE_INPUT);
let sens_addr = 0x76;  // BME280 I2C address

// Initialize Adafruit_SSD1306 library (I2C)
let d = Adafruit_SSD1306.create_i2c(4 /* RST GPIO */ , Adafruit_SSD1306.RES_128_64);
// Initialize the display.
d.begin(Adafruit_SSD1306.SWITCHCAPVCC, 0x3C, true /* reset */ );
d.display();
d.setTextColor(Adafruit_SSD1306.WHITE);

// Initialize Adafruit_BME280 library
let bme = Adafruit_BME280.create();
// Initialize the sensor
if (bme.begin(sens_addr) === 0) {
    Log.print(Log.ERROR, 'Cant find a sensor!');
} else {
    has_bme = true;
}

let UpdateReadings = function() {
    if (has_bme) {

        readings.temp = bme.readTemperature();
        readings.humid = Math.floor(bme.readHumidity());
        readings.pressure = Math.floor(bme.readPressure());
        readings.inactivity = inactivity / 1000;

		let pubmsg = JSON.stringify({
			uptime: Math.floor(Sys.uptime()),
			memory: Sys.free_ram(),
			data: readings
		});
		let ok = MQTT.pub(hab_update_topic, pubmsg);
		Log.print(Log.INFO, 'Published:' + (ok ? 'OK' : 'FAIL') + ' topic:' + hab_update_topic + ' msg:' +  pubmsg);

        //Log.print(Log.INFO, 'Temperature:' + JSON.stringify(temp) + '*C');
        //Log.print(Log.INFO, 'Humidity:' + JSON.stringify(humid) + '%');
        //Log.print(Log.INFO, 'Pressure:' + JSON.stringify(pressure) + 'hPa');
        //Log.print(Log.INFO, 'Activities:' + JSON.stringify(motion_count));
        //Log.print(Log.INFO, 'Inactive:' + JSON.stringify(inactivity / 1000) + 's');
        //Log.print(Log.INFO, 'RAM:' + JSON.stringify(Sys.free_ram()));

        if (display_enabled) {
            d.clearDisplay();
            d.setTextSize(2);
            d.setCursor(0, 0);
            d.write(JSON.stringify(readings.temp) + ' *C');
            d.setCursor(0, 16);
            d.write("H: " + JSON.stringify(readings.humid) + '%');
            d.setCursor(0, 32);
            d.write("P: " + JSON.stringify(readings.pressure) + ' mb');
            d.display();
        } else {
            d.clearDisplay();
            d.display();
        }
    }
    motion_count = 0;
};

// wait 5 seconds after boot and give initial readings
Timer.set(5000 /* milliseconds */ , false /* repeat */ , function() {
    UpdateReadings();
}, null);


Timer.set(read_interval , true, function() {
    tickcount++;

    // update readings every tick_n seconds
    if ((tickcount % tick_300s) === 0) {

        localts = Math.floor(Timer.now()) + 28800  /* HKT (8 x 3600s) */;
        hour = localts % 86400;
        if ( (hour > (6 * 3600)) && (hour < (22 * 3600))) {
            display_enabled = true;
        } else {
            display_enabled = false;
        }

        UpdateReadings();
        tickcount = 0;
    }

    // check pir level
    if (GPIO.read(pir_pin) === 1) {
        Log.print(Log.INFO, '### PIR sensor active ###');
        motion_count++;
    } else {
        inactivity = inactivity + read_interval;
    }
}, null);

GPIO.set_int_handler(pir_pin, GPIO.INT_EDGE_POS, function(x) {
    Log.print(Log.INFO, '^^^ PIR sensor triggered ^^^');
    motion_count++;
    inactivity = 0;
}, null);
GPIO.enable_int(pir_pin);

// press gpio 0 to force readings update
GPIO.set_button_handler(0, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 500, function(x) {
    display_enabled = true;
    UpdateReadings();
}, null);
