class Table {
  constructor(file) {
    this.file = file;
    const info = this.file.directory.tables[this.tag];
    this.exists = !!info;
    
    if (info) {
      ({offset: this.offset, length: this.length} = info);
      this.parse(this.file.contents);
    }
  }
      
  parse() {}
    // implemented by subclasses
      
  encode() {}
    // implemented by subclasses
      
  raw() {
    if (!this.exists) { return null; }
    
    this.file.contents.pos = this.offset;
    return this.file.contents.read(this.length);
  }
}
      
module.exports = Table;