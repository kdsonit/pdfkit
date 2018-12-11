const fs = require('fs');

var AFMFont = (function() {
  let WIN_ANSI_MAP = undefined;
  let characters = undefined;
  AFMFont = class AFMFont {
    static initClass() {
      
      WIN_ANSI_MAP = {
        402:  131,
        8211: 150,
        8212: 151,
        8216: 145,
        8217: 146,
        8218: 130,
        8220: 147,
        8221: 148,
        8222: 132,
        8224: 134,
        8225: 135,
        8226: 149,
        8230: 133,
        8364: 128,
        8240: 137,
        8249: 139,
        8250: 155,
        710:  136,
        8482: 153,
        338:  140,
        339:  156,
        732:  152,
        352:  138,
        353:  154,
        376:  159,
        381:  142,
        382:  158
      };
                      
      characters = `\
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
.notdef       .notdef        .notdef        .notdef
  
space         exclam         quotedbl       numbersign
dollar        percent        ampersand      quotesingle
parenleft     parenright     asterisk       plus
comma         hyphen         period         slash
zero          one            two            three
four          five           six            seven
eight         nine           colon          semicolon
less          equal          greater        question
  
at            A              B              C
D             E              F              G
H             I              J              K
L             M              N              O
P             Q              R              S
T             U              V              W
X             Y              Z              bracketleft
backslash     bracketright   asciicircum    underscore
  
grave         a              b              c
d             e              f              g
h             i              j              k
l             m              n              o
p             q              r              s
t             u              v              w
x             y              z              braceleft
bar           braceright     asciitilde     .notdef
  
Euro          .notdef        quotesinglbase florin
quotedblbase  ellipsis       dagger         daggerdbl
circumflex    perthousand    Scaron         guilsinglleft
OE            .notdef        Zcaron         .notdef
.notdef       quoteleft      quoteright     quotedblleft
quotedblright bullet         endash         emdash
tilde         trademark      scaron         guilsinglright
oe            .notdef        zcaron         ydieresis
  
space         exclamdown     cent           sterling
currency      yen            brokenbar      section
dieresis      copyright      ordfeminine    guillemotleft
logicalnot    hyphen         registered     macron
degree        plusminus      twosuperior    threesuperior
acute         mu             paragraph      periodcentered
cedilla       onesuperior    ordmasculine   guillemotright
onequarter    onehalf        threequarters  questiondown
  
Agrave        Aacute         Acircumflex    Atilde
Adieresis     Aring          AE             Ccedilla
Egrave        Eacute         Ecircumflex    Edieresis
Igrave        Iacute         Icircumflex    Idieresis
Eth           Ntilde         Ograve         Oacute
Ocircumflex   Otilde         Odieresis      multiply
Oslash        Ugrave         Uacute         Ucircumflex
Udieresis     Yacute         Thorn          germandbls
  
agrave        aacute         acircumflex    atilde
adieresis     aring          ae             ccedilla
egrave        eacute         ecircumflex    edieresis
igrave        iacute         icircumflex    idieresis
eth           ntilde         ograve         oacute
ocircumflex   otilde         odieresis      divide
oslash        ugrave         uacute         ucircumflex
udieresis     yacute         thorn          ydieresis\
`.split(/\s+/);
    }
    static open(filename) {
      return new AFMFont(fs.readFileSync(filename, 'utf8'));
    }
  
    constructor(contents) {
      this.contents = contents;
      this.attributes = {};
      this.glyphWidths = {};
      this.boundingBoxes = {};
    
      this.parse();
      this.charWidths = (__range__(0, 255, true).map((i) => this.glyphWidths[characters[i]]));
    
      this.bbox = (Array.from(this.attributes['FontBBox'].split(/\s+/)).map((e) => +e));
      this.ascender = +(this.attributes['Ascender'] || 0);
      this.decender = +(this.attributes['Descender'] || 0);
      this.lineGap = (this.bbox[3] - this.bbox[1]) - (this.ascender - this.decender);
    }
  
    parse() {
      let section = '';
      for (let line of Array.from(this.contents.split('\n'))) {
        var match;
        var a;
        if (match = line.match(/^Start(\w+)/)) {
          section = match[1];
          continue;
        
        } else if (match = line.match(/^End(\w+)/)) {
          section = '';
          continue;
        }
        
        switch (section) {
          case 'FontMetrics':
            match = line.match(/(^\w+)\s+(.*)/);
            var key = match[1];
            var value = match[2];
          
            if (a = this.attributes[key]) {
              if (!Array.isArray(a)) { a = (this.attributes[key] = [a]); }
              a.push(value);
            } else {
              this.attributes[key] = value;
            }
            break;
          
          case 'CharMetrics':
            if (!/^CH?\s/.test(line)) { continue; }
            var name = line.match(/\bN\s+(\.?\w+)\s*;/)[1];
            this.glyphWidths[name] = +line.match(/\bWX\s+(\d+)\s*;/)[1];
            break;
        }
      }
          
    }

    encodeText(text) {
      let string = '';
      for (let i = 0, end = text.length, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        let char = text.charCodeAt(i);
        char = WIN_ANSI_MAP[char] || char;
        string += String.fromCharCode(char);
      }
    
      return string;
    }
          
    characterToGlyph(character) {
      return characters[WIN_ANSI_MAP[character] || character];
    }
          
    widthOfGlyph(glyph) {
      return this.glyphWidths[glyph];
    }
  };
  AFMFont.initClass();
  return AFMFont;
})();
    
module.exports = AFMFont;
function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}