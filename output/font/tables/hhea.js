const Table = require('../table');
const Data = require('../../data');

class HheaTable extends Table {
  static initClass() {
    this.prototype.tag = 'hhea';
  }
  parse(data) {
    data.pos = this.offset;
    
    this.version = data.readInt();
    this.ascender = data.readShort();
    this.decender = data.readShort();
    this.lineGap = data.readShort();
    this.advanceWidthMax = data.readShort();
    this.minLeftSideBearing = data.readShort();
    this.minRightSideBearing = data.readShort();
    this.xMaxExtent = data.readShort();
    this.caretSlopeRise = data.readShort();
    this.caretSlopeRun = data.readShort();
    this.caretOffset = data.readShort();
    
    data.pos += 4 * 2; // skip 4 reserved int16 slots
    
    this.metricDataFormat = data.readShort();
    return this.numberOfMetrics = data.readUInt16();
  }
    
  encode(ids) {
    const table = new Data;
    
    table.writeInt(this.version);
    table.writeShort(this.ascender);
    table.writeShort(this.decender);
    table.writeShort(this.lineGap);
    table.writeShort(this.advanceWidthMax);
    table.writeShort(this.minLeftSideBearing);
    table.writeShort(this.minRightSideBearing);
    table.writeShort(this.xMaxExtent);
    table.writeShort(this.caretSlopeRise);
    table.writeShort(this.caretSlopeRun);
    table.writeShort(this.caretOffset);
    
    for (let i = 0, end = 4 * 2, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) { table.writeByte(0); } // skip 4 reserved int16 slots
    
    table.writeShort(this.metricDataFormat);
    table.writeUInt16(ids.length); // numberOfMetrics
    
    return table.data;
  }
}
HheaTable.initClass();
    
module.exports = HheaTable;