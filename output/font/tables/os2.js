const Table = require('../table');

class OS2Table extends Table {
  static initClass() {
    this.prototype.tag = 'OS/2';
  }
  parse(data) {
     let i;
     data.pos = this.offset;
     
     this.version = data.readUInt16();
     this.averageCharWidth = data.readShort();
     this.weightClass = data.readUInt16();
     this.widthClass = data.readUInt16();
     this.type = data.readShort();
     this.ySubscriptXSize = data.readShort();
     this.ySubscriptYSize = data.readShort();
     this.ySubscriptXOffset = data.readShort();
     this.ySubscriptYOffset = data.readShort();
     this.ySuperscriptXSize = data.readShort();
     this.ySuperscriptYSize = data.readShort();
     this.ySuperscriptXOffset = data.readShort();
     this.ySuperscriptYOffset = data.readShort();
     this.yStrikeoutSize = data.readShort();
     this.yStrikeoutPosition = data.readShort();
     this.familyClass = data.readShort();
     
     this.panose = ((() => {
       const result = [];
       for (i = 0; i < 10; i++) {
         result.push(data.readByte());
       }
       return result;
     })());
     this.charRange = ((() => {
       const result1 = [];
       for (i = 0; i < 4; i++) {
         result1.push(data.readInt());
       }
       return result1;
     })());
     
     this.vendorID = data.readString(4);
     this.selection = data.readShort();
     this.firstCharIndex = data.readShort();
     this.lastCharIndex = data.readShort();
     
     if (this.version > 0) {
       this.ascent = data.readShort();
       this.descent = data.readShort();
       this.lineGap = data.readShort();
       this.winAscent = data.readShort();
       this.winDescent = data.readShort();
       this.codePageRange = ((() => {
         const result2 = [];
         for (i = 0; i < 2; i++) {
           result2.push(data.readInt());
         }
         return result2;
       })());
       
       if (this.version > 1) {
         this.xHeight = data.readShort();
         this.capHeight = data.readShort();
         this.defaultChar = data.readShort();
         this.breakChar = data.readShort();
         return this.maxContext = data.readShort();
       }
     }
   }
         
  encode() {
    return this.raw();
  }
}
OS2Table.initClass();
       
module.exports = OS2Table;