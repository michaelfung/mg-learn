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
let hab_control_topic = 'hab2/switch/' + thing_id;
let led_onboard = 13; // Sonoff LED pin
let sw_pin = 12;  // Sonoff relay pin
let spare_pin = 14;  // Sonoff not connected
let button_pin = 0;  // Sonoff push button
let sw_state = {
	dev_id: '00FF0001',
	status: 0,
	battery: 1,
	time: 0
};
let last_toggle = 0;

// init hardware
GPIO.set_mode(led_onboard, GPIO.MODE_OUTPUT);
GPIO.write(led_onboard, 1);  // default to off

GPIO.set_mode(sw_pin, GPIO.MODE_OUTPUT);
GPIO.write(sw_pin, 0);  // default to off

GPIO.set_mode(spare_pin, GPIO.MODE_INPUT);
GPIO.set_mode(button_pin, GPIO.MODE_INPUT);

// define functions:
let get_sw_state = function() {
	sw_state.time = Timer.now();
	return sw_state;
};

/* notify server of switch state */
let update_state = function() {
	let topic = 'wd/' + thing_id + '/update/state';
	let pubmsg = JSON.stringify({
		type: 'noti',
		op: 'report',
		hub_id: thing_id,
		uptime: Sys.uptime(),
		memory: Sys.free_ram(),
		data: [
			get_sw_state()
		]
	});
	let ok = MQTT.pub(topic, pubmsg);
	Log.print(Log.INFO, 'Published:' + (ok ? 'OK' : 'FAIL') + ' topic:' + topic + 'msg:' +  pubmsg);
};

/* toggle switch with bounce protection */
let toggle_switch = function() {
	if ( (Sys.uptime() - last_toggle ) > 10 ) {
		GPIO.toggle(sw_pin);
		sw_state.status = 1 - sw_state.status; // 0 1 toggle
		last_toggle = Sys.uptime();
	} else {
		Log.print(Log.INFO, 'Too frequent. Toggle not allowed.');
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

MQTT.sub(hab_control_topic, function(conn, topic, msg) {
	Log.print(Log.INFO, 'rcvd ctrl msg:' + msg);

	if ( msg === '1' ) {
		if ( (Sys.uptime() - last_toggle ) > 5 ) {
			GPIO.write(sw_pin, 1);  // set switch to on
			sw_state.status = 1;
			last_toggle = Sys.uptime();
		}
	} else if ( msg === '0') {
		   GPIO.write(sw_pin, 0);  // set switch to off
		   sw_state.status = 0;
		   last_toggle = Sys.uptime();
	} else {
		//parsed.errno = 5;  /* 5: invalid param */
		Log.print(Log.ERROR, 'Unknown Operation');
	}

	//let topic = 'wd/' + thing_id + '/update/state';
	//let pubmsg = JSON.stringify(parsed);
	//let ok = MQTT.pub(topic, pubmsg);
	//Log.print(Log.INFO, 'Published:' + (ok ? 'OK' : 'FAIL') + ' topic:' + topic + 'msg:' +  pubmsg);
	// update_state();

}, null);


// Blink built-in LED every second
GPIO.set_mode(led_onboard, GPIO.MODE_OUTPUT);
Timer.set(1000 /* 1 sec */, true /* repeat */, function() {
  let value = GPIO.toggle(led_onboard);
  print(value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime());
}, null);

Log.print(Log.WARN, "### init script started ###");
