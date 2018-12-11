const Table = require('../table');
const Data = require('../../data');

class HeadTable extends Table {
  static initClass() {
    this.prototype.tag = 'head';
  }
  parse(data) {
    data.pos = this.offset;
    
    this.version = data.readInt();
    this.revision = data.readInt();
    this.checkSumAdjustment = data.readInt();
    this.magicNumber = data.readInt();
    this.flags = data.readShort();
    this.unitsPerEm = data.readShort();
    this.created = data.readLongLong();
    this.modified = data.readLongLong();
    
    this.xMin = data.readShort();
    this.yMin = data.readShort();
    this.xMax = data.readShort();
    this.yMax = data.readShort();
    this.macStyle = data.readShort();
    this.lowestRecPPEM = data.readShort();
    this.fontDirectionHint = data.readShort();
    this.indexToLocFormat = data.readShort();
    return this.glyphDataFormat = data.readShort();
  }
  
  encode(loca) {
    const table = new Data;
    
    table.writeInt(this.version);
    table.writeInt(this.revision);
    table.writeInt(this.checkSumAdjustment);
    table.writeInt(this.magicNumber);
    table.writeShort(this.flags);
    table.writeShort(this.unitsPerEm);
    table.writeLongLong(this.created);
    table.writeLongLong(this.modified);
    
    table.writeShort(this.xMin);
    table.writeShort(this.yMin);
    table.writeShort(this.xMax);
    table.writeShort(this.yMax);
    table.writeShort(this.macStyle);
    table.writeShort(this.lowestRecPPEM);
    table.writeShort(this.fontDirectionHint);
    table.writeShort(loca.type);
    table.writeShort(this.glyphDataFormat);
    
    return table.data;
  }
}
HeadTable.initClass();
    
module.exports = HeadTable;