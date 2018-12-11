const fs = require('fs');
const Data = require('../data');
const Directory = require('./directory');
const NameTable = require('./tables/name');

class DFont {
  static open(filename) {
    const contents = fs.readFileSync(filename);
    return new DFont(contents);
  }
    
  constructor(contents) {
    this.contents = new Data(contents);
    this.parse(this.contents);
  }
    
  parse(data) {
    const dataOffset = data.readInt();
    const mapOffset = data.readInt();
    const dataLength = data.readInt();
    const mapLength = data.readInt();
    
    this.map = {};
    data.pos = mapOffset + 24; // skip header copy, next map handle, file reference, and attrs
    
    const typeListOffset = data.readShort() + mapOffset;
    const nameListOffset = data.readShort() + mapOffset;
    
    data.pos = typeListOffset;
    const maxIndex = data.readShort();
    
    for (let i = 0, end = maxIndex; i <= end; i++) {
      const type = data.readString(4);
      const maxTypeIndex = data.readShort();
      const refListOffset = data.readShort();
      
      this.map[type] = {
        list: [],
        named: {}
      };
        
      const { pos } = data;
      data.pos = typeListOffset + refListOffset;
      
      for (let j = 0, end1 = maxTypeIndex; j <= end1; j++) {
        var name;
        const id = data.readShort();
        const nameOfs = data.readShort();
        const attr = data.readByte();
        
        const b2 = data.readByte() << 16;
        const b3 = data.readByte() << 8;
        const b4 = data.readByte();
        const dataOfs = dataOffset + (0 | b2 | b3 | b4);
        
        const handle = data.readUInt32();
        const entry = { 
          id,
          attributes: attr,
          offset: dataOfs,
          handle
        };
        
        const p = data.pos;
        
        // if the name is easily accessible, parse it
        if ((nameOfs !== -1) && ((nameListOffset + nameOfs) < (mapOffset + mapLength))) {
          data.pos = nameListOffset + nameOfs;
          const len = data.readByte();
          entry.name = data.readString(len);
        
        // otherwise jump into the actual ttf and grab it from the 'name' table  
        } else if (type === 'sfnt') {
          data.pos = entry.offset;
          const length = data.readUInt32();
          const font = {};
          font.contents = new Data(data.slice(data.pos, data.pos + length));
          font.directory = new Directory(font.contents);
          name = new NameTable(font);
          entry.name = name.fontName[0].raw;
        }
        
        data.pos = p;
        
        this.map[type].list.push(entry);
        if (entry.name) { this.map[type].named[entry.name] = entry; }
      }
        
      data.pos = pos;
    }
    
  }
    
  getNamedFont(name) {
    const data = this.contents;
    const { pos } = data;
    
    const entry = this.map.sfnt != null ? this.map.sfnt.named[name] : undefined;
    if (!entry) { throw new Error(`Font ${name} not found in DFont file.`); }
    
    data.pos = entry.offset;
    
    const length = data.readUInt32();
    const ret = data.slice(data.pos, data.pos + length);
    
    data.pos = pos;
    return ret;
  }
}
    
module.exports = DFont;