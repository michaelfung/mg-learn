#include <stdio.h>
#include <time.h>

#include "common/platform.h"
#include "common/cs_file.h"
#include "fw/src/mgos_app.h"
#include "fw/src/mgos_gpio.h"
#include "fw/src/mgos_sys_config.h"
#include "fw/src/mgos_timers.h"
#include "fw/src/mgos_hal.h"
#include "fw/src/mgos_dlsym.h"
#include "fw/src/mgos_mqtt.h"
#include "mjs.h"
#include "bme280/bme280.h"

Generic_BME280 bme;
static int ON_BOARD_LED = 13; /* sonoff basic LED pin */

bool mqtt_conn_flag = false;

int get_led_gpio_pin(void) {
  return ON_BOARD_LED;
}

void jslog(uint8_t level ,const char *msg) {
	LOG(level, ("%s", msg));
};

int mqtt_connected(void) {
	return (int) mqtt_conn_flag;
}

static void off_on_board_led_cb (void *arg) {
	mgos_gpio_write(ON_BOARD_LED, 1);
	(void) arg;
}

static void blink_on_board_led_cb(void *arg) {
	if (mqtt_conn_flag) {
		mgos_gpio_write(ON_BOARD_LED, 0);  // on
		mgos_set_timer(50 /* ms */, false /* repeat */, off_on_board_led_cb, NULL);
	} else {
		mgos_gpio_toggle(ON_BOARD_LED);
	}
	(void) arg;
}

static void pub(struct mg_connection *c, const char *fmt, ...) {
  char msg[200];
  struct json_out jmo = JSON_OUT_BUF(msg, sizeof(msg));
  va_list ap;
  int n;
  va_start(ap, fmt);
  n = json_vprintf(&jmo, fmt, ap);
  va_end(ap);
  mg_mqtt_publish(c, get_cfg()->mqtt.pub, 0, MG_MQTT_QOS(0), msg, n);
  LOG(LL_INFO, ("%s -> %s", get_cfg()->mqtt.pub, msg));
}

static void mqtt_ev_handler(struct mg_connection *c, int ev, void *p, void *user_data) {
  struct mg_mqtt_message *msg = (struct mg_mqtt_message *) p;
  if (ev == MG_EV_MQTT_CONNACK) {
    LOG(LL_INFO, ("CONNACK: %d", msg->connack_ret_code));
    mqtt_conn_flag = true;
    if (get_cfg()->mqtt.pub == NULL) {
      LOG(LL_ERROR, ("Run 'mos config-set mqtt.pub=... '"));
    } else {
      pub(c, "{timestamp:%.3lf, mem_free:%d}", mg_time(), mgos_get_free_heap_size() );  /* post uptime */
    }
  } else if (ev == MG_EV_CLOSE) {
      mqtt_conn_flag = false;
  }
  (void) user_data;
}

static void bme280_cb(void *arg){
  LOG (LL_INFO, ("Temp: %2.2fC, Humidity: %2.2f%%, Pressure: %2.4fmb",
                 bme.readTemperature(),
                 bme.readHumidity(),
                 (float)(bme.readPressure()/100)));
  (void) arg;
}

enum mgos_app_init_result mgos_app_init(void) {

  mgos_gpio_set_mode(ON_BOARD_LED, MGOS_GPIO_MODE_OUTPUT);
  mgos_set_timer(2000 /* ms */, true /* repeat */, blink_on_board_led_cb, NULL);

  /* Initialize JavaScript engine */
  int mem1, mem2, mem3;
  mem1 = mgos_get_free_heap_size();
  struct mjs *mjs = mjs_create();
  mem2 = mgos_get_free_heap_size();
  mjs_set_ffi_resolver(mjs, mgos_dlsym);
  mjs_err_t err = mjs_exec_file(mjs, "init.js", NULL);
  if (err != MJS_OK) {
    LOG(LL_ERROR, ("MJS exec error: %s\n", mjs_strerror(mjs, err)));
  }
  mem3 = mgos_get_free_heap_size();
  LOG(LL_INFO, ("mJS memory stat: before init: %d "
                "after init: %d after init.js: %d",
                mem1, mem2, mem3));
  mgos_mqtt_add_global_handler(mqtt_ev_handler, NULL);

  bool status;
  status = bme.begin();
  if (!status) {
    LOG (LL_INFO, ("Could not find BME280 on I2C, check wiring or I2C config"));
  } else {
	mgos_set_timer(5000, true /* repeat */, bme280_cb, NULL);
  }

  return MGOS_APP_INIT_SUCCESS;
}
