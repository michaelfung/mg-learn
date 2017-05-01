/*
        BME280 commands

        Uses a provided I2C pointer
 */

extern "C" {
	#include "fw/src/mgos_i2c.h"
	#include "fw/src/mgos_hal.h"
}

#include <limits>
#include <math.h>
#include "bme280.h"


/***************************************************************************
   PRIVATE FUNCTIONS
***************************************************************************/
Generic_BME280::Generic_BME280()
  : _cs(-1), _mosi(-1), _miso(-1), _sck(-1)
{
}

Generic_BME280::Generic_BME280(int8_t cspin)
  : _cs(cspin), _mosi(-1), _miso(-1), _sck(-1)
{
}

Generic_BME280::Generic_BME280(int8_t cspin, int8_t mosipin, int8_t misopin, int8_t sckpin)
  : _cs(cspin), _mosi(mosipin), _miso(misopin), _sck(sckpin)
{
}


/**************************************************************************/
/*!
    @brief  Initialise sensor with given parameters / settings
 */
/**************************************************************************/
bool Generic_BME280::begin(uint8_t addr)
{
  _i2caddr = addr;

  // init I2C or SPI sensor interface
  // GAA - for now hard code call to the single I2C master
  //       later add SPI and parameter to define protocol/pins

  _i2c = mgos_i2c_get_global();
  _protocol = I2C;

  // check if sensor, i.e. the chip ID is correct
  if (read8(BME280_REGISTER_CHIPID) != 0x60) {
    return false;
  }
  // reset the device using soft-reset
  // this makes sure the IIR is off, etc.
  write8(BME280_REGISTER_SOFTRESET, 0xB6);

  // wait for chip to wake up.
  mgos_msleep(300);

  // if chip is still reading calibration, delay
  while (isReadingCalibration()) {
    mgos_msleep(100);
  }
  readCoefficients();   // read trimming parameters, see DS 4.2.2
  setSampling();   // use defaults

  return true;
}

/**************************************************************************/
/*!
    @brief  setup sensor with given parameters / settings

    This is simply a overload to the normal begin()-function, so SPI users
    don't get confused about the library requiring an address.
 */
/**************************************************************************/


void Generic_BME280::setSampling(sensor_mode mode,
                                 sensor_sampling tempSampling,
                                 sensor_sampling pressSampling,
                                 sensor_sampling humSampling,
                                 sensor_filter filter,
                                 standby_duration duration) {
  _measReg.mode     = mode;
  _measReg.osrs_t   = tempSampling;
  _measReg.osrs_p   = pressSampling;


  _humReg.osrs_h    = humSampling;
  _configReg.filter = filter;
  _configReg.t_sb   = duration;


  // you must make sure to also set REGISTER_CONTROL after setting the
  // CONTROLHUMID register, otherwise the values won't be applied (see DS 5.4.3)
  write8(BME280_REGISTER_CONTROLHUMID, _humReg.get());
  write8(BME280_REGISTER_CONFIG, _configReg.get());
  write8(BME280_REGISTER_CONTROL, _measReg.get());
}


/**************************************************************************/
/*!
    SPI transfer into one function placeholder
 */
/**************************************************************************/
uint8_t Generic_BME280::spixfer(uint8_t x) {
  (void) x;
  return 0;
}


/**************************************************************************/
/*!
    @brief  Writes an 8 bit value over I2C or SPI
 */
/**************************************************************************/
void Generic_BME280::write8(byte reg, byte value) {
  if (_protocol == I2C) {
    mgos_i2c_write_reg_b(_i2c, _i2caddr,reg, value);
  } else {
    // SPI transaction
  }
  return;
}

/**************************************************************************/
/*!
    @brief  Reads an 8 bit value over I2C or SPI
 */
/**************************************************************************/
uint8_t Generic_BME280::read8(byte reg) {
  uint8_t value = 0xFF;

  if (_protocol == I2C) {
    value = mgos_i2c_read_reg_b(_i2c, _i2caddr, reg);
  } else {
    // SPI transaction
  }
  return value;
}


/**************************************************************************/
/*!
    @brief  Reads a 16 bit value over I2C or SPI
 */
/**************************************************************************/
uint16_t Generic_BME280::read16(byte reg)
{
  uint16_t retval = 0xFFFF;
  uint8_t readval = 0x00;

  if (_protocol == I2C) {
    // read first register
    readval = mgos_i2c_read_reg_b(_i2c, _i2caddr, reg);
    retval = readval << 8 | mgos_i2c_read_reg_b(_i2c, _i2caddr, reg+1);
  } else {
    // SPI transaction placeholder
  }
  return retval;
}


/**************************************************************************/
/*!

 */
/**************************************************************************/
uint16_t Generic_BME280::read16_LE(byte reg) {
  uint16_t temp = read16(reg);
  return (temp >> 8) | (temp << 8);
}


/**************************************************************************/
/*!
    @brief  Reads a signed 16 bit value over I2C or SPI
 */
/**************************************************************************/
int16_t Generic_BME280::readS16(byte reg)
{
  return (int16_t)read16(reg);
}


