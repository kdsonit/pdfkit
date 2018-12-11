/*
PDFEmbeddedFiles - handles embedded files representation in the PDF document
*/

const utf8 = require('utf8');

class PDFEmbeddedFiles {
  constructor(document, embeddedFiles) {
    this.document = document;
    this.embeddedFiles = embeddedFiles;
    for (let key in this.embeddedFiles) {
      const embeddedFile = this.embeddedFiles[key];
      const streamRef = this.streamRef(embeddedFile);
      this.embeddedFiles[key]._fileRef = this.fileRef(embeddedFile, streamRef);
    }
  }

  streamRef(embeddedFile) {
    const ref = this.document.ref({
      Type: 'EmbeddedFile',
      Subtype: embeddedFile.mime,
      Params: { ModDate: embeddedFile.updatedAt }});
    ref.write(utf8.encode(embeddedFile.content));
    return ref;
  }

  fileRef(embeddedFile, streamRef) {
    return this.document.ref({
      F: new String(embeddedFile.name),
      UF: new String(utf8.encode(embeddedFile.name)),
      Desc: new String(embeddedFile.description),
      Type: 'Filespec',
      AFRelationship: embeddedFile.AFRelationship != null ? embeddedFile.AFRelationship : '',
      EF: {
        F: streamRef,
        UF: streamRef
      }
    });
  }

  names() {
    return {
      Names: this.embeddedFiles.map(embeddedFile => embeddedFile._fileRef.namedReference(embeddedFile.name))
    };
  }

  associatedFiles() {
    return this.document.ref(this.embeddedFiles.map(embeddedFile => embeddedFile._fileRef)
    );
  }

  end() {
    return (() => {
      const result = [];
      for (let embeddedFile of Array.from(this.embeddedFiles)) {
        embeddedFile._fileRef.data.EF.F.end();
        result.push(embeddedFile._fileRef.end());
      }
      return result;
    })();
  }
}


module.exports = PDFEmbeddedFiles;
