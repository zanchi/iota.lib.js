var inputValidator = require("./inputValidator");
var makeRequest = require("./makeRequest");
var Curl = require("../crypto/curl");
var Converter = require("../crypto/converter");
var ascii = require("./asciiToTrytes");
var Signing = require("../crypto/signing");

/**
*   Table of IOTA Units based off of the standard System of Units
**/
var unitMap = {
    'i'   :   1,
    'Ki'  :   1000,
    'Mi'  :   1000000,
    'Gi'  :   1000000000,
    'Ti'  :   1000000000000,
    'Pi'  :   1000000000000000  // For the very, very rich
}

/**
*   converts IOTA units
*
*   @method convertUnits
*   @param {string || int || float} value
*   @param {string} fromUnit
*   @param {string} toUnit
*   @returns {integer} converted
**/
var convertUnits = function(value, fromUnit, toUnit) {


    // If not valid value, throw error
    if (!inputValidator.isDecimal(value)) {

        throw new Error("Invalid value input");
    }

    // Check if wrong unit provided
    if (unitMap[fromUnit] === undefined || unitMap[toUnit] === undefined) {

        throw new Error("Invalid unit provided");
    }

    var floatValue = parseFloat(value);

    var converted = (floatValue * unitMap[fromUnit]) / unitMap[toUnit];

    return converted;
}

/**
*   Generates the 9-tryte checksum of an address
*
*   @method addChecksum
*   @param {string | list} address
*   @returns {string | list} address (with checksum)
**/
var addChecksum = function(address) {

    var isSingleAddress = inputValidator.isString(address)

    // If only single address, turn it into an array
    if (isSingleAddress) address = Array(address);

    var addressesWithChecksum = [];

    address.forEach(function(thisAddress) {

        if (thisAddress.length !== 81) throw new Error("Invalid address input");

        // create new Curl instance
        var curl = new Curl();

        // initialize curl empty trits state
        curl.initialize();

        // convert address into trits and map it into the state
        curl.state = Converter.trits(thisAddress, curl.state);

        curl.transform();

        var checksum = Converter.trytes(curl.state).substring(0, 9);

        addressesWithChecksum.push(thisAddress + checksum);
    });

    if (isSingleAddress) {
        return addressesWithChecksum[0];
    } else {
        return addressesWithChecksum;
    }
}

/**
*   Removes the 9-tryte checksum of an address
*
*   @method noChecksum
*   @param {string | list} address
*   @returns {string | list} address (without checksum)
**/
var noChecksum = function(address) {

    var isSingleAddress = inputValidator.isString(address)

    // If only single address, turn it into an array
    if (isSingleAddress) address = Array(address);

    var addressesWithChecksum = [];

    address.forEach(function(thisAddress) {
        addressesWithChecksum.push(thisAddress.slice(0, 81))
    })

    // return either string or the list
    if (isSingleAddress) {
        return addressesWithChecksum[0];
    } else {
        return addressesWithChecksum;
    }
}

/**
*   Validates the checksum of an address
*
*   @method isValidChecksum
*   @param {string} addressWithChecksum
*   @returns {bool}
**/
var isValidChecksum = function(addressWithChecksum) {

    var addressWithoutChecksum = noChecksum(addressWithChecksum);

    var newChecksum = addChecksum(addressWithoutChecksum);

    return newChecksum === addressWithChecksum;
}

