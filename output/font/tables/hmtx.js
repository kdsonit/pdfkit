const Table = require('../table');
const Data = require('../../data');

class HmtxTable extends Table {
  static initClass() {
    this.prototype.tag = 'hmtx';
  }
  parse(data) {
    let asc, end;
    let i;
    data.pos = this.offset;
    
    this.metrics = [];
    for (i = 0, end = this.file.hhea.numberOfMetrics, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      this.metrics.push({
        advance: data.readUInt16(),
        lsb: data.readInt16()
      });
    }
        
    const lsbCount = this.file.maxp.numGlyphs - this.file.hhea.numberOfMetrics;
    this.leftSideBearings = ((() => {
      let asc1, end1;
      const result = [];
      for (i = 0, end1 = lsbCount, asc1 = 0 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
        result.push(data.readInt16());
      }
      return result;
    })());
    
    this.widths = (Array.from(this.metrics).map((m) => m.advance));
    const last = this.widths[this.widths.length - 1];
    return (() => {
      let asc2, end2;
      const result1 = [];
      for (i = 0, end2 = lsbCount, asc2 = 0 <= end2; asc2 ? i < end2 : i > end2; asc2 ? i++ : i--) {
        result1.push(this.widths.push(last));
      }
      return result1;
    })();
  }
    
  forGlyph(id) {
    let metrics;
    if (id in this.metrics) { return this.metrics[id]; }
    return metrics = { 
      advance: this.metrics[this.metrics.length - 1].advance,
      lsb: this.leftSideBearings[id - this.metrics.length]
    };
  }
    
  encode(mapping) {
    const table = new Data;
    for (let id of Array.from(mapping)) {
      const metric = this.forGlyph(id);
      table.writeUInt16(metric.advance);
      table.writeUInt16(metric.lsb);
    }
      
    return table.data;
  }
}
HmtxTable.initClass();
    
       
module.exports = HmtxTable;