/**************************************************************************/
/*!

 */
/**************************************************************************/
int16_t Generic_BME280::readS16_LE(byte reg)
{
  return (int16_t)read16_LE(reg);
}


/**************************************************************************/
/*!
    @brief  Reads a 24 bit value over I2C
 */
/**************************************************************************/
uint32_t Generic_BME280::read24(byte reg)
{
  uint32_t retval = 0xFFFFFFFF;
  uint8_t readval = 0x00;

  if (_protocol == I2C) {
    readval = mgos_i2c_read_reg_b(_i2c, _i2caddr, reg);
    retval = readval << 8 | mgos_i2c_read_reg_b(_i2c, _i2caddr, reg+1);
    retval = retval << 8 | mgos_i2c_read_reg_b(_i2c, _i2caddr, reg+2);
  } else {
    // SPI transaction placeholder
  }
  return retval;
}


/**************************************************************************/
/*!
    @brief  Take a new measurement (only possible in forced mode)
 */
/**************************************************************************/
void Generic_BME280::takeForcedMeasurement()
{
  // If we are in forced mode, the BME sensor goes back to sleep after each
  // measurement and we need to set it to forced mode once at this point, so
  // it will take the next measurement and then return to sleep again.
  // In normal mode simply does new measurements periodically.
  if (_measReg.mode == MODE_FORCED) {
    // set to forced mode, i.e. "take next measurement"
    write8(BME280_REGISTER_CONTROL, _measReg.get());
    // wait until measurement has been completed, otherwise we would read
    // the values from the last measurement
    while (read8(BME280_REGISTER_STATUS) & 0x08)
      mgos_msleep(1);
  }
}


/**************************************************************************/
/*!
    @brief  Reads the factory-set coefficients
 */
/**************************************************************************/
void Generic_BME280::readCoefficients(void)
{
  _bme280_calib.dig_T1 = read16_LE(BME280_REGISTER_DIG_T1);
  _bme280_calib.dig_T2 = readS16_LE(BME280_REGISTER_DIG_T2);
  _bme280_calib.dig_T3 = readS16_LE(BME280_REGISTER_DIG_T3);

  _bme280_calib.dig_P1 = read16_LE(BME280_REGISTER_DIG_P1);
  _bme280_calib.dig_P2 = readS16_LE(BME280_REGISTER_DIG_P2);
  _bme280_calib.dig_P3 = readS16_LE(BME280_REGISTER_DIG_P3);
  _bme280_calib.dig_P4 = readS16_LE(BME280_REGISTER_DIG_P4);
  _bme280_calib.dig_P5 = readS16_LE(BME280_REGISTER_DIG_P5);
  _bme280_calib.dig_P6 = readS16_LE(BME280_REGISTER_DIG_P6);
  _bme280_calib.dig_P7 = readS16_LE(BME280_REGISTER_DIG_P7);
  _bme280_calib.dig_P8 = readS16_LE(BME280_REGISTER_DIG_P8);
  _bme280_calib.dig_P9 = readS16_LE(BME280_REGISTER_DIG_P9);

  _bme280_calib.dig_H1 = read8(BME280_REGISTER_DIG_H1);
  _bme280_calib.dig_H2 = readS16_LE(BME280_REGISTER_DIG_H2);
  _bme280_calib.dig_H3 = read8(BME280_REGISTER_DIG_H3);
  _bme280_calib.dig_H4 = (read8(BME280_REGISTER_DIG_H4) << 4) | (read8(BME280_REGISTER_DIG_H4+1) & 0xF);
  _bme280_calib.dig_H5 = (read8(BME280_REGISTER_DIG_H5+1) << 4) | (read8(BME280_REGISTER_DIG_H5) >> 4);
  _bme280_calib.dig_H6 = (int8_t)read8(BME280_REGISTER_DIG_H6);
}

/**************************************************************************/
/*!
    @brief return true if chip is busy reading cal data
 */
/**************************************************************************/
bool Generic_BME280::isReadingCalibration(void)
{
  uint8_t const rStatus = read8(BME280_REGISTER_STATUS);

  return (rStatus & (1 << 0)) != 0;
}


/**************************************************************************/
/*!
    @brief  Returns the temperature from the sensor
 */
/**************************************************************************/
float Generic_BME280::readTemperature(void)
{
  int32_t var1, var2;

  int32_t adc_T = read24(BME280_REGISTER_TEMPDATA);
  if (adc_T == 0x800000)   // value in case temp measurement was disabled
    return std::numeric_limits<double>::quiet_NaN();
  adc_T >>= 4;

  var1 = ((((adc_T>>3) - ((int32_t)_bme280_calib.dig_T1 <<1))) *
          ((int32_t)_bme280_calib.dig_T2)) >> 11;

  var2 = (((((adc_T>>4) - ((int32_t)_bme280_calib.dig_T1)) *
            ((adc_T>>4) - ((int32_t)_bme280_calib.dig_T1))) >> 12) *
          ((int32_t)_bme280_calib.dig_T3)) >> 14;

  t_fine = var1 + var2;

  float T = (t_fine * 5 + 128) >> 8;
  return T/100;
}


