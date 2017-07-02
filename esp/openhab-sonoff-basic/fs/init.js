/*
 * test interfacing openHAB2
 *
 * emulate a sonoff basic to ease test
 *
 */

// Load Mongoose OS API
load('api_timer.js');
load('api_gpio.js');
load('api_rpc.js');
load('api_sys.js');
load('api_mqtt.js');
load('api_config.js');
load('api_log.js');

// init variables / constants
let thing_id = Cfg.get('mqtt.client_id');
let hab_control_topic = 'sonoff_basic/' + thing_id;
let hab_state_topic = 'sonoff_basic/' + thing_id + '/state';
let led_onboard = 13; // Sonoff LED pin
let relay_pin = 12;  // Sonoff relay pin
let spare_pin = 14;  // Sonoff not connected
let button_pin = 0;  // Sonoff push button
let relay_state = 'OFF';
let relay_value = 0;
let last_toggle = 0;
let tick_count = 0;

// init hardware
GPIO.set_mode(led_onboard, GPIO.MODE_OUTPUT);
GPIO.write(led_onboard, 1);  // default to off

GPIO.set_mode(relay_pin, GPIO.MODE_OUTPUT);
GPIO.write(relay_pin, 0);  // default to off

GPIO.set_mode(spare_pin, GPIO.MODE_INPUT);
GPIO.set_mode(button_pin, GPIO.MODE_INPUT);

/* notify server of switch state */
let update_state = function() {
    let pubmsg = JSON.stringify({
        uptime: Sys.uptime(),
        memory: Sys.free_ram(),
        relay_state: relay_state
    });
    let ok = MQTT.pub(hab_state_topic, pubmsg);
    Log.print(Log.INFO, 'Published:' + (ok ? 'OK' : 'FAIL') + ' topic:' + hab_state_topic + ' msg:' +  pubmsg);
};

/* toggle switch with bounce protection */
let toggle_switch = function() {
    if ( (Sys.uptime() - last_toggle ) > 2 ) {
        GPIO.toggle(relay_pin);
        relay_value = 1 - relay_value; // 0 1 toggle
        last_toggle = Sys.uptime();
    } else {
        Log.print(Log.INFO, 'Bounce protection: toggle not allowed.');
    }
};

// define event and event handlers
/* sonoff button pressed */
GPIO.set_button_handler(button_pin, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 500, function(x) {
    // toggle switch
    Log.print(Log.INFO, 'button pressed');
    toggle_switch();
    update_state();
}, true);

MQTT.sub(hab_control_topic, function(conn, topic, command) {
    Log.print(Log.INFO, 'rcvd ctrl msg:' + command);


        if ( command === 'ON' ) {
            if ( (Sys.uptime() - last_toggle ) > 2 ) {
                GPIO.write(relay_pin, 1);  // set switch to on
                relay_state.value = 1;
                last_toggle = Sys.uptime();
            }
        } else if ( command === 'OFF' ) {
                   GPIO.write(relay_pin, 0);  // set switch to off
                   relay_state.value = 0;
                   last_toggle = Sys.uptime();
        } else {
			Log.print(Log.ERROR, 'Unsupported command');
        }

    update_state();

}, null);


// timer loop to update state
Timer.set(1000 /* 1 sec */, true /* repeat */, function() {

  tick_count++;
  tick_count = tick_count % 300;
  if ( tick_count === 0 ) {
		update_state();
  }
}, null);

Log.print(Log.WARN, "### BOOT UP Script Started ###");
