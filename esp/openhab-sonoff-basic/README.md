## A firmware to work with openHAB

This will target openHAB2.


	mos build --local --clean --repo ~/git/mongoose-os --arch esp8266

	mos build --local --clean --no-libs-update --repo ~/git/mongoose-os --arch esp8266



### MQTT config at openHAB side

Add this to file `default.items` under folder `conf/items/`:

```
Switch Bedroom_Lights_Switch "Lights Switch" {mqtt=">[local_broker:sonoff_basic/em-009:command:*:${command}], <[local_broker:sonoff_basic/em-009/state:state:JSONPATH($.relay_state)]"}
Number Bedroom_Lights_Switch_RAM "RAM Free" {mqtt="<[local_broker:sonoff_basic/em-009/state:state:JSONPATH($.memory)]"}
Number Bedroom_Lights_Switch_Uptime "Uptime" {mqtt="<[local_broker:sonoff_basic/em-009/state:state:JSONPATH($.uptime)]"}
```

Also add entry to sitemap like this:

```
sitemap default label="Home Sweet Home"
{

	Frame label="Bedroom" {
		Switch item=Bedroom_Lights_Switch label="Lights Switch"
		Text item=Bedroom_Lights_Switch_RAM label="RAM Free [%d bytes]" icon="line-stagnation"
		Text item=Bedroom_Lights_Switch_Uptime label="Uptime [%d sec]" icon="line-stagnation"
	}
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
Switch HabTest1_Switch "Lights Switch" {mqtt=">[local_broker:hab2/switch/habtest1:command:*:MAP(habtest1.map)], <[local_broker:hab2/switch/habtest1/state:state:JSONPATH($.data[0].status)]"}
Number HabTest1_RAM "RAM Free" {mqtt="<[local_broker:hab2/switch/habtest1/state:state:JSONPATH($.memory)]"}

```

And sitemap as:

```
sitemap default label="My first sitemap"
{
    Switch item=Presence_Mobile_Michael label="Michael Mobile"
    Switch item=HabTest1_Switch label="HabTest1 Lights Switch"
    Text item=HabTest1_RAM label="HabTest1 RAM Free [%d bytes]" icon="line-stagnation"
}

```

#### Clear config cache

Config cache may be messed up after editing the conf files. Clear it by
delete the corresponding files in:

	/var/lib/openhab2/config/org/openhab/


#### filesystem setting

Save flash life:

	tmpfs /var/log tmpfs defaults,noatime,mode=0755 0 0

