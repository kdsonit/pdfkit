
const LineWrapper = require('../line_wrapper');

module.exports = { 
  initText() {
    // Current coordinates
    this.x = 0;
    this.y = 0;
    return this._lineGap = 0;
  },
    
  lineGap(_lineGap) {
    this._lineGap = _lineGap;
    return this;
  },
    
  moveDown(lines) {
    if (lines == null) { lines = 1; }
    this.y += (this.currentLineHeight(true) * lines) + this._lineGap;
    return this;
  },

  moveUp(lines) {
    if (lines == null) { lines = 1; }
    this.y -= (this.currentLineHeight(true) * lines) + this._lineGap;
    return this;
  },
    
  _text(text, x, y, options, lineCallback) {
    options = this._initOptions(x, y, options);
    
    // Convert text to a string
    text = `${text}`;
          
    // if the wordSpacing option is specified, remove multiple consecutive spaces
    if (options.wordSpacing) {
      text = text.replace(/\s{2,}/g, ' ');
    }

    // word wrapping
    if (options.width) {
      let wrapper = this._wrapper;
      if (!wrapper) {
        wrapper = new LineWrapper(this, options);
        wrapper.on('line', lineCallback);
      }
        
      this._wrapper = options.continued ? wrapper : null;
      this._textOptions = options.continued ? options : null;
      wrapper.wrap(text, options);
      
    // render paragraphs as single lines
    } else {
      for (let line of Array.from(text.split('\n'))) { lineCallback(line, options); }
    }
    
    return this;
  },
    
  text(text, x, y, options) {
    return this._text(text, x, y, options, this._line.bind(this));
  },
    
  widthOfString(string, options) {
    if (options == null) { options = {}; }
    return this._font.widthOfString(string, this._fontSize) + ((options.characterSpacing || 0) * (string.length - 1));
  },
    
  heightOfString(text, options) {
    if (options == null) { options = {}; }
    const {x,y} = this;
    
    options = this._initOptions(options);
    options.height = Infinity; // don't break pages
    
    const lineGap = options.lineGap || this._lineGap || 0;
    this._text(text, this.x, this.y, options, (line, options) => {
      return this.y += this.currentLineHeight(true) + lineGap;
    });
      
    const height = this.y - y;
    this.x = x;
    this.y = y;
    
    return height;
  },      
    
  list(list, x, y, options, wrapper) {
    options = this._initOptions(x, y, options);
    
    const r = Math.round(((this._font.ascender / 1000) * this._fontSize) / 3);
    const indent = options.textIndent || (r * 5);
    const itemIndent = options.bulletIndent || (r * 8);
    
    let level = 1;
    const items = [];
    const levels = [];
    
    var flatten = list =>
      (() => {
        const result = [];
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (Array.isArray(item)) {
            level++;
            flatten(item);
            result.push(level--);
          } else {
            items.push(item);
            result.push(levels.push(level));
          }
        }
        return result;
      })()
    ;
          
    flatten(list);
        
    wrapper = new LineWrapper(this, options);
    wrapper.on('line', this._line.bind(this));
    
    level = 1;
    let i = 0;
    wrapper.on('firstLine', () => {
      let l;
      if ((l = levels[i++]) !== level) {
        const diff = itemIndent * (l - level);
        this.x += diff;
        wrapper.lineWidth -= diff;
        level = l;
      }
        
      this.circle((this.x - indent) + r, this.y + r + (r / 2), r);
      return this.fill();
    });
        
    wrapper.on('sectionStart', () => {
      const pos = indent + (itemIndent * (level - 1));
      this.x += pos;
      return wrapper.lineWidth -= pos;
    });
      
    wrapper.on('sectionEnd', () => {
      const pos = indent + (itemIndent * (level - 1));
      this.x -= pos;
      return wrapper.lineWidth += pos;
    });
          
    wrapper.wrap(items.join('\n'), options);
    
    return this;
  },
    
  _initOptions(x, y, options) {
    if (x == null) { x = {}; }
    if (options == null) { options = {}; }
    if (typeof x === 'object') {
      options = x;
      x = null;
    }

    // clone options object
    options = (function() {
      const opts = {};
      for (let k in options) { const v = options[k]; opts[k] = v; }
      return opts;
    })();
      
    // extend options with previous values for continued text
    if (this._textOptions) {
      for (let key in this._textOptions) {
        const val = this._textOptions[key];
        if (key !== 'continued') {
          if (options[key] == null) { options[key] = val; }
        }
      }
    }

    // Update the current position
    if (x != null) {
      this.x = x;
    }
    if (y != null) {
      this.y = y;
    }

    // wrap to margins if no x or y position passed
    if (options.lineBreak !== false) {
      const { margins } = this.page;
      if (options.width == null) { options.width = this.page.width - this.x - margins.right; }
    }

    if (!options.columns) { options.columns = 0; }
    if (options.columnGap == null) { options.columnGap = 18; } // 1/4 inch

    return options;
  },
      
  _line(text, options, wrapper) {
    if (options == null) { options = {}; }
    this._fragment(text, this.x, this.y, options);
    const lineGap = options.lineGap || this._lineGap || 0;
    
    if (!wrapper) {
      return this.x += this.widthOfString(text);
    } else {
      return this.y += this.currentLineHeight(true) + lineGap;
    }
  },

  _fragment(text, x, y, options) {
    let encoded, textWidth, words;
    let i;
    text = `${text}`;
    if (text.length === 0) { return; }

    // handle options
    const align = options.align || 'left';
    let wordSpacing = options.wordSpacing || 0;
    const characterSpacing = options.characterSpacing || 0;

    // text alignments
    if (options.width) {
      switch (align) {
        case 'right':
          textWidth = this.widthOfString(text.replace(/\s+$/, ''), options);
          x += options.lineWidth - textWidth;
          break;

        case 'center':
          x += (options.lineWidth / 2) - (options.textWidth / 2);
          break;

        case 'justify':
          // calculate the word spacing value
          words = text.trim().split(/\s+/);
          textWidth = this.widthOfString(text.replace(/\s+/g, ''), options);
          var spaceWidth = this.widthOfString(' ') + characterSpacing;
          wordSpacing = Math.max(0, ((options.lineWidth - textWidth) / Math.max(1, words.length - 1)) - spaceWidth);
          break;
      }
    }
          
    // calculate the actual rendered width of the string after word and character spacing
    const renderedWidth = options.textWidth + (wordSpacing * (options.wordCount - 1)) + (characterSpacing * (text.length - 1));
          
    // create link annotations if the link option is given
    if (options.link) {
      this.link(x, y, renderedWidth, this.currentLineHeight(), options.link);
    }
      
    // create underline or strikethrough line
    if (options.underline || options.strike) {
      this.save();
      if (!options.stroke) { this.strokeColor(...Array.from(this._fillColor || [])); }
      
      const lineWidth = this._fontSize < 10 ? 0.5 : Math.floor(this._fontSize / 10);
      this.lineWidth(lineWidth);
      
      const d = options.underline ? 1 : 2;
      let lineY = y + (this.currentLineHeight() / d);
      if (options.underline) { lineY -= lineWidth; }
      
      this.moveTo(x, lineY);
      this.lineTo(x + renderedWidth, lineY);
      this.stroke();
      this.restore();
    }

    // flip coordinate system
    this.save();
    this.transform(1, 0, 0, -1, 0, this.page.height);
    y = this.page.height - y - ((this._font.ascender / 1000) * this._fontSize);

    // add current font to page if necessary
    if (this.page.fonts[this._font.id] == null) { this.page.fonts[this._font.id] = this._font.ref(); }

    // tell the font subset to use the characters
    this._font.use(text);

    // begin the text object
    this.addContent("BT");

    // text position
    this.addContent(`${x} ${y} Td`);

    // font and font size
    this.addContent(`/${this._font.id} ${this._fontSize} Tf`);

    // rendering mode
    const mode = options.fill && options.stroke ? 2 : options.stroke ? 1 : 0;
    if (mode) { this.addContent(`${mode} Tr`); }

    // Character spacing
    if (characterSpacing) { this.addContent(`${characterSpacing} Tc`); }
    
    // Add the actual text
    // If we have a word spacing value, we need to encode each word separately
    // since the normal Tw operator only works on character code 32, which isn't
    // used for embedded fonts.
    if (wordSpacing) {
      words = text.trim().split(/\s+/);
      wordSpacing += this.widthOfString(' ') + characterSpacing;
      wordSpacing *= 1000 / this._fontSize;
      
      const commands = [];
      for (let word of Array.from(words)) {
        // encode the text based on the font subset,
        // and then convert it to hex
        encoded = this._font.encode(word);
        encoded = ((() => {
          let end;
          const result = [];
          for (i = 0, end = encoded.length; i < end; i++) {
            result.push(encoded.charCodeAt(i).toString(16));
          }
          return result;
        })()).join('');
        commands.push(`<${encoded}> ${-wordSpacing}`);
      }
      
      this.addContent(`[${commands.join(' ')}] TJ`);
    } else {
      // encode the text based on the font subset,
      // and then convert it to hex
      encoded = this._font.encode(text);
      encoded = ((() => {
        let end1;
        const result1 = [];
        for (i = 0, end1 = encoded.length; i < end1; i++) {
          result1.push(encoded.charCodeAt(i).toString(16));
        }
        return result1;
      })()).join('');
      this.addContent(`<${encoded}> Tj`);
    }

    // end the text object
    this.addContent("ET");
    
    // restore flipped coordinate system
    return this.restore();
  }
};
