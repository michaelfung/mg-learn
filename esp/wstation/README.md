## Weather Station

This project collects data from bme280 and and reports to a cloud service,
also display it using OLED.


  mos build --local --repo ~/git/mongoose-os --arch esp8266

  mos build --local --no-libs-update --repo ~/git/mongoose-os --arch esp8266


### ThingSpeak Configuration

$ mos --port "ws://wsta-01.lan/rpc" get conf9.json
{
  "debug": {
    "udp_log_addr": "192.168.0.236:1993",
    "stdout_topic": "esp8266_115950/log",
    "stderr_topic": "esp8266_115950/log"
  },
  "thingspeak": {
    "key": "RDW...9KJ"
  }
}


### openHAB2 configuration

connect to MQTT broker of the hab

```
mos --port "ws://wsta-01.lan/rpc" config-set \
  mqtt.enable=true \
  mqtt.client_id="wsta1" \
  mqtt.server="hab2.lan:1883" \
  mqtt.user="" mqtt.pass="" \
  debug.stderr_topic="" debug.stdout_topic="" \
  debug.udp_log_addr="192.168.0.31:1993"

```

item entries:

```
	Number Wsta1_RAM "RAM Free" {mqtt="<[local_broker:hab2/sensors/wsta1/state:state:JSONPATH($.memory)]"}
	Number Wsta1_Temp "Temperature [%.1f °C]" {mqtt="<[local_broker:hab2/sensors/wsta1/state:state:JSONPATH($.data.temp)]"}
	Number Wsta1_Humidity "Humidity [%d %%]" {mqtt="<[local_broker:hab2/sensors/wsta1/state:state:JSONPATH($.data.humid)]"}
	Number Wsta1_Pressure "Pressure [%d hPa]" {mqtt="<[local_broker:hab2/sensors/wsta1/state:state:JSONPATH($.data.pressure)]"}
	Number Wsta1_Inactivity "Inactivity [%d sec]" {mqtt="<[local_broker:hab2/sensors/wsta1/state:state:JSONPATH($.data.inactivity)]"}

```


sitemap entries:

```
    Text item=Wsta1_RAM label="Wsta1 RAM Free [%d bytes]" icon="line-stagnation"
    Text item=Wsta1_Temp label="Temperature [%.1f °C]" icon="temperature"
    Text item=Wsta1_Humidity label="Humidity [%d %%]" icon="humidity"
    Text item=Wsta1_Pressure label="Pressure [%d hPa]" icon="line-stagnation"
    Text item=Wsta1_Inactivity label="Inactivity [%d sec]" icon="line-stagnation"
```


### OTA

Place fw.zip into a web folder, then:

	mos --port "ws://wsta-01.lan/rpc" call OTA.Update \
	  '{"url": "http://192.168.0.1/usbhd/tmp/fw.zip", "commit_timeout": 600}'

If okay:

	mos --port "ws://wsta-01.lan/rpc" call OTA.Commit

Check status:

	mos --port "ws://wsta-01.lan/rpc" call OTA.GetBootState