/**
*   Converts transaction trytes of 2673 trytes into a transaction object
*
*   @method transactionObject
*   @param {string} trytes
*   @returns {String} transactionObject
**/
var transactionObject = function(trytes) {

    if (!trytes) return

    // validity check
    for (var i = 2279; i < 2295; i++) {
        if (trytes.charAt(i) !== "9") {
            return null;
        }
    }
    var thisTransaction = new Object();
    var transactionTrits = Converter.trits(trytes);

    var hash = [];

    var curl = new Curl()
    curl.initialize();
    // absorb transactionTrits in order to get bundle hash 
    curl.absorb(transactionTrits);
    curl.squeeze(hash);

    thisTransaction.hash = Converter.trytes(hash);
    thisTransaction.signatureMessage = trytes.slice(0, 6561);
    thisTransaction.checksum = trytes.slice(6561, 6642);
    thisTransaction.address = trytes.slice(6642, 6723);
    thisTransaction.value = Converter.value(transactionTrits.slice(20169, 20250));
    thisTransaction.tag = trytes.slice(6750, 6777)
    thisTransaction.bundleNonce = trytes.slice(6777, 6804);
    thisTransaction.trunkTransaction = trytes.slice(6804, 6885);
    thisTransaction.branchTransaction = trytes.slice(6885, 6966);
    thisTransaction.transactionNonce = trytes.slice(6966, 7047);

    return thisTransaction;
}

/**
*   Converts a transaction object into trytes
*
*   @method transactionTrytes
*   @param {object} transactionTrytes
*   @returns {String} trytes
**/
var transactionTrytes = function(transaction) {

    var valueTrits = Converter.trits(transaction.value);
    while (valueTrits.length < 81) {
        valueTrits[valueTrits.length] = 0;
    }

    return transaction.signatureMessage
    + transaction.checksum
    + transaction.address
    + Converter.trytes(valueTrits)
    + transaction.tag
    + transaction.bundleNonce
    + transaction.trunkTransaction
    + transaction.branchTransaction
    + transaction.transactionNonce;
}

/**
*   Categorizes a list of transfers between sent and received
*
*   @method categorizeTransfers
*   @param {object} transfers Transfers (bundles)
*   @param {list} addresses List of addresses that belong to the user
*   @returns {String} trytes
**/
var categorizeTransfers = function(transfers, addresses) {

    var categorized = {
        'sent'      : [],
        'received'  : []
    }

    // Iterate over all bundles and sort them between incoming and outgoing transfers
    transfers.forEach(function(bundle) {

        var spentAlreadyAdded = false;

        // Iterate over every bundle entry
        bundle.forEach(function(bundleEntry, bundleIndex) {

            // If bundle address in the list of addresses associated with the seed
            // add the bundle to the
            if (addresses.indexOf(bundleEntry.address) > -1) {

                // Check if it's a remainder address
                var isRemainder = ( bundleEntry.currentIndex === bundleEntry.lastIndex ) && bundleEntry.lastIndex !== 0;

                // check if sent transaction
                if (bundleEntry.value < 0 && !spentAlreadyAdded && !isRemainder) {

                    categorized.sent.push(bundle);

                    // too make sure we do not add transactions twice
                    spentAlreadyAdded = true;
                }
                // check if received transaction, or 0 value (message)
                // also make sure that this is not a 2nd tx for spent inputs
                else if (bundleEntry.value >= 0 && !spentAlreadyAdded && !isRemainder) {

                    categorized.received.push(bundle);
                }
            }
        })
    })

    return categorized;
}


/**
*   Validates the signatures
*
*   @method validateSignatures
*   @param {array} signedBundle
*   @param {string} inputAddress
*   @returns {bool}
**/
var validateSignatures = function(signedBundle, inputAddress) {


    var bundleHash;
    var signatureFragments = [];

    for (var i = 0; i < signedBundle.length; i++) {

        if (signedBundle[i].address === inputAddress) {

            bundleHash = signedBundle[i].bundle;

            // if we reached remainder bundle
            if (inputValidator.isNinesTrytes(signedBundle[i].signatureMessageFragment)) {
                break;
            }

            signatureFragments.push(signedBundle[i].signatureMessageFragment)
        }
    }

    return Signing.validateSignatures(inputAddress, signatureFragments, bundleHash);
}


module.exports = {
    convertUnits        : convertUnits,
    addChecksum         : addChecksum,
    noChecksum          : noChecksum,
    isValidChecksum     : isValidChecksum,
    transactionObject   : transactionObject,
    transactionTrytes   : transactionTrytes,
    categorizeTransfers : categorizeTransfers,
    toTrytes            : ascii.toTrytes,
    fromTrytes          : ascii.fromTrytes,
    validateSignatures  : validateSignatures
}
