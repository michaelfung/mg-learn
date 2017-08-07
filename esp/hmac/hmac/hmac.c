/*
 * Wrapper for mbedtls HMAC functions
 * for use with mJS
 */

#include <stdio.h>
#include <ctype.h>
#include "common/platform.h"
#include "mgos_dlsym.h"
#include "mbedtls/md.h"
#include "hmac.h"

// data
static mbedtls_md_context_t ctx;
const mbedtls_md_info_t *md_info;
static unsigned char key[16];
static size_t keylen = 16;
unsigned char digest[20];
static char hexdigest[41];

// helper functions
static uint8_t hexdec(const char *s) {  /* borrowed from frozen */
#define HEXTOI(x) (x >= '0' && x <= '9' ? x - '0' : x - 'W')
  int a = tolower(*(const unsigned char *) s);
  int b = tolower(*(const unsigned char *) (s + 1));
  return (HEXTOI(a) << 4) | HEXTOI(b);
}

void tohex(unsigned char * in, size_t insz, char * out /* , size_t outsz */) {
    unsigned char *pin = in;
    const char *hex = "0123456789ABCDEF";
    char *pout = out;
    for(; pin < in+insz; pout +=2, pin++){
        pout[0] = hex[(*pin>>4) & 0xF];
        pout[0] = ( pout[0] > 0x40 && pout[0] < 0x5b ) ? pout[0] | 0x60 : pout[0];
        pout[1] = hex[ *pin     & 0xF];
        pout[1] = ( pout[1] > 0x40 && pout[1] < 0x5b ) ? pout[1] | 0x60 : pout[1];

    }
    pout[0] = '\0';
}


// FFI'able functions:
/*
 * load 128 bit key from a hexstring
 * must be 32 characters or more
 */
int hmac_set_key(char *hexstring) {
	char *hexstrptr = hexstring;

	if (strlen(hexstring) < 32) {
		return 1;
	}

	int i = 0;
	for (;  i < 16; i++) {
		key[i] = hexdec(hexstrptr);
		hexstrptr += 2;
	}
	return 0;
}

/* get hexdigest  */
char *hmac_get_hexdigest() {
	return hexdigest;
}

/* combine both init and setup of the hash operation ctx */
int hmac_init_ctx() {
 md_info = mbedtls_md_info_from_type( MBEDTLS_MD_SHA1 );
 mbedtls_md_init( &ctx );
 return mbedtls_md_setup( &ctx, md_info, 1 );  // param 'hmac' set to 1
}

/* inject key to ctx */
int hmac_inject_key() {
		return mbedtls_md_hmac_starts( &ctx, key, keylen );
}

/* calculate digest of string data buffer */
int hmac_compute_digest(const char *buf) {
	size_t bufsz = strlen(buf);
	if (mbedtls_md_hmac_update(&ctx, (unsigned char *)buf, bufsz) != 0) {
		return 1;
	}

	// clear digest
	memset(digest, 0, sizeof(digest));
	memset(hexdigest, '\0', sizeof(hexdigest));

	if (mbedtls_md_hmac_finish(&ctx, digest) != 0) {
		return 1;
	}
	// convert digest to hex string
	size_t insz =  sizeof(digest);
	// size_t outsz = sizeof(hexdigest);
	tohex(digest, insz, hexdigest /* , outsz */);
	return 0;
}

/* reset to make ready to compute another digest */
int hmac_reset_ctx() {
	return mbedtls_md_hmac_reset(&ctx);
}
