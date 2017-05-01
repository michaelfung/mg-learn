// Load Mongoose OS API
load('api_timer.js');
load('api_gpio.js');
load('api_rpc.js');
load('api_sys.js');
load('api_mqtt.js');
load('api_config.js');
load('api_custom.js');

// init variables / constants
let wd_id = Cfg.get('device.id');
let led_onboard = 13; // Sonoff LED pin
let sw_pin = 12;  // Sonoff relay pin
let spare_pin = 14;  // Sonoff not connected
let button_pin = 0;  // Sonoff push button
let sw_state = {
	dev_id: '00FF0001',
	status: 0,
	battery: 1,
	time: Sys.uptime()
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
	sw_state.time = Sys.uptime();
	return sw_state;
};

/* notify server of switch state */
let update_state = function() {
	let topic = 'wd/' + wd_id + '/update/state';
	let pubmsg = JSON.stringify({
		type: 'noti',
		op: 'report',
		hub_id: wd_id,
		ts: Sys.uptime(),
		memory: Sys.free_ram(),
		data: [
			get_sw_state()
		]
	});
	let ok = MQTT.pub(topic, pubmsg);
	//print('Published:', ok ? 'OK' : 'FAIL', 'topic:', topic, 'message:', pubmsg);
	Custom.Log(LL.INFO, 'Published:'  + (ok ? 'OK' : 'FAIL') + ', topic:' + topic + ', msg:' +  pubmsg);
};

/* toggle switch with bounce protection */
let toggle_switch = function() {
	if (sw_state.status === 1) {  // bypass check if to switch off
		GPIO.write(sw_pin, 0);
		sw_state.status = 0;
		last_toggle = Sys.uptime();
	} else if ( (Sys.uptime() - last_toggle ) > 5 ) {
		GPIO.write(sw_pin, 1);  // turn on
		sw_state.status = 1;
		last_toggle = Sys.uptime();
	} else {
		// too soon to switch on
	}
};

// define event and event handlers
/* sonoff button pressed */
GPIO.set_button_handler(button_pin, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 500, function(x) {
	// toggle switch
	toggle_switch();
	update_state();
}, true);

MQTT.sub('wd/' + wd_id + '/control', function(conn, topic, msg) {
	Custom.Log(LL.INFO, 'rcvd ctrl msg:' + msg);
	let parsed = JSON.parse(msg);

	if ( parsed.op === 'read' ) {
		parsed.data = [	get_sw_state() ];
		parsed.errno = 0;

	} else if ( parsed.op === 'set' ) {
		if (parsed.params.value === 2) {
		   toggle_switch();  // toggle switch
		} else if (parsed.params.value === 1) {
			if ( (Sys.uptime() - last_toggle ) > 5 ) {
				GPIO.write(sw_pin, 1);  // set switch to on
				sw_state.status = 1;
				last_toggle = Sys.uptime();
			}
		} else {
		   GPIO.write(sw_pin, 0);  // set switch to on
		   sw_state.status = 0;
		   last_toggle = Sys.uptime();
		}
		parsed.errno = 0;
	} else {
		parsed.errno = 5;  /* 5: invalid param */
		print('Un-supported op');
	}

	let topic = 'wd/' + wd_id + '/update/state';
	let pubmsg = JSON.stringify(parsed);
	let ok = MQTT.pub(topic, pubmsg);
	//print('Published:', ok ? 'OK' : 'FAIL', 'topic:', topic, 'message:', pubmsg);
	Custom.Log(LL.INFO, 'Published:' + (ok ? 'OK' : 'FAIL') + 'topic:' + topic + 'msg:' +  pubmsg);
	update_state();

}, null);


Custom.Log(LL.INFO, "### INIT Script Started ###");

