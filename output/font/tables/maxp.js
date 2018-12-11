const Table = require('../table');
const Data = require('../../data');

class MaxpTable extends Table {
  static initClass() {
    this.prototype.tag = 'maxp';
  }
  parse(data) {
    data.pos = this.offset;
    
    this.version = data.readInt();
    this.numGlyphs = data.readUInt16();
    this.maxPoints = data.readUInt16();
    this.maxContours = data.readUInt16();
    this.maxCompositePoints = data.readUInt16();
    this.maxComponentContours = data.readUInt16();
    this.maxZones = data.readUInt16();
    this.maxTwilightPoints = data.readUInt16();
    this.maxStorage = data.readUInt16();
    this.maxFunctionDefs = data.readUInt16();
    this.maxInstructionDefs = data.readUInt16();
    this.maxStackElements = data.readUInt16();
    this.maxSizeOfInstructions = data.readUInt16();
    this.maxComponentElements = data.readUInt16();
    return this.maxComponentDepth = data.readUInt16();
  }
    
  encode(ids) {
    const table = new Data;
    
    table.writeInt(this.version);
    table.writeUInt16(ids.length); // numGlyphs
    table.writeUInt16(this.maxPoints);
    table.writeUInt16(this.maxContours);
    table.writeUInt16(this.maxCompositePoints);
    table.writeUInt16(this.maxComponentContours);
    table.writeUInt16(this.maxZones);
    table.writeUInt16(this.maxTwilightPoints);
    table.writeUInt16(this.maxStorage);
    table.writeUInt16(this.maxFunctionDefs);
    table.writeUInt16(this.maxInstructionDefs);
    table.writeUInt16(this.maxStackElements);
    table.writeUInt16(this.maxSizeOfInstructions);
    table.writeUInt16(this.maxComponentElements);
    table.writeUInt16(this.maxComponentDepth);
    
    return table.data;
  }
}
MaxpTable.initClass();
    
module.exports = MaxpTable;