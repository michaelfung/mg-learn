/* *
 *
 * some useful functions for mJS
 *
 * */


extern int mqtt_conn_flag;
extern float bme_temp;
extern float bme_humidity;
extern float bme_pressure;

int mqtt_connected(void);

double read_bme_temp(void);
double read_bme_humidity(void);
double read_bme_pressure(void);
