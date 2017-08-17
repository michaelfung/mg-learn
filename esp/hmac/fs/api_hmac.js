let HMAC = {

	_setKey: ffi('int hmac_set_key(char *)'),
	_initCtx: ffi('int hmac_init_ctx()'),
	_injectKey: ffi('int hmac_inject_key()'),
	_computeDigest: ffi('int hmac_compute_digest(char *)'),
	_getDigest: ffi('char *hmac_get_hexdigest()'),
	_resetCtx: ffi('int hmac_reset_ctx()'),

	/* run this first */
	initCtx: function() {
		if (this._initCtx() === 0) {
			return true;
		} else {
			return false;
		}
	},

	/* if initCtx is successful, do this */
	setKey: function(hexstring) {
		if (hexstring.length < 32) {
			return false;
		}
		let ret = this._setKey(hexstring);
		if (ret !== 0) {
			return false;
		}
		if (this._injectKey() === 0) {
			return true;
		} else {
			return false;
		}
	},

	/* after key is set, use this to get digest of data. */
	getDigest: function(data) {
		let res = null;
		if (this._computeDigest(data) !== 0) {
			// return null;
		} else {
			res = this._getDigest();
		}
		// clean up for next _computeDigest operation
		this._resetCtx();
		return res;
	}
};

