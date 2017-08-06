#include <stdio.h>
#include <ctype.h>
#include "mgos_dlsym.h"
#include "mbedtls/md.h"
#include "hmac.h"

void tohex(unsigned char * in, size_t insz, char * out, size_t outsz) {
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

