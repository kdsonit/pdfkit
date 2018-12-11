const CmapTable = require('./tables/cmap');
const utils = require('./utils');

class Subset {
  constructor(font) {
    this.font = font;
    this.subset = {};
    this.unicodes = {};
    this.next = 33; // PDFs don't like character codes between 0 and 32
  }
    
  use(character) {
    // if given a string, add each character
    if (typeof character === 'string') {
      for (let i = 0, end = character.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        this.use(character.charCodeAt(i));
      }
        
      return;
    }

    if (!this.unicodes[character]) {
      this.subset[this.next] = character;
      return this.unicodes[character] = this.next++;
    }
  }
    
  encodeText(text) {
    // encodes UTF-8 text for this subset. Returned 
    // text may not look correct, but it is.
    let string = '';
    for (let i = 0, end = text.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      const char = this.unicodes[text.charCodeAt(i)];
      string += String.fromCharCode(char);
    }
      
    return string;
  }
    
  generateCmap() {
    // generate the cmap table for this subset
    const unicodeCmap = this.font.cmap.tables[0].codeMap;
    const mapping = {};
    for (let roman in this.subset) {
      const unicode = this.subset[roman];
      mapping[roman] = unicodeCmap[unicode];
    }
    
    return mapping;
  }
    
  glyphIDs() {
    // collect glyph ids for this subset
    const unicodeCmap = this.font.cmap.tables[0].codeMap;
    const ret = [0];
    for (let roman in this.subset) {
      const unicode = this.subset[roman];
      const val = unicodeCmap[unicode];
      if ((val != null) && !Array.from(ret).includes(val)) { ret.push(val); }
    }
    
    return ret.sort();
  }
    
  glyphsFor(glyphIDs) {
    // collect the actual glyph data for this subset
    let glyph, id;
    const glyphs = {};
    for (id of Array.from(glyphIDs)) {
      glyphs[id] = this.font.glyf.glyphFor(id);
    }
    
    // collect additional glyphs referenced from compound glyphs  
    const additionalIDs = [];
    for (id in glyphs) {
      glyph = glyphs[id];
      if ((glyph != null ? glyph.compound : undefined)) {
        additionalIDs.push(...Array.from(glyph.glyphIDs || []));
      }
    }
      
    if (additionalIDs.length > 0) {
      const object = this.glyphsFor(additionalIDs);
      for (id in object) {
        glyph = object[id];
        glyphs[id] = glyph;
      }
    }
    
    return glyphs;
  }
    
  encode() {
    // generate the Cmap for this subset
    let code, ids;
    const cmap = CmapTable.encode(this.generateCmap(), 'unicode');
    const glyphs = this.glyphsFor(this.glyphIDs());
        
    // compute old2new and new2old mapping tables
    const old2new = { 0: 0 };
    for (code in cmap.charMap) {
      ids = cmap.charMap[code];
      old2new[ids.old] = ids.new;
    }
      
    let nextGlyphID = cmap.maxGlyphID;
    for (let oldID in glyphs) {
      if (!(oldID in old2new)) {
        old2new[oldID] = nextGlyphID++;
      }
    }
      
    const new2old = utils.invert(old2new);
    const newIDs = Object.keys(new2old).sort((a, b) => a - b);
    const oldIDs = (Array.from(newIDs).map((id) => new2old[id]));
      
    // encode the font tables
    const glyf = this.font.glyf.encode(glyphs, oldIDs, old2new);
    const loca = this.font.loca.encode(glyf.offsets);
    const name = this.font.name.encode();
    
    // store for use later
    this.postscriptName = name.postscriptName;
    this.cmap = {};
    for (code in cmap.charMap) {
      ids = cmap.charMap[code];
      this.cmap[code] = ids.old;
    }
    
    const tables = {
      cmap: cmap.table,
      glyf: glyf.table,
      loca: loca.table,
      hmtx: this.font.hmtx.encode(oldIDs),
      hhea: this.font.hhea.encode(oldIDs),
      maxp: this.font.maxp.encode(oldIDs),
      post: this.font.post.encode(oldIDs),
      name: name.table,
      head: this.font.head.encode(loca)
    };
    
    // just copy over the OS/2 table if it exists  
    if (this.font.os2.exists) { tables['OS/2'] = this.font.os2.raw(); }
    
    // encode the font directory
    return this.font.directory.encode(tables);
  }
}
    
module.exports = Subset;