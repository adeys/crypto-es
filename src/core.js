/**
 * Crypto namespace.
 */
const C = {};

/**
 * Library namespace.
 */
const C_lib = {};
C.lib = C_lib;

/**
 * Base class for inheritance.
 */
class Base {
  /**
   * Extends this object and runs the init method.
   * Arguments to create() will be passed to init().
   *
   * @return {Object} The new object.
   *
   * @static
   *
   * @example
   *
   *     var instance = MyType.create();
   */
  static create(...args) {
    return new this(...args);
  }

  /**
   * Creates a copy of this object.
   *
   * @return {Object} The clone.
   *
   * @example
   *
   *     var clone = instance.clone();
   */
  clone() {
    const clone = new this.constructor();
    Object.assign(clone, this);
    return clone;
  }
}
C_lib.Base = Base;

/**
 * An array of 32-bit words.
 *
 * @property {Array} words The array of 32-bit words.
 * @property {number} sigBytes The number of significant bytes in this word array.
 */
class WordArray extends Base {
  /**
   * Initializes a newly created word array.
   *
   * @param {Array} words (Optional) An array of 32-bit words.
   * @param {number} sigBytes (Optional) The number of significant bytes in the words.
   *
   * @example
   *
   *     var wordArray = CryptoJS.lib.WordArray.create();
   *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
   *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
   */
  constructor(words = [], sigBytes = words.length * 4) {
    super();
    this.words = words;
    this.sigBytes = sigBytes;
  }

  /**
   * Converts this word array to a string.
   *
   * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
   *
   * @return {string} The stringified word array.
   *
   * @example
   *
   *     var string = wordArray + '';
   *     var string = wordArray.toString();
   *     var string = wordArray.toString(CryptoJS.enc.Utf8);
   */
  toString(encoder = Hex) {
    return encoder.stringify(this);
  }

  /**
   * Concatenates a word array to this word array.
   *
   * @param {WordArray} wordArray The word array to append.
   *
   * @return {WordArray} This word array.
   *
   * @example
   *
   *     wordArray1.concat(wordArray2);
   */
  concat(wordArray) {
    // Shortcuts
    const thisWords = this.words;
    const thatWords = wordArray.words;
    const thisSigBytes = this.sigBytes;
    const thatSigBytes = wordArray.sigBytes;

    // Clamp excess bits
    this.clamp();

    // Concat
    if (thisSigBytes % 4) {
      // Copy one byte at a time
      for (let i = 0; i < thatSigBytes; i += 1) {
        const thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
      }
    } else {
      // Copy one word at a time
      for (let i = 0; i < thatSigBytes; i += 4) {
        thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
      }
    }
    this.sigBytes += thatSigBytes;

    // Chainable
    return this;
  }

  /**
   * Removes insignificant bits.
   *
   * @example
   *
   *     wordArray.clamp();
   */
  clamp() {
    // Shortcuts
    const { words, sigBytes } = this;

    // Clamp
    words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
    words.length = Math.ceil(sigBytes / 4);
  }

  /**
   * Creates a copy of this word array.
   *
   * @return {WordArray} The clone.
   *
   * @example
   *
   *     var clone = wordArray.clone();
   */
  clone() {
    const clone = super.clone.call(this);
    clone.words = this.words.slice(0);

    return clone;
  }

  /**
   * Creates a word array filled with random bytes.
   *
   * @param {number} nBytes The number of random bytes to generate.
   *
   * @return {WordArray} The random word array.
   *
   * @static
   *
   * @example
   *
   *     var wordArray = CryptoJS.lib.WordArray.random(16);
   */
  random(nBytes) {
    const words = [];

    const r = (w) => {
      let m_w = w;
      let m_z = 0x3ade68b1;
      const mask = 0xffffffff;

      return () => {
        m_z = (0x9069 * (m_z & 0xFFFF) + (m_z >> 0x10)) & mask;
        m_w = (0x4650 * (m_w & 0xFFFF) + (m_w >> 0x10)) & mask;
        let result = ((m_z << 0x10) + m_w) & mask;
        result /= 0x100000000;
        result += 0.5;
        return result * (Math.random() > 0.5 ? 1 : -1);
      };
    };

    for (let i = 0, rcache; i < nBytes; i += 4) {
      const _r = r((rcache || Math.random()) * 0x100000000);

      rcache = _r() * 0x3ade67b7;
      words.push((_r() * 0x100000000) | 0);
    }

    return new WordArray(words, nBytes);
  }
}
C_lib.WordArray = WordArray;

