const Table = require('../table');
const Data = require('../../data');

var PostTable = (function() {
  let POSTSCRIPT_GLYPHS = undefined;
  PostTable = class PostTable extends Table {
    static initClass() {
      this.prototype.tag = 'post';
      
      POSTSCRIPT_GLYPHS = `\
.notdef .null nonmarkingreturn space exclam quotedbl numbersign dollar percent
ampersand quotesingle parenleft parenright asterisk plus comma hyphen period slash
zero one two three four five six seven eight nine colon semicolon less equal greater
question at A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
bracketleft backslash bracketright asciicircum underscore grave
a b c d e f g h i j k l m n o p q r s t u v w x y z
braceleft bar braceright asciitilde Adieresis Aring Ccedilla Eacute Ntilde Odieresis
Udieresis aacute agrave acircumflex adieresis atilde aring ccedilla eacute egrave
ecircumflex edieresis iacute igrave icircumflex idieresis ntilde oacute ograve
ocircumflex odieresis otilde uacute ugrave ucircumflex udieresis dagger degree cent
sterling section bullet paragraph germandbls registered copyright trademark acute
dieresis notequal AE Oslash infinity plusminus lessequal greaterequal yen mu
partialdiff summation product pi integral ordfeminine ordmasculine Omega ae oslash
questiondown exclamdown logicalnot radical florin approxequal Delta guillemotleft
guillemotright ellipsis nonbreakingspace Agrave Atilde Otilde OE oe endash emdash
quotedblleft quotedblright quoteleft quoteright divide lozenge ydieresis Ydieresis
fraction currency guilsinglleft guilsinglright fi fl daggerdbl periodcentered
quotesinglbase quotedblbase perthousand Acircumflex Ecircumflex Aacute Edieresis
Egrave Iacute Icircumflex Idieresis Igrave Oacute Ocircumflex apple Ograve Uacute
Ucircumflex Ugrave dotlessi circumflex tilde macron breve dotaccent ring cedilla
hungarumlaut ogonek caron Lslash lslash Scaron scaron Zcaron zcaron brokenbar Eth
eth Yacute yacute Thorn thorn minus multiply onesuperior twosuperior threesuperior
onehalf onequarter threequarters franc Gbreve gbreve Idotaccent Scedilla scedilla
Cacute cacute Ccaron ccaron dcroat\
`.split(/\s+/g);
    }
    parse(data) {
      let asc, end;
      let i;
      data.pos = this.offset;
    
      this.format = data.readInt();
      this.italicAngle = data.readInt();
      this.underlinePosition = data.readShort();
      this.underlineThickness = data.readShort();
      this.isFixedPitch = data.readInt();
      this.minMemType42 = data.readInt();
      this.maxMemType42 = data.readInt();
      this.minMemType1 = data.readInt();
      this.maxMemType1 = data.readInt();
        
      switch (this.format) {
        case 0x00010000: break;
        case 0x00020000:
          var numberOfGlyphs = data.readUInt16();
          this.glyphNameIndex = [];
        
          for (i = 0, end = numberOfGlyphs, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
            this.glyphNameIndex.push(data.readUInt16());
          }
          
          this.names = [];
          return (() => {
            const result = [];
            while (data.pos < (this.offset + this.length)) {
              const length = data.readByte();
              result.push(this.names.push(data.readString(length)));
            }
            return result;
          })();
        
        case 0x00025000:
          numberOfGlyphs = data.readUInt16();
          return this.offsets = data.read(numberOfGlyphs);
        
        case 0x00030000: break;
        case 0x00040000:
          return this.map = ((() => {
            let asc1, end1;
            const result1 = [];
            for (i = 0, end1 = this.file.maxp.numGlyphs, asc1 = 0 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
              result1.push(data.readUInt32());
            }
            return result1;
          })());
      }
    }
        
    glyphFor(code) {
      switch (this.format) {
        case 0x00010000:
          return POSTSCRIPT_GLYPHS[code] || '.notdef';
        
        case 0x00020000:
          var index = this.glyphNameIndex[code];
          if (index <= 257) {
            return POSTSCRIPT_GLYPHS[index];
          } else {
            return this.names[index - 258] || '.notdef';
          }
          
        case 0x00025000:
          return POSTSCRIPT_GLYPHS[code + this.offsets[code]] || '.notdef';
        
        case 0x00030000:
          return '.notdef';
        
        case 0x00040000:
          return this.map[code] || 0xFFFF;
      }
    }
    
    encode(mapping) {
      if (!this.exists) { return null; }
    
      const raw = this.raw();
      if (this.format === 0x00030000) { return raw; }
    
      const table = new Data(raw.slice(0, 32));
      table.writeUInt32(0x00020000); // set format
      table.pos = 32;
    
      const indexes = [];
      const strings = [];
    
      for (let id of Array.from(mapping)) {
        const post = this.glyphFor(id);
        const position = POSTSCRIPT_GLYPHS.indexOf(post);
      
        if (position !== -1) {
          indexes.push(position);
        } else {
          indexes.push(257 + strings.length);
          strings.push(post);
        }
      }
        
      table.writeUInt16(Object.keys(mapping).length);
      for (let index of Array.from(indexes)) {
        table.writeUInt16(index);
      }
    
      for (let string of Array.from(strings)) {
        table.writeByte(string.length);
        table.writeString(string);
      }
    
      return table.data;
    }
  };
  PostTable.initClass();
  return PostTable;
})();
    
module.exports = PostTable;