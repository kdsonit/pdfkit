const Table = require('../table');
const Data = require('../../data');

class LocaTable extends Table {
  static initClass() {
    this.prototype.tag = 'loca';
  }
  parse(data) {
    let i;
    data.pos = this.offset;
    const format = this.file.head.indexToLocFormat;
    
    // short format
    if (format === 0) {
      return this.offsets = ((() => {
        let end;
        const result = [];
        for (i = 0, end = this.length; i < end; i += 2) {
          result.push(data.readUInt16() * 2);
        }
        return result;
      })());
    
    // long format
    } else {
      return this.offsets = ((() => {
        let end1;
        const result1 = [];
        for (i = 0, end1 = this.length; i < end1; i += 4) {
          result1.push(data.readUInt32());
        }
        return result1;
      })());
    }
  }
      
  indexOf(id) {
    return this.offsets[id];
  }
    
  lengthOf(id) {
    return this.offsets[id + 1] - this.offsets[id];
  }
    
  encode(offsets) {
    let o, ret;
    const table = new Data;
    
    // long format
    for (let offset of Array.from(offsets)) {
      if (offset > 0xFFFF) {
        for (o of Array.from(this.offsets)) {
          table.writeUInt32(o);
        }
        
        return ret = {
          format: 1,
          table: table.data
        };
      }
    }
        
    // short format
    for (o of Array.from(offsets)) {
      table.writeUInt16(o / 2);
    }
      
    return ret = {
      format: 0,
      table: table.data
    };
  }
}
LocaTable.initClass();
        
    
module.exports = LocaTable;