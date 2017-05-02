/* *
 *
 * some useful functions for mJS
 *
 * */

#include <stdio.h>
#include "custom.h"
#include "common/platform.h"
#include "common/cs_dbg.h"

int mqtt_conn_flag;

int mqtt_connected(void) {
	return mqtt_conn_flag;
}


float bme_temp;
float bme_humidity;
float bme_pressure;

double read_bme_temp(void) {
	return (double)bme_temp;
};

double read_bme_humidity(void) {
	return (double)bme_humidity;
};

double read_bme_pressure(void) {
	return (double)bme_pressure;
};
