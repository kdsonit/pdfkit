const Table = require('../table');
const Data = require('../../data');

class GlyfTable extends Table {
  static initClass() {
    this.prototype.tag = 'glyf';
  }
  parse(data) {
    // We're not going to parse the whole glyf table, just the glyfs we need.  See below.
    return this.cache = {};
  }
    
  glyphFor(id) {
    if (id in this.cache) { return this.cache[id]; }
    
    const { loca } = this.file;
    const data = this.file.contents;
    
    const index = loca.indexOf(id);
    const length = loca.lengthOf(id);
    
    if (length === 0) {
      return this.cache[id] = null;
    }
      
    data.pos = this.offset + index;
    const raw = new Data(data.read(length));
    
    const numberOfContours = raw.readShort();
    const xMin = raw.readShort();
    const yMin = raw.readShort();
    const xMax = raw.readShort();
    const yMax = raw.readShort();
    
    if (numberOfContours === -1) {
      this.cache[id] = new CompoundGlyph(raw, xMin, yMin, xMax, yMax);
      
    } else {
      this.cache[id] = new SimpleGlyph(raw, numberOfContours, xMin, yMin, xMax, yMax);
    }
      
    return this.cache[id];
  }
    
  encode(glyphs, mapping, old2new) {
    let table = [];
    const offsets = [];
      
    for (let id of Array.from(mapping)) {
      const glyph = glyphs[id];
      offsets.push(table.length);
      if (glyph) { table = table.concat(glyph.encode(old2new)); }
    }
      
    // include an offset at the end of the table, for use in computing the
    // size of the last glyph
    offsets.push(table.length);
    return { table, offsets };
  }
}
GlyfTable.initClass();
      
class SimpleGlyph {
  constructor(raw, numberOfContours, xMin, yMin, xMax, yMax) {
    this.raw = raw;
    this.numberOfContours = numberOfContours;
    this.xMin = xMin;
    this.yMin = yMin;
    this.xMax = xMax;
    this.yMax = yMax;
    this.compound = false;
  }
    
  encode() {
    return this.raw.data;
  }
}

// a compound glyph is one that is comprised of 2 or more simple glyphs, 
// for example a letter with an accent
var CompoundGlyph = (function() {
  let ARG_1_AND_2_ARE_WORDS = undefined;
  let WE_HAVE_A_SCALE = undefined;
  let MORE_COMPONENTS = undefined;
  let WE_HAVE_AN_X_AND_Y_SCALE = undefined;
  let WE_HAVE_A_TWO_BY_TWO = undefined;
  let WE_HAVE_INSTRUCTIONS = undefined;
  CompoundGlyph = class CompoundGlyph {
    static initClass() {
      ARG_1_AND_2_ARE_WORDS  = 0x0001;
      WE_HAVE_A_SCALE      = 0x0008;
      MORE_COMPONENTS      = 0x0020;
      WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
      WE_HAVE_A_TWO_BY_TWO   = 0x0080;
      WE_HAVE_INSTRUCTIONS   = 0x0100;
    }
  
    constructor(raw, xMin, yMin, xMax, yMax) {
      this.raw = raw;
      this.xMin = xMin;
      this.yMin = yMin;
      this.xMax = xMax;
      this.yMax = yMax;
      this.compound = true;
      this.glyphIDs = [];
      this.glyphOffsets = [];
      const data = this.raw;
        
      while (true) {
        const flags = data.readShort();
        this.glyphOffsets.push(data.pos);
        this.glyphIDs.push(data.readShort());
      
        if (!(flags & MORE_COMPONENTS)) { break; }
      
        if (flags & ARG_1_AND_2_ARE_WORDS) {
          data.pos += 4;
        } else { 
          data.pos += 2;
        }
        
        if (flags & WE_HAVE_A_TWO_BY_TWO) {
          data.pos += 8;
        } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
          data.pos += 4;
        } else if (flags & WE_HAVE_A_SCALE) {
          data.pos += 2;
        }
      }
    }
        
    encode(mapping) {
      const result = new Data([...Array.from(this.raw.data)]);
    
      // update glyph offsets
      for (let i = 0; i < this.glyphIDs.length; i++) {
        const id = this.glyphIDs[i];
        result.pos = this.glyphOffsets[i];
        result.writeShort(mapping[id]);
      }
    
      return result.data;
    }
  };
  CompoundGlyph.initClass();
  return CompoundGlyph;
})();
        
module.exports = GlyfTable;