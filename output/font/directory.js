const Data = require('../data');

var Directory = (function() {
  let checksum = undefined;
  Directory = class Directory {
    static initClass() {
        
      checksum = function(data) {
        data = [...Array.from(data)];
        while (data.length % 4) {
          data.push(0);
        }
          
        const tmp = new Data(data);
        let sum = 0;
        for (let i = 0, end = data.length; i < end; i += 4) {
          sum += tmp.readUInt32();
        }
      
        return sum & 0xFFFFFFFF;
      };
    }
    constructor(data) {
      this.scalarType = data.readInt();
      this.tableCount = data.readShort();
      this.searchRange = data.readShort();
      this.entrySelector = data.readShort();
      this.rangeShift = data.readShort();
    
      this.tables = {};
      for (let i = 0, end = this.tableCount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        const entry = {
          tag: data.readString(4),
          checksum: data.readInt(),
          offset: data.readInt(),
          length: data.readInt()
        };
        
        this.tables[entry.tag] = entry;
      }
    }
      
    encode(tables) {
      const tableCount = Object.keys(tables).length;
      const log2 = Math.log(2);
    
      const searchRange = Math.floor(Math.log(tableCount) / log2) * 16;
      const entrySelector = Math.floor(searchRange / log2);
      const rangeShift = (tableCount * 16) - searchRange;
    
      const directory = new Data;
      directory.writeInt(this.scalarType);
      directory.writeShort(tableCount);
      directory.writeShort(searchRange);
      directory.writeShort(entrySelector);
      directory.writeShort(rangeShift);
    
      const directoryLength = tableCount * 16;
      let offset = directory.pos + directoryLength;
      let headOffset = null;
      let tableData = [];
    
      // encode the font table directory
      for (let tag in tables) {
        const table = tables[tag];
        directory.writeString(tag);
        directory.writeInt(checksum(table));
        directory.writeInt(offset);
        directory.writeInt(table.length);
      
        tableData = tableData.concat(table);
        if (tag === 'head') { headOffset = offset; }
        offset += table.length;
      
        while (offset % 4) {
          tableData.push(0);
          offset++;
        }
      }
    
      // write the actual table data to the font
      directory.write(tableData);
    
      // calculate the font's checksum
      const sum = checksum(directory.data);
    
      // set the checksum adjustment in the head table
      const adjustment = 0xB1B0AFBA - sum;
      directory.pos = headOffset + 8;
      directory.writeUInt32(adjustment);
        
      return new Buffer(directory.data);
    }
  };
  Directory.initClass();
  return Directory;
})();
          
module.exports = Directory;