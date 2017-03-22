var Curl = require("./curl");
var Converter = require("./converter");

/**
*
*   @constructor bundle
**/
function Bundle() {

    // Declare empty bundle
    this.bundle = [];
}

/**
*
*
**/
Bundle.prototype.addEntry = function(signatureMessageLength, address, value, tag, index) {

    for (var i = 0; i < signatureMessageLength; i++) {

        var transactionObject = new Object();
        transactionObject.address = address;
        transactionObject.value = i === 0 ? value : new BN(0);
        transactionObject.tag = tag;

        this.bundle[this.bundle.length] = transactionObject;
    }
}

/**
*
*
**/
Bundle.prototype.addTrytes = function(signatureFragments) {

    var message;
    var emptySignatureFragment = '';
    var emptyHash = '999999999999999999999999999999999999999999999999999999999999999999999999999999999';
    var nonceHash = '999999999999999999999999999'

    for (var j = 0; emptySignatureFragment.length < 6561; j++) {
        emptySignatureFragment += '9';
    }

    for (var i = 0; i < this.bundle.length; i++) {

        // Fill empty signatureMessageFragment
        this.bundle[i].signatureMessage = signatureFragments[i] ? signatureFragments[i] : emptySignatureFragment;

        // Fill empty trunkTransaction
        this.bundle[i].trunkTransaction = emptyHash;

        // Fill empty branchTransaction
        this.bundle[i].branchTransaction = emptyHash;

        // Fill empty transaction nonce
        this.bundle[i].transactionNonce = emptyHash;

        // Fill empty nonce
        this.bundle[i].bundleNonce = i === 0 ? 'DOM999999999999999999999999' : nonceHash;

        // empty checksum for now
        this.bundle[i].checksum = emptyHash;
    }
}

module.exports = Bundle;
