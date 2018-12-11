/*
PDFNamedReference - representation of a named reference, e.g. "(file1.txt) 11 0 R"
*/

class PDFNamedReference {
  constructor(reference, name) {
    this.reference = reference;
    this.name = name;
  }

  toString() {
    return `(${this.name}) ${this.reference}`;
  }
}

module.exports = PDFNamedReference;
