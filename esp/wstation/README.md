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


### OTA

Place fw.zip into a web folder, then:

	mos --port "ws://wsta-01.lan/rpc" call OTA.Update \
	  '{"url": "http://192.168.0.1/usbhd/tmp/fw.zip", "commit_timeout": 600}'

If okay:

	mos --port "ws://wsta-01.lan/rpc" call OTA.Commit

Check status:

	mos --port "ws://wsta-01.lan/rpc" call OTA.GetBootState
