## A firmware to work with openHAB

This will target openHAB2.


	mos build --local --clean --repo ~/git/mongoose-os --arch esp8266

	mos build --local --clean --no-libs-update --repo ~/git/mongoose-os --arch esp8266



### MQTT config at openHAB side

Add this to file `default.items` under folder `conf/items/`:

```
Switch HabTest1 {mqtt=">[broker:hab2/switch/habtest1:command:ON:1],>[broker:hab2/switch/habtest1:command:OFF:0],<[broker:hab2/switch/habtest1:state:ON:1],<[broker:hab2/switch/habtest1:state:OFF:0]"}
```

Also add entry to sitemap like this:

```
sitemap default label="My first sitemap"
{
	Switch item=Presence_Mobile_Michael label="Michael Mobile"
	Switch item=HabTest1 label="HabTest1 Lights Switch"
}
```

#### JSON command

If want to use JSON in control command and status report:

1. Make sure installed the **MAP** and **JSONPath** Transformation Add-On.

2. create a map file habtest1.map:

```
ON={"op": "set", "value": 1}
OFF={"op": "set", "value": 0}
```

Then, define item as:

```
Switch HabTest1 {mqtt=">[local_broker:hab2/switch/habtest1:command:*:MAP(habtest1.map)], <[local_broker:hab2/switch/habtest1/state:state:JSONPATH($.data[0].status)]"}
```


#### Clear config cache

Config cache may be messed up after editing the conf files. Clear it by
delete the corresponding files in:

	/var/lib/openhab2/config/org/openhab/


#### filesystem setting

Save flash life:

	tmpfs /var/log tmpfs defaults,noatime,mode=0755 0 0

