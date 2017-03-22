var Curl = require("./curl");
var Converter = require("./converter");
var Bundle = require("./bundle");

/**
*           Signing related functions
*
**/
var key = function(seed, index) {

    var subseedPreimage = seed.slice();

    for (var i = 0; i < index; i++) {

        for (var j = 0; j < subseedPreimage.length; j++) {

            if (++subseedPreimage[j] > 1) {

                subseedPreimage[j] = -1;

            } else {

                break;
            }
        }
    }

    var subseed = [];

    for (var i = 0; i < 243; i++) {
        subseed[i] = 0;
    }

    var curl = new Curl();
    curl.initialize();
    curl.absorb(subseedPreimage, 0, subseedPreimage.length);
    curl.squeeze(subseed, 0, subseed.length);

    var key = [];

    // KEY Length: HASH_LENGTH / 3 + 1) * HASH_LENGTH
    for (var i = 0; i < 19926; i++) {
        key[i] = 0;
    }

    curl.initialize();
    curl.absorb(subseed, 0, subseed.length);
    curl.squeeze(key, 0, key.length);

    for (var offset = 0; offset < key.length; offset += 243) {

        curl.initialize();
        curl.absorb(key, offset, 243);
        curl.squeeze(key, offset, 243);

    }

    return key;
}

/**
*
*
**/
var digestFromKey = function(key) {

    // initiate buffer with empty state, 243 trits
    var digest = [], buffer = [];

    // Max checksum value: HASH_LENGTH / TRYTE_WIDTH * (MAX_TRYTE_VALUE - MIN_TRYTE_VALUE)
    var checksumValue = 2106;

    var keyLength = key.length;

    var digestCurl = new Curl();
    digestCurl.initialize();

    var keyFragmentCurl = new Curl();

    for ( var i = 0; i < (keyLength - 243) / 243; i++ ) {

        buffer = key.slice(i * 243, (i + 1) * 243);

        for (var j = 0; j < 26; j++) {

            keyFragmentCurl.initialize();
            keyFragmentCurl.absorb(buffer, 0, buffer.length);
            keyFragmentCurl.squeeze(buffer, 0 , buffer.length);
        }

        digestCurl.absorb(buffer, 0, 243);
    }

    buffer = key.slice(keyLength - 243, keyLength);

    for ( var i = checksumValue; i-- > 0; ) {

        keyFragmentCurl.initialize();
        keyFragmentCurl.absorb(buffer, 0, buffer.length);
        keyFragmentCurl.squeeze(buffer, 0 , buffer.length);

    }

    digestCurl.absorb(buffer, 0, 243);
    digestCurl.squeeze(digest, 0, 243);

    return digest;
}

/**
*
*
**/
var address = function(digests) {

    var addressTrits = [];

    var curl = new Curl();

    curl.initialize();
    curl.absorb(digests, 0, digests.length);
    curl.squeeze(addressTrits, 0, 243);

    return addressTrits;
}

/**
*
*
**/
var digestFromBundle = function(bundle, signature) {

    var buffer = []

    // Max checksum value: HASH_LENGTH / TRYTE_WIDTH * (MAX_TRYTE_VALUE - MIN_TRYTE_VALUE)
    var checksumValue = 2106;

    var digestCurl = new Curl();
    digestCurl.initialize();

    var signatureFragmentCurl = new Curl();

    for (var i = 0; i < 81; i++ ) {

        buffer = signature.slice(i * 243, (i + 1) * 243);

        var hashingChainLength = -13 - (bundle[i * 3] + bundle[i * 3 + 1] * 3 + bundle[i * 3 + 2] * 9);

        checksumValue -= hashingChainLength;

        for ( var j = hashingChainLength; j-- > 0; ) {

            signatureFragmentCurl.initialize();
            signatureFragmentCurl.absorb(buffer, 0, 243);
            signatureFragmentCurl.squeeze(buffer, 0, 243);

        }

        digestCurl.absorb(buffer, 0, 243);
    }

    buffer = signature.slice(19926 - 243, 19926);

    while (checksumValue-- > 0) {

        signatureFragmentCurl.initialize();
        signatureFragmentCurl.absorb(buffer, 0, 243);
        signatureFragmentCurl.squeeze(buffer, 0, 243);

    }

    digestCurl.absorb(buffer, 0, 243);

    var digest = [];

    digestCurl.squeeze(digest, 0, 243);

    return digest;
}

/**
*
*
**/
var signature = function(bundle, keyTrits) {

    var signature = keyTrits.slice(), hash = [];

    var curl = new Curl();

    // Max checksum value: HASH_LENGTH / TRYTE_WIDTH * (MAX_TRYTE_VALUE - MIN_TRYTE_VALUE)
    var checksumValue = 2106;

    for (var i = 0; i < 81; i++) {

        var hashingChainLength = 13 - (bundle[i * 3] + bundle[i * 3 + 1] * 3 + bundle[i * 3 + 2] * 9);

        checksumValue -= hashingChainLength;

        for (var j = hashingChainLength; j-- > 0; ) {

            curl.initialize();
            curl.absorb(signature, i * 243, 243);
            curl.squeeze(signature, i * 243, 243);
        }
    }

    while (checksumValue-- > 0) {

        curl.initialize();
        curl.absorb(signature, 19926 - 243, 243);
        curl.squeeze(signature, 19926 - 243, 243);

    }

    return signature;
}

var getBundleHash = function(bundle) {

    var curl = new Curl();
    curl.initialize();

    for (var i = 0; i < bundle.length; i++) {

        var valueTrits = Converter.trits(bundle[i].value);
        curl.absorb(Converter.trits(bundle[i].address + Converter.trytes(valueTrits) + bundle[i].tag + bundle[i].bundleNonce), 0, 162);
    }

    var hash = [];
    curl.squeeze(hash, 0, 243);
    hash = Converter.trytes(hash);

    return hash;
}

/**
*
*
**/
var validateSignatures = function(expectedAddress, signature, bundle) {

    // TODO: INPUT VALIDATION

    var self = this;

    var bundleHash = self.getBundleHash(bundle);

    var digests = self.digestFromBundle(Converter.trits(bundleHash), Converter.trits(signature));

    var address = Converter.trytes(self.address(digests))

    console.log("EXPECTED", expectedAddress);
    console.log("ADDRESS", address)
    console.log("bundle", bundleHash)

    return (expectedAddress === address);

}


module.exports = {
    key                 :   key,
    digestFromKey       :   digestFromKey,
    address             :   address,
    digestFromBundle    :   digestFromBundle,
    signature           :   signature,
    validateSignatures  :   validateSignatures,
    getBundleHash       :   getBundleHash
}
