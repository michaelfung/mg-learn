#include <stdio.h>
#include <ctype.h>
#include "common/platform.h"
#include "mgos_dlsym.h"
#include "mbedtls/md.h"
#include "hmac.h"

// data
static mbedtls_md_context_t *ctx;
const mbedtls_md_info_t *md_info;
static unsigned char key[16];
unsigned char digest[20];

// helper functions
static uint8_t hexdec(const char *s) {
#define HEXTOI(x) (x >= '0' && x <= '9' ? x - '0' : x - 'W')
  int a = tolower(*(const unsigned char *) s);
  int b = tolower(*(const unsigned char *) (s + 1));
  return (HEXTOI(a) << 4) | HEXTOI(b);
}

/*
 * load key from a hexstring
 * must be 32 chars or more
 */
int loadkey(char *hexstring) {
	char *hexstrptr = hexstring;
	if (sizeof(hexstring) < 32) {
		return 1;
	}
	int i = 0;
	for (;  i < 16; i++) {
		key[i] = hexdec(hexstrptr);
		hexstrptr += 2;
	}
	return 0;
}

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


// ffi'able functions
int hmac_init() {
 md_info = mbedtls_md_info_from_type( MBEDTLS_MD_SHA1 );
 mbedtls_md_init( ctx );
 return mbedtls_md_setup( ctx, md_info, 1 );  // param 'hmac' set to 1
}
