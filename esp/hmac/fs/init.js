load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');

let HMAC = {

	_setKey: ffi('int hmac_set_key(char *)'),
	_initCtx: ffi('int hmac_init_ctx()'),
	_injectKey: ffi('int hmac_inject_key()'),
	_computeDigest: ffi('int hmac_compute_digest(char *)'),
	_getDigest: ffi('char *hmac_get_hexdigest()'),
	_resetCtx: ffi('int hmac_reset_ctx()'),

	/* run this first */
	initCtx: function() {
		if (this._initCtx() === 0) {
			return true;
		} else {
			return false;
		}
	},

	/* if initCtx is successful, do this */
	setKey: function(hexstring) {
		if (hexstring.length < 32) {
			return false;
		}
		let ret = this._setKey(hexstring);
		if (ret !== 0) {
			return false;
		}
		if (this._injectKey() === 0) {
			return true;
		} else {
			return false;
		}
	},

	/* after key is set, use this to get digest of data. */
	getDigest: function(data) {
		let res = null;
		if (this._computeDigest(data) !== 0) {
			// return null;
		} else {
			res = this._getDigest();
		}
		// clean up for next _computeDigest operation
		this._resetCtx();
		return res;
	}
};

// Helper C function get_led_gpio_pin() in src/main.c returns built-in LED GPIO
let led = ffi('int get_led_gpio_pin()')();

let ok = false;

	if (HMAC.initCtx()) {
		print('HMAC ctx init OK');
		ok = true;
	}

let keystring = "d5aa9600d5aa9600d5aa9600d5aa9600";

ok = HMAC.setKey(keystring);
print('HMAC setKey ', ok ? 'OK' : 'Failed');

if (ok) {
	let data = "hello world";
	let digest = HMAC.getDigest(data);
	if (digest === null) {
		print('HMAC getDigest Failed.');
	} else {
		print('hello_world : ', digest);
	}

	data = '{"desired":{"power":"ON"}}';
	let digest = HMAC.getDigest(data);
	if (digest === null) {
		print('HMAC getDigest Failed for desired.');
	} else {
		print('desired : ', digest);
	}
}

let getInfo = function() {
  return JSON.stringify({total_ram: Sys.total_ram(), free_ram: Sys.free_ram()});
};

// Blink built-in LED every second
GPIO.set_mode(led, GPIO.MODE_OUTPUT);
Timer.set(1000 /* 1 sec */, true /* repeat */, function() {
  let value = GPIO.toggle(led);
  print(value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime(), getInfo());
}, null);

// Publish to MQTT topic on a button press. Button is wired to GPIO pin 0
GPIO.set_button_handler(0, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 200, function() {
  let topic = '/devices/' + Cfg.get('device.id') + '/events';
  let message = getInfo();
  let ok = MQTT.pub(topic, message, 1);
  print('Published:', ok ? 'yes' : 'no', 'topic:', topic, 'message:', message);
}, null);
