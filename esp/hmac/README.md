## HMAC for mjs

Limitation: hardcoded to use HMAC-SHA1, and 128 bits key.

### Sample code


```javascript
load('api_hmac.js');

let hmacEnable = false;
let hmacKey = Cfg.get('hmac.key');  // not secure, please use secure storage instead

if ((hmacKey !== null) && (hmacKey !== '')) {
  if (HMAC.initCtx()) {
    print('HMAC ctx init OK');
    if (HMAC.setKey(hmacKey)) {
      print('HMAC setKey OK');
      hmacEnable = true;
    }
  } else {
    print('HMAC ctx init failed');
  }
}

// <skip>

    let data = desired.mdev.power + desired.mdev.token + JSON.stringify(desired.mdev.timestamp);
    Log.print(Log.DEBUG, 'do_desired: signed data:' + data);
    let digest = HMAC.getDigest(data);
    Log.print(Log.DEBUG, 'do_desired: computed digest:' + digest);
    if (digest !== desired.signature) {
        Log.print(Log.ERROR, 'do_desired: invalid signature');
        return;
    }
}

// <skip>

```
