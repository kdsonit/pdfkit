/*
PDFReference - represents a reference to another object in the PDF object heirarchy
By Devon Govett
*/

const zlib = require('zlib');
const PDFNamedReference = require('./named_reference');

class PDFReference {
  constructor(document, id, data, options) {
    this.finalize = this.finalize.bind(this);
    this.document = document;
    this.id = id;
    if (data == null) { data = {}; }
    this.data = data;
    if (options == null) { options = {}; }
    this.options = options;
    this.gen = 0;
    this.deflate = null;
    this.compress = (this.options.compress != null ? this.options.compress : true) && this.document.compress && !this.data.Filter;
    this.uncompressedLength = 0;
    this.chunks = [];
  }

  initDeflate() {
    this.data.Filter = 'FlateDecode';

    this.deflate = zlib.createDeflate();
    this.deflate.on('data', chunk => {
      this.chunks.push(chunk);
      return this.data.Length += chunk.length;
    });

    return this.deflate.on('end', this.finalize);
  }

  write(chunk) {
    if (!Buffer.isBuffer(chunk)) {
      chunk = new Buffer(chunk + '\n', 'binary');
    }

    this.uncompressedLength += chunk.length;
    if (this.data.Length == null) { this.data.Length = 0; }

    if (this.compress) {
      if (!this.deflate) { this.initDeflate(); }
      return this.deflate.write(chunk);
    } else {
      this.chunks.push(chunk);
      return this.data.Length += chunk.length;
    }
  }

  end(chunk) {
    if ((typeof chunk === 'string') || Buffer.isBuffer(chunk)) {
      this.write(chunk);
    }

    if (this.deflate) {
      return this.deflate.end();
    } else {
      return this.finalize();
    }
  }

  finalize() {
    this.offset = this.document._offset;

    this.document._write(`${this.id} ${this.gen} obj`);
    this.document._write(PDFObject.convert(this.data));

    if (this.chunks.length) {
      this.document._write('stream');
      for (let chunk of Array.from(this.chunks)) {
        this.document._write(chunk);
      }

      this.chunks.length = 0; // free up memory
      this.document._write('\nendstream');
    }

    this.document._write('endobj');
    return this.document._refEnd(this);
  }

  toString() {
    return `${this.id} ${this.gen} R`;
  }

  namedReference(name){
    return this._namedReference || (this._namedReference = new PDFNamedReference(this, name));
  }
}

module.exports = PDFReference;
var PDFObject = require('./object');
