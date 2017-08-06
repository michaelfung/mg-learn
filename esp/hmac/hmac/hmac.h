#ifndef __HMAC_H
#define __HMAC_H

int load_key(char *hexstring);
void tohex(unsigned char * in, size_t insz, char * out, size_t outsz);
int init_ctx();
int inject_key(size_t keylen);
int compute_digest(const unsigned char *buf);
char *get_hexdigest();

#endif
