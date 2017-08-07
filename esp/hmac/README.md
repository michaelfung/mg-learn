### Test adding hmac-sha1 to mjs


mos build --local --clean --no-libs-update --repo ~/git/mongoose-os --arch esp8266



### Reference

```
#include <stdio.h>

void tohex(unsigned char * in, size_t insz, char * out, size_t outsz)
{
    unsigned char *pin = in;
    const char *hex = "0123456789ABCDEF";
    char *pout = out;
    for(; pin < in+insz; pout +=2, pin++){
        pout[0] = hex[(*pin>>4) & 0xF];
        pout[0] = ( pout[0] > 0x40 && pout[0] < 0x5b ) ? pout[0] | 0x60 : pout[0];
        pout[1] = hex[ *pin     & 0xF];
        pout[1] = ( pout[1] > 0x40 && pout[1] < 0x5b ) ? pout[1] | 0x60 : pout[1];

    }
    pout[0] = 0;
}

int main(){
    enum {insz = 16, outsz = (2 * insz + 1)};
    unsigned char buf[] = {0, 1, 10, 11, 255, 1, 10, 224, 0, 1, 10, 127, 64, 1, 65, 33};
    char str[outsz];
    tohex(buf, insz, str, outsz);
    printf("%s\n", str);
}


```
