var Utf8 = {
  encode: function(string, view, off) {
    var pos = off;
    for(var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        view.setInt8(pos++, c);
      } else if((c > 127) && (c < 2048)) {
        view.setInt8(pos++, (c >> 6) | 192);
        view.setInt8(pos++, (c & 63) | 128);
      } else {
        view.setInt8(pos++, (c >> 12) | 224);
        view.setInt8(pos++, ((c >> 6) & 63) | 128);
        view.setInt8(pos++, (c & 63) | 128);
      }
    }
    return (pos - off);
  },
  decode : function(view, off, length) {
    var string = "";
    var i = off;
    length += off;
    var c = c1 = c2 = 0;
    while ( i < length ) {
      c = view.getInt8(i++);
      if (c < 128) {
        string += String.fromCharCode(c);
      } else if((c > 191) && (c < 224)) {
        c2 = view.getInt8(i++);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else {
        c2 = view.getInt8(i++);
        c3 = view.getInt8(i++);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
    }
    return string;
  }
}

/* constructor simply creates a buffer of a specified length */
var Buffer = function(length) {
  this.offset = 0;
  this.length = length;
  if(length) {
    var buf = this.buf = new ArrayBuffer(length);
    this.view = new DataView(buf);
  }
};

Buffer.prototype = {
  getArray: function() {
    if(!this.array)
      this.array = new Uint8Array(this.buf, this.offset, this.length);
    return this.array;
  },
  slice: function(start, end) {
    start = start || 0;
    end = end || this.length;
    var result = new Buffer();
    var length = result.length = end - start;
    var offset = result.offset = this.offset + start;
    var buf = result.buf = this.buf;
    result.view = new DataView(buf, offset, length);
    return result;
  },
  getInt8: function(off) {
    return this.view.getInt8(off);
  },
  getInt16: function(off) {
    return this.view.getInt16(off, false);
  },
  getInt32: function(off) {
    return this.view.getInt32(off, false);
  },
  getInt64: function(off) {
    var hi = this.view.getInt32(off, false);
    var lo = this.view.getUint32(off + 4, false);
    return new Int64(hi, lo);
  },
  getFloat64: function(off) {
    return this.view.getFloat64(off, false);
  },
  getUtf8String: function(off, utflen) {
    return Utf8.decode(this.view, off, utflen);
  },
  setInt8: function(off, v) {
    this.view.setInt8(off, v);
  },
  setInt16: function(off, v) {
    this.view.setInt16(off, v, false);
  },
  setInt32: function(off, v) {
    this.view.setInt32(off, v, false);
  },
  setInt64: function(off, v) {
    this.getArray().set(v.buffer, off);
  },
  setFloat64: function(off, v) {
    this.view.setFloat64(off, v, false);
  },
  setBuffer: function(off, v) {
    this.getArray().set(v.getArray(), off);
  },
  setUtf8String: function(off, v) {
    return Utf8.encode(v, this.view, off);
  },
  inspect: function() {
    var result = 'length: ' + this.length + '\n';
    var idx = 0;
    while(idx < this.length) {
      for(var i = 0; (idx < this.length) && (i < 32); i++)
        result += this.view.getInt8(idx++).toString(16) + ' ';
      result += '\n';
    }
    return result;
  }
};

var CheckedBuffer = Thrift.CheckedBuffer = function(length) {
  Buffer.call(this, length);
};
inherits(CheckedBuffer, Buffer, {
  grow: function(extra) {
    extra = extra || 0;
    var len = this.length + Math.max(extra, this.length*0.41);
    var src = getArray();
    this.buf = new ArrayBuffer(len);
    this.view = new DataView(this.buf);
    this.getArray().set(src);
    this.offset = 0;
    this.length = len;
  },
  checkAvailable: function(off, extra) {
    if(off + extra >= this.length)
      this.grow(extra);
  },
  setInt8: function(off, v) {
    this.checkAvailable(1);
    this.view.setInt8(off, v);
  },
  setInt16: function(off, v) {
    this.checkAvailable(2);
    this.view.setInt16(off, v, false);
  },
  setInt32: function(off, v) {
    this.checkAvailable(4);
    this.view.setInt32(off, v, false);
  },
  setInt64: function(off, v) {
    this.checkAvailable(8);
    this.getArray().set(v.buffer, off);
  },
  setFloat64: function(off, v) {
    this.checkAvailable(8);
    this.view.setFloat64(off, v, false);
  },
  setBuffer: function(off, v) {
    this.checkAvailable(v.length);
    this.getArray().set(v.getArray(), off);
  },
  setUtf8String: function(off, v) {
    while(true) {
      try {
        return Utf8.encode(v, this.view, off);
      } catch(e) {
        this.grow();
      }
    }
  }
});