/**
 * Encoder namespace.
 */
const C_enc = {};
C.enc = C_enc;

/**
 * Hex encoding strategy.
 */
const Hex = {
  /**
   * Converts a word array to a hex string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The hex string.
   *
   * @static
   *
   * @example
   *
   *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
   */
  stringify: (wordArray) => {
    // Shortcuts
    const { words, sigBytes } = wordArray;

    // Convert
    const hexChars = [];
    for (let i = 0; i < sigBytes; i += 1) {
      const bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      hexChars.push((bite >>> 4).toString(16));
      hexChars.push((bite & 0x0f).toString(16));
    }

    return hexChars.join('');
  },

  /**
   * Converts a hex string to a word array.
   *
   * @param {string} hexStr The hex string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
   */
  parse: (hexStr) => {
    // Shortcut
    const hexStrLength = hexStr.length;

    // Convert
    const words = [];
    for (let i = 0; i < hexStrLength; i += 2) {
      words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
    }

    return new WordArray(words, hexStrLength / 2);
  },
};
C_enc.Hex = Hex;

/**
 * Latin1 encoding strategy.
 */
const Latin1 = {
  /**
   * Converts a word array to a Latin1 string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The Latin1 string.
   *
   * @static
   *
   * @example
   *
   *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
   */
  stringify: (wordArray) => {
    // Shortcuts
    const { words, sigBytes } = wordArray;

    // Convert
    const latin1Chars = [];
    for (let i = 0; i < sigBytes; i += 1) {
      const bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      latin1Chars.push(String.fromCharCode(bite));
    }

    return latin1Chars.join('');
  },

  /**
   * Converts a Latin1 string to a word array.
   *
   * @param {string} latin1Str The Latin1 string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
   */
  parse: (latin1Str) => {
    // Shortcut
    const latin1StrLength = latin1Str.length;

    // Convert
    const words = [];
    for (let i = 0; i < latin1StrLength; i += 1) {
      words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
    }

    return new WordArray(words, latin1StrLength);
  },
};
C_enc.Latin1 = Latin1;

/**
 * UTF-8 encoding strategy.
 */
const Utf8 = {
  /**
   * Converts a word array to a UTF-8 string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The UTF-8 string.
   *
   * @static
   *
   * @example
   *
   *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
   */
  stringify: (wordArray) => {
    try {
      return decodeURIComponent(escape(Latin1.stringify(wordArray)));
    } catch (e) {
      throw new Error('Malformed UTF-8 data');
    }
  },

  /**
   * Converts a UTF-8 string to a word array.
   *
   * @param {string} utf8Str The UTF-8 string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
   */
  parse: utf8Str => Latin1.parse(unescape(encodeURIComponent(utf8Str))),
};
C_enc.Utf8 = Utf8;

/**
 * Abstract buffered block algorithm template.
 *
 * The property blockSize must be implemented in a concrete subtype.
 *
 * @property {number} _minBufferSize
 *
 *     The number of blocks that should be kept unprocessed in the buffer. Default: 0
 */
class BufferedBlockAlgorithm extends Base {
  constructor() {
    super();
    this._minBufferSize = 0;
  }

  /**
   * Resets this block algorithm's data buffer to its initial state.
   *
   * @example
   *
   *     bufferedBlockAlgorithm.reset();
   */
  reset() {
    // Initial values
    this._data = new WordArray();
    this._nDataBytes = 0;
  }

  /**
   * Adds new data to this block algorithm's buffer.
   *
   * @param {WordArray|string} data
   *
   *     The data to append. Strings are converted to a WordArray using UTF-8.
   *
   * @example
   *
   *     bufferedBlockAlgorithm._append('data');
   *     bufferedBlockAlgorithm._append(wordArray);
   */
  _append(data) {
    let m_data = data;

    // Convert string to WordArray, else assume WordArray already
    if (typeof m_data === 'string') {
      m_data = Utf8.parse(m_data);
    }

    // Append
    this._data.concat(m_data);
    this._nDataBytes += m_data.sigBytes;
  }

