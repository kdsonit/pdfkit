
/*
PDFObject - converts JavaScript types into their corrisponding PDF types.
By Devon Govett
*/

var PDFObject = (function() {
  let pad = undefined;
  let swapBytes = undefined;
  PDFObject = class PDFObject {
    static initClass() {
      pad = (str, length) => (Array(length + 1).join('0') + str).slice(-length);
  
      // Convert little endian UTF-16 to big endian
      swapBytes = function(buff) {
        const l = buff.length;
        if (l & 0x01) {
          throw new Error("Buffer length must be even");
        } else {
          for (let i = 0, end = l - 1; i < end; i += 2) {
            const a = buff[i];
            buff[i] = buff[i + 1];
            buff[i+1] = a;
          }
        }
  
        return buff;
      };
    }

    static convert(object) {
      // String literals are converted to the PDF name type
      if (typeof object === 'string') {
        return `/${PDFEscape.escapeName(object)}`;

      // String objects are converted to PDF strings (UTF-16)
      } else if (object instanceof String) {
        let string = PDFEscape.escapeString(object);

        // Detect if this is a unicode string
        let isUnicode = false;
        for (let i = 0, end = string.length; i < end; i++) {
          if (string.charCodeAt(i) > 0x7f) {
            isUnicode = true;
            break;
          }
        }

        // If so, encode it as big endian UTF-16
        if (isUnicode) {
          string = swapBytes(new Buffer(`\ufeff${string}`, 'utf16le')).toString('binary');
        }

        return `(${string})`;

      // Buffers are converted to PDF hex strings
      } else if (Buffer.isBuffer(object)) {
        return `<${object.toString('hex')}>`;

      } else if (object instanceof PDFReference ||
              object instanceof PDFNamedReference) {
        return object.toString();

      } else if (object instanceof Date) {
        return `(D:${pad(object.getUTCFullYear(), 4)}` +
                pad(object.getUTCMonth() + 1, 2) +
                pad(object.getUTCDate(), 2) +
                pad(object.getUTCHours(), 2) +
                pad(object.getUTCMinutes(), 2) +
                pad(object.getUTCSeconds(), 2) +
        'Z)';

      } else if (Array.isArray(object)) {
        const items = (Array.from(object).map((e) => PDFObject.convert(e))).join(' ');
        return `[${items}]`;

      } else if ({}.toString.call(object) === '[object Object]') {
        const out = ['<<'];
        for (let key in object) {
          const val = object[key];
          out.push(`/${key} ${PDFObject.convert(val)}`);
        }

        out.push('>>');
        return out.join('\n');

      } else {
        return `${object}`;
      }
    }
  };
  PDFObject.initClass();
  return PDFObject;
})();

module.exports = PDFObject;
var PDFEscape = require('./escape');
var PDFReference = require('./reference');
var PDFNamedReference = require('./named_reference');
