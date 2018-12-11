const Table = require('../table');
const Data = require('../../data');

class CmapTable extends Table {
  static initClass() {
    this.prototype.tag = 'cmap';
  }
  parse(data) {
    data.pos = this.offset;
    
    this.version = data.readUInt16();
    const tableCount = data.readUInt16();
    this.tables = [];
    this.unicode = null;
    
    for (let i = 0, end = tableCount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      const entry = new CmapEntry(data, this.offset);
      this.tables.push(entry);
      if (entry.isUnicode) { if (this.unicode == null) { this.unicode = entry; } }
    }
      
    return true;
  }
    
  static encode(charmap, encoding) {
    if (encoding == null) { encoding = 'macroman'; }
    const result = CmapEntry.encode(charmap, encoding);
    const table = new Data;
    
    table.writeUInt16(0); // version
    table.writeUInt16(1); // tableCount
    
    result.table = table.data.concat(result.subtable);
    return result;
  }
}
CmapTable.initClass();
      
class CmapEntry {
  constructor(data, offset) {
    let i;
    this.platformID = data.readUInt16();
    this.encodingID = data.readShort();
    this.offset = offset + data.readInt();

    const saveOffset = data.pos;
    
    data.pos = this.offset;
    this.format = data.readUInt16();
    this.length = data.readUInt16();
    this.language = data.readUInt16();
    
    this.isUnicode = ((this.platformID === 3) && (this.encodingID === 1) && (this.format === 4)) || ((this.platformID === 0) && (this.format === 4));
    
    this.codeMap = {};
    switch (this.format) {
      case 0:
        for (i = 0; i < 256; i++) {
          this.codeMap[i] = data.readByte();
        }
        break;
      
      case 4:
        var segCountX2 = data.readUInt16();
        var segCount = segCountX2 / 2;
        
        data.pos += 6; // skip searching hints
        var endCode = ((() => {
          let asc, end;
          const result = [];
          for (i = 0, end = segCount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
            result.push(data.readUInt16());
          }
          return result;
        })());
        data.pos += 2; // skip reserved value
        
        var startCode = ((() => {
          let asc1, end1;
          const result1 = [];
          for (i = 0, end1 = segCount, asc1 = 0 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
            result1.push(data.readUInt16());
          }
          return result1;
        })());
        var idDelta = ((() => {
          let asc2, end2;
          const result2 = [];
          for (i = 0, end2 = segCount, asc2 = 0 <= end2; asc2 ? i < end2 : i > end2; asc2 ? i++ : i--) {
            result2.push(data.readUInt16());
          }
          return result2;
        })());
        var idRangeOffset = ((() => {
          let asc3, end3;
          const result3 = [];
          for (i = 0, end3 = segCount, asc3 = 0 <= end3; asc3 ? i < end3 : i > end3; asc3 ? i++ : i--) {
            result3.push(data.readUInt16());
          }
          return result3;
        })());
        
        var count = ((this.length - data.pos) + this.offset) / 2;
        var glyphIds = ((() => {
          let asc4, end4;
          const result4 = [];
          for (i = 0, end4 = count, asc4 = 0 <= end4; asc4 ? i < end4 : i > end4; asc4 ? i++ : i--) {
            result4.push(data.readUInt16());
          }
          return result4;
        })());
        
        for (i = 0; i < endCode.length; i++) {
          const tail = endCode[i];
          const start = startCode[i];
          for (let code = start, end5 = tail, asc5 = start <= end5; asc5 ? code <= end5 : code >= end5; asc5 ? code++ : code--) {
            var glyphId;
            if (idRangeOffset[i] === 0) {
              glyphId = code + idDelta[i];
            } else {
              const index = ((idRangeOffset[i] / 2) + (code - start)) - (segCount - i);
              glyphId = glyphIds[index] || 0;
              if (glyphId !== 0) { glyphId += idDelta[i]; }
            }
              
            this.codeMap[code] = glyphId & 0xFFFF;
          }
        }
        break;
    }

    data.pos = saveOffset;
  }
            
