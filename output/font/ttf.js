const fs = require('fs');
const Data = require('../data');
const DFont = require('./dfont');
const Directory = require('./directory');

const NameTable = require('./tables/name');
const HeadTable = require('./tables/head');
const CmapTable = require('./tables/cmap');
const HmtxTable = require('./tables/hmtx');
const HheaTable = require('./tables/hhea');
const MaxpTable = require('./tables/maxp');
const PostTable = require('./tables/post');
const OS2Table  = require('./tables/os2');
const LocaTable = require('./tables/loca');
const GlyfTable = require('./tables/glyf');

class TTFFont {
  static open(filename, name) {
    const contents = fs.readFileSync(filename);
    return new TTFFont(contents, name);
  }
    
  static fromDFont(filename, family) {
    const dfont = DFont.open(filename);
    return new TTFFont(dfont.getNamedFont(family));
  }
    
  static fromBuffer(buffer, family) {
    try {
      let ttf = new TTFFont(buffer, family);
    
      // check some tables to make sure this is valid
      if (!ttf.head.exists || !ttf.name.exists || !ttf.cmap.exists) {
        // if not, try a DFont
        const dfont = new DFont(buffer);
        ttf = new TTFFont(dfont.getNamedFont(family));
        
        // check again after dfont
        if (!ttf.head.exists || !ttf.name.exists || !ttf.cmap.exists) {
          throw new Error('Invalid TTF file in DFont');
        }
      }
      
      return ttf;
    } catch (e) {
      throw new Error(`Unknown font format in buffer: ${e.message}`);
    }
  }
        
  constructor(rawData, name) {
    this.rawData = rawData;
    const data = (this.contents = new Data(this.rawData));

    if (data.readString(4) === 'ttcf') {
      let i;
      let asc, end;
      if (!name) { throw new Error("Must specify a font name for TTC files."); }
      
      // This is a TrueType Collection
      const version = data.readInt();
      const numFonts = data.readInt();
      const offsets = [];
      for (i = 0, end = numFonts, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        offsets[i] = data.readInt();
      }
        
      for (i = 0; i < offsets.length; i++) {
        const offset = offsets[i];
        data.pos = offset;
        this.parse();
        
        if (this.name.postscriptName === name) { return; }
      }
      
      throw new Error(`Font ${name} not found in TTC file.`);
                
    } else {
      data.pos = 0;
      this.parse();
    }
  }
    
  parse() {
    this.directory = new Directory(this.contents);
    this.head = new HeadTable(this);
    this.name = new NameTable(this);
    this.cmap = new CmapTable(this);
    this.hhea = new HheaTable(this);
    this.maxp = new MaxpTable(this);
    this.hmtx = new HmtxTable(this);
    this.post = new PostTable(this);
    this.os2  = new OS2Table(this);
    this.loca = new LocaTable(this);
    this.glyf = new GlyfTable(this);
    
    this.ascender = (this.os2.exists && this.os2.ascender) || this.hhea.ascender;
    this.decender = (this.os2.exists && this.os2.decender) || this.hhea.decender;
    this.lineGap = (this.os2.exists && this.os2.lineGap) || this.hhea.lineGap;
    return this.bbox = [this.head.xMin, this.head.yMin, this.head.xMax, this.head.yMax];
  }
    
  characterToGlyph(character) {
    return (this.cmap.unicode != null ? this.cmap.unicode.codeMap[character] : undefined) || 0;
  }
    
  widthOfGlyph(glyph) {
    const scale = 1000.0 / this.head.unitsPerEm;
    return this.hmtx.forGlyph(glyph).advance * scale;
  }
}

module.exports = TTFFont;