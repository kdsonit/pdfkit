/*
PDFEscape - escape PDF "Name objects" or "Strings"
*/

class PDFEscape {
  //
  // Escape Strings as required by the spec
  // Strings are the ones wrapped in parenthesis, e.g. (Foo)
  //
  static escapeString(s) {
    const escapableRe = /[\n\r\t\b\f\(\)\\]/g;
    const escapable = {
      '\n': '\\n',
      '\r': '\\r',
      '\t': '\\t',
      '\b': '\\b',
      '\f': '\\f',
      '\\': '\\\\',
      '(': '\\(',
      ')': '\\)'
    };

    return s.replace(escapableRe, c => escapable[c]);
  }

  //
  // Escape Name Objects as described in 3.2.4 “Name Objects' of PDF1.7 reference
  // Name Objects are the ones starting with a slash, e.g. /Foo
  //
  // Note: This initial version only deals with known cases.
  //   e.g. mime-types: "text/xml" => "text#2Fxml"
  //
  // TODO: implement this for all escapable characters described in the spec:
  // "it is recommended but not required for characters whose codes are outside the range 33 to 126."
  //
  static escapeName(s){
    const escapableRe = /\//g;
    const escapable =
      {'/': '#2F'};

    return s.replace(escapableRe, c => escapable[c]);
  }
}

module.exports = PDFEscape;