  static encode(charmap, encoding) {
    let code, delta, diff, result;
    let i;
    const subtable = new Data;
    const codes = Object.keys(charmap).sort((a, b) => a - b);
    
    switch (encoding) {
      case 'macroman':
        var id = 0;
        var indexes = ((() => {
          const result1 = [];
          for (i = 0; i < 256; i++) {
            result1.push(0);
          }
          return result1;
        })());
        var map = { 0: 0 };
        var codeMap = {};
        
        for (code of Array.from(codes)) {
          if (map[charmap[code]] == null) { map[charmap[code]] = ++id; }
          codeMap[code] = { 
            old: charmap[code],
            new: map[charmap[code]]
          };
            
          indexes[code] = map[charmap[code]];
        }
          
        subtable.writeUInt16(1);   // platformID
        subtable.writeUInt16(0);   // encodingID
        subtable.writeUInt32(12);  // offset
        subtable.writeUInt16(0);   // format
        subtable.writeUInt16(262); // length
        subtable.writeUInt16(0);   // language
        subtable.write(indexes);   // glyph indexes
        
        return result = { 
          charMap: codeMap,
          subtable: subtable.data,
          maxGlyphID: id + 1
        };
        
      case 'unicode':
        var startCodes = [];
        var endCodes = [];
        var nextID = 0;
        map = {};
        var charMap = {};
        var last = (diff = null);
        
        for (code of Array.from(codes)) {
          const old = charmap[code];
          if (map[old] == null) { map[old] = ++nextID; }
          charMap[code] = { 
            old,
            new: map[old]
          };
          
          delta = map[old] - code;
          if ((last == null) || (delta !== diff)) {
            if (last) { endCodes.push(last); }
            startCodes.push(code);
            diff = delta;
          }

          last = code;
        }
          
        if (last) { endCodes.push(last); }
        endCodes.push(0xFFFF);
        startCodes.push(0xFFFF);
        
        var segCount = startCodes.length;
        var segCountX2 = segCount * 2;
        var searchRange = 2 * Math.pow(Math.log(segCount) / Math.LN2, 2);
        var entrySelector = Math.log(searchRange / 2) / Math.LN2;
        var rangeShift = (2 * segCount) - searchRange;
        
        var deltas = [];
        var rangeOffsets = [];
        var glyphIDs = [];
        
        for (i = 0; i < startCodes.length; i++) {
          const startCode = startCodes[i];
          const endCode = endCodes[i];
          
          if (startCode === 0xFFFF) {
            deltas.push(0);
            rangeOffsets.push(0);
            break;
          }
            
          const startGlyph = charMap[startCode].new;
          if ((startCode - startGlyph) >= 0x8000) {
            var asc, end;
            deltas.push(0);
            rangeOffsets.push(2 * ((glyphIDs.length + segCount) - i));
            
            for (code = startCode, end = endCode, asc = startCode <= end; asc ? code <= end : code >= end; asc ? code++ : code--) {
              glyphIDs.push(charMap[code].new);
            }
              
          } else {
            deltas.push(startGlyph - startCode);
            rangeOffsets.push(0);
          }
        }
                        
        subtable.writeUInt16(3);  // platformID
        subtable.writeUInt16(1);  // encodingID
        subtable.writeUInt32(12); // offset
        subtable.writeUInt16(4);  // format
        subtable.writeUInt16(16 + (segCount * 8) + (glyphIDs.length * 2)); // length
        subtable.writeUInt16(0);  // language
        subtable.writeUInt16(segCountX2);
        subtable.writeUInt16(searchRange);
        subtable.writeUInt16(entrySelector);
        subtable.writeUInt16(rangeShift);
        
        for (code of Array.from(endCodes)) { subtable.writeUInt16(code); }
        subtable.writeUInt16(0);  // reserved value
        for (code of Array.from(startCodes)) { subtable.writeUInt16(code); }
        
        for (delta of Array.from(deltas)) { subtable.writeUInt16(delta); }
        for (let offset of Array.from(rangeOffsets)) { subtable.writeUInt16(offset); }
        for (id of Array.from(glyphIDs)) { subtable.writeUInt16(id); }
        
        return result = { 
          charMap,
          subtable: subtable.data,
          maxGlyphID: nextID + 1
        };
    }
  }
}
    
module.exports = CmapTable;