/**************************************************************************/
/*!
    @brief  Returns the temperature from the sensor
 */
/**************************************************************************/
float Generic_BME280::readPressure(void) {
  int64_t var1, var2, p;

  readTemperature();   // must be done first to get t_fine

  int32_t adc_P = read24(BME280_REGISTER_PRESSUREDATA);
  if (adc_P == 0x800000)   // value in case pressure measurement was disabled
    return std::numeric_limits<double>::quiet_NaN();
  adc_P >>= 4;

  var1 = ((int64_t)t_fine) - 128000;
  var2 = var1 * var1 * (int64_t)_bme280_calib.dig_P6;
  var2 = var2 + ((var1*(int64_t)_bme280_calib.dig_P5)<<17);
  var2 = var2 + (((int64_t)_bme280_calib.dig_P4)<<35);
  var1 = ((var1 * var1 * (int64_t)_bme280_calib.dig_P3)>>8) +
         ((var1 * (int64_t)_bme280_calib.dig_P2)<<12);
  var1 = (((((int64_t)1)<<47)+var1))*((int64_t)_bme280_calib.dig_P1)>>33;

  if (var1 == 0) {
    return 0;     // avoid exception caused by division by zero
  }
  p = 1048576 - adc_P;
  p = (((p<<31) - var2)*3125) / var1;
  var1 = (((int64_t)_bme280_calib.dig_P9) * (p>>13) * (p>>13)) >> 25;
  var2 = (((int64_t)_bme280_calib.dig_P8) * p) >> 19;

  p = ((p + var1 + var2) >> 8) + (((int64_t)_bme280_calib.dig_P7)<<4);
  return (float)p/256;
}


/**************************************************************************/
/*!
    @brief  Returns the humidity from the sensor
 */
/**************************************************************************/
float Generic_BME280::readHumidity(void) {
  readTemperature();   // must be done first to get t_fine

  int32_t adc_H = read16(BME280_REGISTER_HUMIDDATA);
  if (adc_H == 0x8000)   // value in case humidity measurement was disabled
    return std::numeric_limits<double>::quiet_NaN();

  int32_t v_x1_u32r;

  v_x1_u32r = (t_fine - ((int32_t)76800));

  v_x1_u32r = (((((adc_H << 14) - (((int32_t)_bme280_calib.dig_H4) << 20) -
                  (((int32_t)_bme280_calib.dig_H5) * v_x1_u32r)) + ((int32_t)16384)) >> 15) *
               (((((((v_x1_u32r * ((int32_t)_bme280_calib.dig_H6)) >> 10) *
                    (((v_x1_u32r * ((int32_t)_bme280_calib.dig_H3)) >> 11) + ((int32_t)32768))) >> 10) +
                  ((int32_t)2097152)) * ((int32_t)_bme280_calib.dig_H2) + 8192) >> 14));

  v_x1_u32r = (v_x1_u32r - (((((v_x1_u32r >> 15) * (v_x1_u32r >> 15)) >> 7) *
                             ((int32_t)_bme280_calib.dig_H1)) >> 4));

  v_x1_u32r = (v_x1_u32r < 0) ? 0 : v_x1_u32r;
  v_x1_u32r = (v_x1_u32r > 419430400) ? 419430400 : v_x1_u32r;
  float h = (v_x1_u32r>>12);
  return h / 1024.0;
}


/**************************************************************************/
/*!
    Calculates the altitude (in meters) from the specified atmospheric
    pressure (in hPa), and sea-level pressure (in hPa).

    @param  seaLevel      Sea-level pressure in hPa
    @param  atmospheric   Atmospheric pressure in hPa
 */
/**************************************************************************/
float Generic_BME280::readAltitude(float seaLevel)
{
  // Equation taken from BMP180 datasheet (page 16):
  //  http://www.adafruit.com/datasheets/BST-BMP180-DS000-09.pdf

  // Note that using the equation from wikipedia can give bad results
  // at high altitude. See this thread for more information:
  //  http://forums.adafruit.com/viewtopic.php?f=22&t=58064

  float atmospheric = readPressure() / 100.0F;
  return 44330.0 * (1.0 - pow(atmospheric / seaLevel, 0.1903));
}


/**************************************************************************/
/*!
    Calculates the pressure at sea level (in hPa) from the specified altitude
    (in meters), and atmospheric pressure (in hPa).
    @param  altitude      Altitude in meters
    @param  atmospheric   Atmospheric pressure in hPa
 */
/**************************************************************************/
float Generic_BME280::seaLevelForAltitude(float altitude, float atmospheric)
{
  // Equation taken from BMP180 datasheet (page 17):
  //  http://www.adafruit.com/datasheets/BST-BMP180-DS000-09.pdf

  // Note that using the equation from wikipedia can give bad results
  // at high altitude. See this thread for more information:
  //  http://forums.adafruit.com/viewtopic.php?f=22&t=58064

  return atmospheric / pow(1.0 - (altitude/44330.0), 5.255);
}
