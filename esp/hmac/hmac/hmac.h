#ifndef __HMAC_H
#define __HMAC_H

void tohex(unsigned char * in, size_t insz, char * out /*, size_t outsz */);
int hmac_set_key(char *hexstring);
int hmac_init_ctx();
int hmac_inject_key();
int hmac_compute_digest(const unsigned char *buf);
char *hmac_get_hexdigest();

#endif
