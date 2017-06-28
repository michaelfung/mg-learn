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
let hab_state_topic = 'hab2/switch/' + thing_id + '/state';
let led_onboard = 13; // Sonoff LED pin
let sw_pin = 12;  // Sonoff relay pin
let spare_pin = 14;  // Sonoff not connected
let button_pin = 0;  // Sonoff push button
let sw_state = {
    dev_id: '1',
    value: 0,
    status: 'OFF',
    battery: 1,
    time: 0
};
let last_toggle = 0;
let tick_count = 0;

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
    sw_state.status = sw_state.value ? 'ON' : 'OFF';
    return sw_state;
};

/* notify server of switch state */
let update_state = function() {
    let pubmsg = JSON.stringify({
        op: 'state',
        uptime: Sys.uptime(),
        memory: Sys.free_ram(),
        data: [
            get_sw_state()
        ]
    });
    let ok = MQTT.pub(hab_state_topic, pubmsg);
    Log.print(Log.INFO, 'Published:' + (ok ? 'OK' : 'FAIL') + ' topic:' + hab_state_topic + ' msg:' +  pubmsg);
};

/* toggle switch with bounce protection */
let toggle_switch = function() {
    if ( (Sys.uptime() - last_toggle ) > 2 ) {
        GPIO.toggle(sw_pin);
        sw_state.value = 1 - sw_state.value; // 0 1 toggle
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
    let parsed = JSON.parse(msg);

    if ( parsed.op === 'set' ) {
        if ( parsed.value === 1 ) {
            if ( (Sys.uptime() - last_toggle ) > 2 ) {
                GPIO.write(sw_pin, 1);  // set switch to on
                sw_state.value = 1;
                last_toggle = Sys.uptime();
            }
        } else if ( parsed.value === 0 ) {
                   GPIO.write(sw_pin, 0);  // set switch to off
                   sw_state.value = 0;
                   last_toggle = Sys.uptime();
        } else {
                //parsed.errno = 5;  /* 5: invalid param */
                Log.print(Log.ERROR, 'Unsupported value');
        }
    }

    else {
        Log.print(Log.ERROR, 'Unsupported Operation');
    }

    update_state();

}, null);


// Blink built-in LED every second
Timer.set(1000 /* 1 sec */, true /* repeat */, function() {

  let value = GPIO.toggle(led_onboard);
  print(value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime());
  tick_count++;
  tick_count = tick_count % 60;
  if ( tick_count === 0 ) {
		update_state();
  }
}, null);

Log.print(Log.WARN, "### init script started ###");
