const Table = require('../table');
const Data = require('../../data');
const utils = require('../utils');

var NameTable = (function() {
  let subsetTag = undefined;
  NameTable = class NameTable extends Table {
    static initClass() {
      this.prototype.tag = 'name';
      
      subsetTag = "AAAAAA";
    }
    parse(data) {
      let i;
      let asc, end;
      data.pos = this.offset;
    
      const format = data.readShort();
      const count = data.readShort();
      const stringOffset = data.readShort();
    
      const entries = [];
      for (i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        entries.push({
          platformID: data.readShort(),
          encodingID: data.readShort(),
          languageID: data.readShort(),
          nameID: data.readShort(),
          length: data.readShort(),
          offset: this.offset + stringOffset + data.readShort()
        });
      }
    
      const strings = {};
      for (i = 0; i < entries.length; i++) {
        const entry = entries[i];
        data.pos = entry.offset;
        const text = data.readString(entry.length);
        const name = new NameEntry(text, entry);
      
        if (strings[entry.nameID] == null) { strings[entry.nameID] = []; }
        strings[entry.nameID].push(name);
      }
    
      this.strings = strings;      
      this.copyright = strings[0];
      this.fontFamily = strings[1];
      this.fontSubfamily = strings[2];
      this.uniqueSubfamily = strings[3];
      this.fontName = strings[4];
      this.version = strings[5];
      this.postscriptName = strings[6][0].raw.replace(/[\x00-\x19\x80-\xff]/g, ""); // should only be ONE postscript name
      this.trademark = strings[7];
      this.manufacturer = strings[8];
      this.designer = strings[9];
      this.description = strings[10];
      this.vendorUrl = strings[11];
      this.designerUrl = strings[12];
      this.license = strings[13];
      this.licenseUrl = strings[14];
      this.preferredFamily = strings[15];
      this.preferredSubfamily = strings[17];
      this.compatibleFull = strings[18];
      return this.sampleText = strings[19];
    }
    encode() {
      let id, list, nameTable;
      const strings = {};
      for (id in this.strings) { const val = this.strings[id]; strings[id] = val; }
    
      // generate a new postscript name for this subset
      const postscriptName = new NameEntry(`${subsetTag}+${this.postscriptName}`, { 
        platformID: 1,
        encodingID: 0,
        languageID: 0
      }
      );
      
      strings[6] = [postscriptName];
      subsetTag = utils.successorOf(subsetTag);
    
      // count the number of strings in the table
      let strCount = 0;
      for (id in strings) { list = strings[id]; if (list != null) { strCount += list.length; } }
    
      const table = new Data;
      const strTable = new Data;
    
      table.writeShort(0);         // format
      table.writeShort(strCount);      // count
      table.writeShort(6 + (12 * strCount)); // stringOffset
    
      // write the strings
      for (let nameID in strings) {
        list = strings[nameID];
        if (list != null) {
          for (let string of Array.from(list)) {
            table.writeShort(string.platformID);
            table.writeShort(string.encodingID);
            table.writeShort(string.languageID);
            table.writeShort(nameID);
            table.writeShort(string.length);
            table.writeShort(strTable.pos);
        
            // write the actual string
            strTable.writeString(string.raw);
          }
        }
      }
    
      return nameTable = {
        postscriptName: postscriptName.raw,
        table: table.data.concat(strTable.data)
      };
    }
  };
  NameTable.initClass();
  return NameTable;
})();

module.exports = NameTable;
        
class NameEntry {
  constructor(raw, entry) {
    this.raw = raw;
    this.length = this.raw.length;
    this.platformID = entry.platformID;
    this.encodingID = entry.encodingID;
    this.languageID = entry.languageID;
  }
}
