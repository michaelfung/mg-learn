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
	// use system logging so that it can go to udp log server
	Log: ffi('void jslog(int, char *)'),

	MQTTConnected: ffi('int mqtt_connected()')
};
