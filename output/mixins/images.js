
const PDFImage = require('../image');

module.exports = {
  initImages() {
    this._imageRegistry = {};
    return this._imageCount = 0;
  },
    
  image(src, x, y, options) {
    let image, left, left1;
    if (options == null) { options = {}; }
    if (typeof x === 'object') {
      options = x;
      x = null;
    }
    
    x = (left = x != null ? x : options.x) != null ? left : this.x;
    y = (left1 = y != null ? y : options.y) != null ? left1 : this.y;
    
    if (!Buffer.isBuffer(src)) {
      image = this._imageRegistry[src];
    }
      
    if (!image) {
      image = PDFImage.open(src, `I${++this._imageCount}`);
      image.embed(this);
      if (!Buffer.isBuffer(src)) {
        this._imageRegistry[src] = image;
      }
    }
        
    if (this.page.xobjects[image.label] == null) { this.page.xobjects[image.label] = image.obj; }

    let w = options.width || image.width;
    let h = options.height || image.height;
    
    if (options.width && !options.height) {
      const wp = w / image.width;
      w = image.width * wp;
      h = image.height * wp;

    } else if (options.height && !options.width) {
      const hp = h / image.height;
      w = image.width * hp;
      h = image.height * hp;

    } else if (options.scale) {
      w = image.width * options.scale;
      h = image.height * options.scale;

    } else if (options.fit) {
      const [bw, bh] = Array.from(options.fit);
      const bp = bw / bh;
      const ip = image.width / image.height;
      if (ip > bp) {
        w = bw;
        h = bw / ip;
      } else {
        h = bh;
        w = bh * ip;
      }
      
      if (options.align === 'center') {
        x = (x + (bw / 2)) - (w / 2);
        
      } else if (options.align === 'right') {
        x = (x + bw) - w;
      }
        
      if (options.valign === 'center') {
        y = (y + (bh / 2)) - (h / 2);
        
      } else if (options.valign === 'bottom') {
        y = (y + bh) - h;
      }
    }
    
    // Set the current y position to below the image if it is in the document flow      
    if (this.y === y) { this.y += h; }

    this.save();
    this.transform(w, 0, 0, -h, x, y + h);
    this.addContent(`/${image.label} Do`);
    this.restore();
      
    return this;
  }
};