  /**
   * Processes available data blocks.
   *
   * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
   *
   * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
   *
   * @return {WordArray} The processed data.
   *
   * @example
   *
   *     var processedData = bufferedBlockAlgorithm._process();
   *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
   */
  _process(doFlush) {
    let processedWords;

    // Shortcuts
    const { _data: data, blockSize } = this;
    const dataWords = data.words;
    const dataSigBytes = data.sigBytes;
    const blockSizeBytes = blockSize * 4;

    // Count blocks ready
    let nBlocksReady = dataSigBytes / blockSizeBytes;
    if (doFlush) {
      // Round up to include partial blocks
      nBlocksReady = Math.ceil(nBlocksReady);
    } else {
      // Round down to include only full blocks,
      // less the number of blocks that must remain in the buffer
      nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
    }

    // Count words ready
    const nWordsReady = nBlocksReady * blockSize;

    // Count bytes ready
    const nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

    // Process blocks
    if (nWordsReady) {
      for (let offset = 0; offset < nWordsReady; offset += blockSize) {
        // Perform concrete-algorithm logic
        this._doProcessBlock(dataWords, offset);
      }

      // Remove processed words
      processedWords = dataWords.splice(0, nWordsReady);
      data.sigBytes -= nBytesReady;
    }

    // Return processed words
    return new WordArray(processedWords, nBytesReady);
  }

  /**
   * Creates a copy of this object.
   *
   * @return {Object} The clone.
   *
   * @example
   *
   *     var clone = bufferedBlockAlgorithm.clone();
   */
  clone() {
    const clone = super.clone.call(this);
    clone._data = this._data.clone();

    return clone;
  }
}
C_lib.BufferedBlockAlgorithm = BufferedBlockAlgorithm;

/**
 * Abstract hasher template.
 *
 * @property {number} blockSize
 *
 *     The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
 */
class Hasher extends BufferedBlockAlgorithm {
  constructor(cfg) {
    super();

    this.blockSize = 512 / 32;

    /**
     * Configuration options.
     */
    this.cfg = new Base();

    // Apply config defaults
    Object.assign(this.cfg, cfg);

    // Set initial values
    this.reset();
  }

  /**
   * Resets this hasher to its initial state.
   *
   * @example
   *
   *     hasher.reset();
   */
  reset() {
    // Reset data buffer
    super.reset.call(this);

    // Perform concrete-hasher logic
    this._doReset();
  }

  /**
   * Updates this hasher with a message.
   *
   * @param {WordArray|string} messageUpdate The message to append.
   *
   * @return {Hasher} This hasher.
   *
   * @example
   *
   *     hasher.update('message');
   *     hasher.update(wordArray);
   */
  update(messageUpdate) {
    // Append
    this._append(messageUpdate);

    // Update the hash
    this._process();

    // Chainable
    return this;
  }

  /**
   * Finalizes the hash computation.
   * Note that the finalize operation is effectively a destructive, read-once operation.
   *
   * @param {WordArray|string} messageUpdate (Optional) A final message update.
   *
   * @return {WordArray} The hash.
   *
   * @example
   *
   *     var hash = hasher.finalize();
   *     var hash = hasher.finalize('message');
   *     var hash = hasher.finalize(wordArray);
   */
  finalize(messageUpdate) {
    // Final message update
    if (messageUpdate) {
      this._append(messageUpdate);
    }

    // Perform concrete-hasher logic
    const hash = this._doFinalize();

    return hash;
  }

  /**
   * Creates a shortcut function to a hasher's object interface.
   *
   * @param {Hasher} hasher The hasher to create a helper for.
   *
   * @return {Function} The shortcut function.
   *
   * @static
   *
   * @example
   *
   *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
   */
  _createHelper(SubHasher) {
    return (message, cfg) => new SubHasher(cfg).finalize(message);
  }

  /**
   * Creates a shortcut function to the HMAC's object interface.
   *
   * @param {Hasher} hasher The hasher to use in this HMAC helper.
   *
   * @return {Function} The shortcut function.
   *
   * @static
   *
   * @example
   *
   *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
   */
  _createHmacHelper(SubHasher) {
    return (message, key) => new C_algo.HMAC(SubHasher, key).finalize(message);
  }
}
C_enc.Hasher = Hasher;

/**
 * Algorithm namespace.
 */
const C_algo = {};
C.algo = C_algo;

export default C;