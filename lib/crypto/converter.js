var BN = require('bn.js');

/**
*
*   Conversion functions
*
**/

// All possible tryte values
var trytesAlphabet = "9ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// map of all trits representations
var trytesTrits = [
    [ 0,  0,  0],
    [ 1,  0,  0],
    [-1,  1,  0],
    [ 0,  1,  0],
    [ 1,  1,  0],
    [-1, -1,  1],
    [ 0, -1,  1],
    [ 1, -1,  1],
    [-1,  0,  1],
    [ 0,  0,  1],
    [ 1,  0,  1],
    [-1,  1,  1],
    [ 0,  1,  1],
    [ 1,  1,  1],
    [-1, -1, -1],
    [ 0, -1, -1],
    [ 1, -1, -1],
    [-1,  0, -1],
    [ 0,  0, -1],
    [ 1,  0, -1],
    [-1,  1, -1],
    [ 0,  1, -1],
    [ 1,  1, -1],
    [-1, -1,  0],
    [ 0, -1,  0],
    [ 1, -1,  0],
    [-1,  0,  0]
];

/**
*   Converts trytes into trits
*
*   @method trits
*   @param {String | BN} input Tryte value to be converted. Can either be string or BigNumber
*   @param {Array} state (optional) state to be modified
*   @returns {Array} trits
**/
var trits = function(input, state) {

    var trits = state || [];

    // IF BIGNUMBER
    if (input instanceof BN) {

        var absoluteValue = input.abs();

        while (absoluteValue > 0) {

            var remainder = absoluteValue.mod(new BN(3)).toNumber();

            absoluteValue = absoluteValue.divRound(new BN(3));

            if (remainder > 1) {
                remainder = -1;
                absoluteValue = absoluteValue.add(new BN(1));
            }

            trits[trits.length] = remainder;
        }

        if (input < 0) {
            for (var i = 0; i < trits.length; i++) {

                trits[i] = -trits[i];
            }
        }

    } else {

        for (var i = 0; i < input.length; i++) {

            var index = trytesAlphabet.indexOf(input.charAt(i));
            trits[i * 3] = trytesTrits[index][0];
            trits[i * 3 + 1] = trytesTrits[index][1];
            trits[i * 3 + 2] = trytesTrits[index][2];
        }
    }

    return trits;
}

/**
*   Converts trits into trytes
*
*   @method trytes
*   @param {Array} trits
*   @returns {String} trytes
**/
var trytes = function(trits) {

    var trytes = "";

    for (var i = 0; i < trits.length; i += 3) {

        // Iterate over all possible tryte values to find correct trit representation
        for (var j = 0; j < trytesAlphabet.length; j++) {

            if (trytesTrits[j][0] == trits[i] && trytesTrits[j][1] == trits[i + 1] && trytesTrits[j][2] == trits[i + 2]) {

                trytes += trytesAlphabet.charAt(j);
                break;
            }
        }
    }

    return trytes;
}

/**
*   Converts trits into an integer value
*
*   @method value
*   @param {Array} trits
*   @returns {BN} value
**/
var value = function(trits) {

    var value = new BN(0);

    for (var i = trits.length; i-- > 0; ) {

        // Multiply by 3 and add the respective trit value
        value = value.mul(new BN(3)).add(new BN(trits[i]));
    }

    return value;
}


module.exports = {
    trits   : trits,
    trytes  : trytes,
    value   : value
};
