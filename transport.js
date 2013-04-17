var emptyBuf = new Buffer(0);

var InputBufferUnderrunError = function() {
};

var TTransport = Thrift.TTransport = function(buffer, callback) {
  this.buf = buffer || emptyBuf;
  this.onFlush = callback;
  this.reset();
};

TTransport.receiver = function(callback) {
  return function(data) {
    callback(new TTransport(data));
  };
};

TTransport.prototype = {
  commitPosition: function(){},
  rollbackPosition: function(){},

  reset: function() {
    this.pos = 0;
  },

  // TODO: Implement open/close support
  isOpen: function() {return true;},
  open: function() {},
  close: function() {},

  read: function(len) { // this function will be used for each frames.
    var end = this.pos + len;

    if (this.buf.length < end) {
      throw new Error('read(' + len + ') failed - not enough data');
    }

    var buf = this.buf.slice(this.pos, end);
    this.pos = end;
    return buf;
  },

  readByte: function() {
    return this.buf.getInt8(this.pos++);
  },

  readI16: function() {
    var i16 = this.buf.getInt16(this.pos);
    this.pos += 2;
    return i16;
  },

  readI32: function() {
    var i32 = this.buf.getInt32(this.pos);
    this.pos += 4;
    return i32;
  },

  readDouble: function() {
    var d = this.buf.getFloat64(this.pos);
    this.pos += 8;
    return d;
  },

  readString: function(len) {
    var str = this.buf.getUtf8String(this.pos, len);
    this.pos += len;
    return str;
  },

  readAll: function() {
    return this.buf;
  },
  
  writeByte: function(v) {
    this.buf.setInt8(this.pos++, v);
  },

  writeI16: function(v) {
    this.buf.setInt16(this.pos, v);
    this.pos += 2;
  },

  writeI32: function(v) {
    this.buf.setInt32(this.pos, v);
    this.pos += 4;
  },

  writeI64: function(v) {
    this.buf.setInt64(this.pos, v);
    this.pos += 8;
  },

  writeDouble: function(v) {
    this.buf.setFloat64(this.pos, v);
    this.pos += 8;
  },

  write: function(buf) {
    if (typeof(buf) === 'string') {
      this.pos += this.setUtf8String(this.pos, buf);
    } else {
      this.setBuffer(this.pos, buf);
      this.pos += buf.length;
    }
  },

  writeWithLength: function(buf) {
    var len;
    if (typeof(buf) === 'string') {
      len = this.buf.setUtf8String(this.pos + 4, buf);
    } else {
      this.setBuffer(this.pos + 4, buf);
      len = buf.length;
    }
    this.buf.setInt32(this.pos, len);
    this.pos += len + 4;
  },

  flush: function(flushCallback) {
    flushCallback = flushCallback || this.onFlush;
    if(flushCallback) {
      var out = this.buf.slice(0, this.pos);
      flushCallback(out);
    }
  }
};

var TFramedTransport = Thrift.TFramedTransport = function(buffer, callback) {
  TTransport.call(this, buffer, callback);
};

TFramedTransport.receiver = function(callback) {
  var frameLeft = 0,
      framePos = 0,
      frame = null;
  var residual = null;

  return function(data) {
    // Prepend any residual data from our previous read
    if (residual) {
      var dat = new Buffer(data.length + residual.length);
      residual.copy(dat, 0, 0);
      data.copy(dat, residual.length, 0);
      residual = null;
    }

    // framed transport
    while (data.length) {
      if (frameLeft === 0) {
        // TODO assumes we have all 4 bytes
        if (data.length < 4) {
          console.log("Expecting > 4 bytes, found only " + data.length);
          residual = data;
          break;
          //throw Error("Expecting > 4 bytes, found only " + data.length);
        }
        frameLeft = binary.readI32(data, 0);
        frame = new Buffer(frameLeft);
        framePos = 0;
        data = data.slice(4, data.length);
      }

      if (data.length >= frameLeft) {
        data.copy(frame, framePos, 0, frameLeft);
        data = data.slice(frameLeft, data.length);

        frameLeft = 0;
        callback(new TFramedTransport(frame));
      } else if (data.length) {
        data.copy(frame, framePos, 0, data.length);
        frameLeft -= data.length;
        framePos += data.length;
        data = data.slice(data.length, data.length);
      }
    }
  };
};

inherits(TFramedTransport, TTransport, {
  flush: function() {
    var that = this;
    // TODO: optimize this better, allocate one buffer instead of both:
    var framedBuffer = function(out) {
      if(that.onFlush) {
        var msg = new Buffer(out.length + 4);
        binary.writeI32(msg, out.length);
        out.copy(msg, 4, 0, out.length);
        that.onFlush(msg);
      }
    };
    TTransport.prototype.flush.call(this, framedBuffer);
  }
});
