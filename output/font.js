/*
PDFFont - embeds fonts in PDF documents
By Devon Govett
*/

const TTFFont = require('./font/ttf');
const AFMFont = require('./font/afm');
const Subset = require('./font/subset');
const fs = require('fs');

var PDFFont = (function() {
  let STANDARD_FONTS = undefined;
  let toUnicodeCmap = undefined;
  PDFFont = class PDFFont {
    static initClass() {
        
      // This insanity is so browserify can inline the font files
      STANDARD_FONTS = {
        "Courier"() { return fs.readFileSync(__dirname + "/font/data/Courier.afm", 'utf8'); },
        "Courier-Bold"() { return fs.readFileSync(__dirname + "/font/data/Courier-Bold.afm", 'utf8'); },
        "Courier-Oblique"() { return fs.readFileSync(__dirname + "/font/data/Courier-Oblique.afm", 'utf8'); },
        "Courier-BoldOblique"() { return fs.readFileSync(__dirname + "/font/data/Courier-BoldOblique.afm", 'utf8'); },
        "Helvetica"() { return fs.readFileSync(__dirname + "/font/data/Helvetica.afm", 'utf8'); },
        "Helvetica-Bold"() { return fs.readFileSync(__dirname + "/font/data/Helvetica-Bold.afm", 'utf8'); },
        "Helvetica-Oblique"() { return fs.readFileSync(__dirname + "/font/data/Helvetica-Oblique.afm", 'utf8'); },
        "Helvetica-BoldOblique"() { return fs.readFileSync(__dirname + "/font/data/Helvetica-BoldOblique.afm", 'utf8'); },
        "Times-Roman"() { return fs.readFileSync(__dirname + "/font/data/Times-Roman.afm", 'utf8'); },
        "Times-Bold"() { return fs.readFileSync(__dirname + "/font/data/Times-Bold.afm", 'utf8'); },
        "Times-Italic"() { return fs.readFileSync(__dirname + "/font/data/Times-Italic.afm", 'utf8'); },
        "Times-BoldItalic"() { return fs.readFileSync(__dirname + "/font/data/Times-BoldItalic.afm", 'utf8'); },
        "Symbol"() { return fs.readFileSync(__dirname + "/font/data/Symbol.afm", 'utf8'); },
        "ZapfDingbats"() { return fs.readFileSync(__dirname + "/font/data/ZapfDingbats.afm", 'utf8'); }
      };
        
      toUnicodeCmap = function(map) {
        let unicodeMap = `\
/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo <<
  /Registry (Adobe)
  /Ordering (UCS)
  /Supplement 0
>> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<00><ff>
endcodespacerange\
`;
    
        const codes = Object.keys(map).sort((a, b) => a - b);
        let range = [];
        for (let code of Array.from(codes)) {
          if (range.length >= 100) {
            unicodeMap += `\n${range.length} beginbfchar\n${range.join('\n')}\nendbfchar`;
            range = [];
          }
          
          const unicode = (`0000${map[code].toString(16)}`).slice(-4);
          code = (+code).toString(16);
          range.push(`<${code}><${unicode}>`);
        }
        
        if (range.length) { unicodeMap += `\n${range.length} beginbfchar\n${range.join('\n')}\nendbfchar\n`; }
        return unicodeMap += `\
endcmap
CMapName currentdict /CMap defineresource pop
end
end\
`;
      };
    }
    constructor(document, src, family, id) {    
      this.document = document;
      this.id = id;
      if (typeof src === 'string') {
        if (src in STANDARD_FONTS) {
          this.isAFM = true;
          this.font = new AFMFont(STANDARD_FONTS[src]());
          this.registerAFM(src);
          return;
      
        } else if (/\.(ttf|ttc)$/i.test(src)) {
          this.font = TTFFont.open(src, family);
      
        } else if (/\.dfont$/i.test(src)) {
          this.font = TTFFont.fromDFont(src, family);
        
        } else {
          throw new Error('Not a supported font format or standard PDF font.');
        }
        
      } else if (Buffer.isBuffer(src)) {
        this.font = TTFFont.fromBuffer(src, family);

      } else if (src instanceof Uint8Array) {
        this.font = TTFFont.fromBuffer(new Buffer(src), family);
      
      } else if (src instanceof ArrayBuffer) {
        this.font = TTFFont.fromBuffer(new Buffer(new Uint8Array(src)), family);
      
      } else {
        throw new Error('Not a supported font format or standard PDF font.');
      }
      
      // create a subset for the font and register
      this.subset = new Subset(this.font);
      this.registerTTF();
    }
      
    use(characters) {
      return (this.subset != null ? this.subset.use(characters) : undefined);
    }
    
    embed() {
      if (this.embedded || (this.dictionary == null)) { return; }
    
      if (this.isAFM) {
        this.embedAFM();
      } else {
        this.embedTTF();
      }
      
      return this.embedded = true;
    }
    
    encode(text) {
      if (this.isAFM) {
        return this.font.encodeText(text);
      } else {
        return (this.subset != null ? this.subset.encodeText(text) : undefined) || text;
      }
    }
          
    ref() {
      return this.dictionary != null ? this.dictionary : (this.dictionary = this.document.ref());
    }
    
    registerTTF() {
      this.name = this.font.name.postscriptName;
      this.scaleFactor = 1000.0 / this.font.head.unitsPerEm;
      this.bbox = (Array.from(this.font.bbox).map((e) => Math.round(e * this.scaleFactor)));
      this.stemV = 0; // not sure how to compute this for true-type fonts...
    
      if (this.font.post.exists) {
        const raw = this.font.post.italic_angle;
        let hi = raw >> 16;
        const low = raw & 0xFF;
        if (hi & (0x8000 !== 0)) { hi = -((hi ^ 0xFFFF) + 1); }
        this.italicAngle = +`${hi}.${low}`;
      } else {
        this.italicAngle = 0;
      }
      
      this.ascender = Math.round(this.font.ascender * this.scaleFactor);
      this.decender = Math.round(this.font.decender * this.scaleFactor);
      this.lineGap = Math.round(this.font.lineGap * this.scaleFactor);

      this.capHeight = (this.font.os2.exists && this.font.os2.capHeight) || this.ascender;
      this.xHeight = (this.font.os2.exists && this.font.os2.xHeight) || 0;

      this.familyClass = ((this.font.os2.exists && this.font.os2.familyClass) || 0) >> 8;
      this.isSerif = [1,2,3,4,5,7].includes(this.familyClass);
      this.isScript = this.familyClass === 10;

      this.flags = 0;
      if (this.font.post.isFixedPitch) { this.flags |= 1 << 0; }
      if (this.isSerif) { this.flags |= 1 << 1; }
      if (this.isScript) { this.flags |= 1 << 3; }
      if (this.italicAngle !== 0) { this.flags |= 1 << 6; }
      this.flags |= 1 << 5; // assume the font is nonsymbolic...

      if (!this.font.cmap.unicode) { throw new Error('No unicode cmap for font'); }
    }
      
    embedTTF() {
      const data = this.subset.encode();
      const fontfile = this.document.ref();
      fontfile.write(data);
    
      fontfile.data.Length1 = fontfile.uncompressedLength;
      fontfile.end();
      
      const descriptor = this.document.ref({
        Type: 'FontDescriptor',
        FontName: this.subset.postscriptName,
        FontFile2: fontfile,
        FontBBox: this.bbox,
        Flags: this.flags,
        StemV: this.stemV,
        ItalicAngle: this.italicAngle,
        Ascent: this.ascender,
        Descent: this.decender,
        CapHeight: this.capHeight,
        XHeight: this.xHeight
      });
      
      descriptor.end();
      
      const firstChar = +Object.keys(this.subset.cmap)[0];
      const charWidths = (() => {
        const result = [];
        for (let code in this.subset.cmap) {
          const glyph = this.subset.cmap[code];
          result.push(Math.round(this.font.widthOfGlyph(glyph)));
        }
        return result;
      })();
  
      const cmap = this.document.ref();
      cmap.end(toUnicodeCmap(this.subset.subset));
    
      this.dictionary.data = {
        Type: 'Font',
        BaseFont: this.subset.postscriptName,
        Subtype: 'TrueType',
        FontDescriptor: descriptor,
        FirstChar: firstChar,
        LastChar: (firstChar + charWidths.length) - 1,
        Widths: charWidths,
        Encoding: 'MacRomanEncoding',
        ToUnicode: cmap
      };
    
      return this.dictionary.end();
    }
          
    registerAFM(name) {
      this.name = name;
      return {ascender: this.ascender,decender: this.decender,bbox: this.bbox,lineGap: this.lineGap} = this.font;
    }
    
    embedAFM() {
      this.dictionary.data = {
        Type: 'Font',
        BaseFont: this.name,
        Subtype: 'Type1',
        Encoding: 'WinAnsiEncoding'
      };
      
      return this.dictionary.end();
    }
      
    widthOfString(string, size) {
      string = `${string}`;
      let width = 0;
      for (let i = 0, end = string.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        const charCode = string.charCodeAt(i);        
        width += this.font.widthOfGlyph(this.font.characterToGlyph(charCode)) || 0;
      }
    
      const scale = size / 1000;  
      return width * scale;
    }
    
    lineHeight(size, includeGap) {
      if (includeGap == null) { includeGap = false; }
      const gap = includeGap ? this.lineGap : 0;
      return (((this.ascender + gap) - this.decender) / 1000) * size;
    }
  };
  PDFFont.initClass();
  return PDFFont;
})();
    
module.exports = PDFFont;
