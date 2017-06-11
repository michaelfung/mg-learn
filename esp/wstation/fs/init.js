/*
 * Read Sensors and send to ThingSpeak
 */

// Load Mongoose OS API
load('api_log.js');
load('api_timer.js');
load('api_gpio.js');
load('api_sys.js');
load('api_arduino_ssd1306.js');
load('api_arduino_bme280.js');
load('api_http.js');

/* vars declare */
let pir_pin = 13;
let ThingSpeakKey = 'RDW7QK8IE5NON9KJ';
let motion_count = 0;
// let last_motion_ts = 0;  // use if need high inactive precision
let inactive_duration = 0;  // no motion detected for n ms
let temp = -273.0;
let humid = 0.0;
let pressure = 0.0;
let has_bme = false;
let read_interval = 5000;  // read sensors every n ms
let tickcount = 0;  // for periodic reading
let tick_300s = 300000 / read_interval;  // ticks per 5 mins
let display_enabled = true;

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

        temp = bme.readTemperature();
        humid = bme.readHumidity();
        pressure = bme.readPressure();
        Log.print(Log.INFO, 'Temperature:' + JSON.stringify(temp) + '*C');
        Log.print(Log.INFO, 'Humidity:' + JSON.stringify(humid) + '%');
        Log.print(Log.INFO, 'Pressure:' + JSON.stringify(pressure) + 'hPa');
        Log.print(Log.INFO, 'Activities:' + JSON.stringify(motion_count));
        Log.print(Log.INFO, 'Inactive:' + JSON.stringify(inactive_duration / 1000) + 's');
        Log.print(Log.INFO, 'RAM:' + JSON.stringify(Sys.free_ram()));

        if (display_enabled) {
            d.clearDisplay();
            d.setTextSize(2);
            d.setCursor(0, 0);
            d.write(JSON.stringify(temp) + ' *C');
            d.setCursor(0, 16);
            d.write("H: " + JSON.stringify(humid) + '%');
            d.setCursor(0, 32);
            d.write("P: " + JSON.stringify(pressure) + ' hPa');
            d.display();
        }

        HTTP.query({
            url: 'https://api.thingspeak.com/update?api_key='
            + ThingSpeakKey + '&field1=' + JSON.stringify(temp)
            + '&field2=' + JSON.stringify(humid)
            + '&field3=' + JSON.stringify(pressure)
            + '&field4=' + JSON.stringify(motion_count)
            + '&field5=' + JSON.stringify(Sys.free_ram()),
            ca_cert: 'thingspeak_ca.pem',
            success: function(body, full_http_msg) {
                Log.print(Log.INFO, 'ThingSpeak Feed OK:' + body);
            },
            error: function(err) {
                Log.print(Log.ERROR, 'ThingSpeak Feed ERR:' + err);
            }, // Optional
        });
    }
    motion_count = 0;
};

// wait 5 seconds after boot and give initial readings
Timer.set(5000 /* milliseconds */ , false /* repeat */ , function() {
    UpdateReadings();
}, null);


Timer.set(read_interval , true, function() {
    tickcount++;

    // update readings every 300 seconds
    if ((tickcount % (tick_300s)) === 0) {
        UpdateReadings();
        tickcount = 0;
    }

    // check pir level
    if (GPIO.read(pir_pin) === 1) {
        Log.print(Log.INFO, '### PIR sensor active ###');
        motion_count++;
    } else if (motion_count === 0) {
        inactive_duration = inactive_duration + read_interval;
    }
}, null);


GPIO.set_int_handler(pir_pin, GPIO.INT_EDGE_POS, function(x) {
    Log.print(Log.INFO, '^^^ PIR sensor triggered ^^^');
    motion_count++;
    inactive_duration = 0;
}, null);
GPIO.enable_int(pir_pin);

// press gpio 0 to force readings update
GPIO.set_button_handler(0, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 500, function(x) {
    UpdateReadings();
}, null);
