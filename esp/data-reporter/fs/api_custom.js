// Custom API.

let LL = {
	NONE: -1,
	ERROR: 0,
	WARN: 1,
	INFO: 2,
	DEBUG: 3,
	VERBOSE_DEBUG: 4
};

let Custom = {

	MQTTConnected: ffi('int mqtt_connected()'),

	BMETemp: ffi('double read_bme_temp()'),
	BMEHumidity: ffi('double read_bme_humidity()'),
	BMEPressure: ffi('double read_bme_pressure()')

};
