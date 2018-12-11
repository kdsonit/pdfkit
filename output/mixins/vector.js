
const SVGPath = require('../path');

// This constant is used to approximate a symmetrical arc using a cubic
// Bezier curve.
const KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);
module.exports = {
  initVector() {
    this._ctm = [1, 0, 0, 1, 0, 0]; // current transformation matrix
    return this._ctmStack = [];
  },
    
  save() {
    this._ctmStack.push(this._ctm.slice());
    // TODO: save/restore colorspace and styles so not setting it unnessesarily all the time?
    return this.addContent('q');
  },
    
  restore() {
    this._ctm = this._ctmStack.pop() || [1, 0, 0, 1, 0, 0];
    return this.addContent('Q');
  },
    
  closePath() {
    return this.addContent('h');
  },
  
  lineWidth(w) {
    return this.addContent(`${w} w`);
  },
    
  _CAP_STYLES: { 
    BUTT: 0,
    ROUND: 1,
    SQUARE: 2
  },
    
  lineCap(c) {
    if (typeof c === 'string') { c = this._CAP_STYLES[c.toUpperCase()]; }
    return this.addContent(`${c} J`);
  },
    
  _JOIN_STYLES: {
    MITER: 0,
    ROUND: 1,
    BEVEL: 2
  },
    
  lineJoin(j) {
    if (typeof j === 'string') { j = this._JOIN_STYLES[j.toUpperCase()]; }
    return this.addContent(`${j} j`);
  },
    
  miterLimit(m) {
    return this.addContent(`${m} M`);
  },
    
  dash(length, options) {
    if (options == null) { options = {}; }
    if (length == null) { return this; }
    
    const space = options.space != null ? options.space : length;
    const phase = options.phase || 0;
    
    return this.addContent(`[${length} ${space}] ${phase} d`);
  },
    
  undash() {
    return this.addContent("[] 0 d");
  },
    
  moveTo(x, y) {
    return this.addContent(`${x} ${y} m`);
  },

  lineTo(x, y) {
    return this.addContent(`${x} ${y} l`);
  },
    
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    return this.addContent(`${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y} c`);
  },
    
  quadraticCurveTo(cpx, cpy, x, y) {
    return this.addContent(`${cpx} ${cpy} ${x} ${y} v`);
  },
    
  rect(x, y, w, h) {
    return this.addContent(`${x} ${y} ${w} ${h} re`);
  },
    
  roundedRect(x, y, w, h, r) {
    if (r == null) { r = 0; }
    this.moveTo(x + r, y);
    this.lineTo((x + w) - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, (y + h) - r);
    this.quadraticCurveTo(x + w, y + h, (x + w) - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, (y + h) - r);
    this.lineTo(x, y + r);
    return this.quadraticCurveTo(x, y, x + r, y);
  },
    
  ellipse(x, y, r1, r2) {
    // based on http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas/2173084#2173084
    if (r2 == null) { r2 = r1; }
    x -= r1;
    y -= r2;
    const ox = r1 * KAPPA;
    const oy = r2 * KAPPA;
    const xe = x + (r1 * 2);
    const ye = y + (r2 * 2);
    const xm = x + r1;
    const ym = y + r2;
    
    this.moveTo(x, ym);
    this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    return this.closePath();
  },
    
  circle(x, y, radius) {
    return this.ellipse(x, y, radius);
  },
    
  polygon(...points) {
    this.moveTo(...Array.from(points.shift() || []));
    for (let point of Array.from(points)) { this.lineTo(...Array.from(point || [])); }
    return this.closePath();
  },
    
  path(path) {
    SVGPath.apply(this, path);
    return this;
  },
    
  _windingRule(rule) {
    if (/even-?odd/.test(rule)) {
      return '*';
    }
    
    return '';
  },
    
  fill(color, rule) {
    if (/(even-?odd)|(non-?zero)/.test(color)) {
      rule = color;
      color = null;
    }
    
    if (color) { this.fillColor(color); }
    return this.addContent(`f${this._windingRule(rule)}`);
  },

  stroke(color) {
    if (color) { this.strokeColor(color); }
    return this.addContent('S');
  },

  fillAndStroke(fillColor, strokeColor, rule) {
    if (strokeColor == null) { strokeColor = fillColor; }
    const isFillRule = /(even-?odd)|(non-?zero)/;
    if (isFillRule.test(fillColor)) {
      rule = fillColor;
      fillColor = null;
    }
      
    if (isFillRule.test(strokeColor)) {
      rule = strokeColor;
      strokeColor = fillColor;
    }
    
    if (fillColor) {
      this.fillColor(fillColor);
      this.strokeColor(strokeColor);
    }
      
    return this.addContent(`B${this._windingRule(rule)}`);
  },

  clip(rule) {
    return this.addContent(`W${this._windingRule(rule)} n`);
  },
    
  transform(m11, m12, m21, m22, dx, dy) {
    // keep track of the current transformation matrix
    const m = this._ctm;
    const [m0, m1, m2, m3, m4, m5] = Array.from(m);
    m[0] = (m0 * m11) + (m2 * m12);
    m[1] = (m1 * m11) + (m3 * m12);
    m[2] = (m0 * m21) + (m2 * m22);
    m[3] = (m1 * m21) + (m3 * m22);
    m[4] = (m0 * dx) + (m2 * dy) + m4;
    m[5] = (m1 * dx) + (m3 * dy) + m5;
    
    const values = ([m11, m12, m21, m22, dx, dy].map((v) => +v.toFixed(5))).join(' ');
    return this.addContent(`${values} cm`);
  },
    
  translate(x, y) {
    return this.transform(1, 0, 0, 1, x, y);
  },
    
  rotate(angle, options) {
    let y;
    if (options == null) { options = {}; }
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let x = (y = 0);

    if (options.origin != null) {
      [x, y] = Array.from(options.origin);
      const x1 = (x * cos) - (y * sin);
      const y1 = (x * sin) + (y * cos);
      x -= x1;
      y -= y1;
    }

    return this.transform(cos, sin, -sin, cos, x, y);
  },
    
  scale(xFactor, yFactor, options) {
    let y;
    if (yFactor == null) { yFactor = xFactor; }
    if (options == null) { options = {}; }
    if (arguments.length === 2) {
      yFactor = xFactor;
      options = yFactor;
    }
      
    let x = (y = 0);
    if (options.origin != null) {
      [x, y] = Array.from(options.origin);
      x -= xFactor * x;
      y -= yFactor * y;
    }
    
    return this.transform(xFactor, 0, 0, yFactor, x, y);
  }
};
