#include <stdio.h>

#include "common/platform.h"
#include "common/cs_file.h"
#include "mgos_app.h"
#include "mgos_gpio.h"
#include "mgos_sys_config.h"
#include "mgos_timers.h"
#include "mgos_hal.h"
#include "mgos_dlsym.h"
#include "mjs.h"
#include "mbedtls/md.h"

#if CS_PLATFORM == CS_P_ESP8266
#define LED_GPIO 2 /* On ESP-12E there is a blue LED connected to GPIO2  */
#elif CS_PLATFORM == CS_P_ESP32
#define LED_GPIO 21 /* No LED on DevKitC, use random GPIO close to GND pin */
#elif CS_PLATFORM == CS_P_CC3200
#define LED_GPIO 64 /* The red LED on LAUNCHXL */
#elif(CS_PLATFORM == CS_P_STM32) && defined(BSP_NUCLEO_F746ZG)
/* Nucleo-144 F746 */
#define LED_GPIO STM32_PIN_PB7 /* Blue LED */
#elif(CS_PLATFORM == CS_P_STM32) && defined(BSP_DISCO_F746G)
/* Discovery-0 F746 */
#define LED_GPIO STM32_PIN_PI1 /* Green LED */
#else
#error Unknown platform
#endif

int get_led_gpio_pin(void) {
  return LED_GPIO;
}

enum mgos_app_init_result mgos_app_init(void) {

  return MGOS_APP_INIT_SUCCESS;
}

/*
int mbedtls_md_hmac( const mbedtls_md_info_t *md_info, const unsigned char *key, size_t keylen,
                const unsigned char *input, size_t ilen,
                unsigned char *output );

                *
                */


/*
 *
  enum mgos_app_init_result mgos_app_init(void) {

  const mbedtls_md_info_t *md_info = mbedtls_md_info_from_type( MBEDTLS_MD_SHA1 );

  unsigned char key[] = "0123456789abcdef";
  unsigned char input[] = "launch ICBM";
  unsigned char digest[20];
  size_t ilen = sizeof(input);
  size_t keylen = sizeof(key);

  int res;

  res = mbedtls_md_hmac( md_info, key, keylen,
                input, ilen,
                digest );
  (void) res;

  return MGOS_APP_INIT_SUCCESS;
}
*/


