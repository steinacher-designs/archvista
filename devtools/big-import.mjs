var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/flatbuffers/js/constants.js
var require_constants = __commonJS({
  "node_modules/flatbuffers/js/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SIZE_PREFIX_LENGTH = exports.FILE_IDENTIFIER_LENGTH = exports.SIZEOF_INT = exports.SIZEOF_SHORT = void 0;
    exports.SIZEOF_SHORT = 2;
    exports.SIZEOF_INT = 4;
    exports.FILE_IDENTIFIER_LENGTH = 4;
    exports.SIZE_PREFIX_LENGTH = 4;
  }
});

// node_modules/flatbuffers/js/utils.js
var require_utils = __commonJS({
  "node_modules/flatbuffers/js/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isLittleEndian = exports.float64 = exports.float32 = exports.int32 = void 0;
    exports.int32 = new Int32Array(2);
    exports.float32 = new Float32Array(exports.int32.buffer);
    exports.float64 = new Float64Array(exports.int32.buffer);
    exports.isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;
  }
});

// node_modules/flatbuffers/js/encoding.js
var require_encoding = __commonJS({
  "node_modules/flatbuffers/js/encoding.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Encoding = void 0;
    var Encoding;
    (function(Encoding2) {
      Encoding2[Encoding2["UTF8_BYTES"] = 1] = "UTF8_BYTES";
      Encoding2[Encoding2["UTF16_STRING"] = 2] = "UTF16_STRING";
    })(Encoding || (exports.Encoding = Encoding = {}));
  }
});

// node_modules/flatbuffers/js/byte-buffer.js
var require_byte_buffer = __commonJS({
  "node_modules/flatbuffers/js/byte-buffer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ByteBuffer = void 0;
    var constants_js_1 = require_constants();
    var encoding_js_1 = require_encoding();
    var utils_js_1 = require_utils();
    var ByteBuffer2 = class _ByteBuffer {
      /**
       * Create a new ByteBuffer with a given array of bytes (`Uint8Array`)
       */
      constructor(bytes_) {
        this.bytes_ = bytes_;
        this.position_ = 0;
        this.text_decoder_ = new TextDecoder();
      }
      /**
       * Create and allocate a new ByteBuffer with a given size.
       */
      static allocate(byte_size) {
        return new _ByteBuffer(new Uint8Array(byte_size));
      }
      clear() {
        this.position_ = 0;
      }
      /**
       * Get the underlying `Uint8Array`.
       */
      bytes() {
        return this.bytes_;
      }
      /**
       * Get the buffer's position.
       */
      position() {
        return this.position_;
      }
      /**
       * Set the buffer's position.
       */
      setPosition(position) {
        this.position_ = position;
      }
      /**
       * Get the buffer's capacity.
       */
      capacity() {
        return this.bytes_.length;
      }
      readInt8(offset) {
        return this.readUint8(offset) << 24 >> 24;
      }
      readUint8(offset) {
        return this.bytes_[offset];
      }
      readInt16(offset) {
        return this.readUint16(offset) << 16 >> 16;
      }
      readUint16(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8;
      }
      readInt32(offset) {
        return this.bytes_[offset] | this.bytes_[offset + 1] << 8 | this.bytes_[offset + 2] << 16 | this.bytes_[offset + 3] << 24;
      }
      readUint32(offset) {
        return this.readInt32(offset) >>> 0;
      }
      readInt64(offset) {
        return BigInt.asIntN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
      }
      readUint64(offset) {
        return BigInt.asUintN(64, BigInt(this.readUint32(offset)) + (BigInt(this.readUint32(offset + 4)) << BigInt(32)));
      }
      readFloat32(offset) {
        utils_js_1.int32[0] = this.readInt32(offset);
        return utils_js_1.float32[0];
      }
      readFloat64(offset) {
        utils_js_1.int32[utils_js_1.isLittleEndian ? 0 : 1] = this.readInt32(offset);
        utils_js_1.int32[utils_js_1.isLittleEndian ? 1 : 0] = this.readInt32(offset + 4);
        return utils_js_1.float64[0];
      }
      writeInt8(offset, value) {
        this.bytes_[offset] = value;
      }
      writeUint8(offset, value) {
        this.bytes_[offset] = value;
      }
      writeInt16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
      }
      writeUint16(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
      }
      writeInt32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
      }
      writeUint32(offset, value) {
        this.bytes_[offset] = value;
        this.bytes_[offset + 1] = value >> 8;
        this.bytes_[offset + 2] = value >> 16;
        this.bytes_[offset + 3] = value >> 24;
      }
      writeInt64(offset, value) {
        this.writeInt32(offset, Number(BigInt.asIntN(32, value)));
        this.writeInt32(offset + 4, Number(BigInt.asIntN(32, value >> BigInt(32))));
      }
      writeUint64(offset, value) {
        this.writeUint32(offset, Number(BigInt.asUintN(32, value)));
        this.writeUint32(offset + 4, Number(BigInt.asUintN(32, value >> BigInt(32))));
      }
      writeFloat32(offset, value) {
        utils_js_1.float32[0] = value;
        this.writeInt32(offset, utils_js_1.int32[0]);
      }
      writeFloat64(offset, value) {
        utils_js_1.float64[0] = value;
        this.writeInt32(offset, utils_js_1.int32[utils_js_1.isLittleEndian ? 0 : 1]);
        this.writeInt32(offset + 4, utils_js_1.int32[utils_js_1.isLittleEndian ? 1 : 0]);
      }
      /**
       * Return the file identifier.   Behavior is undefined for FlatBuffers whose
       * schema does not include a file_identifier (likely points at padding or the
       * start of a the root vtable).
       */
      getBufferIdentifier() {
        if (this.bytes_.length < this.position_ + constants_js_1.SIZEOF_INT + constants_js_1.FILE_IDENTIFIER_LENGTH) {
          throw new Error("FlatBuffers: ByteBuffer is too short to contain an identifier.");
        }
        let result = "";
        for (let i2 = 0; i2 < constants_js_1.FILE_IDENTIFIER_LENGTH; i2++) {
          result += String.fromCharCode(this.readInt8(this.position_ + constants_js_1.SIZEOF_INT + i2));
        }
        return result;
      }
      /**
       * Look up a field in the vtable, return an offset into the object, or 0 if the
       * field is not present.
       */
      __offset(bb_pos, vtable_offset) {
        const vtable = bb_pos - this.readInt32(bb_pos);
        return vtable_offset < this.readInt16(vtable) ? this.readInt16(vtable + vtable_offset) : 0;
      }
      /**
       * Initialize any Table-derived type to point to the union at the given offset.
       */
      __union(t, offset) {
        t.bb_pos = offset + this.readInt32(offset);
        t.bb = this;
        return t;
      }
      /**
       * Create a JavaScript string from UTF-8 data stored inside the FlatBuffer.
       * This allocates a new string and converts to wide chars upon each access.
       *
       * To avoid the conversion to string, pass Encoding.UTF8_BYTES as the
       * "optionalEncoding" argument. This is useful for avoiding conversion when
       * the data will just be packaged back up in another FlatBuffer later on.
       *
       * @param offset
       * @param opt_encoding Defaults to UTF16_STRING
       */
      __string(offset, opt_encoding) {
        offset += this.readInt32(offset);
        const length = this.readInt32(offset);
        offset += constants_js_1.SIZEOF_INT;
        const utf8bytes = this.bytes_.subarray(offset, offset + length);
        if (opt_encoding === encoding_js_1.Encoding.UTF8_BYTES)
          return utf8bytes;
        else
          return this.text_decoder_.decode(utf8bytes);
      }
      /**
       * Handle unions that can contain string as its member, if a Table-derived type then initialize it,
       * if a string then return a new one
       *
       * WARNING: strings are immutable in JS so we can't change the string that the user gave us, this
       * makes the behaviour of __union_with_string different compared to __union
       */
      __union_with_string(o, offset) {
        if (typeof o === "string") {
          return this.__string(offset);
        }
        return this.__union(o, offset);
      }
      /**
       * Retrieve the relative offset stored at "offset"
       */
      __indirect(offset) {
        return offset + this.readInt32(offset);
      }
      /**
       * Get the start of data of a vector whose offset is stored at "offset" in this object.
       */
      __vector(offset) {
        return offset + this.readInt32(offset) + constants_js_1.SIZEOF_INT;
      }
      /**
       * Get the length of a vector whose offset is stored at "offset" in this object.
       */
      __vector_len(offset) {
        return this.readInt32(offset + this.readInt32(offset));
      }
      __has_identifier(ident2) {
        if (ident2.length != constants_js_1.FILE_IDENTIFIER_LENGTH) {
          throw new Error("FlatBuffers: file identifier must be length " + constants_js_1.FILE_IDENTIFIER_LENGTH);
        }
        for (let i2 = 0; i2 < constants_js_1.FILE_IDENTIFIER_LENGTH; i2++) {
          if (ident2.charCodeAt(i2) != this.readInt8(this.position() + constants_js_1.SIZEOF_INT + i2)) {
            return false;
          }
        }
        return true;
      }
      /**
       * A helper function for generating list for obj api
       */
      createScalarList(listAccessor, listLength) {
        const ret = [];
        for (let i2 = 0; i2 < listLength; ++i2) {
          const val = listAccessor(i2);
          if (val !== null) {
            ret.push(val);
          }
        }
        return ret;
      }
      /**
       * A helper function for generating list for obj api
       * @param listAccessor function that accepts an index and return data at that index
       * @param listLength listLength
       * @param res result list
       */
      createObjList(listAccessor, listLength) {
        const ret = [];
        for (let i2 = 0; i2 < listLength; ++i2) {
          const val = listAccessor(i2);
          if (val !== null) {
            ret.push(val.unpack());
          }
        }
        return ret;
      }
    };
    exports.ByteBuffer = ByteBuffer2;
  }
});

// node_modules/flatbuffers/js/builder.js
var require_builder = __commonJS({
  "node_modules/flatbuffers/js/builder.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Builder = void 0;
    var byte_buffer_js_1 = require_byte_buffer();
    var constants_js_1 = require_constants();
    var Builder2 = class _Builder {
      /**
       * Create a FlatBufferBuilder.
       */
      constructor(opt_initial_size) {
        this.minalign = 1;
        this.vtable = null;
        this.vtable_in_use = 0;
        this.isNested = false;
        this.object_start = 0;
        this.vtables = [];
        this.vector_num_elems = 0;
        this.force_defaults = false;
        this.string_maps = null;
        this.text_encoder = new TextEncoder();
        let initial_size;
        if (!opt_initial_size) {
          initial_size = 1024;
        } else {
          initial_size = opt_initial_size;
        }
        this.bb = byte_buffer_js_1.ByteBuffer.allocate(initial_size);
        this.space = initial_size;
      }
      clear() {
        this.bb.clear();
        this.space = this.bb.capacity();
        this.minalign = 1;
        this.vtable = null;
        this.vtable_in_use = 0;
        this.isNested = false;
        this.object_start = 0;
        this.vtables = [];
        this.vector_num_elems = 0;
        this.force_defaults = false;
        this.string_maps = null;
      }
      /**
       * In order to save space, fields that are set to their default value
       * don't get serialized into the buffer. Forcing defaults provides a
       * way to manually disable this optimization.
       *
       * @param forceDefaults true always serializes default values
       */
      forceDefaults(forceDefaults) {
        this.force_defaults = forceDefaults;
      }
      /**
       * Get the ByteBuffer representing the FlatBuffer. Only call this after you've
       * called finish(). The actual data starts at the ByteBuffer's current position,
       * not necessarily at 0.
       */
      dataBuffer() {
        return this.bb;
      }
      /**
       * Get the bytes representing the FlatBuffer. Only call this after you've
       * called finish().
       */
      asUint8Array() {
        return this.bb.bytes().subarray(this.bb.position(), this.bb.position() + this.offset());
      }
      /**
       * Prepare to write an element of `size` after `additional_bytes` have been
       * written, e.g. if you write a string, you need to align such the int length
       * field is aligned to 4 bytes, and the string data follows it directly. If all
       * you need to do is alignment, `additional_bytes` will be 0.
       *
       * @param size This is the of the new element to write
       * @param additional_bytes The padding size
       */
      prep(size2, additional_bytes) {
        if (size2 > this.minalign) {
          this.minalign = size2;
        }
        const align_size = ~(this.bb.capacity() - this.space + additional_bytes) + 1 & size2 - 1;
        while (this.space < align_size + size2 + additional_bytes) {
          const old_buf_size = this.bb.capacity();
          this.bb = _Builder.growByteBuffer(this.bb);
          this.space += this.bb.capacity() - old_buf_size;
        }
        this.pad(align_size);
      }
      pad(byte_size) {
        for (let i2 = 0; i2 < byte_size; i2++) {
          this.bb.writeInt8(--this.space, 0);
        }
      }
      writeInt8(value) {
        this.bb.writeInt8(this.space -= 1, value);
      }
      writeInt16(value) {
        this.bb.writeInt16(this.space -= 2, value);
      }
      writeInt32(value) {
        this.bb.writeInt32(this.space -= 4, value);
      }
      writeInt64(value) {
        this.bb.writeInt64(this.space -= 8, value);
      }
      writeFloat32(value) {
        this.bb.writeFloat32(this.space -= 4, value);
      }
      writeFloat64(value) {
        this.bb.writeFloat64(this.space -= 8, value);
      }
      /**
       * Add an `int8` to the buffer, properly aligned, and grows the buffer (if necessary).
       * @param value The `int8` to add the buffer.
       */
      addInt8(value) {
        this.prep(1, 0);
        this.writeInt8(value);
      }
      /**
       * Add an `int16` to the buffer, properly aligned, and grows the buffer (if necessary).
       * @param value The `int16` to add the buffer.
       */
      addInt16(value) {
        this.prep(2, 0);
        this.writeInt16(value);
      }
      /**
       * Add an `int32` to the buffer, properly aligned, and grows the buffer (if necessary).
       * @param value The `int32` to add the buffer.
       */
      addInt32(value) {
        this.prep(4, 0);
        this.writeInt32(value);
      }
      /**
       * Add an `int64` to the buffer, properly aligned, and grows the buffer (if necessary).
       * @param value The `int64` to add the buffer.
       */
      addInt64(value) {
        this.prep(8, 0);
        this.writeInt64(value);
      }
      /**
       * Add a `float32` to the buffer, properly aligned, and grows the buffer (if necessary).
       * @param value The `float32` to add the buffer.
       */
      addFloat32(value) {
        this.prep(4, 0);
        this.writeFloat32(value);
      }
      /**
       * Add a `float64` to the buffer, properly aligned, and grows the buffer (if necessary).
       * @param value The `float64` to add the buffer.
       */
      addFloat64(value) {
        this.prep(8, 0);
        this.writeFloat64(value);
      }
      addFieldInt8(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
          this.addInt8(value);
          this.slot(voffset);
        }
      }
      addFieldInt16(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
          this.addInt16(value);
          this.slot(voffset);
        }
      }
      addFieldInt32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
          this.addInt32(value);
          this.slot(voffset);
        }
      }
      addFieldInt64(voffset, value, defaultValue) {
        if (this.force_defaults || value !== defaultValue) {
          this.addInt64(value);
          this.slot(voffset);
        }
      }
      addFieldFloat32(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
          this.addFloat32(value);
          this.slot(voffset);
        }
      }
      addFieldFloat64(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
          this.addFloat64(value);
          this.slot(voffset);
        }
      }
      addFieldOffset(voffset, value, defaultValue) {
        if (this.force_defaults || value != defaultValue) {
          this.addOffset(value);
          this.slot(voffset);
        }
      }
      /**
       * Structs are stored inline, so nothing additional is being added. `d` is always 0.
       */
      addFieldStruct(voffset, value, defaultValue) {
        if (value != defaultValue) {
          this.nested(value);
          this.slot(voffset);
        }
      }
      /**
       * Structures are always stored inline, they need to be created right
       * where they're used.  You'll get this assertion failure if you
       * created it elsewhere.
       */
      nested(obj) {
        if (obj != this.offset()) {
          throw new TypeError("FlatBuffers: struct must be serialized inline.");
        }
      }
      /**
       * Should not be creating any other object, string or vector
       * while an object is being constructed
       */
      notNested() {
        if (this.isNested) {
          throw new TypeError("FlatBuffers: object serialization must not be nested.");
        }
      }
      /**
       * Set the current vtable at `voffset` to the current location in the buffer.
       */
      slot(voffset) {
        if (this.vtable !== null)
          this.vtable[voffset] = this.offset();
      }
      /**
       * @returns Offset relative to the end of the buffer.
       */
      offset() {
        return this.bb.capacity() - this.space;
      }
      /**
       * Doubles the size of the backing ByteBuffer and copies the old data towards
       * the end of the new buffer (since we build the buffer backwards).
       *
       * @param bb The current buffer with the existing data
       * @returns A new byte buffer with the old data copied
       * to it. The data is located at the end of the buffer.
       *
       * uint8Array.set() formally takes {Array<number>|ArrayBufferView}, so to pass
       * it a uint8Array we need to suppress the type check:
       * @suppress {checkTypes}
       */
      static growByteBuffer(bb) {
        const old_buf_size = bb.capacity();
        if (old_buf_size & 3221225472) {
          throw new Error("FlatBuffers: cannot grow buffer beyond 2 gigabytes.");
        }
        const new_buf_size = old_buf_size << 1;
        const nbb = byte_buffer_js_1.ByteBuffer.allocate(new_buf_size);
        nbb.setPosition(new_buf_size - old_buf_size);
        nbb.bytes().set(bb.bytes(), new_buf_size - old_buf_size);
        return nbb;
      }
      /**
       * Adds on offset, relative to where it will be written.
       *
       * @param offset The offset to add.
       */
      addOffset(offset) {
        this.prep(constants_js_1.SIZEOF_INT, 0);
        this.writeInt32(this.offset() - offset + constants_js_1.SIZEOF_INT);
      }
      /**
       * Start encoding a new object in the buffer.  Users will not usually need to
       * call this directly. The FlatBuffers compiler will generate helper methods
       * that call this method internally.
       */
      startObject(numfields) {
        this.notNested();
        if (this.vtable == null) {
          this.vtable = [];
        }
        this.vtable_in_use = numfields;
        for (let i2 = 0; i2 < numfields; i2++) {
          this.vtable[i2] = 0;
        }
        this.isNested = true;
        this.object_start = this.offset();
      }
      /**
       * Finish off writing the object that is under construction.
       *
       * @returns The offset to the object inside `dataBuffer`
       */
      endObject() {
        if (this.vtable == null || !this.isNested) {
          throw new Error("FlatBuffers: endObject called without startObject");
        }
        this.addInt32(0);
        const vtableloc = this.offset();
        let i2 = this.vtable_in_use - 1;
        for (; i2 >= 0 && this.vtable[i2] == 0; i2--) {
        }
        const trimmed_size = i2 + 1;
        for (; i2 >= 0; i2--) {
          this.addInt16(this.vtable[i2] != 0 ? vtableloc - this.vtable[i2] : 0);
        }
        const standard_fields = 2;
        this.addInt16(vtableloc - this.object_start);
        const len = (trimmed_size + standard_fields) * constants_js_1.SIZEOF_SHORT;
        this.addInt16(len);
        let existing_vtable = 0;
        const vt1 = this.space;
        outer_loop: for (i2 = 0; i2 < this.vtables.length; i2++) {
          const vt2 = this.bb.capacity() - this.vtables[i2];
          if (len == this.bb.readInt16(vt2)) {
            for (let j = constants_js_1.SIZEOF_SHORT; j < len; j += constants_js_1.SIZEOF_SHORT) {
              if (this.bb.readInt16(vt1 + j) != this.bb.readInt16(vt2 + j)) {
                continue outer_loop;
              }
            }
            existing_vtable = this.vtables[i2];
            break;
          }
        }
        if (existing_vtable) {
          this.space = this.bb.capacity() - vtableloc;
          this.bb.writeInt32(this.space, existing_vtable - vtableloc);
        } else {
          this.vtables.push(this.offset());
          this.bb.writeInt32(this.bb.capacity() - vtableloc, this.offset() - vtableloc);
        }
        this.isNested = false;
        return vtableloc;
      }
      /**
       * Finalize a buffer, poiting to the given `root_table`.
       */
      finish(root_table, opt_file_identifier, opt_size_prefix) {
        const size_prefix = opt_size_prefix ? constants_js_1.SIZE_PREFIX_LENGTH : 0;
        if (opt_file_identifier) {
          const file_identifier = opt_file_identifier;
          this.prep(this.minalign, constants_js_1.SIZEOF_INT + constants_js_1.FILE_IDENTIFIER_LENGTH + size_prefix);
          if (file_identifier.length != constants_js_1.FILE_IDENTIFIER_LENGTH) {
            throw new TypeError("FlatBuffers: file identifier must be length " + constants_js_1.FILE_IDENTIFIER_LENGTH);
          }
          for (let i2 = constants_js_1.FILE_IDENTIFIER_LENGTH - 1; i2 >= 0; i2--) {
            this.writeInt8(file_identifier.charCodeAt(i2));
          }
        }
        this.prep(this.minalign, constants_js_1.SIZEOF_INT + size_prefix);
        this.addOffset(root_table);
        if (size_prefix) {
          this.addInt32(this.bb.capacity() - this.space);
        }
        this.bb.setPosition(this.space);
      }
      /**
       * Finalize a size prefixed buffer, pointing to the given `root_table`.
       */
      finishSizePrefixed(root_table, opt_file_identifier) {
        this.finish(root_table, opt_file_identifier, true);
      }
      /**
       * This checks a required field has been set in a given table that has
       * just been constructed.
       */
      requiredField(table, field) {
        const table_start = this.bb.capacity() - table;
        const vtable_start = table_start - this.bb.readInt32(table_start);
        const ok = field < this.bb.readInt16(vtable_start) && this.bb.readInt16(vtable_start + field) != 0;
        if (!ok) {
          throw new TypeError("FlatBuffers: field " + field + " must be set");
        }
      }
      /**
       * Start a new array/vector of objects.  Users usually will not call
       * this directly. The FlatBuffers compiler will create a start/end
       * method for vector types in generated code.
       *
       * @param elem_size The size of each element in the array
       * @param num_elems The number of elements in the array
       * @param alignment The alignment of the array
       */
      startVector(elem_size, num_elems, alignment) {
        this.notNested();
        this.vector_num_elems = num_elems;
        this.prep(constants_js_1.SIZEOF_INT, elem_size * num_elems);
        this.prep(alignment, elem_size * num_elems);
      }
      /**
       * Finish off the creation of an array and all its elements. The array must be
       * created with `startVector`.
       *
       * @returns The offset at which the newly created array
       * starts.
       */
      endVector() {
        this.writeInt32(this.vector_num_elems);
        return this.offset();
      }
      /**
       * Encode the string `s` in the buffer using UTF-8. If the string passed has
       * already been seen, we return the offset of the already written string
       *
       * @param s The string to encode
       * @return The offset in the buffer where the encoded string starts
       */
      createSharedString(s) {
        if (!s) {
          return 0;
        }
        if (!this.string_maps) {
          this.string_maps = /* @__PURE__ */ new Map();
        }
        if (this.string_maps.has(s)) {
          return this.string_maps.get(s);
        }
        const offset = this.createString(s);
        this.string_maps.set(s, offset);
        return offset;
      }
      /**
       * Encode the string `s` in the buffer using UTF-8. If a Uint8Array is passed
       * instead of a string, it is assumed to contain valid UTF-8 encoded data.
       *
       * @param s The string to encode
       * @return The offset in the buffer where the encoded string starts
       */
      createString(s) {
        if (s === null || s === void 0) {
          return 0;
        }
        let utf82;
        if (s instanceof Uint8Array) {
          utf82 = s;
        } else {
          utf82 = this.text_encoder.encode(s);
        }
        this.addInt8(0);
        this.startVector(1, utf82.length, 1);
        this.bb.setPosition(this.space -= utf82.length);
        this.bb.bytes().set(utf82, this.space);
        return this.endVector();
      }
      /**
       * Create a byte vector.
       *
       * @param v The bytes to add
       * @returns The offset in the buffer where the byte vector starts
       */
      createByteVector(v) {
        if (v === null || v === void 0) {
          return 0;
        }
        this.startVector(1, v.length, 1);
        this.bb.setPosition(this.space -= v.length);
        this.bb.bytes().set(v, this.space);
        return this.endVector();
      }
      /**
       * A helper function to pack an object
       *
       * @returns offset of obj
       */
      createObjectOffset(obj) {
        if (obj === null) {
          return 0;
        }
        if (typeof obj === "string") {
          return this.createString(obj);
        } else {
          return obj.pack(this);
        }
      }
      /**
       * A helper function to pack a list of object
       *
       * @returns list of offsets of each non null object
       */
      createObjectOffsetList(list) {
        const ret = [];
        for (let i2 = 0; i2 < list.length; ++i2) {
          const val = list[i2];
          if (val !== null) {
            ret.push(this.createObjectOffset(val));
          } else {
            throw new TypeError("FlatBuffers: Argument for createObjectOffsetList cannot contain null.");
          }
        }
        return ret;
      }
      createStructOffsetList(list, startFunc) {
        startFunc(this, list.length);
        this.createObjectOffsetList(list.slice().reverse());
        return this.endVector();
      }
    };
    exports.Builder = Builder2;
  }
});

// node_modules/flatbuffers/js/flatbuffers.js
var require_flatbuffers = __commonJS({
  "node_modules/flatbuffers/js/flatbuffers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Encoding = exports.ByteBuffer = exports.Builder = exports.isLittleEndian = exports.int32 = exports.float64 = exports.float32 = exports.SIZE_PREFIX_LENGTH = exports.SIZEOF_SHORT = exports.SIZEOF_INT = exports.FILE_IDENTIFIER_LENGTH = void 0;
    var constants_js_1 = require_constants();
    Object.defineProperty(exports, "FILE_IDENTIFIER_LENGTH", { enumerable: true, get: function() {
      return constants_js_1.FILE_IDENTIFIER_LENGTH;
    } });
    Object.defineProperty(exports, "SIZEOF_INT", { enumerable: true, get: function() {
      return constants_js_1.SIZEOF_INT;
    } });
    Object.defineProperty(exports, "SIZEOF_SHORT", { enumerable: true, get: function() {
      return constants_js_1.SIZEOF_SHORT;
    } });
    Object.defineProperty(exports, "SIZE_PREFIX_LENGTH", { enumerable: true, get: function() {
      return constants_js_1.SIZE_PREFIX_LENGTH;
    } });
    var utils_js_1 = require_utils();
    Object.defineProperty(exports, "float32", { enumerable: true, get: function() {
      return utils_js_1.float32;
    } });
    Object.defineProperty(exports, "float64", { enumerable: true, get: function() {
      return utils_js_1.float64;
    } });
    Object.defineProperty(exports, "int32", { enumerable: true, get: function() {
      return utils_js_1.int32;
    } });
    Object.defineProperty(exports, "isLittleEndian", { enumerable: true, get: function() {
      return utils_js_1.isLittleEndian;
    } });
    var builder_js_1 = require_builder();
    Object.defineProperty(exports, "Builder", { enumerable: true, get: function() {
      return builder_js_1.Builder;
    } });
    var byte_buffer_js_1 = require_byte_buffer();
    Object.defineProperty(exports, "ByteBuffer", { enumerable: true, get: function() {
      return byte_buffer_js_1.ByteBuffer;
    } });
    var encoding_js_1 = require_encoding();
    Object.defineProperty(exports, "Encoding", { enumerable: true, get: function() {
      return encoding_js_1.Encoding;
    } });
  }
});

// scripts/dev/big-import.ts
import { openSync, readSync, fstatSync } from "node:fs";

// src/core/dxf/color.ts
function hsv(h, s, v) {
  const c = v * s;
  const hp = h % 360 / 60;
  const x2 = c * (1 - Math.abs(hp % 2 - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x2, 0];
  else if (hp < 2) [r, g, b] = [x2, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x2];
  else if (hp < 4) [r, g, b] = [0, x2, c];
  else if (hp < 5) [r, g, b] = [x2, 0, c];
  else [r, g, b] = [c, 0, x2];
  const m = v - c;
  const f2 = (x3) => Math.floor(x3 + 1e-6);
  return f2(r + m) << 16 | f2(g + m) << 8 | f2(b + m);
}
var LEVELS = [255, 204, 153, 127, 76];
var BASE = {
  1: 16711680,
  2: 16776960,
  3: 65280,
  4: 65535,
  5: 255,
  6: 16711935,
  7: 16777215,
  8: 8421504,
  9: 12632256,
  250: 3355443,
  251: 5263440,
  252: 6908265,
  253: 8553090,
  254: 12500670,
  255: 16777215
};
var ACI = (() => {
  const t = new Array(256).fill(16777215);
  for (let i2 = 1; i2 < 256; i2++) {
    if (BASE[i2] !== void 0) t[i2] = BASE[i2];
    else if (i2 >= 10 && i2 <= 249) {
      const group = Math.floor(i2 / 10) - 1;
      const v = i2 % 10;
      t[i2] = hsv(group * 15, v % 2 === 0 ? 1 : 0.5, LEVELS[Math.floor(v / 2)]);
    }
  }
  return t;
})();
function aciToRgb(index) {
  const i2 = Math.abs(Math.round(index));
  if (i2 < 1 || i2 > 255) return 16777215;
  return ACI[i2];
}

// src/core/weld.ts
var GrowF64 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Float64Array(cap);
  }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Float64Array(c);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  push(v) {
    if (this.n === this.a.length) this.reserve(1);
    this.a[this.n++] = v;
  }
  view() {
    return this.a.subarray(0, this.n);
  }
};
var GrowI32 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Int32Array(cap);
  }
  push(v) {
    if (this.n === this.a.length) {
      const b = new Int32Array(this.a.length * 2);
      b.set(this.a);
      this.a = b;
    }
    this.a[this.n++] = v;
  }
  view() {
    return this.a.subarray(0, this.n);
  }
};
var GrowF32 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Float32Array(cap);
  }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Float32Array(c);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  push(v) {
    if (this.n === this.a.length) this.reserve(1);
    this.a[this.n++] = v;
  }
  /** Exact-size copy (frees the spare capacity). */
  take() {
    return this.a.slice(0, this.n);
  }
};
var GrowU32 = class {
  a;
  n = 0;
  constructor(cap = 1024) {
    this.a = new Uint32Array(cap);
  }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let c = this.a.length * 2;
    while (c < this.n + k) c *= 2;
    const b = new Uint32Array(c);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  push(v) {
    if (this.n === this.a.length) this.reserve(1);
    this.a[this.n++] = v;
  }
  take() {
    return this.a.slice(0, this.n);
  }
  view() {
    return this.a.subarray(0, this.n);
  }
};
var Welder = class {
  constructor(cell) {
    this.cell = cell;
    this.inv = 1 / cell;
    this.mask = 31;
    this.keys = new Int32Array(32 * 3);
    this.vals = new Int32Array(32).fill(-1);
  }
  cell;
  inv;
  keys;
  vals;
  mask;
  used = 0;
  pos = new GrowF64(48);
  idx = new GrowU32(48);
  /** triangles offered / dropped because they collapsed */
  offered = 0;
  dropped = 0;
  get vertexCount() {
    return this.pos.n / 3;
  }
  get triangleCount() {
    return this.idx.n / 3;
  }
  grow() {
    const oldK = this.keys, oldV = this.vals;
    const size2 = oldV.length * 2;
    this.keys = new Int32Array(size2 * 3);
    this.vals = new Int32Array(size2).fill(-1);
    this.mask = size2 - 1;
    for (let s = 0; s < oldV.length; s++) {
      if (oldV[s] < 0) continue;
      const x2 = oldK[s * 3], y = oldK[s * 3 + 1], z = oldK[s * 3 + 2];
      let h = this.hash(x2, y, z);
      while (this.vals[h] >= 0) h = h + 1 & this.mask;
      this.keys[h * 3] = x2;
      this.keys[h * 3 + 1] = y;
      this.keys[h * 3 + 2] = z;
      this.vals[h] = oldV[s];
    }
  }
  hash(x2, y, z) {
    return (Math.imul(x2, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & this.mask;
  }
  vertex(x2, y, z) {
    const ix = Math.floor(x2 * this.inv) | 0, iy = Math.floor(y * this.inv) | 0, iz = Math.floor(z * this.inv) | 0;
    let h = this.hash(ix, iy, iz);
    for (; ; ) {
      const v = this.vals[h];
      if (v < 0) break;
      if (this.keys[h * 3] === ix && this.keys[h * 3 + 1] === iy && this.keys[h * 3 + 2] === iz) return v;
      h = h + 1 & this.mask;
    }
    const id = this.pos.n / 3;
    this.keys[h * 3] = ix;
    this.keys[h * 3 + 1] = iy;
    this.keys[h * 3 + 2] = iz;
    this.vals[h] = id;
    this.pos.reserve(3);
    this.pos.a[this.pos.n++] = x2;
    this.pos.a[this.pos.n++] = y;
    this.pos.a[this.pos.n++] = z;
    if (++this.used * 2 > this.vals.length) this.grow();
    return id;
  }
  tri(ax, ay, az, bx, by, bz, cx, cy, cz) {
    this.offered++;
    const a = this.vertex(ax, ay, az), b = this.vertex(bx, by, bz), c = this.vertex(cx, cy, cz);
    if (a === b || b === c || a === c) {
      this.dropped++;
      return;
    }
    this.idx.reserve(3);
    this.idx.a[this.idx.n++] = a;
    this.idx.a[this.idx.n++] = b;
    this.idx.a[this.idx.n++] = c;
  }
};
var LARGE_MODEL_TRIANGLES = 3e6;
var IMPORT_BUDGET = 25e5;
function dedupeTriangles(I) {
  const n = I.length / 3;
  let size2 = 64;
  while (size2 < n * 2) size2 *= 2;
  const mask = size2 - 1;
  const keys = new Uint32Array(size2 * 3), used = new Uint8Array(size2);
  const out = new Uint32Array(I.length);
  let o = 0;
  for (let t = 0; t < n; t++) {
    let a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    if (a > b) {
      const x2 = a;
      a = b;
      b = x2;
    }
    if (b > c) {
      const x2 = b;
      b = c;
      c = x2;
    }
    if (a > b) {
      const x2 = a;
      a = b;
      b = x2;
    }
    let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & mask;
    let dup = false;
    while (used[h]) {
      if (keys[h * 3] === a && keys[h * 3 + 1] === b && keys[h * 3 + 2] === c) {
        dup = true;
        break;
      }
      h = h + 1 & mask;
    }
    if (dup) continue;
    used[h] = 1;
    keys[h * 3] = a;
    keys[h * 3 + 1] = b;
    keys[h * 3 + 2] = c;
    out[o++] = I[t * 3];
    out[o++] = I[t * 3 + 1];
    out[o++] = I[t * 3 + 2];
  }
  return { indices: out.slice(0, o), removed: n - o / 3 };
}

// src/core/dxf/reader.ts
var DxfFormatError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DxfFormatError";
  }
};
var bytesSource = (b) => ({ size: b.length, read: (o, l) => b.subarray(o, Math.min(b.length, o + l)) });
var CHUNK = 16 * 1024 * 1024;
var utf8 = new TextDecoder("utf-8");
var PairCursor = class {
  constructor(src2, onRead) {
    this.src = src2;
    this.onRead = onRead;
    this.fill();
    if (this.buf[0] === 239 && this.buf[1] === 187 && this.buf[2] === 191) this.pos = 3;
  }
  src;
  onRead;
  buf = new Uint8Array(0);
  pos = 0;
  fileOff = 0;
  // file offset of buf[0]
  peeked = null;
  line = 0;
  /** keep the unread rest, append the next piece of the file */
  fill() {
    const readTo = this.fileOff + this.buf.length;
    if (readTo >= this.src.size) return false;
    const rest = this.buf.subarray(this.pos);
    const next = this.src.read(readTo, CHUNK);
    const b = new Uint8Array(rest.length + next.length);
    b.set(rest);
    b.set(next, rest.length);
    this.fileOff = readTo - rest.length;
    this.buf = b;
    this.pos = 0;
    this.onRead?.(Math.min(1, (this.fileOff + b.length) / Math.max(1, this.src.size)));
    return next.length > 0;
  }
  readLine() {
    let end = this.buf.indexOf(10, this.pos);
    while (end === -1) {
      if (!this.fill()) {
        end = this.buf.length;
        break;
      }
      end = this.buf.indexOf(10, this.pos);
    }
    if (this.pos >= this.buf.length) return null;
    let e = end;
    if (e > this.pos && this.buf[e - 1] === 13) e--;
    const bytes = this.buf.subarray(this.pos, e);
    this.pos = end + 1;
    this.line++;
    let ascii = true;
    for (let i2 = 0; i2 < bytes.length; i2++) if (bytes[i2] > 127) {
      ascii = false;
      break;
    }
    if (!ascii) return utf8.decode(bytes);
    if (bytes.length < 4096) return String.fromCharCode.apply(null, bytes);
    return utf8.decode(bytes);
  }
  next() {
    if (this.peeked) {
      const p = this.peeked;
      this.peeked = null;
      return p;
    }
    const c = this.readLine();
    if (c === null) return null;
    const v = this.readLine();
    if (v === null) return null;
    const code = parseInt(c.trim(), 10);
    if (Number.isNaN(code)) {
      throw new DxfFormatError(`Ung\xFCltiger Gruppencode in Zeile ${this.line - 1}: "${c.slice(0, 30)}"`);
    }
    return [code, v.trim()];
  }
  peek() {
    if (!this.peeked) this.peeked = this.next();
    return this.peeked;
  }
};
var FACE_COORD = /* @__PURE__ */ new Set([10, 11, 12, 13, 20, 21, 22, 23, 30, 31, 32, 33]);
function addFace(list, ent) {
  const attrs = [];
  const c = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let got = 0;
  for (const [code, v] of ent.pairs) {
    if (FACE_COORD.has(code)) {
      const i2 = code % 10 * 3 + Math.floor(code / 10) - 1;
      if (!(got & 1 << i2)) {
        got |= 1 << i2;
        const n = parseFloat(v);
        if (Number.isFinite(n)) c[i2] = n;
      }
    } else if (code !== 70 && code !== 5 && code !== 330 && code !== 100) attrs.push([code, v]);
  }
  const sig = attrs.map(([k, v]) => `${k}=${v}`).join("|");
  const last = list[list.length - 1];
  let fb = last && last.type === "@FACES" && last.sig === sig ? last.faces : void 0;
  if (!fb) {
    fb = { data: new Float64Array(12 * 16), count: 0, tris: 0 };
    list.push({ type: "@FACES", pairs: attrs, faces: fb, sig });
  }
  if ((fb.count + 1) * 12 > fb.data.length) {
    const d = new Float64Array(fb.data.length * 2);
    d.set(fb.data);
    fb.data = d;
  }
  fb.data.set(c, fb.count * 12);
  fb.count++;
  fb.tris += Math.abs(c[6] - c[9]) < 1e-9 && Math.abs(c[7] - c[10]) < 1e-9 && Math.abs(c[8] - c[11]) < 1e-9 ? 1 : 2;
}
function readRecord(cur, type) {
  const pairs = [];
  for (; ; ) {
    const p = cur.peek();
    if (!p || p[0] === 0) break;
    pairs.push(cur.next());
  }
  return { type, pairs };
}
function readMesh(cur) {
  const pairs = [];
  const verts = new GrowF64(3 * 64);
  const list = new GrowI32(64);
  let state = "attr";
  let vLeft = 0, fLeft = 0;
  for (; ; ) {
    const p = cur.peek();
    if (!p || p[0] === 0) break;
    cur.next();
    const [c, v] = p;
    if (state === "verts" && (c === 10 || c === 20 || c === 30)) {
      verts.push(parseFloat(v) || 0);
      if (c === 30 && --vLeft <= 0) state = "rest";
      continue;
    }
    if (state === "faces" && c === 90) {
      list.push(parseInt(v, 10) || 0);
      if (--fLeft <= 0) state = "rest";
      continue;
    }
    if (c === 92 && state === "attr") {
      vLeft = parseInt(v, 10) || 0;
      state = vLeft > 0 ? "verts" : "rest";
      continue;
    }
    if (c === 93 && list.n === 0) {
      fLeft = parseInt(v, 10) || 0;
      state = fLeft > 0 ? "faces" : "rest";
      continue;
    }
    if (state === "rest" && (c === 90 || c === 140 || c === 10 || c === 20 || c === 30)) continue;
    if (state !== "verts" && state !== "faces") pairs.push(p);
  }
  return { type: "MESH", pairs, mesh: { verts: verts.view().slice(), list: list.view().slice() } };
}
function readEntityList(cur, terminators) {
  const list = [];
  for (; ; ) {
    const p = cur.next();
    if (!p) return { list, end: null };
    if (p[0] !== 0) continue;
    const type = p[1].toUpperCase();
    if (terminators.has(type)) {
      readRecord(cur, type);
      return { list, end: type };
    }
    const ent = type === "MESH" ? readMesh(cur) : readRecord(cur, type);
    if (type === "3DFACE") {
      addFace(list, ent);
      continue;
    }
    if (type === "POLYLINE") {
      ent.children = readChildren(cur, "VERTEX");
    } else if (type === "INSERT" && num(ent.pairs, 66, 0) === 1) {
      readChildren(cur, "ATTRIB");
    }
    list.push(ent);
  }
}
function readChildren(cur, childType) {
  const out = [];
  for (; ; ) {
    const p = cur.peek();
    if (!p) return out;
    if (p[0] !== 0) {
      cur.next();
      continue;
    }
    const type = p[1].toUpperCase();
    if (type === childType) {
      cur.next();
      out.push(readRecord(cur, type));
    } else if (type === "SEQEND") {
      cur.next();
      readRecord(cur, type);
      return out;
    } else {
      return out;
    }
  }
}
function num(pairs, code, def) {
  for (const [c, v] of pairs) if (c === code) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  }
  return def;
}
function str(pairs, code, def = "") {
  for (const [c, v] of pairs) if (c === code) return v;
  return def;
}
function isBinaryDxf(head) {
  return head.startsWith("AutoCAD Binary DXF");
}
function readDxf(input, onRead) {
  const src2 = typeof input === "string" ? bytesSource(new TextEncoder().encode(input)) : input instanceof Uint8Array ? bytesSource(input) : input;
  const head = src2.read(0, 22);
  if (isBinaryDxf(String.fromCharCode.apply(null, head))) {
    throw new DxfFormatError(
      "Diese DXF-Datei ist im Bin\xE4rformat gespeichert. Bitte in AutoCAD mit DXFOUT als ASCII-DXF speichern (Standardeinstellung)."
    );
  }
  const cur = new PairCursor(src2, onRead);
  const out = { header: /* @__PURE__ */ new Map(), layers: /* @__PURE__ */ new Map(), blocks: /* @__PURE__ */ new Map(), entities: [], materials: /* @__PURE__ */ new Map() };
  let sawSection = false;
  for (; ; ) {
    const p = cur.next();
    if (!p) break;
    if (p[0] === 0 && p[1] === "EOF") break;
    if (p[0] === 0 && p[1] === "SECTION") {
      sawSection = true;
      const nameP = cur.next();
      const name = nameP?.[1]?.toUpperCase() ?? "";
      if (name === "HEADER") readHeader(cur, out);
      else if (name === "TABLES") readTables(cur, out);
      else if (name === "BLOCKS") readBlocks(cur, out);
      else if (name === "ENTITIES") out.entities = readEntityList(cur, /* @__PURE__ */ new Set(["ENDSEC"])).list;
      else if (name === "OBJECTS") readObjects(cur, out);
      else skipSection(cur);
    }
  }
  if (!sawSection) {
    throw new DxfFormatError("Die Datei enth\xE4lt keine DXF-Abschnitte. Ist es wirklich eine DXF-Datei?");
  }
  const ver = out.header.get("$ACADVER");
  if (ver) out.version = ver[0]?.[1];
  return out;
}
function skipSection(cur) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
  }
}
function readHeader(cur, out) {
  let current = null;
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] === 9) {
      current = p[1];
      out.header.set(current, []);
    } else if (current) {
      out.header.get(current).push(p);
    }
  }
}
function readTables(cur, out) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] === 0 && p[1] === "LAYER") {
      const rec = readRecord(cur, "LAYER");
      const name = str(rec.pairs, 2);
      if (!name) continue;
      const tc = rec.pairs.find(([c]) => c === 420);
      out.layers.set(name.toUpperCase(), {
        name,
        color: num(rec.pairs, 62, 7),
        trueColor: tc ? parseInt(tc[1], 10) : void 0,
        flags: num(rec.pairs, 70, 0),
        material: str(rec.pairs, 347).toUpperCase() || void 0
      });
    }
  }
}
function cmColor(v) {
  if (!Number.isFinite(v)) return void 0;
  const method = v >>> 24 & 255;
  if (method === 195) return aciToRgb(v & 255);
  return v & 16777215;
}
function readObjects(cur, out) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] !== 0 || p[1].toUpperCase() !== "MATERIAL") continue;
    const P = readRecord(cur, "MATERIAL").pairs;
    const handle = str(P, 5).toUpperCase();
    const name = str(P, 1);
    if (!handle || !name) continue;
    const m = { handle, name };
    const desc = str(P, 2);
    if (desc) m.description = desc;
    if (num(P, 71, 0) === 1) {
      const c = cmColor(parseInt(str(P, 91, "NaN"), 10));
      if (c !== void 0) m.diffuse = c;
    }
    const i3 = P.findIndex(([c]) => c === 3);
    if (i3 >= 0 && P[i3][1].trim()) {
      m.diffuseMap = P[i3][1].trim();
      const mat = [];
      for (let k = i3 + 1; k < P.length && mat.length < 16; k++) if (P[k][0] === 43) mat.push(parseFloat(P[k][1]));
      const sx = mat[0];
      if (Number.isFinite(sx) && Math.abs(sx) > 1e-9 && Math.abs(sx - 1) > 1e-9) m.mapScaleU = 1 / Math.abs(sx);
    }
    const op = num(P, 140, NaN);
    if (Number.isFinite(op) && op >= 0 && op <= 1) m.opacity = op;
    out.materials.set(handle, m);
  }
}
function readBlocks(cur, out) {
  for (; ; ) {
    const p = cur.next();
    if (!p || p[0] === 0 && p[1] === "ENDSEC") return;
    if (p[0] === 0 && p[1] === "BLOCK") {
      const head = readRecord(cur, "BLOCK");
      const name = str(head.pairs, 2) || str(head.pairs, 3);
      const { list } = readEntityList(cur, /* @__PURE__ */ new Set(["ENDBLK"]));
      out.blocks.set(name.toUpperCase(), {
        name,
        base: [num(head.pairs, 10, 0), num(head.pairs, 20, 0), num(head.pairs, 30, 0)],
        flags: num(head.pairs, 70, 0),
        entities: list
      });
    }
  }
}

// src/core/dxf/math.ts
function identity() {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}
function mul(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}
function translate(x2, y, z) {
  const m = identity();
  m[12] = x2;
  m[13] = y;
  m[14] = z;
  return m;
}
function scale(x2, y, z) {
  const m = identity();
  m[0] = x2;
  m[5] = y;
  m[10] = z;
  return m;
}
function rotZ(rad) {
  const m = identity();
  const c = Math.cos(rad), s = Math.sin(rad);
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}
function apply(m, p) {
  const [x2, y, z] = p;
  return [
    m[0] * x2 + m[4] * y + m[8] * z + m[12],
    m[1] * x2 + m[5] * y + m[9] * z + m[13],
    m[2] * x2 + m[6] * y + m[10] * z + m[14]
  ];
}
function applyDir(m, p) {
  const [x2, y, z] = p;
  return [m[0] * x2 + m[4] * y + m[8] * z, m[1] * x2 + m[5] * y + m[9] * z, m[2] * x2 + m[6] * y + m[10] * z];
}
function det3(m) {
  return m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
}
function ocsMatrix(n) {
  const az = norm(n);
  if (Math.abs(az[0]) < 1e-12 && Math.abs(az[1]) < 1e-12 && az[2] > 0) return identity();
  const lim = 1 / 64;
  const ax = norm(Math.abs(az[0]) < lim && Math.abs(az[1]) < lim ? cross([0, 1, 0], az) : cross([0, 0, 1], az));
  const ay = norm(cross(az, ax));
  const m = identity();
  m[0] = ax[0];
  m[1] = ax[1];
  m[2] = ax[2];
  m[4] = ay[0];
  m[5] = ay[1];
  m[6] = ay[2];
  m[8] = az[0];
  m[9] = az[1];
  m[10] = az[2];
  return m;
}

// src/core/dxf/build.ts
var ACIS_TYPES = /* @__PURE__ */ new Set([
  "3DSOLID",
  "BODY",
  "REGION",
  "SURFACE",
  "EXTRUDEDSURFACE",
  "LOFTEDSURFACE",
  "PLANESURFACE",
  "REVOLVEDSURFACE",
  "SWEPTSURFACE",
  "NURBSURFACE"
]);
var ANNOTATION_TYPES = /* @__PURE__ */ new Set([
  "TEXT",
  "MTEXT",
  "DIMENSION",
  "LEADER",
  "MLEADER",
  "MULTILEADER",
  "HATCH",
  "POINT",
  "ATTDEF",
  "VIEWPORT",
  "IMAGE",
  "WIPEOUT",
  "TOLERANCE",
  "XLINE",
  "RAY",
  "SPLINE",
  "ELLIPSE",
  "ARC",
  "OLE2FRAME"
]);
function addTri(g, ax, ay, az, bx, by, bz, cx, cy, cz) {
  if (g.weld) g.weld.tri(ax, ay, az, bx, by, bz, cx, cy, cz);
  else g.tris.push(ax, ay, az, bx, by, bz, cx, cy, cz);
}
function estimateTriangles(dxf) {
  const memo = /* @__PURE__ */ new Map();
  const list = (ents, stack) => {
    let n = 0;
    for (const e of ents) {
      if (e.faces) n += e.faces.tris;
      else if (e.type === "POLYLINE") n += e.children?.length ?? 0;
      else if (e.type === "MESH") n += e.mesh ? Math.max(e.mesh.list.length / 4, e.mesh.verts.length / 3) : e.pairs.length / 4;
      else if (e.type === "INSERT") {
        const name = (str(e.pairs, 2) || "").toUpperCase();
        if (stack.includes(name) || stack.length > 32) continue;
        let b = memo.get(name);
        if (b === void 0) {
          const blk = dxf.blocks.get(name);
          b = blk ? list(blk.entities, [...stack, name]) : 0;
          memo.set(name, b);
        }
        n += b * Math.max(1, num(e.pairs, 70, 1)) * Math.max(1, num(e.pairs, 71, 1));
      }
    }
    return n;
  };
  return list(dxf.entities, []);
}
function roughExtent(dxf) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const add2 = (x2, y, z) => {
    if (!Number.isFinite(x2 + y + z)) return;
    mn[0] = Math.min(mn[0], x2);
    mn[1] = Math.min(mn[1], y);
    mn[2] = Math.min(mn[2], z);
    mx[0] = Math.max(mx[0], x2);
    mx[1] = Math.max(mx[1], y);
    mx[2] = Math.max(mx[2], z);
  };
  for (const e of dxf.entities) {
    if (e.faces) {
      const d = e.faces.data;
      for (let i2 = 0; i2 < e.faces.count * 12; i2 += 3) add2(d[i2], d[i2 + 1], d[i2 + 2]);
    } else if (e.type === "INSERT") add2(num(e.pairs, 10, 0), num(e.pairs, 20, 0), num(e.pairs, 30, 0));
  }
  return Number.isFinite(mn[0]) ? Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) : 0;
}
var ARC_SEGMENTS = 16;
var CIRCLE_SEGMENTS = 24;
function buildGeometry(dxf, opts = {}) {
  const res = {
    groups: /* @__PURE__ */ new Map(),
    entityCounts: {},
    acis: [],
    ignored2d: 0,
    skippedHiddenLayers: 0,
    meshWithSubdivision: 0,
    missingBlocks: [],
    recursionCut: 0
  };
  const acisMap = /* @__PURE__ */ new Map();
  const acisCount = /* @__PURE__ */ new Map();
  const missing = /* @__PURE__ */ new Set();
  const layerRgb = (name) => {
    const l = dxf.layers.get(name.toUpperCase());
    if (!l) return 16777215;
    if (l.trueColor !== void 0) return l.trueColor & 16777215;
    return aciToRgb(l.color);
  };
  const layerHidden = (name) => {
    const l = dxf.layers.get(name.toUpperCase());
    return !!l && (l.color < 0 || (l.flags & 1) === 1);
  };
  const matName = (handle) => handle ? dxf.materials.get(handle.toUpperCase())?.name : void 0;
  const special = (n) => (n ?? "").toUpperCase();
  const layerMaterial = (layer) => {
    const n = matName(dxf.layers.get(layer.toUpperCase())?.material);
    const u = special(n);
    return !n || u === "GLOBAL" || u === "BYLAYER" || u === "BYBLOCK" ? void 0 : n;
  };
  const resolveMaterial = (P, layer, ctx) => {
    const n = matName(str(P, 347) || void 0);
    const u = special(n);
    if (!n || u === "BYLAYER") return layerMaterial(layer);
    if (u === "BYBLOCK") return ctx.material;
    if (u === "GLOBAL") return void 0;
    return n;
  };
  let curMat;
  const groupFor = (layer, color) => {
    const material = curMat;
    const key = `${layer}\0${color}\0${material ?? ""}`;
    let g = res.groups.get(key);
    if (!g) {
      g = { layer, color, material, tris: [], ...opts.weldCell ? { weld: new Welder(opts.weldCell) } : {} };
      res.groups.set(key, g);
    }
    return g;
  };
  const emit = (g, M, flip, a, b, c) => {
    const A = apply(M, a), B = apply(M, b), C2 = apply(M, c);
    if (flip) addTri(g, A[0], A[1], A[2], C2[0], C2[1], C2[2], B[0], B[1], B[2]);
    else addTri(g, A[0], A[1], A[2], B[0], B[1], B[2], C2[0], C2[1], C2[2]);
  };
  const quad = (g, M, flip, a, b, c, d) => {
    emit(g, M, flip, a, b, c);
    emit(g, M, flip, a, c, d);
  };
  const visit = (e, M, ctx) => {
    const P = e.pairs;
    if (e.faces) res.entityCounts["3DFACE"] = (res.entityCounts["3DFACE"] ?? 0) + e.faces.count;
    else res.entityCounts[e.type] = (res.entityCounts[e.type] ?? 0) + 1;
    if (num(P, 67, 0) === 1) return;
    if (num(P, 60, 0) === 1) return;
    let layer = str(P, 8, "0");
    if (layer === "0" && ctx.depth > 0) layer = ctx.layer;
    if (layerHidden(layer)) {
      res.skippedHiddenLayers++;
      return;
    }
    const tc = P.find(([c]) => c === 420);
    const aci = num(P, 62, 256);
    let color;
    if (tc) color = parseInt(tc[1], 10) & 16777215;
    else if (aci === 0) color = ctx.color;
    else if (aci === 256) color = layerRgb(layer);
    else color = aciToRgb(aci);
    const material = resolveMaterial(P, layer, ctx);
    curMat = material;
    const flip = det3(M) < 0;
    const thickness = num(P, 39, 0);
    const ext = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    if (ACIS_TYPES.has(e.type)) {
      acisCount.set(e.type, (acisCount.get(e.type) ?? 0) + 1);
      if (!acisMap.has(e.type)) acisMap.set(e.type, /* @__PURE__ */ new Set());
      acisMap.get(e.type).add(layer);
      return;
    }
    switch (e.type) {
      case "@FACES": {
        const g = groupFor(layer, color);
        const d = e.faces.data, n = e.faces.count;
        for (let f2 = 0; f2 < n; f2++) {
          const o = f2 * 12;
          const a = [d[o], d[o + 1], d[o + 2]], b = [d[o + 3], d[o + 4], d[o + 5]], c = [d[o + 6], d[o + 7], d[o + 8]], q = [d[o + 9], d[o + 10], d[o + 11]];
          if (same(c, q)) emit(g, M, flip, a, b, c);
          else quad(g, M, flip, a, b, c, q);
        }
        return;
      }
      case "3DFACE": {
        const p = pts(P, 4);
        const g = groupFor(layer, color);
        if (same(p[2], p[3])) emit(g, M, flip, p[0], p[1], p[2]);
        else quad(g, M, flip, p[0], p[1], p[2], p[3]);
        return;
      }
      case "SOLID":
      case "TRACE": {
        const p = pts(P, 4);
        const O = mul(M, ocsMatrix(ext));
        const g = groupFor(layer, color);
        const ring = same(p[2], p[3]) ? [p[0], p[1], p[2]] : [p[0], p[1], p[3], p[2]];
        if (thickness !== 0) prism(g, O, flip, ring, thickness, true);
        else fan(g, O, flip, ring);
        return;
      }
      case "POLYLINE":
        polyline(e, M, flip, layer, color);
        return;
      case "LWPOLYLINE": {
        if (thickness === 0) {
          res.ignored2d++;
          return;
        }
        const elev = num(P, 38, 0);
        const verts = [];
        let cur = null;
        for (const [c, v] of P) {
          if (c === 10) {
            cur = [parseFloat(v), 0, 0];
            verts.push(cur);
          } else if (c === 20 && cur) cur[1] = parseFloat(v);
          else if (c === 42 && cur) cur[2] = parseFloat(v);
        }
        const ring = bulgeRing(verts, (num(P, 70, 0) & 1) === 1, elev);
        const O = mul(M, ocsMatrix(ext));
        walls(groupFor(layer, color), O, flip, ring.pts, ring.closed, thickness);
        return;
      }
      case "LINE": {
        if (thickness === 0) {
          res.ignored2d++;
          return;
        }
        const p = pts(P, 2);
        const d = applyDir(identity(), ext).map((x2) => x2 * thickness);
        const g = groupFor(layer, color);
        quad(g, M, flip, p[0], p[1], add(p[1], d), add(p[0], d));
        return;
      }
      case "CIRCLE": {
        if (thickness === 0) {
          res.ignored2d++;
          return;
        }
        const c0 = pts(P, 1)[0];
        const r = num(P, 40, 0);
        const ring = [];
        for (let i2 = 0; i2 < CIRCLE_SEGMENTS; i2++) {
          const a = i2 / CIRCLE_SEGMENTS * Math.PI * 2;
          ring.push([c0[0] + r * Math.cos(a), c0[1] + r * Math.sin(a), c0[2]]);
        }
        prism(groupFor(layer, color), mul(M, ocsMatrix(ext)), flip, ring, thickness, true);
        return;
      }
      case "MESH":
        mesh(e, M, flip, groupFor(layer, color));
        return;
      case "INSERT":
        insert(e, M, { ...ctx, layer, color, material }, layer, color);
        return;
      default:
        if (ANNOTATION_TYPES.has(e.type) || e.type === "LINE" || e.type === "CIRCLE") res.ignored2d++;
        else res.ignored2d++;
    }
  };
  const polyline = (e, M, flip, layer, color) => {
    const P = e.pairs;
    const flags = num(P, 70, 0);
    const verts = e.children ?? [];
    const g = groupFor(layer, color);
    if (flags & 64) {
      const coords = [];
      for (const v of verts) {
        const vf = num(v.pairs, 70, 0);
        if (vf & 128 && vf & 64) coords.push([num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 30, 0)]);
      }
      for (const v of verts) {
        const vf = num(v.pairs, 70, 0);
        if (vf & 128 && !(vf & 64)) {
          const idx = [71, 72, 73, 74].map((c) => Math.abs(num(v.pairs, c, 0))).filter((i2) => i2 > 0);
          const poly = idx.map((i2) => coords[i2 - 1]).filter(Boolean);
          if (poly.length >= 3) fan(g, M, flip, poly);
        }
      }
      return;
    }
    if (flags & 16) {
      const m = num(P, 71, 0), n = num(P, 72, 0);
      const grid = verts.map((v) => [num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 30, 0)]);
      if (m < 2 || n < 2 || grid.length < m * n) return;
      const closedM = (flags & 1) === 1, closedN = (flags & 32) === 32;
      const at = (i2, j) => grid[i2 % m * n + j % n];
      for (let i2 = 0; i2 < (closedM ? m : m - 1); i2++)
        for (let j = 0; j < (closedN ? n : n - 1); j++)
          quad(g, M, flip, at(i2, j), at(i2, j + 1), at(i2 + 1, j + 1), at(i2 + 1, j));
      return;
    }
    if (flags & 8) {
      res.ignored2d++;
      return;
    }
    const thickness = num(P, 39, 0);
    if (thickness === 0) {
      res.ignored2d++;
      return;
    }
    const elev = num(P, 30, 0);
    const raw = verts.map((v) => [num(v.pairs, 10, 0), num(v.pairs, 20, 0), num(v.pairs, 42, 0)]);
    const ext = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    const ring = bulgeRing(raw, (flags & 1) === 1, elev);
    walls(g, mul(M, ocsMatrix(ext)), flip, ring.pts, ring.closed, thickness);
  };
  const mesh = (e, M, flip, g) => {
    const P = e.pairs;
    if (num(P, 91, 0) > 0) res.meshWithSubdivision++;
    if (e.mesh) {
      const V = e.mesh.verts, L = e.mesh.list, nv = V.length / 3;
      for (let k = 0; k < L.length; ) {
        const n = L[k++];
        if (n <= 0) break;
        const poly = [];
        for (let j = 0; j < n && k + j < L.length; j++) {
          const vi = L[k + j];
          if (vi >= 0 && vi < nv) poly.push([V[vi * 3], V[vi * 3 + 1], V[vi * 3 + 2]]);
        }
        k += n;
        if (poly.length >= 3) fan(g, M, flip, poly);
      }
      return;
    }
    let i2 = 0;
    const vCount = (() => {
      for (; i2 < P.length; i2++) if (P[i2][0] === 92) return parseInt(P[i2++][1], 10);
      return 0;
    })();
    const vs = [];
    while (i2 < P.length && vs.length < vCount) {
      if (P[i2][0] === 10) {
        vs.push([parseFloat(P[i2][1]), parseFloat(P[i2 + 1]?.[1] ?? "0"), parseFloat(P[i2 + 2]?.[1] ?? "0")]);
        i2 += 3;
      } else i2++;
    }
    for (; i2 < P.length; i2++) if (P[i2][0] === 93) {
      i2++;
      break;
    }
    const list = [];
    for (; i2 < P.length && P[i2][0] === 90; i2++) list.push(parseInt(P[i2][1], 10));
    for (let k = 0; k < list.length; ) {
      const n = list[k++];
      const poly = list.slice(k, k + n).map((j) => vs[j]).filter(Boolean);
      k += n;
      if (poly.length >= 3) fan(g, M, flip, poly);
    }
  };
  const insert = (e, M, ctx, layer, color) => {
    const P = e.pairs;
    const name = str(P, 2);
    const block = dxf.blocks.get(name.toUpperCase());
    if (!block) {
      missing.add(name);
      return;
    }
    if (ctx.depth > 32 || ctx.stack.includes(name.toUpperCase())) {
      res.recursionCut++;
      return;
    }
    const ext = [num(P, 210, 0), num(P, 220, 0), num(P, 230, 1)];
    const ins = [num(P, 10, 0), num(P, 20, 0), num(P, 30, 0)];
    const sx = num(P, 41, 1), sy = num(P, 42, 1), sz = num(P, 43, 1);
    const rot = num(P, 50, 0) * Math.PI / 180;
    const cols = Math.max(1, num(P, 70, 1)), rows = Math.max(1, num(P, 71, 1));
    const cs = num(P, 44, 0), rs = num(P, 45, 0);
    const base = mul(M, ocsMatrix(ext));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        let T = mul(base, translate(ins[0], ins[1], ins[2]));
        T = mul(T, rotZ(rot));
        T = mul(T, translate(c * cs, r * rs, 0));
        T = mul(T, scale(sx, sy, sz));
        T = mul(T, translate(-block.base[0], -block.base[1], -block.base[2]));
        const child = { layer, color, material: ctx.material, depth: ctx.depth + 1, stack: [...ctx.stack, name.toUpperCase()] };
        for (const be of block.entities) visit(be, T, child);
      }
  };
  const root = { layer: "0", color: 16777215, depth: 0, stack: [] };
  for (const e of dxf.entities) visit(e, identity(), root);
  res.acis = [...acisCount.entries()].map(([type, count2]) => ({ type, count: count2, layers: [...acisMap.get(type)] }));
  res.missingBlocks = [...missing];
  return res;
  function fan(g, M, flip, poly) {
    const p = dedupeRing(poly);
    if (p.length < 3) return;
    if (p.length === 3 || p.length === 4) {
      emit(g, M, flip, p[0], p[1], p[2]);
      if (p.length === 4) emit(g, M, flip, p[0], p[2], p[3]);
      return;
    }
    for (const [a, b, c] of earClip(p)) emit(g, M, flip, p[a], p[b], p[c]);
  }
  function walls(g, O, flip, ring, closed, h) {
    const n = ring.length;
    for (let i2 = 0; i2 < (closed ? n : n - 1); i2++) {
      const a = ring[i2], b = ring[(i2 + 1) % n];
      quad(g, O, flip, a, b, [b[0], b[1], b[2] + h], [a[0], a[1], a[2] + h]);
    }
  }
  function prism(g, O, flip, ring, h, caps) {
    walls(g, O, flip, ring, true, h);
    if (caps) {
      fan(g, O, !flip, ring);
      fan(g, O, flip, ring.map((p) => [p[0], p[1], p[2] + h]));
    }
  }
}
function pts(P, n) {
  const out = [];
  for (let i2 = 0; i2 < n; i2++) out.push([num(P, 10 + i2, 0), num(P, 20 + i2, 0), num(P, 30 + i2, 0)]);
  return out;
}
function same(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9 && Math.abs(a[2] - b[2]) < 1e-9;
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function dedupeRing(p) {
  const out = [];
  for (const v of p) if (!out.length || !same(out[out.length - 1], v)) out.push(v);
  if (out.length > 1 && same(out[0], out[out.length - 1])) out.pop();
  return out;
}
function bulgeRing(v, closed, elev) {
  const out = [];
  const n = v.length;
  for (let i2 = 0; i2 < n; i2++) {
    const [x2, y, bulge] = v[i2];
    out.push([x2, y, elev]);
    const isLast = i2 === n - 1;
    if (Math.abs(bulge) > 1e-9 && (!isLast || closed)) {
      const [x22, y2] = v[(i2 + 1) % n];
      const theta = 4 * Math.atan(bulge);
      const chord = Math.hypot(x22 - x2, y2 - y);
      if (chord < 1e-12) continue;
      const r = chord / (2 * Math.sin(theta / 2));
      const mx = (x2 + x22) / 2, my = (y + y2) / 2;
      const d = r * Math.cos(theta / 2);
      const nx = -(y2 - y) / chord, ny = (x22 - x2) / chord;
      const cx = mx + nx * d, cy = my + ny * d;
      const a0 = Math.atan2(y - cy, x2 - cx);
      const segs = Math.max(2, Math.ceil(ARC_SEGMENTS * Math.abs(theta) / Math.PI));
      for (let s = 1; s < segs; s++) {
        const a = a0 + theta * s / segs;
        out.push([cx + Math.abs(r) * Math.cos(a), cy + Math.abs(r) * Math.sin(a), elev]);
      }
    }
  }
  return { pts: out, closed };
}
function earClip(p) {
  let nx = 0, ny = 0, nz = 0;
  for (let i2 = 0; i2 < p.length; i2++) {
    const a = p[i2], b = p[(i2 + 1) % p.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  const [u, w] = az >= ax && az >= ay ? [0, 1] : ax >= ay ? [1, 2] : [2, 0];
  const sign = (az >= ax && az >= ay ? nz : ax >= ay ? nx : ny) >= 0 ? 1 : -1;
  const q = p.map((v) => [v[u], v[w]]);
  const idx = p.map((_, i2) => i2);
  const tris = [];
  const area2 = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * sign;
  const inside = (pt, a, b, c) => area2(a, b, pt) >= 0 && area2(b, c, pt) >= 0 && area2(c, a, pt) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 1e4) {
    let clipped = false;
    for (let i2 = 0; i2 < idx.length; i2++) {
      const i0 = idx[(i2 + idx.length - 1) % idx.length], i1 = idx[i2], i22 = idx[(i2 + 1) % idx.length];
      if (area2(q[i0], q[i1], q[i22]) <= 0) continue;
      let ok = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i22) continue;
        if (inside(q[j], q[i0], q[i1], q[i22])) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      tris.push([i0, i1, i22]);
      idx.splice(i2, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  else for (let i2 = 1; i2 + 1 < idx.length; i2++) tris.push([idx[0], idx[i2], idx[i2 + 1]]);
  return tris;
}

// src/core/simplify.ts
var DENSE = 40;
var MIN_TRIS = 300;
function surfaceArea(p) {
  const P = p.positions, I = p.indices;
  let s = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    s += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return s;
}
function clusterPart(p, cell) {
  const P = p.positions, I = p.indices, nv = P.length / 3;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i2 = 0; i2 < P.length; i2 += 3) {
    if (P[i2] < x0) x0 = P[i2];
    if (P[i2 + 1] < y0) y0 = P[i2 + 1];
    if (P[i2 + 2] < z0) z0 = P[i2 + 2];
    if (P[i2] > x1) x1 = P[i2];
    if (P[i2 + 1] > y1) y1 = P[i2 + 1];
  }
  const nx = Math.floor((x1 - x0) / cell) + 1, ny = Math.floor((y1 - y0) / cell) + 1;
  const rep = new Int32Array(nv);
  const cells = /* @__PURE__ */ new Map();
  for (let v = 0; v < nv; v++) {
    const k = (Math.floor((P[v * 3 + 2] - z0) / cell) * ny + Math.floor((P[v * 3 + 1] - y0) / cell)) * nx + Math.floor((P[v * 3] - x0) / cell);
    const r = cells.get(k);
    if (r === void 0) {
      cells.set(k, v);
      rep[v] = v;
    } else rep[v] = r;
  }
  const keep = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = rep[I[t]], b = rep[I[t + 1]], c = rep[I[t + 2]];
    if (a !== b && b !== c && a !== c) keep.push(t);
  }
  if (keep.length * 3 === I.length) return p;
  const map = new Int32Array(nv).fill(-1);
  let n = 0;
  const idx = new Uint32Array(keep.length * 3);
  for (let i2 = 0; i2 < keep.length; i2++) for (let k = 0; k < 3; k++) {
    const v = I[keep[i2] + k];
    if (map[v] < 0) map[v] = n++;
    idx[i2 * 3 + k] = map[v];
  }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let v = 0; v < nv; v++) {
    const m = map[v];
    if (m < 0) continue;
    const r = rep[v];
    pos[m * 3] = P[r * 3];
    pos[m * 3 + 1] = P[r * 3 + 1];
    pos[m * 3 + 2] = P[r * 3 + 2];
    nrm[m * 3] = p.normals[v * 3];
    nrm[m * 3 + 1] = p.normals[v * 3 + 1];
    nrm[m * 3 + 2] = p.normals[v * 3 + 2];
    uv[m * 2] = p.uvs[v * 2];
    uv[m * 2 + 1] = p.uvs[v * 2 + 1];
  }
  return { ...p, positions: pos, normals: nrm, uvs: uv, indices: idx };
}
var triangleCount = (parts) => parts.reduce((n, p) => n + p.indices.length / 3, 0);
function simplifyToBudget(parts, budget) {
  const before = triangleCount(parts);
  if (before <= budget) return { parts, before, after: before, cell: 0 };
  const info = parts.map((p) => {
    const tris = p.indices.length / 3;
    const a = tris > MIN_TRIS ? surfaceArea(p) : 0;
    return { tris, area: a, dense: tris > MIN_TRIS && tris / Math.max(a, 1e-6) > DENSE };
  });
  const fixed = info.reduce((n, x2) => n + (x2.dense ? 0 : x2.tris), 0);
  const denseArea = info.reduce((n, x2) => n + (x2.dense ? x2.area : 0), 0);
  if (!denseArea) return { parts, before, after: before, cell: 0 };
  const target = Math.max(budget - fixed, budget * 0.25);
  let cell = Math.min(0.15, Math.max(0.01, Math.sqrt(2 * denseArea / target)));
  let out = parts, after = before;
  for (let attempt = 0; attempt < 4; attempt++) {
    out = parts.map((p, i2) => info[i2].dense ? clusterPart(p, cell) : p);
    after = triangleCount(out);
    if (after <= budget * 1.1 || cell >= 0.15) break;
    cell = Math.min(0.15, cell * Math.sqrt(after / budget) * 1.1);
  }
  return { parts: out, before, after, cell };
}

// src/core/dxf/import.ts
var UNITS = {
  1: ["Zoll", 0.0254],
  2: ["Fu\xDF", 0.3048],
  4: ["Millimeter", 1e-3],
  5: ["Zentimeter", 0.01],
  6: ["Meter", 1],
  7: ["Kilometer", 1e3],
  10: ["Yard", 0.9144],
  14: ["Dezimeter", 0.1]
};
var UNIT_CHOICES = [
  ["Millimeter", 1e-3],
  ["Zentimeter", 0.01],
  ["Meter", 1],
  ["Zoll", 0.0254],
  ["Fu\xDF", 0.3048]
];
function plausibleMeters(extentM) {
  return extentM >= 2 && extentM <= 2e3;
}
function guessUnits(rawExtent) {
  let best = UNIT_CHOICES[2];
  let bestScore = Infinity;
  for (const u of [UNIT_CHOICES[0], UNIT_CHOICES[1], UNIT_CHOICES[2]]) {
    const m = rawExtent * u[1];
    const score = Math.abs(Math.log10(Math.max(m, 1e-9)) - Math.log10(30));
    if (score < bestScore) {
      bestScore = score;
      best = u;
    }
  }
  return best;
}
function importDxf(input, opts = {}) {
  const progress = opts.onProgress ?? (() => {
  });
  progress(0.05, "Datei wird gelesen");
  const raw = readDxf(input, (f2) => progress(0.05 + 0.25 * f2, "Datei wird gelesen"));
  progress(0.3, "Geometrie wird rekonstruiert");
  let weldCell;
  if (estimateTriangles(raw) > LARGE_MODEL_TRIANGLES) {
    const code = num(raw.header.get("$INSUNITS") ?? [], 70, 0);
    const toM = opts.unitsToMeters ?? UNITS[code]?.[1] ?? guessUnits(roughExtent(raw))[1];
    weldCell = 0.01 / toM;
  }
  const built = buildGeometry(raw, { weldCell });
  progress(0.6, "Modell wird optimiert");
  return finalize(built, raw.header.get("$INSUNITS"), raw.version, opts, progress, raw.materials);
}
function finalize(b, insunitsPairs, version, opts, progress, rawMaterials = /* @__PURE__ */ new Map()) {
  const warnings = [];
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of b.groups.values()) {
    const arr = g.weld ? g.weld.pos.view() : g.tris;
    for (let i2 = 0; i2 < arr.length; i2 += 3)
      for (let k = 0; k < 3; k++) {
        const v = arr[i2 + k];
        if (v < mn[k]) mn[k] = v;
        if (v > mx[k]) mx[k] = v;
      }
  }
  const hasGeo = Number.isFinite(mn[0]);
  const rawExtent = hasGeo ? Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) : 0;
  const code = insunitsPairs ? num(insunitsPairs, 70, 0) : 0;
  let units;
  if (opts.unitsToMeters) {
    const n = UNIT_CHOICES.find((u) => u[1] === opts.unitsToMeters)?.[0] ?? "Benutzerdefiniert";
    units = { name: n, toMeters: opts.unitsToMeters, source: "user", rawExtent, plausible: plausibleMeters(rawExtent * opts.unitsToMeters) };
  } else if (UNITS[code]) {
    const [n, f2] = UNITS[code];
    units = { name: n, toMeters: f2, source: "header", rawExtent, plausible: plausibleMeters(rawExtent * f2) };
    if (hasGeo && !units.plausible) {
      const [gn] = guessUnits(rawExtent);
      warnings.push({
        code: "units-implausible",
        message: `Die Datei gibt \u201E${n}\u201C als Einheit an, dann w\xE4re das Geb\xE4ude ${fmtLen(rawExtent * f2)} gro\xDF. Vermutlich ist \u201E${gn}\u201C richtig \u2013 bitte pr\xFCfen.`
      });
    }
  } else {
    const [n, f2] = guessUnits(rawExtent);
    units = { name: n, toMeters: f2, source: "guess", rawExtent, plausible: plausibleMeters(rawExtent * f2) };
    if (hasGeo)
      warnings.push({
        code: "units-guessed",
        message: `Die Datei enth\xE4lt keine Einheit. ARCHVISTA hat \u201E${n}\u201C erkannt (Geb\xE4udegr\xF6\xDFe ${fmtLen(rawExtent * f2)}). Bei Bedarf mit einem Klick \xE4ndern.`
      });
  }
  const s = units.toMeters;
  const origin = hasGeo ? [(mn[0] + mx[0]) / 2 * s, mn[2] * s, -((mn[1] + mx[1]) / 2) * s] : [0, 0, 0];
  let removedDegenerate = 0, removedDuplicate = 0, flipped = 0, outward = 0;
  const meshes = [];
  const layerMap = /* @__PURE__ */ new Map();
  const bmin = [Infinity, Infinity, Infinity];
  const bmax = [-Infinity, -Infinity, -Infinity];
  let gi = 0;
  const groups = [...b.groups.values()];
  const welded = groups.filter((g) => g.weld);
  if (welded.length) {
    const parts = welded.map((g) => {
      const w = g.weld, P = w.pos.view();
      const positions = new Float32Array(P.length);
      for (let i2 = 0; i2 < P.length; i2 += 3) {
        positions[i2] = P[i2] * s - origin[0];
        positions[i2 + 1] = P[i2 + 2] * s - origin[1];
        positions[i2 + 2] = -P[i2 + 1] * s - origin[2];
      }
      removedDegenerate += w.dropped;
      const dd = dedupeTriangles(w.idx.view());
      removedDuplicate += dd.removed;
      const indices = dd.indices;
      g.weld = void 0;
      return { g, positions, normals: new Float32Array(positions.length), uvs: new Float32Array(positions.length / 3 * 2), indices };
    });
    const otherTris = groups.reduce((n, g) => n + (g.weld ? 0 : g.tris.length / 9), 0);
    const reduced = simplifyToBudget(parts, Math.max(IMPORT_BUDGET - otherTris, IMPORT_BUDGET / 4)).parts;
    for (const p of reduced) {
      if (!p.indices.length) continue;
      if (p.indices.length / 3 <= 15e5) {
        const r = orientConsistently(p.positions, p.indices);
        flipped += r.flipped;
        outward += r.outward;
      }
      const flat = flatten(p.positions, p.indices);
      for (let i2 = 0; i2 < flat.positions.length; i2 += 3)
        for (let k = 0; k < 3; k++) {
          if (flat.positions[i2 + k] < bmin[k]) bmin[k] = flat.positions[i2 + k];
          if (flat.positions[i2 + k] > bmax[k]) bmax[k] = flat.positions[i2 + k];
        }
      const g = p.g;
      meshes.push({ id: `m${gi++}`, layer: g.layer, color: g.color, ...g.material ? { material: g.material } : {}, positions: flat.positions, normals: flat.normals, indices: flat.indices, triangleCount: flat.indices.length / 3 });
      const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
      li.triangleCount += flat.indices.length / 3;
      layerMap.set(g.layer, li);
    }
    warnings.push({ code: "large-model", message: `Sehr gro\xDFes Modell: Feine Details (z. B. M\xF6bel) wurden beim Einlesen vereinfacht, damit es fl\xFCssig bleibt. W\xE4nde, B\xF6den und D\xE4cher bleiben exakt.` });
  }
  for (const g of groups) {
    if (g.tris.length === 0 && !g.weld) continue;
    progress(0.6 + 0.35 * gi / Math.max(1, groups.length), "Modell wird optimiert");
    const tri = g.tris;
    const pos = [];
    const idx = [];
    const weld = /* @__PURE__ */ new Map();
    const seen = /* @__PURE__ */ new Set();
    const vid = (x2, y, z) => {
      const X = x2 * s - origin[0], Y = z * s - origin[1], Z = -y * s - origin[2];
      const key = `${Math.round(X * 1e4)},${Math.round(Y * 1e4)},${Math.round(Z * 1e4)}`;
      let i2 = weld.get(key);
      if (i2 === void 0) {
        i2 = pos.length / 3;
        pos.push(X, Y, Z);
        weld.set(key, i2);
      }
      return i2;
    };
    for (let i2 = 0; i2 < tri.length; i2 += 9) {
      const a = vid(tri[i2], tri[i2 + 1], tri[i2 + 2]);
      const bb = vid(tri[i2 + 3], tri[i2 + 4], tri[i2 + 5]);
      const c = vid(tri[i2 + 6], tri[i2 + 7], tri[i2 + 8]);
      if (a === bb || bb === c || a === c || triArea(pos, a, bb, c) < 1e-8) {
        removedDegenerate++;
        continue;
      }
      const key = [a, bb, c].sort((x2, y) => x2 - y).join(",");
      if (seen.has(key)) {
        removedDuplicate++;
        continue;
      }
      seen.add(key);
      idx.push(a, bb, c);
    }
    if (!idx.length) continue;
    const r = orientConsistently(pos, idx);
    flipped += r.flipped;
    outward += r.outward;
    const split = splitByCrease(pos, idx, 35);
    const positions = split.positions;
    const indices = split.indices;
    for (let i2 = 0; i2 < positions.length; i2 += 3)
      for (let k = 0; k < 3; k++) {
        if (positions[i2 + k] < bmin[k]) bmin[k] = positions[i2 + k];
        if (positions[i2 + k] > bmax[k]) bmax[k] = positions[i2 + k];
      }
    meshes.push({
      id: `m${gi++}`,
      layer: g.layer,
      color: g.color,
      ...g.material ? { material: g.material } : {},
      positions,
      normals: split.normals,
      indices,
      triangleCount: indices.length / 3
    });
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }
  for (const a of b.acis) {
    warnings.push({
      code: "acis",
      message: `${a.count}\xD7 ${a.type} (ACIS-Volumenk\xF6rper) auf Layer ${a.layers.join(", ")} kann nicht gelesen werden. Diese Teile fehlen im Modell.`,
      detail: "acis-fix"
    });
  }
  if (b.meshWithSubdivision)
    warnings.push({ code: "mesh-subd", message: `${b.meshWithSubdivision} Netzobjekte sind gegl\xE4ttet (Gl\xE4ttungsstufe > 0). \xDCbernommen wird das ungegl\xE4ttete Grundnetz.` });
  if (b.missingBlocks.length)
    warnings.push({ code: "missing-block", message: `Fehlende Blockdefinitionen: ${b.missingBlocks.slice(0, 5).join(", ")}${b.missingBlocks.length > 5 ? " \u2026" : ""}` });
  if (b.skippedHiddenLayers)
    warnings.push({ code: "hidden-layers", message: `${b.skippedHiddenLayers} Objekte auf ausgeschalteten oder gefrorenen Layern wurden nicht \xFCbernommen.` });
  if (b.recursionCut)
    warnings.push({ code: "recursion", message: `${b.recursionCut} sich selbst enthaltende Blockeinf\xFCgungen wurden \xFCbersprungen.` });
  const triangles = meshes.reduce((n, m) => n + m.triangleCount, 0);
  const vertices = meshes.reduce((n, m) => n + m.positions.length / 3, 0);
  const ok = triangles > 0;
  if (!ok) {
    warnings.unshift({
      code: "no-3d",
      message: b.acis.length ? "Die Datei enth\xE4lt nur ACIS-Volumenk\xF6rper, die ohne AutoCAD nicht gelesen werden k\xF6nnen. Bitte die Korrektur-Anleitung befolgen." : "In der Datei wurde keine 3D-Geometrie gefunden (nur 2D-Linien, Texte oder Bema\xDFungen).",
      detail: b.acis.length ? "acis-fix" : void 0
    });
  }
  const usedNames = new Set(meshes.map((m) => m.material).filter(Boolean));
  const materials = [];
  for (const rm of rawMaterials.values()) {
    if (!usedNames.has(rm.name) || materials.some((x2) => x2.name === rm.name)) continue;
    const file = rm.diffuseMap?.split(/[\\/]/).pop()?.trim();
    materials.push({
      name: rm.name,
      ...rm.description ? { description: rm.description } : {},
      ...rm.diffuse !== void 0 ? { color: rm.diffuse } : {},
      ...file ? { map: file } : {},
      ...rm.mapScaleU ? { mapSize: rm.mapScaleU * units.toMeters } : {},
      ...rm.opacity !== void 0 && rm.opacity < 1 ? { opacity: rm.opacity } : {}
    });
  }
  progress(1, "Fertig");
  return {
    meshes,
    materials,
    layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
    units,
    origin,
    bbox: ok ? { min: bmin, max: bmax } : { min: [0, 0, 0], max: [0, 0, 0] },
    stats: {
      version,
      entityCounts: b.entityCounts,
      triangles,
      vertices,
      removedDegenerate,
      removedDuplicate,
      flippedForConsistency: flipped,
      closedShellsOutward: outward
    },
    warnings,
    ok
  };
}
function flatten(P, I) {
  const n = I.length / 3;
  const positions = new Float32Array(n * 9), normals = new Float32Array(n * 9), indices = new Uint32Array(n * 3);
  for (let t = 0; t < n; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    for (let k = 0; k < 3; k++) {
      const src2 = k === 0 ? a : k === 1 ? b : c, o = t * 9 + k * 3;
      positions[o] = P[src2];
      positions[o + 1] = P[src2 + 1];
      positions[o + 2] = P[src2 + 2];
      normals[o] = nx;
      normals[o + 1] = ny;
      normals[o + 2] = nz;
      indices[t * 3 + k] = t * 3 + k;
    }
  }
  return { positions, normals, indices };
}
function fmtLen(m) {
  if (m >= 1e3) return `${(m / 1e3).toFixed(1)} km`;
  if (m >= 1) return `${m.toFixed(1)} m`;
  return `${(m * 100).toFixed(1)} cm`;
}
function triArea(p, a, b, c) {
  const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
  return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}
function orientConsistently(pos, idx) {
  const n = idx.length / 3;
  const edges = /* @__PURE__ */ new Map();
  const nv = pos.length / 3;
  const ek = (a, b) => a < b ? a * nv + b : b * nv + a;
  for (let t = 0; t < n; t++)
    for (let k = 0; k < 3; k++) {
      const key = ek(idx[t * 3 + k], idx[t * 3 + (k + 1) % 3]);
      const l = edges.get(key);
      if (l) l.push(t);
      else edges.set(key, [t]);
    }
  const dirOf = (t, a, b) => {
    for (let k = 0; k < 3; k++) if (idx[t * 3 + k] === a && idx[t * 3 + (k + 1) % 3] === b) return 1;
    return -1;
  };
  const flip = (t) => {
    const x2 = idx[t * 3 + 1];
    idx[t * 3 + 1] = idx[t * 3 + 2];
    idx[t * 3 + 2] = x2;
  };
  const comp = new Int32Array(n).fill(-1);
  let flipped = 0, outward = 0, cid = 0;
  for (let s = 0; s < n; s++) {
    if (comp[s] !== -1) continue;
    const members = [s];
    comp[s] = cid;
    let closed = true;
    for (let qi = 0; qi < members.length; qi++) {
      const t = members[qi];
      for (let k = 0; k < 3; k++) {
        const a = idx[t * 3 + k], b = idx[t * 3 + (k + 1) % 3];
        const list = edges.get(ek(a, b));
        if (list.length > 2) continue;
        for (const u of list) {
          if (u === t || comp[u] !== -1) continue;
          if (dirOf(u, a, b) === 1) {
            flip(u);
            flipped++;
          }
          comp[u] = cid;
          members.push(u);
        }
      }
    }
    const cnt = /* @__PURE__ */ new Map();
    for (const t of members)
      for (let k = 0; k < 3; k++) {
        const key = ek(idx[t * 3 + k], idx[t * 3 + (k + 1) % 3]);
        cnt.set(key, (cnt.get(key) ?? 0) + 1);
      }
    for (const c of cnt.values()) if (c !== 2) {
      closed = false;
      break;
    }
    if (closed && members.length >= 4) {
      let vol = 0;
      for (const t of members) {
        const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
        vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
      }
      if (vol < 0) {
        for (const t of members) flip(t);
      }
      outward++;
    }
    cid++;
  }
  return { flipped, outward };
}
function splitByCrease(pos, idx, creaseDeg) {
  const nt = idx.length / 3;
  const fn = new Float64Array(nt * 3);
  const fa = new Float64Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    fn[t * 3] = nx / l;
    fn[t * 3 + 1] = ny / l;
    fn[t * 3 + 2] = nz / l;
    fa[t] = l;
  }
  const cos = Math.cos(creaseDeg * Math.PI / 180);
  const nv = pos.length / 3;
  const inc = Array.from({ length: nv }, () => []);
  for (let i2 = 0; i2 < idx.length; i2++) inc[idx[i2]].push(i2);
  const outP = [], outN = [];
  const outI = new Uint32Array(idx.length);
  for (let v = 0; v < nv; v++) {
    const clusters = [];
    for (const corner of inc[v]) {
      const t = corner / 3 | 0;
      const n = [fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2]];
      let cl = clusters.find((c) => c.n[0] * n[0] + c.n[1] * n[1] + c.n[2] * n[2] > cos);
      if (!cl) {
        cl = { n, acc: [0, 0, 0], id: outP.length / 3 };
        clusters.push(cl);
        outP.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        outN.push(0, 0, 0);
      }
      cl.acc[0] += n[0] * fa[t];
      cl.acc[1] += n[1] * fa[t];
      cl.acc[2] += n[2] * fa[t];
      outI[corner] = cl.id;
    }
    for (const c of clusters) {
      const l = Math.hypot(...c.acc) || 1;
      outN[c.id * 3] = c.acc[0] / l;
      outN[c.id * 3 + 1] = c.acc[1] / l;
      outN[c.id * 3 + 2] = c.acc[2] / l;
    }
  }
  return { positions: new Float32Array(outP), normals: new Float32Array(outN), indices: outI };
}

// src/core/tds/import.ts
var C = {
  MAIN: 19789,
  EDITOR: 15677,
  OBJECT: 16384,
  HIDDEN: 16400,
  TRIMESH: 16640,
  VERTICES: 16656,
  FACES: 16672,
  FACE_MAT: 16688,
  MATERIAL: 45055,
  MAT_NAME: 40960,
  MAT_DIFFUSE: 40992,
  MAT_TRANSPARENCY: 41040,
  MAT_TEXMAP: 41472,
  MAP_NAME: 41728,
  COLOR_F: 16,
  COLOR_24: 17,
  LIN_COLOR_24: 18,
  LIN_COLOR_F: 19,
  PERCENT_I: 48,
  PERCENT_F: 49
};
var TdsFormatError = class extends Error {
};
function importTds(bytes, opts = {}) {
  const progress = opts.onProgress ?? (() => {
  });
  progress(0.05, "3DS-Datei wird gelesen");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 6 || dv.getUint16(0, true) !== C.MAIN) throw new TdsFormatError("Das ist keine g\xFCltige 3DS-Datei.");
  const chunk = (at, limit) => {
    if (at + 6 > limit) return null;
    const len = dv.getUint32(at + 2, true);
    if (len < 6 || at + len > limit) return null;
    return { id: dv.getUint16(at, true), start: at + 6, end: at + len };
  };
  const children = (c, from = c.start) => {
    const out = [];
    for (let p = from; p < c.end; ) {
      const k = chunk(p, c.end);
      if (!k) break;
      out.push(k);
      p = k.end;
    }
    return out;
  };
  const cstr = (at, limit) => {
    let e = at;
    while (e < limit && bytes[e] !== 0) e++;
    return [new TextDecoder("latin1").decode(bytes.subarray(at, e)), e + 1];
  };
  const color = (c) => {
    let best;
    for (const k of children(c)) {
      if (k.id === C.COLOR_24 || k.id === C.LIN_COLOR_24) best = bytes[k.start] << 16 | bytes[k.start + 1] << 8 | bytes[k.start + 2];
      else if (k.id === C.COLOR_F || k.id === C.LIN_COLOR_F) {
        const f2 = (i2) => Math.max(0, Math.min(255, Math.round(dv.getFloat32(k.start + i2 * 4, true) * 255)));
        best = f2(0) << 16 | f2(1) << 8 | f2(2);
      }
      if (best !== void 0 && (k.id === C.COLOR_24 || k.id === C.COLOR_F)) break;
    }
    return best;
  };
  const percent = (c) => {
    for (const k of children(c)) {
      if (k.id === C.PERCENT_I) return dv.getInt16(k.start, true);
      if (k.id === C.PERCENT_F) return dv.getFloat32(k.start, true);
    }
    return void 0;
  };
  const root = chunk(0, bytes.length);
  if (!root) throw new TdsFormatError("Die 3DS-Datei ist besch\xE4digt.");
  const editor = children(root).find((k) => k.id === C.EDITOR);
  if (!editor) throw new TdsFormatError("Die 3DS-Datei enth\xE4lt keine 3D-Daten.");
  const materials = /* @__PURE__ */ new Map();
  const groups = /* @__PURE__ */ new Map();
  let objects = 0, hidden = 0, faces = 0;
  const editorItems = children(editor);
  for (const m of editorItems.filter((k) => k.id === C.MATERIAL)) {
    const rm = { handle: "", name: "" };
    for (const k of children(m)) {
      if (k.id === C.MAT_NAME) rm.name = cstr(k.start, k.end)[0];
      else if (k.id === C.MAT_DIFFUSE) {
        const c = color(k);
        if (c !== void 0) rm.diffuse = c;
      } else if (k.id === C.MAT_TRANSPARENCY) {
        const t = percent(k);
        if (t !== void 0 && t > 0) rm.opacity = Math.max(0, Math.min(1, 1 - t / 100));
      } else if (k.id === C.MAT_TEXMAP) {
        for (const s of children(k)) if (s.id === C.MAP_NAME) {
          const n = cstr(s.start, s.end)[0].trim();
          if (n) rm.diffuseMap = n;
        }
      }
    }
    if (!rm.name) continue;
    rm.handle = rm.name.toUpperCase();
    materials.set(rm.handle, rm);
  }
  const groupFor = (layer, mat) => {
    const rm = mat ? materials.get(mat.toUpperCase()) : void 0;
    const color2 = rm?.diffuse ?? 13421772;
    const key = `${layer}\0${mat ?? ""}`;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { layer, color: color2, material: rm ? rm.name : void 0, tris: [], ...weldCell ? { weld: new Welder(weldCell) } : {} });
    return g;
  };
  const objs = editorItems.filter((k) => k.id === C.OBJECT);
  const generic = (n) => /^(object|obj|mesh|m|g|box|line)?[\s_#-]*\d+$/i.test(n.trim()) || !n.trim();
  const sample = objs.slice(0, 500).map((o) => cstr(o.start, o.end)[0]);
  const byMaterial = objs.length > 2e3 && sample.filter(generic).length > sample.length * 0.8;
  const faceMatName = (fm) => {
    for (const m of fm) if (m) return materials.get(m.toUpperCase())?.name ?? m;
    return void 0;
  };
  let weldCell;
  {
    let total = 0;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    const meshes = [];
    for (const o of objs) {
      const [, after] = cstr(o.start, o.end);
      for (const tm of children(o, after)) if (tm.id === C.TRIMESH) {
        const fc = children(tm).find((k) => k.id === C.FACES);
        if (fc) total += dv.getUint16(fc.start, true);
        meshes.push(tm);
      }
    }
    if (total > LARGE_MODEL_TRIANGLES) {
      for (const tm of meshes) {
        const vc = children(tm).find((k) => k.id === C.VERTICES);
        if (!vc) continue;
        const nv = dv.getUint16(vc.start, true);
        for (let i2 = 0; i2 < nv && vc.start + 2 + i2 * 12 + 12 <= vc.end; i2 += 7) for (let k = 0; k < 3; k++) {
          const v = dv.getFloat32(vc.start + 2 + i2 * 12 + k * 4, true);
          if (v < mn[k]) mn[k] = v;
          if (v > mx[k]) mx[k] = v;
        }
      }
      const ext = Number.isFinite(mn[0]) ? Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) : 0;
      weldCell = 0.01 / (opts.unitsToMeters ?? guessUnits(ext)[1]);
    }
  }
  objs.forEach((o, oi) => {
    if (oi % 50 === 0) progress(0.1 + 0.4 * (oi / Math.max(1, objs.length)), "Objekte werden gelesen");
    const [name, after] = cstr(o.start, o.end);
    const parts = children(o, after);
    if (parts.some((k) => k.id === C.HIDDEN)) {
      hidden++;
      return;
    }
    for (const tm of parts.filter((k) => k.id === C.TRIMESH)) {
      objects++;
      const sub = children(tm);
      const vc = sub.find((k) => k.id === C.VERTICES), fc = sub.find((k) => k.id === C.FACES);
      if (!vc || !fc) continue;
      const nv = dv.getUint16(vc.start, true);
      const V = new Float32Array(nv * 3);
      for (let i2 = 0; i2 < nv * 3 && vc.start + 2 + i2 * 4 + 4 <= vc.end; i2++) V[i2] = dv.getFloat32(vc.start + 2 + i2 * 4, true);
      const nf = dv.getUint16(fc.start, true);
      const faceEnd = fc.start + 2 + nf * 8;
      const faceMat = new Array(nf).fill(void 0);
      for (const g of children(fc, faceEnd)) {
        if (g.id !== C.FACE_MAT) continue;
        const [mn, p] = cstr(g.start, g.end);
        const n = dv.getUint16(p, true);
        for (let i2 = 0; i2 < n; i2++) {
          const f2 = dv.getUint16(p + 2 + i2 * 2, true);
          if (f2 < nf) faceMat[f2] = mn;
        }
      }
      const layer = byMaterial ? faceMatName(faceMat) ?? "3DS" : name || `Objekt ${objects}`;
      for (let f2 = 0; f2 < nf; f2++) {
        const at = fc.start + 2 + f2 * 8;
        const a = dv.getUint16(at, true), b = dv.getUint16(at + 2, true), c = dv.getUint16(at + 4, true);
        if (a >= nv || b >= nv || c >= nv) continue;
        addTri(groupFor(layer, faceMat[f2]), V[a * 3], V[a * 3 + 1], V[a * 3 + 2], V[b * 3], V[b * 3 + 1], V[b * 3 + 2], V[c * 3], V[c * 3 + 1], V[c * 3 + 2]);
        faces++;
      }
    }
  });
  progress(0.55, "Modell wird optimiert");
  const built = {
    groups,
    entityCounts: { "3DS-Objekte": objects, "3DS-Dreiecke": faces },
    acis: [],
    ignored2d: 0,
    skippedHiddenLayers: hidden,
    meshWithSubdivision: 0,
    missingBlocks: [],
    recursionCut: 0
  };
  return finalize(built, void 0, "3DS", opts, progress, materials);
}

// src/core/materials.ts
var PRESETS = [
  { id: "plaster_white", label: { de: "Putz wei\xDF", en: "White plaster" }, color: "#d6d0c6", roughness: 0.92, metalness: 0, texture: "plaster", scale: 2.5 },
  { id: "plaster_warm", label: { de: "Putz warm", en: "Warm plaster" }, color: "#e6dccd", roughness: 0.92, metalness: 0, texture: "plaster", scale: 2.5 },
  { id: "concrete", label: { de: "Sichtbeton", en: "Exposed concrete" }, color: "#b8b5ae", roughness: 0.86, metalness: 0, texture: "concrete", scale: 3 },
  { id: "brick", label: { de: "Klinker", en: "Brick" }, color: "#9a5039", roughness: 0.88, metalness: 0, texture: "brick", scale: 1.2 },
  { id: "oak", label: { de: "Eichenparkett", en: "Oak parquet" }, color: "#b98b5c", roughness: 0.5, metalness: 0, texture: "wood", scale: 2, clearcoat: 0.15 },
  { id: "dark_wood", label: { de: "Nussholz", en: "Walnut" }, color: "#6a4831", roughness: 0.55, metalness: 0, texture: "wood", scale: 1.5 },
  { id: "timber_cladding", label: { de: "Holzschalung", en: "Timber cladding" }, color: "#9d7550", roughness: 0.8, metalness: 0, texture: "planks", scale: 1.6 },
  { id: "stone_tiles", label: { de: "Natursteinplatten", en: "Stone tiles" }, color: "#cbc4b7", roughness: 0.62, metalness: 0, texture: "tiles", scale: 1.2 },
  { id: "terrace_stone", label: { de: "Terrassenplatten", en: "Paving stone" }, color: "#a49d90", roughness: 0.8, metalness: 0, texture: "tiles", scale: 1 },
  { id: "roof_clay", label: { de: "Tondachziegel", en: "Clay roof tiles" }, color: "#9c4a33", roughness: 0.75, metalness: 0, texture: "roof", scale: 0.9 },
  { id: "roof_slate", label: { de: "Dach anthrazit", en: "Anthracite roof" }, color: "#3d4045", roughness: 0.7, metalness: 0, texture: "roof", scale: 0.9 },
  { id: "metal_anthracite", label: { de: "Metall anthrazit", en: "Anthracite metal" }, color: "#2e3135", roughness: 0.42, metalness: 0.6, texture: "none", scale: 1 },
  { id: "steel", label: { de: "Edelstahl", en: "Stainless steel" }, color: "#a3a8ad", roughness: 0.3, metalness: 1, texture: "none", scale: 1 },
  { id: "glass", label: { de: "Glas", en: "Glass" }, color: "#dfe9ee", roughness: 0.03, metalness: 0, texture: "none", scale: 1, transmission: 0.92, ior: 1.5, opacity: 0.35 },
  { id: "grass", label: { de: "Rasen", en: "Lawn" }, color: "#4f6b2c", roughness: 0.95, metalness: 0, texture: "grass", scale: 2 },
  { id: "lacquer_white", label: { de: "Lack wei\xDF", en: "White lacquer" }, color: "#f1f0ee", roughness: 0.38, metalness: 0, texture: "none", scale: 1, clearcoat: 0.3 },
  { id: "natural_stone", label: { de: "Naturstein", en: "Natural stone" }, color: "#9e968a", roughness: 0.85, metalness: 0, texture: "stone", scale: 2 },
  // ——— v1.1: more materials (photo textures from Poly Haven, CC0) ———
  { id: "stucco", label: { de: "Edelputz wei\xDF", en: "White stucco" }, color: "#e9e5de", roughness: 0.9, metalness: 0, texture: "plaster", scale: 2 },
  { id: "plaster_grey", label: { de: "Putz grau", en: "Grey plaster" }, color: "#a9a7a2", roughness: 0.9, metalness: 0, texture: "plaster", scale: 2 },
  { id: "painted_concrete", label: { de: "Beton gestrichen", en: "Painted concrete" }, color: "#d9d7d2", roughness: 0.8, metalness: 0, texture: "concrete", scale: 2 },
  { id: "concrete_smooth", label: { de: "Beton glatt", en: "Smooth concrete" }, color: "#bdbab4", roughness: 0.75, metalness: 0, texture: "concrete", scale: 3 },
  { id: "concrete_floor", label: { de: "Betonboden geschliffen", en: "Polished concrete floor" }, color: "#a8a59f", roughness: 0.45, metalness: 0, texture: "concrete", scale: 3, clearcoat: 0.25 },
  { id: "white_brick", label: { de: "Ziegel wei\xDF", en: "White brick" }, color: "#e3ded6", roughness: 0.88, metalness: 0, texture: "brick", scale: 1.5 },
  { id: "dark_brick", label: { de: "Klinker dunkel", en: "Dark brick" }, color: "#4a3a33", roughness: 0.85, metalness: 0, texture: "brick", scale: 1.5 },
  { id: "marble_white", label: { de: "Marmor wei\xDF", en: "White marble" }, color: "#ecebe8", roughness: 0.18, metalness: 0, texture: "stone", scale: 2, clearcoat: 0.6 },
  { id: "marble_black", label: { de: "Marmor schwarz", en: "Black marble" }, color: "#2a2a2c", roughness: 0.15, metalness: 0, texture: "stone", scale: 2, clearcoat: 0.7 },
  { id: "terrazzo", label: { de: "Terrazzo", en: "Terrazzo" }, color: "#d8d3cb", roughness: 0.3, metalness: 0, texture: "tiles", scale: 2, clearcoat: 0.4 },
  { id: "slate_floor", label: { de: "Schieferboden", en: "Slate floor" }, color: "#4b4d50", roughness: 0.6, metalness: 0, texture: "tiles", scale: 2 },
  { id: "granite_dark", label: { de: "Granit", en: "Granite" }, color: "#77736e", roughness: 0.35, metalness: 0, texture: "tiles", scale: 2, clearcoat: 0.3 },
  { id: "white_tiles", label: { de: "Fliesen wei\xDF", en: "White tiles" }, color: "#f2f1ee", roughness: 0.2, metalness: 0, texture: "tiles", scale: 1, clearcoat: 0.5 },
  { id: "sandstone", label: { de: "Sandstein", en: "Sandstone" }, color: "#c9b28c", roughness: 0.9, metalness: 0, texture: "stone", scale: 3 },
  { id: "herringbone", label: { de: "Fischgr\xE4tparkett", en: "Herringbone parquet" }, color: "#a87a4f", roughness: 0.5, metalness: 0, texture: "wood", scale: 1.5, clearcoat: 0.2 },
  { id: "light_oak", label: { de: "Eiche hell", en: "Light oak" }, color: "#cfae84", roughness: 0.5, metalness: 0, texture: "wood", scale: 2 },
  { id: "smoked_oak", label: { de: "Eiche ger\xE4uchert", en: "Smoked oak" }, color: "#6e5440", roughness: 0.5, metalness: 0, texture: "wood", scale: 2 },
  { id: "walnut", label: { de: "Walnuss", en: "Walnut veneer" }, color: "#7a573b", roughness: 0.45, metalness: 0, texture: "wood", scale: 2, clearcoat: 0.2 },
  { id: "larch_cladding", label: { de: "L\xE4rchenschalung", en: "Larch cladding" }, color: "#a7835c", roughness: 0.8, metalness: 0, texture: "planks", scale: 2 },
  { id: "corten", label: { de: "Cortenstahl", en: "Corten steel" }, color: "#8a4b2a", roughness: 0.75, metalness: 0.3, texture: "concrete", scale: 2 },
  { id: "metal_sheet", label: { de: "Trapezblech", en: "Profiled metal sheet" }, color: "#9aa0a6", roughness: 0.4, metalness: 0.8, texture: "planks", scale: 1.5 },
  { id: "gravel", label: { de: "Kies", en: "Gravel" }, color: "#9b958b", roughness: 0.95, metalness: 0, texture: "stone", scale: 1.5 },
  { id: "aluminium", label: { de: "Aluminium geb\xFCrstet", en: "Brushed aluminium" }, color: "#c6cacd", roughness: 0.32, metalness: 1, texture: "none", scale: 1 },
  { id: "copper", label: { de: "Kupfer", en: "Copper" }, color: "#b8733f", roughness: 0.35, metalness: 1, texture: "none", scale: 1 },
  { id: "brass", label: { de: "Messing", en: "Brass" }, color: "#c9a24f", roughness: 0.3, metalness: 1, texture: "none", scale: 1 },
  { id: "black_steel", label: { de: "Stahl schwarz", en: "Black steel" }, color: "#1e2023", roughness: 0.5, metalness: 0.8, texture: "none", scale: 1 },
  { id: "glass_frosted", label: { de: "Milchglas", en: "Frosted glass" }, color: "#eef2f3", roughness: 0.45, metalness: 0, texture: "none", scale: 1, transmission: 0.8, ior: 1.5, opacity: 0.7 },
  { id: "glass_tinted", label: { de: "Glas get\xF6nt", en: "Tinted glass" }, color: "#5f7377", roughness: 0.03, metalness: 0, texture: "none", scale: 1, transmission: 0.85, ior: 1.5, opacity: 0.5 },
  { id: "paint_matte", label: { de: "Farbe matt (frei w\xE4hlbar)", en: "Matte paint (any colour)" }, color: "#e8e4dd", roughness: 0.9, metalness: 0, texture: "none", scale: 1, paintable: true },
  { id: "green_roof", label: { de: "Gr\xFCndach", en: "Green roof" }, color: "#4f6b2c", roughness: 0.95, metalness: 0, texture: "grass", scale: 2 }
];
var GROUPS = {
  plaster_white: "wall",
  plaster_warm: "wall",
  stucco: "wall",
  plaster_grey: "wall",
  paint_matte: "wall",
  lacquer_white: "wall",
  brick: "stone",
  white_brick: "stone",
  dark_brick: "stone",
  concrete: "stone",
  concrete_smooth: "stone",
  painted_concrete: "stone",
  natural_stone: "stone",
  sandstone: "stone",
  marble_white: "stone",
  marble_black: "stone",
  oak: "floor",
  herringbone: "floor",
  terrazzo: "floor",
  slate_floor: "floor",
  granite_dark: "floor",
  white_tiles: "floor",
  stone_tiles: "floor",
  concrete_floor: "floor",
  light_oak: "wood",
  smoked_oak: "wood",
  walnut: "wood",
  dark_wood: "wood",
  timber_cladding: "wood",
  larch_cladding: "wood",
  roof_clay: "roof",
  roof_slate: "roof",
  green_roof: "roof",
  metal_sheet: "roof",
  metal_anthracite: "metal",
  steel: "metal",
  aluminium: "metal",
  copper: "metal",
  brass: "metal",
  black_steel: "metal",
  corten: "metal",
  glass: "glass",
  glass_frosted: "glass",
  glass_tinted: "glass",
  grass: "outdoor",
  terrace_stone: "outdoor",
  gravel: "outdoor"
};
for (const p of PRESETS) p.group = GROUPS[p.id] ?? "wall";
for (const id of ["plaster_white", "plaster_warm", "stucco", "plaster_grey", "lacquer_white", "painted_concrete"]) PRESETS.find((p) => p.id === id).paintable = true;
var BASE2 = new Map(PRESETS.map((p) => [p.id, p]));
function hsl(rgb) {
  const r = (rgb >> 16 & 255) / 255, g = (rgb >> 8 & 255) / 255, b = (rgb & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
var KW = {
  concrete: /(beton|concrete|stb\b|sichtbeton)/i,
  brick: /(ziegel|brick|klinker|mauerwerk)/i,
  wood: /(holz|wood|timber|parkett|dielen|eiche|oak|larch|l[äa]rche)/i,
  tile: /(fliese|tile|stein|stone|granit|marmor|marble)/i,
  interior: /(innen|interior|int\b)/i,
  screed: /(estrich|screed)/i
};
function assignMaterial(layer, category, role, color) {
  const c = hsl(color);
  const reddish = c.s > 0.35 && (c.h < 30 || c.h > 340) && c.l < 0.75;
  const brownish = c.s > 0.25 && c.h >= 15 && c.h <= 45 && c.l < 0.7;
  switch (category) {
    case "glass":
      return { presetId: "glass", reason: "layer" };
    case "window":
      return { presetId: "metal_anthracite", reason: "layer" };
    case "door":
      return { presetId: "dark_wood", reason: "layer" };
    case "railing":
      return { presetId: "steel", reason: "layer" };
    case "terrain":
      return { presetId: "grass", reason: "layer" };
    case "terrace":
      return { presetId: role === "top" || role === "all" ? "terrace_stone" : "concrete", reason: "layer" };
    case "furniture":
      return { presetId: "lacquer_white", reason: "layer" };
    case "column":
      return { presetId: KW.wood.test(layer) ? "dark_wood" : "concrete", reason: "layer" };
    case "stair":
      return { presetId: KW.concrete.test(layer) ? "concrete" : KW.tile.test(layer) ? "stone_tiles" : "oak", reason: "layer" };
    case "roof":
      return { presetId: role === "under" ? "timber_cladding" : reddish ? "roof_clay" : "roof_slate", reason: reddish ? "colour" : "layer" };
    case "wall":
      if (KW.brick.test(layer)) return { presetId: "brick", reason: "layer" };
      if (KW.concrete.test(layer)) return { presetId: "concrete", reason: "layer" };
      if (KW.wood.test(layer)) return { presetId: "timber_cladding", reason: "layer" };
      if (reddish) return { presetId: "brick", reason: "colour" };
      if (brownish) return { presetId: "timber_cladding", reason: "colour" };
      return { presetId: KW.interior.test(layer) ? "plaster_warm" : "plaster_white", reason: "default" };
    case "floor":
    case "ceiling":
      if (role === "under") return { presetId: "plaster_white", reason: "geometry" };
      if (role === "side") return { presetId: "plaster_white", reason: "geometry" };
      if (KW.tile.test(layer)) return { presetId: "stone_tiles", reason: "layer" };
      if (KW.screed.test(layer) || KW.concrete.test(layer)) return { presetId: "concrete", reason: "layer" };
      return { presetId: "oak", reason: "default" };
    default: {
      if (role === "top") return { presetId: "stone_tiles", reason: "geometry" };
      if (reddish) return { presetId: "brick", reason: "colour" };
      if (brownish) return { presetId: "dark_wood", reason: "colour" };
      if (c.l < 0.3) return { presetId: "metal_anthracite", reason: "colour" };
      return { presetId: "plaster_white", reason: "default" };
    }
  }
}
var hex = (rgb) => "#" + rgb.toString(16).padStart(6, "0");
var CAD_RULES = [
  [/(glas|glass|verglas|glazing|window\s*pane)/, (t) => /(milch|frost|satin|matt|opal|translucent|safety)/.test(t) ? "glass_frosted" : /(get[öo]nt|tint|grau|grey|gray|bronze|smoke)/.test(t) ? "glass_tinted" : "glass"],
  [/(gr[üu]ndach|green\s*roof|sedum)/, "green_roof"],
  [/(rasen|gras|grass|lawn|turf)/, "grass"],
  [/(kies|schotter|gravel|split\b)/, "gravel"],
  [/(dachziegel|roof(ing)?\s*tile|clay\s*tile|spanish\s*tile|tile\s*spanish|biber|tondach|ziegeldach|terracotta\s*roof)/, "roof_clay"],
  [/(schiefer|slate|shingle|schindel|eternit)/, (_t, cat) => cat === "floor" ? "slate_floor" : "roof_slate"],
  [/(klinker|brick|ziegel|backstein|mauerwerk|masonry)/, (t) => /(wei[ßs]|white)/.test(t) ? "white_brick" : /(dunkel|dark|schwarz|black|anthrazit)/.test(t) ? "dark_brick" : "brick"],
  [/(terrazzo)/, "terrazzo"],
  [/(marmor|marble)/, (t) => /(schwarz|black|nero|dunkel|dark)/.test(t) ? "marble_black" : "marble_white"],
  [/(granit|granite)/, "granite_dark"],
  [/(sandstein|sandstone)/, "sandstone"],
  [/(beton|concrete|zement|cement|estrich|screed)/, (t, cat) => /(estrich|screed|geschliffen|polished|floor|boden)/.test(t) || cat === "floor" ? "concrete_floor" : /(glatt|smooth|sicht|fair)/.test(t) ? "concrete_smooth" : /(gestrichen|painted)/.test(t) ? "painted_concrete" : "concrete"],
  [/(fliese|tile|keramik|ceramic|porzellan|porcelain|feinstein)/, (t) => /(wei[ßs]|white)/.test(t) ? "white_tiles" : "stone_tiles"],
  [/(fischgr[äa]t|herringbone)/, "herringbone"],
  [/(nuss|walnut)/, "walnut"],
  [/(r[äa]ucher|smoked)/, "smoked_oak"],
  [/(l[äa]rche|larch|schalung|cladding|siding|boarding)/, "larch_cladding"],
  [/(mahagoni|mahogany|kirsch|cherry|teak|wenge|dunkles?\s*holz|dark\s*wood)/, "dark_wood"],
  [/(esche|ash\b|birke|birch|ahorn|maple|fichte|spruce|kiefer|pine|hell|light)/, (t) => /(holz|wood|timber|parkett|parquet|dielen|floor)/.test(t) || /(esche|ash\b|birke|birch|ahorn|maple|fichte|spruce|kiefer|pine)/.test(t) ? "light_oak" : ""],
  [/(eiche|oak|parkett|parquet|dielen|floorboard|holz|wood|timber|plywood|sperrholz)/, (_t, cat) => cat === "wall" ? "timber_cladding" : cat === "door" ? "dark_wood" : "oak"],
  [/(corten|cor-ten|rost|rust|weathering)/, "corten"],
  [/(kupfer|copper)/, "copper"],
  [/(messing|brass|bronze)/, "brass"],
  [/(alu)/, "aluminium"],
  [/(schwarz|black).*(stahl|steel|metal)|(stahl|steel|metal).*(schwarz|black)/, "black_steel"],
  [/(edelstahl|stainless|inox|chrom|chrome|stahl|steel)/, "steel"],
  [/(anthrazit|anthracite|zink|zinc)/, "metal_anthracite"],
  [/(blech|sheet|trapez|corrugated|wellblech)/, "metal_sheet"],
  [/(metall|metal)/, "aluminium"],
  [/(naturstein|natural\s*stone|bruchstein|stein|stone|rock)/, "natural_stone"],
  [/(edelputz|stucco|reibputz)/, "stucco"],
  [/(putz|plaster|render|verputz|gips|gypsum|drywall|trockenbau)/, (t) => /(grau|grey|gray)/.test(t) ? "plaster_grey" : /(warm|beige|sand|creme|cream)/.test(t) ? "plaster_warm" : "plaster_white"],
  [/(lack|lacquer|gloss|hochglanz)/, "lacquer_white"],
  [/(farbe|paint|anstrich)/, "paint_matte"]
];
function assignFromCad(cad, category) {
  const text = `${cad.name} ${cad.description ?? ""} ${cad.map ?? ""}`.toLowerCase().replace(/[_\-.]+/g, " ");
  let id = "";
  for (const [re, to] of CAD_RULES) {
    if (!re.test(text)) continue;
    id = typeof to === "string" ? to : to(text, category);
    if (id.startsWith("glass") && cad.opaque) {
      id = "";
      continue;
    }
    if (id) break;
  }
  if (!id && cad.opacity !== void 0 && cad.opacity < 0.8) id = "glass";
  if (!id && cad.color === void 0) return null;
  if (!id) id = "paint_matte";
  const pr = BASE2.get(id);
  if (!pr) return null;
  const color = cad.color !== void 0 && pr.paintable ? hex(cad.color) : void 0;
  return { presetId: id, reason: "cad", ...color ? { color } : {} };
}
function textureKey(file) {
  const t = file.normalize("NFC").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  const dot = t.lastIndexOf(".");
  const stem = (dot > 0 ? t.slice(0, dot) : t).replace(/[^a-z0-9-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "textur";
  const ext = dot > 0 ? t.slice(dot + 1).replace(/[^a-z0-9]/g, "").slice(0, 5) : "";
  return ext ? `${stem}.${ext}` : stem;
}
function boxUVs(positions, normals) {
  const uv = new Float32Array(positions.length / 3 * 2);
  for (let i2 = 0, j = 0; i2 < positions.length; i2 += 3, j += 2) {
    const ax = Math.abs(normals[i2]), ay = Math.abs(normals[i2 + 1]), az = Math.abs(normals[i2 + 2]);
    const x2 = positions[i2], y = positions[i2 + 1], z = positions[i2 + 2];
    if (ay >= ax && ay >= az) {
      uv[j] = x2;
      uv[j + 1] = z;
    } else if (ax >= az) {
      uv[j] = z;
      uv[j + 1] = y;
    } else {
      uv[j] = x2;
      uv[j + 1] = y;
    }
  }
  return uv;
}

// src/core/gltf/import.ts
var GltfFormatError = class extends Error {
};
var ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul2(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function trs(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x2, y, z, w] = q;
  const xx = x2 * x2, yy = y * y, zz = z * z, xy = x2 * y, xz = x2 * z, yz = y * z, wx = w * x2, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * s[0],
    2 * (xy + wz) * s[0],
    2 * (xz - wy) * s[0],
    0,
    2 * (xy - wz) * s[1],
    (1 - 2 * (xx + zz)) * s[1],
    2 * (yz + wx) * s[1],
    0,
    2 * (xz + wy) * s[2],
    2 * (yz - wx) * s[2],
    (1 - 2 * (xx + yy)) * s[2],
    0,
    t[0],
    t[1],
    t[2],
    1
  ];
}
function normalMat(m) {
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f2 = m[9], g = m[2], h = m[6], i2 = m[10];
  const n = [e * i2 - f2 * h, -(d * i2 - f2 * g), d * h - e * g, -(b * i2 - c * h), a * i2 - c * g, -(a * h - b * g), b * f2 - c * e, -(a * f2 - c * d), a * e - b * d];
  const det = a * n[0] + b * n[1] + c * n[2];
  return { n, flip: det < 0 };
}
var lin2srgb = (v) => Math.round(255 * Math.max(0, Math.min(1, v <= 31308e-7 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)));
function smoothNormals(P, I, out) {
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      out[v] += nx;
      out[v + 1] += ny;
      out[v + 2] += nz;
    }
  }
  for (let i2 = 0; i2 < out.length; i2 += 3) {
    const l = Math.hypot(out[i2], out[i2 + 1], out[i2 + 2]) || 1;
    out[i2] /= l;
    out[i2 + 1] /= l;
    out[i2 + 2] /= l;
  }
}
function importGltf(bytes, opts = {}, resources = []) {
  const progress = opts.onProgress ?? (() => {
  });
  progress(0.05, "glTF-Datei wird gelesen");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let json, bin = null;
  if (bytes.length >= 12 && dv.getUint32(0, true) === 1179937895) {
    let p = 12;
    while (p + 8 <= bytes.length) {
      const len = dv.getUint32(p, true), type = dv.getUint32(p + 4, true);
      const data = bytes.subarray(p + 8, p + 8 + len);
      if (type === 1313821514) json = JSON.parse(new TextDecoder().decode(data));
      else if (type === 5130562 && !bin) bin = data;
      p += 8 + len + (4 - len % 4) % 4;
    }
    if (!json) throw new GltfFormatError("Die GLB-Datei ist besch\xE4digt.");
  } else {
    try {
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new GltfFormatError("Das ist keine g\xFCltige glTF- oder GLB-Datei.");
    }
  }
  if (!json.asset || String(json.asset.version ?? "").split(".")[0] !== "2") throw new GltfFormatError("Nur glTF 2.0 wird unterst\xFCtzt. Bitte das Modell als glTF 2.0 / GLB exportieren.");
  const req = json.extensionsRequired ?? [];
  if (req.some((x2) => /draco|meshopt/i.test(x2))) throw new GltfFormatError("Diese GLB-Datei ist komprimiert (Draco/Meshopt). Bitte beim Export die Kompression ausschalten und erneut versuchen.");
  const byName = new Map(resources.map((r) => [r.name.toLowerCase(), r.data]));
  const fromUri = (uri) => {
    if (uri.startsWith("data:")) {
      const comma = uri.indexOf(",");
      const meta = uri.slice(5, comma), body = uri.slice(comma + 1);
      if (/;base64/i.test(meta)) {
        const s2 = atob(body);
        const out = new Uint8Array(s2.length);
        for (let i2 = 0; i2 < s2.length; i2++) out[i2] = s2.charCodeAt(i2);
        return out;
      }
      return new TextEncoder().encode(decodeURIComponent(body));
    }
    const n = decodeURIComponent(uri).split(/[\\/]/).pop().toLowerCase();
    return byName.get(n) ?? null;
  };
  const missing = [];
  const buffers = (json.buffers ?? []).map((b, i2) => {
    if (b.uri === void 0) return i2 === 0 ? bin : null;
    const d = fromUri(b.uri);
    if (!d) missing.push(decodeURIComponent(b.uri).split(/[\\/]/).pop() ?? String(b.uri));
    return d;
  });
  if (missing.length) throw new GltfFormatError(`Zur glTF-Datei fehlt ${missing.join(", ")}. Bitte als .glb exportieren \u2013 oder die .gltf zusammen mit allen Dateien als ZIP importieren.`);
  const view = (i2) => {
    const v = json.bufferViews[i2];
    const b = buffers[v.buffer];
    if (!b) throw new GltfFormatError("Die glTF-Datei ist unvollst\xE4ndig.");
    return { data: b.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength), stride: v.byteStride };
  };
  const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const accessor = (i2) => {
    const a = json.accessors[i2];
    const n = NUM[a.type], cs = SIZE[a.componentType];
    const out = new Float64Array(a.count * n);
    if (a.bufferView !== void 0) {
      const { data, stride } = view(a.bufferView);
      const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const st = stride || n * cs, off = a.byteOffset ?? 0;
      const rd = (p) => {
        switch (a.componentType) {
          case 5126:
            return d.getFloat32(p, true);
          case 5125:
            return d.getUint32(p, true);
          case 5123: {
            const v = d.getUint16(p, true);
            return a.normalized ? v / 65535 : v;
          }
          case 5122: {
            const v = d.getInt16(p, true);
            return a.normalized ? Math.max(v / 32767, -1) : v;
          }
          case 5121: {
            const v = d.getUint8(p);
            return a.normalized ? v / 255 : v;
          }
          default: {
            const v = d.getInt8(p);
            return a.normalized ? Math.max(v / 127, -1) : v;
          }
        }
      };
      for (let e = 0; e < a.count; e++) for (let k = 0; k < n; k++) out[e * n + k] = rd(off + e * st + k * cs);
    }
    if (a.sparse) {
      const s2 = a.sparse;
      const iv = view(s2.indices.bufferView), vv = view(s2.values.bufferView);
      const id = new DataView(iv.data.buffer, iv.data.byteOffset + (s2.indices.byteOffset ?? 0));
      const vd = new DataView(vv.data.buffer, vv.data.byteOffset + (s2.values.byteOffset ?? 0));
      const ics = SIZE[s2.indices.componentType];
      for (let e = 0; e < s2.count; e++) {
        const idx = ics === 4 ? id.getUint32(e * 4, true) : ics === 2 ? id.getUint16(e * 2, true) : id.getUint8(e);
        for (let k = 0; k < n; k++) out[idx * n + k] = a.componentType === 5126 ? vd.getFloat32((e * n + k) * 4, true) : vd.getUint16((e * n + k) * 2, true);
      }
    }
    return out;
  };
  const images = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Map();
  const matInfo = /* @__PURE__ */ new Map();
  const imageOf = (texIndex) => {
    const t = json.textures?.[texIndex];
    const src2 = t?.source ?? t?.extensions?.EXT_texture_webp?.source;
    const img = src2 !== void 0 ? json.images?.[src2] : void 0;
    if (!img) return null;
    const data = img.bufferView !== void 0 ? view(img.bufferView).data.slice() : img.uri ? fromUri(img.uri) : null;
    if (!data) return null;
    const mime = img.mimeType ?? (/\.png$/i.test(img.uri ?? "") ? "image/png" : /\.webp$/i.test(img.uri ?? "") ? "image/webp" : "image/jpeg");
    return { data, ext: mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg" };
  };
  const material = (mi) => {
    if (mi === void 0) return { color: 14540253, textured: false, glass: false };
    let info = matInfo.get(mi);
    if (info) return info;
    const m = json.materials?.[mi] ?? {};
    const pbr = m.pbrMetallicRoughness ?? {};
    const f2 = pbr.baseColorFactor ?? [1, 1, 1, 1];
    const color = lin2srgb(f2[0]) << 16 | lin2srgb(f2[1]) << 8 | lin2srgb(f2[2]);
    const name = String(m.name ?? "").trim() || `Material ${mi + 1}`;
    const tex = pbr.baseColorTexture?.index !== void 0 ? imageOf(pbr.baseColorTexture.index) : null;
    const glass = !!m.extensions?.KHR_materials_transmission?.transmissionFactor;
    if (!used.has(name)) {
      const cm = { name, color };
      if (tex) {
        const file = textureKey(`${name}.${tex.ext}`);
        cm.map = file;
        cm.sourceUv = true;
        images.set(file, tex.data);
        if (f2[0] < 0.97 || f2[1] < 0.97 || f2[2] < 0.97) cm.colorize = true;
      }
      const alpha = m.alphaMode === "BLEND" ? f2[3] ?? 1 : 1;
      if (glass) cm.opacity = 0.3;
      else if (alpha < 0.98) cm.opacity = alpha;
      else cm.opaque = true;
      used.set(name, cm);
    }
    info = { name, color, textured: !!tex, glass };
    matInfo.set(mi, info);
    return info;
  };
  const warnings = [];
  const s = opts.unitsToMeters ?? 1;
  const groups = /* @__PURE__ */ new Map();
  let prims = 0, skipped = 0;
  const sceneIdx = json.scene ?? 0;
  const roots = json.scenes?.[sceneIdx]?.nodes ?? (json.nodes ?? []).map((_, i2) => i2);
  const primTris = (p) => {
    const n = p.indices !== void 0 ? json.accessors[p.indices].count : json.accessors[p.attributes?.POSITION]?.count ?? 0;
    return (p.mode ?? 4) === 4 ? n / 3 : Math.max(0, n - 2);
  };
  let worldTris = 0;
  const count2 = (ni, depth) => {
    const node = json.nodes?.[ni];
    if (!node || depth > 64) return;
    if (node.mesh !== void 0) for (const p of json.meshes[node.mesh]?.primitives ?? []) worldTris += (p.mode ?? 4) >= 4 ? primTris(p) : 0;
    for (const c of node.children ?? []) count2(c, depth + 1);
  };
  for (const r of roots) count2(r, 0);
  const large = worldTris > LARGE_MODEL_TRIANGLES;
  let keep = large ? IMPORT_BUDGET / worldTris : 1;
  const cache = /* @__PURE__ */ new Map();
  const readPrim = (p, textured) => {
    const P = accessor(p.attributes.POSITION);
    const N = p.attributes.NORMAL !== void 0 ? accessor(p.attributes.NORMAL) : null;
    const T = textured && p.attributes.TEXCOORD_0 !== void 0 ? accessor(p.attributes.TEXCOORD_0) : null;
    const vc = P.length / 3;
    const mode = p.mode ?? 4;
    let I = p.indices !== void 0 ? accessor(p.indices) : Uint32Array.from({ length: vc }, (_, i2) => i2);
    if (mode === 5 || mode === 6) {
      const t = new GrowU32(Math.max(3, (I.length - 2) * 3));
      for (let i2 = 2; i2 < I.length; i2++) {
        if (mode === 5) {
          if (i2 % 2) {
            t.push(I[i2 - 1]);
            t.push(I[i2 - 2]);
            t.push(I[i2]);
          } else {
            t.push(I[i2 - 2]);
            t.push(I[i2 - 1]);
            t.push(I[i2]);
          }
        } else {
          t.push(I[0]);
          t.push(I[i2 - 1]);
          t.push(I[i2]);
        }
      }
      I = t.take();
    }
    return { P, N, T, I, vc };
  };
  const prim = (mi, pi, p, textured, w) => {
    if (!large) return readPrim(p, textured);
    const key = `${mi}/${pi}`;
    let c = cache.get(key);
    if (c) return c;
    const r = readPrim(p, textured);
    const nI = r.I.length - r.I.length % 3;
    const indices = new Uint32Array(nI);
    for (let i2 = 0; i2 < nI; i2++) indices[i2] = r.I[i2] < r.vc ? r.I[i2] : 0;
    const part = { positions: Float32Array.from(r.P), normals: r.N ? Float32Array.from(r.N) : new Float32Array(r.P.length), uvs: r.T ? Float32Array.from(r.T) : new Float32Array(r.vc * 2), indices };
    if (!r.N) smoothNormals(part.positions, indices, part.normals);
    const sc = Math.cbrt(Math.abs(w[0] * (w[5] * w[10] - w[9] * w[6]) - w[4] * (w[1] * w[10] - w[9] * w[2]) + w[8] * (w[1] * w[6] - w[5] * w[2]))) * s || 1;
    const tris = nI / 3, a = surfaceArea(part) * sc * sc;
    let out = part;
    if (tris > 300 && tris / Math.max(a, 1e-6) > 40) {
      const cell = Math.min(0.15, Math.max(5e-3, Math.sqrt(2 * a / Math.max(1, tris * keep))));
      out = clusterPart(part, cell / sc);
    }
    c = { P: out.positions, N: out.normals, T: r.T ? out.uvs : null, I: out.indices, vc: out.positions.length / 3 };
    cache.set(key, c);
    return c;
  };
  const visit = (ni, parent, layer, depth) => {
    const node = json.nodes?.[ni];
    if (!node || depth > 64) return;
    const local = node.matrix ? node.matrix : trs(node.translation, node.rotation, node.scale);
    const world = mul2(parent, local);
    const name = String(node.name ?? "").trim();
    const lay = layer || name;
    if (node.mesh !== void 0) addMesh(node.mesh, world, lay || String(json.meshes[node.mesh]?.name ?? "").trim() || "Modell");
    for (const c of node.children ?? []) visit(c, world, depth === 0 && !name ? "" : lay, depth + 1);
  };
  let placed = 0;
  let counting = false;
  const need = /* @__PURE__ */ new Map();
  const addMesh = (mi, w, layer) => {
    const mesh = json.meshes[mi];
    const { n: nm, flip } = normalMat(w);
    (mesh?.primitives ?? []).forEach((p, pi) => {
      const mode = p.mode ?? 4;
      if (mode < 4 || p.attributes?.POSITION === void 0) {
        if (!counting) skipped++;
        return;
      }
      const info = material(p.material);
      const { P, N, T, I, vc } = prim(mi, pi, p, info.textured, w);
      const key = `${layer}\0${info.name ?? ""}\0${info.color}`;
      if (counting) {
        const c = need.get(key) ?? { v: 0, i: 0 };
        c.v += N ? vc : I.length;
        c.i += I.length;
        need.set(key, c);
        return;
      }
      prims++;
      if (++placed % 500 === 0) progress(0.1 + 0.45 * Math.min(1, placed / Math.max(1, json.nodes.length)), "Objekte werden gelesen");
      let g = groups.get(key);
      if (!g) {
        const c = need.get(key);
        groups.set(key, g = { layer, material: info.name, color: info.color, textured: info.textured, pos: new GrowF32(c ? c.v * 3 : 1024), nrm: new GrowF32(c ? c.v * 3 : 1024), uv: new GrowF32(c ? c.v * 2 : 1024), idx: new GrowU32(c ? c.i : 1024) });
      }
      if (info.textured && !g.textured) g.textured = true;
      const put = (vi, fn) => {
        const x2 = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
        const wx = w[0] * x2 + w[4] * y + w[8] * z + w[12], wy = w[1] * x2 + w[5] * y + w[9] * z + w[13], wz = w[2] * x2 + w[6] * y + w[10] * z + w[14];
        g.pos.push(wx * s);
        g.pos.push(wy * s);
        g.pos.push(wz * s);
        let nx, ny, nz;
        if (fn) [nx, ny, nz] = fn;
        else {
          const a = N[vi * 3], b = N[vi * 3 + 1], c = N[vi * 3 + 2];
          nx = nm[0] * a + nm[3] * b + nm[6] * c;
          ny = nm[1] * a + nm[4] * b + nm[7] * c;
          nz = nm[2] * a + nm[5] * b + nm[8] * c;
          const l = (Math.hypot(nx, ny, nz) || 1) * (flip ? -1 : 1);
          nx /= l;
          ny /= l;
          nz /= l;
        }
        g.nrm.push(nx);
        g.nrm.push(ny);
        g.nrm.push(nz);
        g.uv.push(T ? T[vi * 2] : 0);
        g.uv.push(T ? T[vi * 2 + 1] : 0);
      };
      if (N) {
        const base = g.pos.n / 3;
        g.pos.reserve(vc * 3);
        g.nrm.reserve(vc * 3);
        g.uv.reserve(vc * 2);
        g.idx.reserve(I.length);
        for (let v = 0; v < vc; v++) put(v);
        for (let i2 = 0; i2 + 2 < I.length; i2 += 3) {
          const a = I[i2], b = I[i2 + 1], c = I[i2 + 2];
          if (a >= vc || b >= vc || c >= vc) continue;
          if (flip) {
            g.idx.push(base + a);
            g.idx.push(base + c);
            g.idx.push(base + b);
          } else {
            g.idx.push(base + a);
            g.idx.push(base + b);
            g.idx.push(base + c);
          }
        }
      } else {
        for (let i2 = 0; i2 + 2 < I.length; i2 += 3) {
          let a = I[i2], b = I[i2 + 1], c = I[i2 + 2];
          if (a >= vc || b >= vc || c >= vc) continue;
          if (flip) {
            const t = b;
            b = c;
            c = t;
          }
          const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
          const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
          let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
          const tx = nm[0] * fx + nm[3] * fy + nm[6] * fz, ty = nm[1] * fx + nm[4] * fy + nm[7] * fz, tz = nm[2] * fx + nm[5] * fy + nm[8] * fz;
          const l = Math.hypot(tx, ty, tz) || 1;
          fx = tx / l;
          fy = ty / l;
          fz = tz / l;
          const base = g.pos.n / 3;
          put(a, [fx, fy, fz]);
          put(b, [fx, fy, fz]);
          put(c, [fx, fy, fz]);
          g.idx.push(base);
          g.idx.push(base + 1);
          g.idx.push(base + 2);
        }
      }
    });
  };
  if (large) {
    counting = true;
    for (const r of roots) visit(r, ident(), "", 0);
    const total = [...need.values()].reduce((n, c) => n + c.i / 3, 0);
    if (total > IMPORT_BUDGET * 1.5) {
      keep *= IMPORT_BUDGET / total;
      cache.clear();
      need.clear();
      for (const r of roots) visit(r, ident(), "", 0);
    }
    counting = false;
    progress(0.35, "Objekte werden gelesen");
  }
  for (const r of roots) visit(r, ident(), "", 0);
  progress(0.6, "Modell wird optimiert");
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of groups.values()) {
    const A = g.pos.a;
    for (let i2 = 0; i2 < g.pos.n; i2 += 3) for (let k = 0; k < 3; k++) {
      const v = A[i2 + k];
      if (v < mn[k]) mn[k] = v;
      if (v > mx[k]) mx[k] = v;
    }
  }
  const ok = Number.isFinite(mn[0]);
  const meshes = [];
  const layerMap = /* @__PURE__ */ new Map();
  const origin = ok ? [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2] : [0, 0, 0];
  let gi = 0, triangles = 0, vertices = 0;
  let list = [...groups.values()].filter((g) => g.idx.n).map((g) => {
    const positions = g.pos.a.subarray(0, g.pos.n);
    for (let i2 = 0; i2 < positions.length; i2 += 3) for (let k = 0; k < 3; k++) positions[i2 + k] -= origin[k];
    const r = { g, positions, normals: g.nrm.a.subarray(0, g.nrm.n), uvs: g.uv.a.subarray(0, g.uv.n), indices: g.idx.a.subarray(0, g.idx.n) };
    g.pos = g.nrm = g.uv = new GrowF32(1);
    g.idx = new GrowU32(1);
    return r;
  });
  if (large) list = simplifyToBudget(list, IMPORT_BUDGET).parts;
  if (large) warnings.push({ code: "large-model", message: "Sehr gro\xDFes Modell: Feine Details (z. B. M\xF6bel) wurden beim Einlesen vereinfacht, damit es fl\xFCssig bleibt. W\xE4nde, B\xF6den und D\xE4cher bleiben exakt." });
  for (const { g, positions, normals, uvs, indices } of list) {
    if (!indices.length) continue;
    meshes.push({
      id: `m${gi++}`,
      layer: g.layer,
      color: g.color,
      ...g.material ? { material: g.material } : {},
      positions,
      normals,
      indices: indices instanceof Uint32Array ? indices : Uint32Array.from(indices),
      triangleCount: indices.length / 3,
      ...g.textured ? { uvs } : {}
    });
    triangles += indices.length / 3;
    vertices += positions.length / 3;
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }
  const size2 = ok ? [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] : [0, 0, 0];
  const rawExtent = Math.max(...size2) / s;
  const plausible = rawExtent * s >= 2 && rawExtent * s <= 2e3;
  if (!ok) warnings.push({ code: "no-3d", message: "In der glTF/GLB-Datei wurden keine Fl\xE4chen gefunden." });
  else if (!plausible) warnings.push({ code: "units-implausible", message: `Das Modell ist ${(rawExtent * s).toFixed(1)} m gro\xDF \u2013 ungew\xF6hnlich f\xFCr ein Geb\xE4ude. Bei Bedarf die Einheit korrigieren.` });
  if (skipped) warnings.push({ code: "gltf-lines", message: `${skipped} Linien-/Punkt-Teil(e) ohne Fl\xE4chen wurden weggelassen.` });
  progress(1, "Fertig");
  return {
    model: {
      meshes,
      materials: [...used.values()],
      layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
      units: { name: s === 1 ? "Meter" : `Faktor ${s}`, toMeters: s, source: opts.unitsToMeters ? "user" : "header", rawExtent, plausible },
      origin,
      bbox: ok ? { min: [mn[0] - origin[0], mn[1] - origin[1], mn[2] - origin[2]], max: [mx[0] - origin[0], mx[1] - origin[1], mx[2] - origin[2]] } : { min: [0, 0, 0], max: [0, 0, 0] },
      stats: { version: `glTF ${json.asset.version}${json.asset.generator ? ` (${String(json.asset.generator).slice(0, 40)})` : ""}`, entityCounts: { "glTF-Teile": prims, "Dreiecke": triangles }, triangles, vertices, removedDegenerate: 0, removedDuplicate: 0, flippedForConsistency: 0, closedShellsOutward: 0 },
      warnings,
      ok
    },
    images: [...images].map(([name, data]) => ({ name, data }))
  };
}

// node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add2 = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add2 = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add2;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// node_modules/earcut/src/earcut.js
var steiners = /* @__PURE__ */ new Set();
var filteredOut = false;
function earcut(data, holeIndices, dim = 2) {
  const hasHoles = holeIndices && holeIndices.length;
  const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
  if (steiners.size) steiners.clear();
  let outerNode = linkedList(data, 0, outerLen, dim, true);
  const triangles = [];
  if (!outerNode || outerNode.next === outerNode.prev) return triangles;
  let minX = 0, minY = 0, invSize = 0;
  if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
  if (data.length > 80 * dim) {
    minX = data[0];
    minY = data[1];
    let maxX = minX;
    let maxY = minY;
    for (let i2 = dim; i2 < outerLen; i2 += dim) {
      const x2 = data[i2];
      const y = data[i2 + 1];
      if (x2 < minX) minX = x2;
      if (y < minY) minY = y;
      if (x2 > maxX) maxX = x2;
      if (y > maxY) maxY = y;
    }
    invSize = Math.max(maxX - minX, maxY - minY);
    invSize = invSize !== 0 ? 32767 / invSize : 0;
  }
  earcutLinked(outerNode, triangles, minX, minY, invSize);
  return triangles;
}
function linkedList(data, start, end, dim, clockwise) {
  let last = null;
  if (clockwise === signedArea(data, start, end, dim) > 0) {
    for (let i2 = start; i2 < end; i2 += dim) last = insertNode(i2 / dim | 0, data[i2], data[i2 + 1], last);
  } else {
    for (let i2 = end - dim; i2 >= start; i2 -= dim) last = insertNode(i2 / dim | 0, data[i2], data[i2 + 1], last);
  }
  if (last && equals(last, last.next)) {
    removeNode(last);
    last = last.next;
  }
  return last;
}
function filterPoints(start, end = start) {
  const full = end === start;
  let p = start, again;
  do {
    again = false;
    if (p !== p.next && (steiners.size === 0 || !steiners.has(p)) && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      if (full || p === end) end = p.prev;
      filteredOut = true;
      removeNode(p);
      p = p.prev;
      again = true;
    } else if (full || p !== end) {
      p = p.next;
      again = !full;
    }
  } while (again || p !== end);
  return end;
}
function earcutLinked(ear, triangles, minX, minY, invSize) {
  if (invSize) indexCurve(ear, minX, minY, invSize);
  let stop = ear, cured = false;
  while (ear.prev !== ear.next) {
    const prev = ear.prev;
    const next = ear.next;
    if (area(prev, ear, next) < 0 && (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear))) {
      triangles.push(prev.i, ear.i, next.i);
      removeNode(ear);
      ear = next;
      stop = next;
      continue;
    }
    ear = next;
    if (ear === stop) {
      filteredOut = false;
      ear = filterPoints(ear);
      if (filteredOut) {
        stop = ear;
        continue;
      }
      if (!cured) {
        ear = cureLocalIntersections(ear, triangles);
        stop = ear;
        cured = true;
        continue;
      }
      splitEarcut(ear, triangles, minX, minY, invSize);
      break;
    }
  }
}
function isEar(ear) {
  const a = ear.prev, b = ear, c = ear.next, ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y, x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy);
  let p = c.next;
  while (p !== a) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && !(ax === p.x && ay === p.y) && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.next;
  }
  return true;
}
function isEarHashed(ear, minX, minY, invSize) {
  const a = ear.prev, b = ear, c = ear.next, ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y, x0 = Math.min(ax, bx, cx), y0 = Math.min(ay, by, cy), x1 = Math.max(ax, bx, cx), y1 = Math.max(ay, by, cy), minZ = zOrder(x0, y0, minX, minY, invSize), maxZ = zOrder(x1, y1, minX, minY, invSize);
  let p = ear.prevZ;
  while (p && p.z >= minZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== c && !(ax === p.x && ay === p.y) && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.prevZ;
  }
  let n = ear.nextZ;
  while (n && n.z <= maxZ) {
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== c && !(ax === n.x && ay === n.y) && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
    n = n.nextZ;
  }
  return true;
}
function cureLocalIntersections(start, triangles) {
  let p = start;
  let cured = false;
  do {
    const a = p.prev, b = p.next.next;
    if (intersects(a, p, p.next, b, false) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push(a.i, p.i, b.i);
      removeNode(p);
      removeNode(p.next);
      p = start = b;
      cured = true;
    }
    p = p.next;
  } while (p !== start);
  return cured ? filterPoints(p) : p;
}
function splitEarcut(start, triangles, minX, minY, invSize) {
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        let c = splitPolygon(a, b);
        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);
        earcutLinked(a, triangles, minX, minY, invSize);
        earcutLinked(c, triangles, minX, minY, invSize);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}
var indexActive = false;
function eliminateHoles(data, holeIndices, outerNode, dim) {
  const queue = [];
  for (let i2 = 0, len = holeIndices.length; i2 < len; i2++) {
    const start = holeIndices[i2] * dim;
    const end = i2 < len - 1 ? holeIndices[i2 + 1] * dim : data.length;
    const list = (
      /** @type {Node} */
      linkedList(data, start, end, dim, false)
    );
    if (list === list.next) steiners.add(list);
    queue.push(getLeftmost(list));
  }
  queue.sort(compareXYSlope);
  buildBlockIndex(data.length / dim, holeIndices.length);
  indexSegment(outerNode, outerNode);
  indexActive = true;
  for (let i2 = 0; i2 < queue.length; i2++) {
    outerNode = eliminateHole(queue[i2], outerNode);
  }
  indexActive = false;
  return filterPoints(outerNode);
}
function compareXYSlope(a, b) {
  return a.x - b.x || a.y - b.y || (a.next.y - a.y) / (a.next.x - a.x) - (b.next.y - b.y) / (b.next.x - b.x);
}
function eliminateHole(hole, outerNode) {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) {
    return outerNode;
  }
  const bridgeReverse = splitPolygon(bridge, hole);
  const bridge2 = bridgeReverse.next;
  indexSegment(bridge, bridge2.next);
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next);
}
var K = 16;
var blockBBox = new Float64Array(0);
var numBlocks = 0;
var blockHead = [];
var blockStop = [];
function buildBlockIndex(maxNodes, numHoles) {
  const maxBlocks = Math.ceil((maxNodes + 2 * numHoles) / K) + numHoles + 2;
  if (blockBBox.length < maxBlocks * 4) blockBBox = new Float64Array(maxBlocks * 4);
  numBlocks = 0;
}
function indexSegment(head, stop) {
  let p = head;
  do {
    const b = numBlocks++;
    blockHead[b] = p;
    let minX = p.x, minY = p.y, maxX = p.x, maxY = p.y;
    let k = 0;
    do {
      const c = p.next;
      p.z = b;
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
      p = c;
    } while (++k < K && p !== stop);
    blockStop[b] = p;
    const g = b * 4;
    blockBBox[g] = minX;
    blockBBox[g + 1] = minY;
    blockBBox[g + 2] = maxX;
    blockBBox[g + 3] = maxY;
  } while (p !== stop);
}
function growBlock(head, tail) {
  const g = head.z * 4;
  if (tail.x < blockBBox[g]) blockBBox[g] = tail.x;
  if (tail.y < blockBBox[g + 1]) blockBBox[g + 1] = tail.y;
  if (tail.x > blockBBox[g + 2]) blockBBox[g + 2] = tail.x;
  if (tail.y > blockBBox[g + 3]) blockBBox[g + 3] = tail.y;
}
function liveBlockStop(b) {
  let stop = blockStop[b];
  while (stop.prev.next !== stop) stop = stop.next;
  blockStop[b] = stop;
  return stop;
}
function liveBlockHead(b) {
  let head = blockHead[b];
  while (head.prev.next !== head) head = head.next;
  blockHead[b] = head;
  return head;
}
function findHoleBridge(hole, outerNode) {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = -Infinity;
  let m;
  if (equals(hole, p)) return p;
  for (let b = 0, g = 0; b < numBlocks; b++, g += 4) {
    if (hy < blockBBox[g + 1] || hy > blockBBox[g + 3] || blockBBox[g] > hx || blockBBox[g + 2] <= qx) continue;
    const stop = liveBlockStop(b);
    p = liveBlockHead(b);
    do {
      if (p.prev.next === p) {
        if (equals(hole, p.next)) return p.next;
        else if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
          const x2 = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
          if (x2 <= hx && x2 > qx) {
            qx = x2;
            m = p.x < p.next.x ? p : p.next;
            if (x2 === hx) return m;
          }
        }
      }
      p = p.next;
    } while (p !== stop);
  }
  if (!m) return null;
  const mx = m.x;
  const my = m.y;
  const tminY = Math.min(hy, my);
  const tmaxY = Math.max(hy, my);
  let tanMin = Infinity;
  for (let b = 0, g = 0; b < numBlocks; b++, g += 4) {
    if (blockBBox[g + 2] < mx || blockBBox[g] > hx || blockBBox[g + 3] < tminY || blockBBox[g + 1] > tmaxY) continue;
    const stop = liveBlockStop(b);
    p = liveBlockHead(b);
    do {
      if (p.prev.next === p && hx >= p.x && p.x >= mx && hx !== p.x && // skip dead nodes
      pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
        const tan = Math.abs(hy - p.y) / (hx - p.x);
        if ((locallyInside(p, hole) || p.y === hy && p.next.y === hy && p.next.x > hx) && (tan < tanMin || tan === tanMin && (p.x > m.x || p.x === m.x && sectorContainsSector(m, p)))) {
          m = p;
          tanMin = tan;
        }
      }
      p = p.next;
    } while (p !== stop);
  }
  return m;
}
function sectorContainsSector(m, p) {
  return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}
var sortArr = [];
var sortBuf = [];
var zArr = new Uint32Array(0);
var zBuf = new Uint32Array(0);
var counts = new Uint32Array(256);
function indexCurve(start, minX, minY, invSize) {
  let p = start;
  let n = 0;
  do {
    p.z = zOrder(p.x, p.y, minX, minY, invSize);
    sortArr[n++] = p;
    p = p.next;
  } while (p !== start);
  sortNodes(n);
  let prev = null;
  for (let i2 = 0; i2 < n; i2++) {
    const node = sortArr[i2];
    node.prevZ = prev;
    if (prev) prev.nextZ = node;
    prev = node;
  }
  prev.nextZ = null;
  sortArr.fill(
    /** @type {Node} */
    /** @type {unknown} */
    null,
    0,
    n
  );
  sortBuf.fill(
    /** @type {Node} */
    /** @type {unknown} */
    null,
    0,
    n
  );
}
function sortNodes(n) {
  if (n <= 32) {
    for (let i2 = 1; i2 < n; i2++) {
      const node = sortArr[i2], z = node.z;
      let j = i2 - 1;
      while (j >= 0 && sortArr[j].z > z) {
        sortArr[j + 1] = sortArr[j];
        j--;
      }
      sortArr[j + 1] = node;
    }
    return;
  }
  if (zArr.length < n) {
    zArr = new Uint32Array(n);
    zBuf = new Uint32Array(n);
    sortBuf = new Array(n);
  }
  for (let i2 = 0; i2 < n; i2++) zArr[i2] = sortArr[i2].z;
  radixPass(n, sortArr, zArr, sortBuf, zBuf, 0);
  radixPass(n, sortBuf, zBuf, sortArr, zArr, 8);
  radixPass(n, sortArr, zArr, sortBuf, zBuf, 16);
  radixPass(n, sortBuf, zBuf, sortArr, zArr, 24);
}
function radixPass(n, src2, srcZ, dst, dstZ, shift) {
  counts.fill(0);
  for (let i2 = 0; i2 < n; i2++) counts[srcZ[i2] >>> shift & 255]++;
  let sum = 0;
  for (let b = 0; b < 256; b++) {
    const c = counts[b];
    counts[b] = sum;
    sum += c;
  }
  for (let i2 = 0; i2 < n; i2++) {
    const z = srcZ[i2];
    const pos = counts[z >>> shift & 255]++;
    dst[pos] = src2[i2];
    dstZ[pos] = z;
  }
}
function zOrder(x2, y, minX, minY, invSize) {
  x2 = (x2 - minX) * invSize | 0;
  y = (y - minY) * invSize | 0;
  x2 = (x2 | x2 << 8) & 16711935;
  x2 = (x2 | x2 << 4) & 252645135;
  x2 = (x2 | x2 << 2) & 858993459;
  x2 = (x2 | x2 << 1) & 1431655765;
  y = (y | y << 8) & 16711935;
  y = (y | y << 4) & 252645135;
  y = (y | y << 2) & 858993459;
  y = (y | y << 1) & 1431655765;
  return x2 | y << 1;
}
function getLeftmost(start) {
  let p = start, leftmost = start;
  do {
    if (p.x < leftmost.x || p.x === leftmost.x && p.y < leftmost.y) leftmost = p;
    p = p.next;
  } while (p !== start);
  return leftmost;
}
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
  return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
}
function isValidDiagonal(a, b) {
  const zeroLength = equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0;
  return a.next.i !== b.i && (zeroLength || locallyInside(a, b) && locallyInside(b, a) && // // locally visible
  (area(a.prev, a, b.prev) !== 0 || area(a, b.prev, b) !== 0)) && // no opposite-facing sectors
  !intersectsPolygon(a, b) && (zeroLength || middleInside(a, b));
}
function area(p, q, r) {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}
function equals(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}
function intersects(p1, q1, p2, q2, includeBoundary = true) {
  const o1 = area(p1, q1, p2);
  const o2 = area(p1, q1, q2);
  const o3 = area(p2, q2, p1);
  const o4 = area(p2, q2, q1);
  if ((o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0)) return true;
  if (!includeBoundary) return false;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}
function onSegment(p, q, r) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}
function intersectsPolygon(a, b) {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  let p = a;
  do {
    const n = p.next;
    if (p.x > maxX && n.x > maxX || p.x < minX && n.x < minX || p.y > maxY && n.y > maxY || p.y < minY && n.y < minY) {
      p = n;
      continue;
    }
    if (p.i !== a.i && n.i !== a.i && p.i !== b.i && n.i !== b.i && intersects(p, n, a, b)) return true;
    p = n;
  } while (p !== a);
  return false;
}
function locallyInside(a, b) {
  return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}
function middleInside(a, b) {
  let p = a;
  let inside = false;
  const px = (a.x + b.x) / 2;
  const py = (a.y + b.y) / 2;
  do {
    const n = p.next;
    if (p.y > py !== n.y > py && px < (n.x - p.x) * (py - p.y) / (n.y - p.y) + p.x)
      inside = !inside;
    p = n;
  } while (p !== a);
  return inside;
}
function splitPolygon(a, b) {
  const a2 = createNode(a.i, a.x, a.y), b22 = createNode(b.i, b.x, b.y), an = a.next, bp = b.prev;
  a.next = b;
  b.prev = a;
  a2.next = an;
  an.prev = a2;
  b22.next = a2;
  a2.prev = b22;
  bp.next = b22;
  b22.prev = bp;
  return b22;
}
function insertNode(i2, x2, y, last) {
  const p = createNode(i2, x2, y);
  if (!last) {
    p.prev = p;
    p.next = p;
  } else {
    p.next = last.next;
    p.prev = last;
    last.next.prev = p;
    last.next = p;
  }
  return p;
}
function removeNode(p) {
  p.next.prev = p.prev;
  p.prev.next = p.next;
  if (p.prevZ) p.prevZ.nextZ = p.nextZ;
  if (p.nextZ) p.nextZ.prevZ = p.prevZ;
  if (indexActive) growBlock(p.prev, p.next);
}
function createNode(i2, x2, y) {
  return (
    /** @type {Node} */
    /** @type {unknown} */
    {
      i: i2,
      // vertex index in coordinates array
      x: x2,
      y,
      // vertex coordinates
      prev: null,
      // previous and next vertex nodes in a polygon ring
      next: null,
      z: 0,
      // z-order curve value; doubles as owning block in the hole-bridge index during eliminateHoles
      prevZ: null,
      // previous and next nodes in z-order
      nextZ: null
    }
  );
}
function signedArea(data, start, end, dim) {
  let sum = 0;
  for (let i2 = start, j = end - dim; i2 < end; i2 += dim) {
    sum += (data[j] - data[i2]) * (data[i2 + 1] + data[j + 1]);
    j = i2;
  }
  return sum;
}

// node_modules/openskp/dist/index.mjs
var flatbuffers15 = __toESM(require_flatbuffers(), 1);
var flatbuffers = __toESM(require_flatbuffers(), 1);
var flatbuffers3 = __toESM(require_flatbuffers(), 1);
var flatbuffers2 = __toESM(require_flatbuffers(), 1);
var flatbuffers4 = __toESM(require_flatbuffers(), 1);
var flatbuffers5 = __toESM(require_flatbuffers(), 1);
var flatbuffers6 = __toESM(require_flatbuffers(), 1);
var flatbuffers10 = __toESM(require_flatbuffers(), 1);
var flatbuffers9 = __toESM(require_flatbuffers(), 1);
var flatbuffers7 = __toESM(require_flatbuffers(), 1);
var flatbuffers8 = __toESM(require_flatbuffers(), 1);
var flatbuffers14 = __toESM(require_flatbuffers(), 1);
var flatbuffers11 = __toESM(require_flatbuffers(), 1);
var flatbuffers12 = __toESM(require_flatbuffers(), 1);
var flatbuffers13 = __toESM(require_flatbuffers(), 1);
var PROGRESS_INTERVAL = 500;
function emitLog(options, level, message) {
  options?.onLog?.(level, message);
}
function emitProgress(options, stage, current, total) {
  options?.onProgress?.({ stage, current, total });
}
var VFF_MAGIC = [255, 254, 255, 14];
var ZIP_LOCAL_HEADER = [80, 75, 3, 4];
function findSequence(data, sequence, startOffset = 0) {
  const seqLen = sequence.length;
  if (seqLen === 0) return -1;
  const limit = data.length - seqLen;
  for (let i2 = startOffset; i2 <= limit; i2++) {
    let match = true;
    for (let j = 0; j < seqLen; j++) {
      if (data[i2 + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return i2;
  }
  return -1;
}
function decodeEntryName(entry) {
  if (!/[\u0080-\u00ff]/.test(entry)) return entry;
  const bytes = new Uint8Array(entry.length);
  for (let i2 = 0; i2 < entry.length; i2++) {
    const code = entry.charCodeAt(i2);
    if (code > 255) return entry;
    bytes[i2] = code;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return entry;
  }
}
function validateHeader(data) {
  if (data.length < 4) return false;
  return data[0] === VFF_MAGIC[0] && data[1] === VFF_MAGIC[1] && data[2] === VFF_MAGIC[2] && data[3] === VFF_MAGIC[3];
}
function readVersion(data, options) {
  if (data.length < 16) return "unknown";
  const secondMarker = findSequence(data, [255, 254, 255], 4);
  if (secondMarker > 0) {
    const verStart = secondMarker + 4;
    const verBytes = data.subarray(verStart, Math.min(verStart + 200, data.length));
    try {
      const decoder = new TextDecoder("utf-16le");
      const verText = decoder.decode(verBytes);
      const braceStart = verText.indexOf("{");
      if (braceStart >= 0) {
        const braceEnd = verText.indexOf("}", braceStart);
        if (braceEnd > braceStart) {
          return verText.slice(braceStart, braceEnd + 1);
        }
      }
    } catch (e) {
      emitLog(options, "debug", `Failed to decode version string: ${e.message}`);
    }
  }
  return "unknown";
}
function findZipOffset(data) {
  const offset = findSequence(data, ZIP_LOCAL_HEADER);
  if (offset < 0) {
    throw new Error("No embedded ZIP archive found in the file");
  }
  return offset;
}
var META_WRAPPER_TAG = [100, 0];
var META_UNITS_TAG = [109, 0];
function readMetaUnits(metaBytes) {
  const view = new DataView(metaBytes.buffer, metaBytes.byteOffset, metaBytes.byteLength);
  let pos = 0;
  while (pos + 6 <= metaBytes.length) {
    const tag = [metaBytes[pos], metaBytes[pos + 1]];
    const size2 = view.getUint32(pos + 2, true);
    if (pos + 6 + size2 > metaBytes.length) break;
    if (tag[0] === META_WRAPPER_TAG[0] && tag[1] === META_WRAPPER_TAG[1]) {
      return readMetaUnits(metaBytes.subarray(pos + 6, pos + 6 + size2));
    }
    if (tag[0] === META_UNITS_TAG[0] && tag[1] === META_UNITS_TAG[1]) {
      return new TextDecoder("utf-8").decode(metaBytes.subarray(pos + 6, pos + 6 + size2));
    }
    pos += 6 + size2;
  }
  return null;
}
var MAX_UNCOMPRESSED_ENTRY_BYTES = 16 * 1024 * 1024 * 1024;
var MAX_COMPRESSION_RATIO = 1e3;
var RATIO_CHECK_THRESHOLD_BYTES = 1024 * 1024;
function validateEntrySize(file) {
  const declared = file.originalSize;
  if (declared <= 0) return;
  if (declared > MAX_UNCOMPRESSED_ENTRY_BYTES) {
    throw new Error(
      `ZIP entry '${file.name}' declares ${declared} bytes uncompressed, exceeding the ${MAX_UNCOMPRESSED_ENTRY_BYTES}-byte safety ceiling`
    );
  }
  if (declared >= RATIO_CHECK_THRESHOLD_BYTES) {
    const compressed = file.size;
    if (compressed <= 0 || declared / compressed > MAX_COMPRESSION_RATIO) {
      throw new Error(
        `ZIP entry '${file.name}' declares an implausible compression ratio (${declared} bytes from ${compressed} bytes compressed) - likely a decompression bomb`
      );
    }
  }
}
function extractSkpContents(data, options) {
  if (!validateHeader(data)) {
    const zipInHeader = findSequence(data.subarray(0, Math.min(64, data.length)), ZIP_LOCAL_HEADER) >= 0;
    if (!zipInHeader) {
      throw new Error("Not a valid SketchUp (.skp) file");
    }
  }
  const version = readVersion(data, options);
  const zipOffset = findZipOffset(data);
  const zipBytes = data.subarray(zipOffset);
  const wanted = (file) => {
    const lower = file.name.toLowerCase();
    const isWanted = lower === "model.dat" || lower.endsWith("/model.dat") || lower === "meta/meta.dat" || lower.endsWith(".xml") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes("material");
    if (isWanted) validateEntrySize(file);
    return isWanted;
  };
  let unzipped;
  try {
    unzipped = unzipSync(zipBytes, { filter: wanted });
  } catch (e) {
    const wrapped = new Error("Failed to decompress ZIP archive: " + e.message);
    wrapped.cause = e;
    throw wrapped;
  }
  let modelData = null;
  let metaData = null;
  const materialFiles = {};
  for (const rawEntry of Object.keys(unzipped)) {
    const entry = decodeEntryName(rawEntry);
    const lower = entry.toLowerCase();
    if (lower === "model.dat" || lower.endsWith("/model.dat")) {
      modelData = unzipped[rawEntry];
    } else if (lower === "meta/meta.dat") {
      metaData = unzipped[rawEntry];
    } else if (lower.endsWith(".xml") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes("material")) {
      materialFiles[entry] = unzipped[rawEntry];
    }
  }
  if (!modelData) {
    throw new Error("ZIP archive found but does not contain a model.dat entry");
  }
  return {
    version,
    modelData,
    materialFiles,
    metaData
  };
}
var CONTAINER_TAGS = /* @__PURE__ */ new Set([
  "F401",
  "F701",
  "D430",
  "D530",
  "C832",
  "7C15",
  "8813",
  "8913",
  "8A13",
  "8B13",
  "8C13",
  "8D13",
  "4C1D",
  "6419",
  "F901",
  "7017",
  "7117",
  "D007",
  "C409",
  "9411",
  "9511",
  "0F01",
  "384A",
  "B80B",
  "9713",
  "2C4C",
  "AC0D",
  "AE0D",
  "F601",
  "F801",
  "983A",
  "993A",
  "8C3C",
  "8D3C",
  // Image-entity placement: an Image placed in the model wraps a standard
  // 6419 instance node inside 9013 -> 401F. Without these two containers,
  // that inner instance stays buried in an opaque payload and the image
  // definition looks "never placed".
  "9013",
  "401F",
  // VFF per-definition guide lines/points and their entity/drawbase wrappers.
  "9113",
  "9213",
  "6942",
  "6C42",
  "6842"
]);
function readU32(data, offset) {
  if (offset + 4 > data.length) {
    throw new Error("Out of bounds readU32");
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return view.getUint32(0, true);
}
function readF64(data, offset) {
  if (offset + 8 > data.length) {
    throw new Error("Out of bounds readF64");
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return view.getFloat64(0, true);
}
function readI32(data, offset) {
  if (offset + 4 > data.length) {
    throw new Error("Out of bounds readI32");
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return view.getInt32(0, true);
}
function parseVarInt(data, offset, length) {
  let val = 0;
  for (let i2 = 0; i2 < length; i2++) {
    val += data[offset + i2] * Math.pow(256, i2);
  }
  return val;
}
function parseTlvRecursive(data, start, end, containerTags = CONTAINER_TAGS, depth = 0) {
  let pos = start;
  const elements = [];
  while (pos <= end - 6) {
    const tagBytes = data.subarray(pos, pos + 2);
    const size2 = readU32(data, pos + 2);
    if (pos + 6 + size2 > end) {
      break;
    }
    let tagHex = "";
    for (let i2 = 0; i2 < 2; i2++) {
      const hex2 = tagBytes[i2].toString(16).toUpperCase();
      tagHex += hex2.length === 1 ? "0" + hex2 : hex2;
    }
    let children = [];
    const isContainer = containerTags.has(tagHex);
    if (isContainer && size2 > 0) {
      children = parseTlvRecursive(
        data,
        pos + 6,
        pos + 6 + size2,
        containerTags,
        depth + 1
      );
    }
    const payload = children.length > 0 ? new Uint8Array(0) : data.subarray(pos + 6, pos + 6 + size2);
    elements.push({
      offset: pos,
      tag: tagHex,
      size: size2,
      children,
      payload
    });
    pos += 6 + size2;
  }
  return elements;
}
function flatHeaders(data, start, end) {
  const headers = [];
  let pos = start;
  while (pos <= end - 6) {
    const tagBytes = data.subarray(pos, pos + 2);
    const size2 = readU32(data, pos + 2);
    if (pos + 6 + size2 > end) break;
    let tagHex = "";
    for (let i2 = 0; i2 < 2; i2++) {
      const hex2 = tagBytes[i2].toString(16).toUpperCase();
      tagHex += hex2.length === 1 ? "0" + hex2 : hex2;
    }
    headers.push([tagHex, pos, size2]);
    pos += 6 + size2;
  }
  return headers;
}
var PASS_THROUGH_WRAPPERS = /* @__PURE__ */ new Set(["F901", "7017", "7117"]);
function expandWrappers(data, headers, containerTags) {
  const out = [];
  for (const header of headers) {
    const [tag, offset, size2] = header;
    if (PASS_THROUGH_WRAPPERS.has(tag) && containerTags.has(tag)) {
      out.push(...expandWrappers(data, flatHeaders(data, offset + 6, offset + 6 + size2), containerTags));
    } else {
      out.push(header);
    }
  }
  return out;
}
function* iterTopLevelLazy(data, start, end, containerTags = CONTAINER_TAGS) {
  let headers = flatHeaders(data, start, end);
  if (headers.length === 1 && headers[0][0] === "F401") {
    const [, f401Offset, f401Size] = headers[0];
    headers = flatHeaders(data, f401Offset + 6, f401Offset + 6 + f401Size);
  }
  headers = expandWrappers(data, headers, containerTags);
  const total = headers.length;
  let index = 0;
  for (const [, offset, size2] of headers) {
    const recordEnd = offset + 6 + size2;
    const nodes = parseTlvRecursive(data, offset, recordEnd, containerTags);
    if (nodes.length > 0) {
      yield { index, total, node: nodes[0] };
    }
    index++;
  }
}
var SkpParseError = class _SkpParseError extends Error {
  constructor(message, context = {}) {
    const parts = [message];
    if (context.stage !== void 0) parts.push(`stage=${context.stage}`);
    if (context.recordIndex !== void 0 && context.totalRecords !== void 0) {
      parts.push(`record=${context.recordIndex}/${context.totalRecords}`);
    }
    if (context.tag !== void 0) parts.push(`tag=${context.tag}`);
    if (context.offset !== void 0) parts.push(`offset=0x${context.offset.toString(16).toUpperCase()}`);
    if (context.definitionId !== void 0) parts.push(`definitionId=${context.definitionId}`);
    super(parts.join(" | "));
    this.name = "SkpParseError";
    this.stage = context.stage;
    this.recordIndex = context.recordIndex;
    this.totalRecords = context.totalRecords;
    this.tag = context.tag;
    this.offset = context.offset;
    this.definitionId = context.definitionId;
    this.cause = context.cause;
    Object.setPrototypeOf(this, _SkpParseError.prototype);
  }
};
var EdgeFlagStore = class {
  constructor() {
    this.flags = new Uint8Array(0);
    this.present = new Uint8Array(0);
    this.baseId = 0;
    this.initialized = false;
    this.count = 0;
    this.highSlot = 0;
  }
  /** Number of ids actually stored. */
  get size() {
    return this.count;
  }
  slotFor(id) {
    return id - this.baseId;
  }
  /** Grow (and, for an id below `baseId`, shift) so `id` has a slot. */
  ensureSlot(id) {
    if (!this.initialized) {
      this.baseId = id;
      this.flags = new Uint8Array(64);
      this.present = new Uint8Array(8);
      this.initialized = true;
      return 0;
    }
    if (id < this.baseId) {
      const used = this.highSlot + 1;
      const gap = this.baseId - id;
      const headroom = Math.max(64, used);
      const shift = gap + headroom;
      const nextLength = shift + used;
      const nextFlags = new Uint8Array(nextLength);
      nextFlags.set(this.flags.subarray(0, used), shift);
      const nextPresent = new Uint8Array(Math.ceil(nextLength / 8));
      for (let slot2 = 0; slot2 < used; slot2++) {
        if ((this.present[slot2 >> 3] & 1 << (slot2 & 7)) !== 0) {
          const moved = slot2 + shift;
          nextPresent[moved >> 3] |= 1 << (moved & 7);
        }
      }
      this.flags = nextFlags;
      this.present = nextPresent;
      this.baseId -= shift;
      this.highSlot += shift;
      return headroom;
    }
    const slot = this.slotFor(id);
    if (slot >= this.flags.length) {
      const nextLength = Math.max(slot + 1, this.flags.length * 2);
      const nextFlags = new Uint8Array(nextLength);
      nextFlags.set(this.flags);
      this.flags = nextFlags;
      const nextPresent = new Uint8Array(Math.ceil(nextLength / 8));
      nextPresent.set(this.present);
      this.present = nextPresent;
    }
    if (slot > this.highSlot) this.highSlot = slot;
    return slot;
  }
  set(id, flags) {
    const slot = this.ensureSlot(id);
    if ((this.present[slot >> 3] & 1 << (slot & 7)) === 0) {
      this.present[slot >> 3] |= 1 << (slot & 7);
      this.count++;
    }
    this.flags[slot] = flags & 255;
  }
  /** The stored byte, or `undefined` when the id was never written -
   * matching `Map.prototype.get`, so callers' `?? 0` fallbacks behave
   * exactly as before. */
  get(id) {
    if (!this.initialized) return void 0;
    const slot = this.slotFor(id);
    if (slot < 0 || slot >= this.flags.length) return void 0;
    if ((this.present[slot >> 3] & 1 << (slot & 7)) === 0) return void 0;
    return this.flags[slot];
  }
  has(id) {
    return this.get(id) !== void 0;
  }
};
var INITIAL_CAPACITY = 256;
var BaseVertexStore = class {
  constructor() {
    this.coords = new Float64Array(INITIAL_CAPACITY * 3);
    this.idList = new Uint32Array(INITIAL_CAPACITY);
    this.count = 0;
  }
  get size() {
    return this.count;
  }
  grow() {
    if (this.count < this.idList.length) return;
    const nextCapacity = this.idList.length * 2;
    const nextCoords = new Float64Array(nextCapacity * 3);
    nextCoords.set(this.coords);
    this.coords = nextCoords;
    const nextIds = new Uint32Array(nextCapacity);
    nextIds.set(this.idList);
    this.idList = nextIds;
  }
  set(id, xyz) {
    const existing = this.slotOf(id);
    const slot = existing >= 0 ? existing : this.count;
    if (existing < 0) {
      this.grow();
      this.idList[slot] = id;
      this.count++;
      this.remember(id, slot);
    }
    this.coords[slot * 3] = xyz[0];
    this.coords[slot * 3 + 1] = xyz[1];
    this.coords[slot * 3 + 2] = xyz[2];
  }
  get(id) {
    const slot = this.slotOf(id);
    if (slot < 0) return void 0;
    return [this.coords[slot * 3], this.coords[slot * 3 + 1], this.coords[slot * 3 + 2]];
  }
  has(id) {
    return this.slotOf(id) >= 0;
  }
  *entries() {
    for (let i2 = 0; i2 < this.count; i2++) {
      yield [
        this.idList[i2],
        [this.coords[i2 * 3], this.coords[i2 * 3 + 1], this.coords[i2 * 3 + 2]]
      ];
    }
  }
  *ids() {
    for (let i2 = 0; i2 < this.count; i2++) yield this.idList[i2];
  }
};
var MapVertexStore = class extends BaseVertexStore {
  constructor() {
    super(...arguments);
    this.index = /* @__PURE__ */ new Map();
  }
  slotOf(id) {
    const slot = this.index.get(id);
    return slot === void 0 ? -1 : slot;
  }
  remember(id, slot) {
    this.index.set(id, slot);
  }
};
var DefaultVertexStore = MapVertexStore;
var INITIAL_CAPACITY2 = 256;
var NULL_END = 4294967295;
var SIDE_END = 4294967294;
function fits(v) {
  return Number.isInteger(v) && v >= 0 && v < SIDE_END;
}
function checkId(id) {
  if (!Number.isInteger(id) || id < 0 || id > 4294967295) {
    throw new RangeError(`edge id ${id} is not a u32`);
  }
}
var BaseEdgeStore = class {
  constructor() {
    this.ends = new Uint32Array(INITIAL_CAPACITY2 * 2);
    this.idList = new Uint32Array(INITIAL_CAPACITY2);
    this.count = 0;
    this.side = null;
  }
  get size() {
    return this.count;
  }
  grow() {
    if (this.count < this.idList.length) return;
    const nextCapacity = this.idList.length * 2;
    const nextEnds = new Uint32Array(nextCapacity * 2);
    nextEnds.set(this.ends);
    this.ends = nextEnds;
    const nextIds = new Uint32Array(nextCapacity);
    nextIds.set(this.idList);
    this.idList = nextIds;
  }
  write(at, v) {
    if (v === null) {
      this.ends[at] = NULL_END;
    } else if (fits(v)) {
      this.ends[at] = v;
    } else {
      this.ends[at] = SIDE_END;
      (this.side ?? (this.side = /* @__PURE__ */ new Map())).set(at, v);
      return;
    }
    this.side?.delete(at);
  }
  read(at) {
    const v = this.ends[at];
    if (v === NULL_END) return null;
    if (v === SIDE_END) return this.side.get(at);
    return v;
  }
  set(id, ends) {
    checkId(id);
    const existing = this.slotOf(id);
    const slot = existing >= 0 ? existing : this.count;
    if (existing < 0) {
      this.grow();
      this.idList[slot] = id;
      this.count++;
      this.remember(id, slot);
    }
    this.write(slot * 2, ends[0]);
    this.write(slot * 2 + 1, ends[1]);
  }
  get(id) {
    const slot = this.slotOf(id);
    if (slot < 0) return void 0;
    return [this.read(slot * 2), this.read(slot * 2 + 1)];
  }
  has(id) {
    return this.slotOf(id) >= 0;
  }
  v1(id) {
    const slot = this.slotOf(id);
    return slot < 0 ? void 0 : this.read(slot * 2);
  }
  v2(id) {
    const slot = this.slotOf(id);
    return slot < 0 ? void 0 : this.read(slot * 2 + 1);
  }
  *entries() {
    for (let i2 = 0; i2 < this.count; i2++) {
      yield [this.idList[i2], [this.read(i2 * 2), this.read(i2 * 2 + 1)]];
    }
  }
};
var DENSE_MIN_SPAN = 1 << 16;
var DENSE_MAX_SPAN_PER_EDGE = 8;
var DenseEdgeStore = class extends BaseEdgeStore {
  constructor() {
    super(...arguments);
    this.dense = null;
    this.baseId = 0;
    this.high = -1;
    this.fallback = null;
  }
  slotOf(id) {
    if (this.fallback) {
      const slot = this.fallback.get(id);
      return slot === void 0 ? -1 : slot;
    }
    if (!this.dense) return -1;
    const at = id - this.baseId;
    return at >= 0 && at < this.dense.length ? this.dense[at] : -1;
  }
  tooSparse(span) {
    return span > DENSE_MIN_SPAN && span > (this.count + 1) * DENSE_MAX_SPAN_PER_EDGE;
  }
  toMap() {
    const m = /* @__PURE__ */ new Map();
    for (let slot = 0; slot < this.count - 1; slot++) m.set(this.idList[slot], slot);
    this.fallback = m;
    this.dense = null;
  }
  remember(id, slot) {
    if (this.fallback) {
      this.fallback.set(id, slot);
      return;
    }
    if (!this.dense) {
      this.dense = new Int32Array(INITIAL_CAPACITY2).fill(-1);
      this.baseId = id;
    }
    let at = id - this.baseId;
    if (at < 0) {
      const used = this.high + 1;
      const shift = -at + Math.max(INITIAL_CAPACITY2, used);
      if (this.tooSparse(shift + used)) {
        this.toMap();
        this.fallback.set(id, slot);
        return;
      }
      const next = new Int32Array(shift + used).fill(-1);
      next.set(this.dense.subarray(0, used), shift);
      this.dense = next;
      this.baseId -= shift;
      this.high += shift;
      at += shift;
    } else if (at >= this.dense.length) {
      if (this.tooSparse(at + 1)) {
        this.toMap();
        this.fallback.set(id, slot);
        return;
      }
      const next = new Int32Array(Math.max(at + 1, this.dense.length * 2)).fill(-1);
      next.set(this.dense);
      this.dense = next;
    }
    this.dense[at] = slot;
    if (at > this.high) this.high = at;
  }
};
var DefaultEdgeStore = DenseEdgeStore;
var GeometryBuilder = class {
  constructor() {
    this.vertices = new DefaultVertexStore();
    this.edges = new DefaultEdgeStore();
    this.edgeFlags = new EdgeFlagStore();
    this.edgeCurves = /* @__PURE__ */ new Map();
    this.arcCurves = /* @__PURE__ */ new Map();
    this.faces = /* @__PURE__ */ new Map();
    this.instances = [];
    this.sectionPlanes = [];
    this.texts = [];
    this.dimensions = [];
    this.constructionLines = [];
    this.constructionPoints = [];
  }
};
function findChildTag(nodes, target) {
  for (const n of nodes) {
    if (n.tag === target) {
      return n;
    }
    const res = findChildTag(n.children, target);
    if (res) return res;
  }
  return null;
}
function findAllNodesRec(nodes, targetTag, results) {
  for (const n of nodes) {
    if (n.tag === targetTag) {
      results.push(n);
    }
    findAllNodesRec(n.children, targetTag, results);
  }
}
function extractEntityId(node) {
  for (const child of node.children) {
    if (child.tag === "DE05") {
      return parseVarInt(child.payload, 0, child.payload.length);
    }
    if (child.tag === "DC05") {
      const payload = child.payload;
      if (payload.length >= 6 && payload[0] === 222 && payload[1] === 5) {
        const de05Len = readU32(payload, 2);
        return parseVarInt(payload, 6, de05Len);
      } else {
        return parseVarInt(payload, 0, payload.length);
      }
    }
  }
  for (const child of node.children) {
    const res = extractEntityId(child);
    if (res !== null) return res;
  }
  return null;
}
function tlvFlat(payload) {
  let pos = 0;
  const out = [];
  while (pos <= payload.length - 6) {
    const tagBytes = payload.subarray(pos, pos + 2);
    let tagHex = "";
    for (let i2 = 0; i2 < 2; i2++) {
      const h = tagBytes[i2].toString(16).toUpperCase();
      tagHex += h.length === 1 ? "0" + h : h;
    }
    const size2 = readU32(payload, pos + 2);
    if (pos + 6 + size2 > payload.length) break;
    out.push([tagHex, payload.subarray(pos + 6, pos + 6 + size2)]);
    pos += 6 + size2;
  }
  return out;
}
function findFlat(seq, tag) {
  for (const [t, body] of seq) {
    if (t === tag) return body;
  }
  return null;
}
function extractUvTransforms(dc05Payload) {
  const dd05 = findFlat(tlvFlat(dc05Payload), "DD05");
  if (dd05 === null) return [null, null];
  const b136 = findFlat(tlvFlat(dd05), "B136");
  if (b136 === null) return [null, null];
  const b236 = findFlat(tlvFlat(b136), "B236");
  if (b236 === null) return [null, null];
  const t1027 = findFlat(tlvFlat(b236), "1027");
  if (t1027 === null) return [null, null];
  const sides = tlvFlat(t1027);
  const result = [];
  for (const sideTag of ["1127", "1227"]) {
    const side = findFlat(sides, sideTag);
    let mat = null;
    if (side !== null) {
      const t1327 = findFlat(tlvFlat(side), "1327");
      if (t1327 !== null) {
        const t1527 = findFlat(tlvFlat(t1327), "1527");
        if (t1527 !== null && t1527.length === 72) {
          mat = [];
          for (let i2 = 0; i2 < 9; i2++) {
            mat.push(readF64(t1527, i2 * 8));
          }
        }
      }
    }
    result.push(mat);
  }
  return [result[0], result[1]];
}
function extractGeometryFromNodes(elements, builder, options) {
  for (const el of elements) {
    const tag = el.tag;
    if (tag === "C409") {
      const vId = extractEntityId(el);
      const c509 = findChildTag(el.children, "C509");
      if (vId !== null && c509 && c509.payload.length >= 24) {
        const x2 = readF64(c509.payload, 0);
        const y = readF64(c509.payload, 8);
        const z = readF64(c509.payload, 16);
        builder.vertices.set(vId, [x2, y, z]);
      }
    } else if (tag === "B80B") {
      const eId = extractEntityId(el);
      if (eId !== null) {
        const v1Node = findChildTag(el.children, "B90B");
        const v2Node = findChildTag(el.children, "BA0B");
        const v1 = v1Node ? parseVarInt(v1Node.payload, 0, v1Node.payload.length) : null;
        const v2 = v2Node ? parseVarInt(v2Node.payload, 0, v2Node.payload.length) : null;
        builder.edges.set(eId, [v1, v2]);
        const d007 = el.children.find((c) => c.tag === "D007");
        if (d007) {
          const d307 = d007.children.find((c) => c.tag === "D307");
          if (d307 && d307.payload.length > 0) {
            builder.edgeFlags.set(eId, d307.payload[0]);
          }
        }
        const bb0b = findChildTag(el.children, "BB0B");
        if (bb0b && bb0b.payload.length > 0) {
          const curveId = parseVarInt(bb0b.payload, 0, bb0b.payload.length);
          if (curveId) builder.edgeCurves.set(eId, curveId);
        }
      }
    } else if (tag === "2C4C") {
      const curve = findChildTag(el.children, "384A");
      const arc = findChildTag(el.children, "2D4C");
      if (curve && arc && arc.payload.length === 128) {
        const curveId = extractEntityId(curve);
        if (curveId !== null) {
          const f2 = (i2) => readF64(arc.payload, i2 * 8);
          builder.arcCurves.set(curveId, {
            center: [f2(0), f2(1), f2(2)],
            normal: [f2(3), f2(4), f2(5)],
            xAxis: [f2(7), f2(8), f2(9)],
            yAxis: [f2(10), f2(11), f2(12)],
            startAngle: f2(14),
            endAngle: f2(15)
          });
        }
      }
    } else if (tag === "AC0D") {
      const fId = extractEntityId(el);
      if (fId !== null) {
        let normal = [0, 0, 1];
        const ad0d = findChildTag(el.children, "AD0D");
        if (ad0d && ad0d.payload.length >= 24) {
          const nx = readF64(ad0d.payload, 0);
          const ny = readF64(ad0d.payload, 8);
          const nz = readF64(ad0d.payload, 16);
          normal = [nx, ny, nz];
        }
        const ae0d = findChildTag(el.children, "AE0D");
        const loops = [];
        if (ae0d) {
          const loopNodes = [];
          findAllNodesRec(ae0d.children, "9411", loopNodes);
          for (const ln of loopNodes) {
            const coEdges = [];
            const coNodes = [];
            findAllNodesRec(ln.children, "A00F", coNodes);
            for (const cn of coNodes) {
              const payload = cn.payload;
              let edgeId = null;
              let orient = null;
              let subPos = 0;
              while (subPos < payload.length - 6) {
                const subSize = readU32(payload, subPos + 2);
                if (subPos + 6 + subSize <= payload.length) {
                  const val = parseVarInt(payload, subPos + 6, subSize);
                  if (payload[subPos] === 161 && payload[subPos + 1] === 15) {
                    edgeId = val;
                  } else if (payload[subPos] === 162 && payload[subPos + 1] === 15) {
                    orient = val;
                  }
                }
                subPos += 6 + subSize;
              }
              if (edgeId !== null && orient !== null) {
                coEdges.push({ edgeId, orientation: orient === 0 ? 1 : -1 });
              }
            }
            if (coEdges.length > 0) {
              loops.push(coEdges);
            }
          }
        }
        let faceMatId = null;
        let uvFront = null;
        let uvBack = null;
        let faceHidden = false;
        const d007 = el.children.find((c) => c.tag === "D007");
        if (d007) {
          const d107 = d007.children.find((c) => c.tag === "D107");
          if (d107) {
            faceMatId = parseVarInt(d107.payload, 0, d107.payload.length);
          }
          const dc05 = d007.children.find((c) => c.tag === "DC05");
          if (dc05) {
            [uvFront, uvBack] = extractUvTransforms(dc05.payload);
          }
          const d307 = d007.children.find((c) => c.tag === "D307");
          if (d307 && d307.payload.length > 0) {
            faceHidden = (d307.payload[0] & 1) !== 0;
          }
        }
        let backMatId = null;
        const af0d = el.children.find((c) => c.tag === "AF0D");
        if (af0d && af0d.payload.length > 0) {
          backMatId = parseVarInt(af0d.payload, 0, af0d.payload.length);
        }
        builder.faces.set(fId, {
          loops,
          normal,
          materialId: faceMatId,
          backMaterialId: backMatId,
          uvTransform: uvFront,
          uvTransformBack: uvBack,
          hidden: faceHidden
        });
      }
    } else if (tag === "6419") {
      const nodesToSearch = el.children.length > 0 ? el.children : [el];
      let guid = null;
      let defIdx = null;
      let name = null;
      const matrix = [];
      const guidNode = findChildTag(nodesToSearch, "6819");
      if (guidNode && guidNode.payload.length === 16) {
        let hex2 = "";
        for (let i2 = 0; i2 < 16; i2++) {
          const h = guidNode.payload[i2].toString(16).toUpperCase();
          hex2 += h.length === 1 ? "0" + h : h;
        }
        guid = hex2;
      }
      const defIdxNode = findChildTag(nodesToSearch, "6719");
      if (defIdxNode) {
        defIdx = parseVarInt(defIdxNode.payload, 0, defIdxNode.payload.length);
      }
      const nameNode = findChildTag(nodesToSearch, "6519");
      if (nameNode) {
        try {
          const decoder = new TextDecoder("utf-8");
          name = decoder.decode(nameNode.payload).replace(/\0/g, "").trim();
        } catch (e) {
          name = "";
          emitLog(options, "debug", `Failed to decode instance name: ${e.message}`);
        }
      }
      const matNode = findChildTag(nodesToSearch, "6619");
      if (matNode && matNode.payload.length >= 104) {
        for (let idx = 0; idx < 13; idx++) {
          matrix.push(readF64(matNode.payload, idx * 8));
        }
      }
      let instMatId = null;
      let instLayerId = null;
      let instHidden = false;
      const d007 = el.children.find((c) => c.tag === "D007");
      if (d007) {
        const d107 = d007.children.find((c) => c.tag === "D107");
        if (d107) {
          instMatId = parseVarInt(d107.payload, 0, d107.payload.length);
        }
        const d207 = d007.children.find((c) => c.tag === "D207");
        if (d207 && d207.payload.length > 0) {
          const p = d207.payload;
          instLayerId = p.length === 1 ? p[0] : parseVarInt(p, 0, p.length);
        }
        const d307 = d007.children.find((c) => c.tag === "D307");
        if (d307 && d307.payload.length > 0) {
          instHidden = (d307.payload[0] & 1) !== 0;
        }
      }
      builder.instances.push({
        offset: el.offset,
        refGuid: guid || "",
        refIdx: defIdx !== null ? defIdx : -1,
        name: name || "",
        matrix,
        materialId: instMatId,
        layerId: instLayerId,
        hidden: instHidden,
        children: el.children
      });
    } else if (tag === "6942") {
      const body = findChildTag(el.children, "6A42");
      if (body && body.payload.length >= 64) {
        const p = body.payload;
        const point = [readF64(p, 0), readF64(p, 8), readF64(p, 16)];
        const direction = [readF64(p, 24), readF64(p, 32), readF64(p, 40)];
        const endpoint = (distance) => Math.abs(distance) < 1e20 ? [
          point[0] + direction[0] * distance,
          point[1] + direction[1] * distance,
          point[2] + direction[2] * distance
        ] : null;
        builder.constructionLines.push({
          point,
          direction,
          start: endpoint(readF64(p, 48)),
          end: endpoint(readF64(p, 56))
        });
      }
    } else if (tag === "6C42") {
      const pos = findChildTag(el.children, "6D42");
      if (pos && pos.payload.length >= 24) {
        builder.constructionPoints.push({
          position: [readF64(pos.payload, 0), readF64(pos.payload, 8), readF64(pos.payload, 16)]
        });
      }
    } else if (el.children && el.children.length > 0) {
      extractGeometryFromNodes(el.children, builder, options);
    }
  }
}
function collectLayers(nodes, layerIdToName = /* @__PURE__ */ new Map(), options, layerHidden) {
  for (const el of nodes) {
    if (el.tag === "993A") {
      for (const child of el.children) {
        if (child.tag === "8C3C") {
          const dc05 = findChildTag(child.children, "DC05");
          const nameNode = findChildTag(child.children, "8D3C");
          if (dc05 && nameNode) {
            const payload = dc05.payload;
            let lId;
            if (payload.length >= 6 && payload[0] === 222 && payload[1] === 5) {
              const de05Len = readU32(payload, 2);
              lId = parseVarInt(payload, 6, de05Len);
            } else {
              lId = parseVarInt(payload, 0, payload.length);
            }
            let lName = "";
            try {
              const decoder = new TextDecoder("utf-8");
              lName = decoder.decode(nameNode.payload).replace(/\0/g, "").trim();
            } catch (e) {
              emitLog(options, "debug", `Failed to decode layer name for id ${lId}: ${e.message}`);
            }
            layerIdToName.set(lId, lName);
            if (layerHidden) {
              const hiddenNode = findChildTag(child.children, "8E3C");
              if (hiddenNode && hiddenNode.payload.length > 0) {
                layerHidden.set(lName, hiddenNode.payload[0] === 1);
              }
            }
          }
        }
      }
    }
    if (el.children && el.children.length > 0) {
      collectLayers(el.children, layerIdToName, options, layerHidden);
    }
  }
  return layerIdToName;
}
function collectDefs(nodes, defsDict = /* @__PURE__ */ new Map(), options) {
  for (const el of nodes) {
    if (el.tag === "7C15") {
      let guid = null;
      let name = null;
      let isImage = false;
      let isGroup = false;
      let facesCamera = false;
      let shadowsFaceSun = false;
      for (const child of el.children) {
        if (child.tag === "7D15" && child.payload.length === 16) {
          let hex2 = "";
          for (let i2 = 0; i2 < 16; i2++) {
            const h = child.payload[i2].toString(16).toUpperCase();
            hex2 += h.length === 1 ? "0" + h : h;
          }
          guid = hex2;
        } else if (child.tag === "7E15") {
          try {
            const decoder = new TextDecoder("utf-8");
            name = decoder.decode(child.payload).replace(/\0/g, "").trim();
          } catch (e) {
            name = "";
            emitLog(options, "debug", `Failed to decode definition name: ${e.message}`);
          }
        } else if (child.tag === "8315" && child.payload.length > 0) {
          const kind = parseVarInt(child.payload, 0, child.payload.length);
          isImage = kind === 2;
          isGroup = kind === 1;
        } else if (child.tag === "581B") {
          let pos = 0;
          const pl = child.payload;
          while (pos <= pl.length - 6) {
            const subSize = readU32(pl, pos + 2);
            if (pos + 6 + subSize > pl.length) break;
            if (pl[pos] === 93 && pl[pos + 1] === 27 && subSize >= 1) {
              facesCamera = parseVarInt(pl, pos + 6, subSize) === 1;
            } else if (pl[pos] === 94 && pl[pos + 1] === 27 && subSize >= 1) {
              shadowsFaceSun = parseVarInt(pl, pos + 6, subSize) === 1;
            }
            pos += 6 + subSize;
          }
        }
      }
      const entId = extractEntityId(el);
      if (entId !== null) {
        const builder = new GeometryBuilder();
        extractGeometryFromNodes(el.children, builder, options);
        defsDict.set(entId, {
          guid: guid || "",
          name: name || "",
          isImage,
          isGroup,
          alwaysFacesCamera: facesCamera,
          shadowsFaceSun,
          builder
        });
      }
    }
    if (el.children && el.children.length > 0) {
      collectDefs(el.children, defsDict, options);
    }
  }
  return defsDict;
}
function extractDynamicProperties(d007, options) {
  const dc05 = d007.children.find((c) => c.tag === "DC05");
  if (!dc05) {
    return {};
  }
  const propContainerTags = /* @__PURE__ */ new Set([
    "DD05",
    "B536",
    "B136",
    "B236",
    "B336",
    "B036",
    "A438"
  ]);
  const propElements = parseTlvRecursive(
    dc05.payload,
    0,
    dc05.payload.length,
    propContainerTags
  );
  const properties = {};
  let currentKey = null;
  function extractProps(nodes) {
    for (const n of nodes) {
      const tag = n.tag;
      if (tag === "B636") {
        try {
          const decoder = new TextDecoder("utf-8");
          currentKey = decoder.decode(n.payload).replace(/\0/g, "").trim();
        } catch (e) {
          currentKey = null;
          emitLog(options, "debug", `Failed to decode dynamic property key: ${e.message}`);
        }
      } else if (tag === "AD38" && currentKey) {
        try {
          const decoder = new TextDecoder("utf-8");
          const val = decoder.decode(n.payload).replace(/\0/g, "").trim();
          properties[currentKey] = val;
        } catch (e) {
          emitLog(
            options,
            "debug",
            `Failed to decode dynamic property value for key ${currentKey}: ${e.message}`
          );
        }
        currentKey = null;
      }
      if (n.children && n.children.length > 0) {
        extractProps(n.children);
      }
    }
  }
  extractProps(propElements);
  return properties;
}
var VFF_ATTR_DOUBLE_TAGS = /* @__PURE__ */ new Set(["AF38", "A938"]);
function decodeVffAttrValue(a438Node) {
  if (!a438Node.children || a438Node.children.length === 0) return null;
  const child = a438Node.children[0];
  const tag = child.tag;
  const payload = child.payload;
  if (tag === "AD38") {
    try {
      return new TextDecoder("utf-8").decode(payload).replace(/\0/g, "").trim();
    } catch {
      return null;
    }
  }
  if (VFF_ATTR_DOUBLE_TAGS.has(tag) && payload.length === 8) return readF64(payload, 0);
  if (tag === "A738" && payload.length === 4) return readI32(payload, 0);
  if ((tag === "B438" || tag === "B538") && payload.length === 24) {
    return [readF64(payload, 0), readF64(payload, 8), readF64(payload, 16)];
  }
  if (tag === "AE38") {
    return (child.children ?? []).map(decodeVffAttrValue);
  }
  return null;
}
function stringifyVffAttrValue(value) {
  if (value === null || value === void 0) return "";
  if (Array.isArray(value)) {
    return value.map((v) => stringifyVffAttrValue(v)).join(",");
  }
  return String(value);
}
function extractAttributeDictionaries(d007, options) {
  const dictionaries = {};
  const dc05 = d007.children.find((c) => c.tag === "DC05");
  if (!dc05) {
    return dictionaries;
  }
  const propContainerTags = /* @__PURE__ */ new Set([
    "DD05",
    "B536",
    "B136",
    "B236",
    "B336",
    "B036",
    "A438",
    "AE38"
  ]);
  const propElements = parseTlvRecursive(dc05.payload, 0, dc05.payload.length, propContainerTags);
  let currentKey = null;
  function extractEntries(nodes, entries) {
    for (const n of nodes) {
      const tag = n.tag;
      if (tag === "B636") {
        try {
          const decoder = new TextDecoder("utf-8");
          currentKey = decoder.decode(n.payload).replace(/\0/g, "").trim();
        } catch (e) {
          currentKey = null;
          emitLog(options, "debug", `Failed to decode attribute dictionary key: ${e.message}`);
        }
      } else if (tag === "A438" && currentKey) {
        entries[currentKey] = decodeVffAttrValue(n);
        currentKey = null;
      } else if (n.children && n.children.length > 0) {
        extractEntries(n.children, entries);
      }
    }
  }
  function walk2(nodes) {
    for (let i2 = 0; i2 < nodes.length; i2++) {
      if (nodes[i2].tag === "B436") {
        let name = "";
        try {
          const decoder = new TextDecoder("utf-8");
          name = decoder.decode(nodes[i2].payload).replace(/\0/g, "").trim();
        } catch (e) {
          emitLog(options, "debug", `Failed to decode attribute dictionary name: ${e.message}`);
        }
        const entries = {};
        currentKey = null;
        if (i2 + 1 < nodes.length && nodes[i2 + 1].children) {
          extractEntries(nodes[i2 + 1].children, entries);
        }
        dictionaries[name] = entries;
      } else if (nodes[i2].children && nodes[i2].children.length > 0) {
        walk2(nodes[i2].children);
      }
    }
  }
  walk2(propElements);
  return dictionaries;
}
var GENERIC_DEFINITION_NAME_PATTERN = /^(?:Group|Component)\d*#\d+$/;
function isGenericDefinitionName(name) {
  return GENERIC_DEFINITION_NAME_PATTERN.test(name);
}
var NAME_OVERRIDE_KEYS = ["name", "label", "code"];
function findNameOverride(attributeDicts) {
  if (!attributeDicts) return null;
  for (const dictName of Object.keys(attributeDicts)) {
    if (dictName === "dynamic_attributes" || dictName === "SU_InstanceSet") continue;
    const entries = attributeDicts[dictName];
    for (const key of NAME_OVERRIDE_KEYS) {
      if (!(key in entries)) continue;
      const val = stringifyVffAttrValue(entries[key]);
      if (val) return val;
    }
  }
  return null;
}
function reconstructLoopVertices(loop, edges) {
  const loopVerts = [];
  const pushStart = (vStart) => {
    if (vStart !== null) {
      if (loopVerts.length === 0 || loopVerts[loopVerts.length - 1] !== vStart) {
        loopVerts.push(vStart);
      }
    }
  };
  if (edges instanceof Map) {
    for (const { edgeId, orientation } of loop) {
      const edge = edges.get(edgeId);
      if (edge) pushStart(orientation === 1 ? edge[0] : edge[1]);
    }
  } else {
    for (const { edgeId, orientation } of loop) {
      const vStart = orientation === 1 ? edges.v1(edgeId) : edges.v2(edgeId);
      if (vStart !== void 0) pushStart(vStart);
    }
  }
  if (loopVerts.length > 1 && loopVerts[0] === loopVerts[loopVerts.length - 1]) {
    loopVerts.pop();
  }
  return loopVerts;
}
function decodeXmlEntities(value) {
  return value.replace(/&(lt|gt|amp|apos|quot|#\d+|#x[0-9a-fA-F]+);/g, (whole2, entity) => {
    switch (entity) {
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "amp":
        return "&";
      case "apos":
        return "'";
      case "quot":
        return '"';
      default:
        if (entity[0] === "#") {
          const codePoint = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
          return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : whole2;
        }
        return whole2;
    }
  });
}
function parseMaterialXml(xmlText) {
  const match = xmlText.match(/<(?:[a-zA-Z0-9_]+:)?material\b([^>]*)\/?>/);
  if (!match) return null;
  const attrsString = match[1];
  const getAttr = (name2) => {
    const attrRegex = new RegExp(`\\b${name2}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
    const m = attrsString.match(attrRegex);
    const raw = m ? m[1] !== void 0 ? m[1] : m[2] : null;
    return raw === null ? null : decodeXmlEntities(raw);
  };
  const name = getAttr("name") || "unknown";
  const colorRed = parseInt(getAttr("colorRed") || "128", 10);
  const colorGreen = parseInt(getAttr("colorGreen") || "128", 10);
  const colorBlue = parseInt(getAttr("colorBlue") || "128", 10);
  let trans;
  if (getAttr("useTrans") === "1") {
    const rawTrans = parseFloat(getAttr("trans") || "0");
    trans = Math.min(Math.max(1 - rawTrans, 0), 1);
  } else {
    trans = 1;
  }
  const colorized = getAttr("type") === "2";
  const colorizeTypeRaw = parseInt(getAttr("colorizeType") || "0", 10);
  const colorizeType = Number.isNaN(colorizeTypeRaw) ? 0 : colorizeTypeRaw;
  const textureMatch = xmlText.match(/<(?:[a-zA-Z0-9_]+:)?texture\b([^>]*)\/?>/);
  let hasTexture = false;
  let textureFilename = "";
  let xScale = 0;
  let yScale = 0;
  if (textureMatch) {
    hasTexture = true;
    const texAttrs = textureMatch[1];
    const getTexAttr = (n) => {
      const r = new RegExp(`\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
      const m = texAttrs.match(r);
      const raw = m ? m[1] !== void 0 ? m[1] : m[2] : null;
      return raw === null ? null : decodeXmlEntities(raw);
    };
    textureFilename = getTexAttr("textureFilename") || "";
    const xs = parseFloat(getTexAttr("xScale") || "0");
    xScale = Number.isNaN(xs) ? 0 : xs;
    const ys = parseFloat(getTexAttr("yScale") || "0");
    yScale = Number.isNaN(ys) ? 0 : ys;
  }
  const imageMatch = xmlText.match(
    /<(?:[a-zA-Z0-9_]+:)?image\b[^>]*\bpath\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\/?>/
  );
  const imagePath = imageMatch ? decodeXmlEntities(imageMatch[1] !== void 0 ? imageMatch[1] : imageMatch[2]) : "";
  return {
    name,
    r: colorRed,
    g: colorGreen,
    b: colorBlue,
    trans,
    colorized,
    colorizeType,
    hasTexture,
    textureFilename,
    xScale,
    yScale,
    imagePath
  };
}
function parseStyleXml(xmlText) {
  const styleMatch = xmlText.match(/<(?:[a-zA-Z0-9_]+:)?style\b([^>]*)>/);
  if (!styleMatch) return null;
  const attrsString = styleMatch[1];
  const nameMatch = attrsString.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/);
  const name = nameMatch ? nameMatch[1] !== void 0 ? nameMatch[1] : nameMatch[2] : "";
  const colors = {};
  const itemRegex = /<(?:[a-zA-Z0-9_]+:)?item\s+id\s*=\s*(?:"(\d+)"|'(\d+)')[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?item>/g;
  let m;
  while ((m = itemRegex.exec(xmlText)) !== null) {
    const id = m[1] !== void 0 ? m[1] : m[2];
    if (id !== "2002" && id !== "2003") continue;
    const inner = m[3];
    const variantMatch = inner.match(/<(?:[a-zA-Z0-9_]+:)?variant\b[^>]*>(-?\d+)<\/(?:[a-zA-Z0-9_]+:)?variant>/);
    if (!variantMatch) continue;
    const raw = parseInt(variantMatch[1], 10);
    if (Number.isNaN(raw)) continue;
    const v = raw >>> 0;
    colors[id] = [v & 255, v >> 8 & 255, v >> 16 & 255];
  }
  return {
    name,
    frontColor: colors["2002"] ?? null,
    backColor: colors["2003"] ?? null
  };
}
function lstripChars(s, chars) {
  let i2 = 0;
  while (i2 < s.length && chars.includes(s[i2])) i2++;
  return s.slice(i2);
}
function resolveTextureBytes(materialFiles, xmlName, filename, imagePath) {
  const names = Object.keys(materialFiles);
  const slashIdx = xmlName.lastIndexOf("/");
  const folder = slashIdx >= 0 ? xmlName.slice(0, slashIdx) : "";
  let data = null;
  let resolvedFilename = filename;
  const candidate = filename ? `${folder}/${filename}` : null;
  if (candidate && names.includes(candidate)) {
    data = materialFiles[candidate];
  } else {
    for (const entry of names) {
      if (entry.startsWith(folder + "/") && entry !== xmlName && !entry.toLowerCase().endsWith(".xml")) {
        data = materialFiles[entry];
        if (!resolvedFilename) {
          resolvedFilename = entry.split("/").pop() || "";
        }
        break;
      }
    }
  }
  if (data === null) {
    const imgPath = lstripChars(imagePath, "./");
    const candidates = [imgPath, folder ? `${folder}/${imgPath}` : imgPath];
    for (const cand of candidates) {
      if (cand && names.includes(cand)) {
        data = materialFiles[cand];
        if (!resolvedFilename) {
          resolvedFilename = cand.split("/").pop() || "";
        }
        break;
      }
    }
  }
  return { data, filename: resolvedFilename };
}
function foldScale(m) {
  if (m.length < 13 || m.length >= 16 || m[12] === 1) return m;
  const s = m[12];
  const out = m.slice(0, 12).map((v) => v * s);
  out.push(1);
  return out;
}
function transformPoint(matrix, point) {
  if (!matrix || matrix.length < 12) {
    return point;
  }
  const [x2, y, z] = point;
  if (matrix.length === 16) {
    const tx = matrix[0] * x2 + matrix[4] * y + matrix[8] * z + matrix[12];
    const ty = matrix[1] * x2 + matrix[5] * y + matrix[9] * z + matrix[13];
    const tz = matrix[2] * x2 + matrix[6] * y + matrix[10] * z + matrix[14];
    return [tx, ty, tz];
  } else {
    const m = foldScale(matrix);
    const tx = m[0] * x2 + m[1] * y + m[2] * z + m[9];
    const ty = m[3] * x2 + m[4] * y + m[5] * z + m[10];
    const tz = m[6] * x2 + m[7] * y + m[8] * z + m[11];
    return [tx, ty, tz];
  }
}
function multiplyMatrices(a, b) {
  if (!a || a.length === 0) return b && b.length === 13 ? foldScale(b) : b;
  if (!b || b.length === 0) return a.length === 13 ? foldScale(a) : a;
  if (a.length === 16 && b.length === 16) {
    const result = new Array(16).fill(0);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let s = 0;
        for (let k = 0; k < 4; k++) {
          s += a[k * 4 + row] * b[col * 4 + k];
        }
        result[col * 4 + row] = s;
      }
    }
    return result;
  } else {
    const aRaw = a.length < 13 ? [...a, ...new Array(13 - a.length).fill(0)] : a;
    const bRaw = b.length < 13 ? [...b, ...new Array(13 - b.length).fill(0)] : b;
    if (a.length < 13 && aRaw[12] === 0) aRaw[12] = 1;
    if (b.length < 13 && bRaw[12] === 0) bRaw[12] = 1;
    const aPad = foldScale(aRaw);
    const bPad = foldScale(bRaw);
    const p_r0 = [aPad[0], aPad[1], aPad[2], aPad[9]];
    const p_r1 = [aPad[3], aPad[4], aPad[5], aPad[10]];
    const p_r2 = [aPad[6], aPad[7], aPad[8], aPad[11]];
    const c_c0 = [bPad[0], bPad[3], bPad[6], 0];
    const c_c1 = [bPad[1], bPad[4], bPad[7], 0];
    const c_c2 = [bPad[2], bPad[5], bPad[8], 0];
    const c_c3 = [bPad[9], bPad[10], bPad[11], 1];
    const dot = (row, col) => {
      return row[0] * col[0] + row[1] * col[1] + row[2] * col[2] + row[3] * col[3];
    };
    const out = new Array(13).fill(0);
    out[0] = dot(p_r0, c_c0);
    out[1] = dot(p_r0, c_c1);
    out[2] = dot(p_r0, c_c2);
    out[3] = dot(p_r1, c_c0);
    out[4] = dot(p_r1, c_c1);
    out[5] = dot(p_r1, c_c2);
    out[6] = dot(p_r2, c_c0);
    out[7] = dot(p_r2, c_c1);
    out[8] = dot(p_r2, c_c2);
    out[9] = dot(p_r0, c_c3);
    out[10] = dot(p_r1, c_c3);
    out[11] = dot(p_r2, c_c3);
    out[12] = 1;
    return out;
  }
}
function triangulateFace3D(vertices3D, loops, normal) {
  if (loops.length === 0) return [];
  if (loops.length === 1 && loops[0].length === 3) {
    return [loops[0]];
  }
  if (loops.length === 1 && loops[0].length === 4) {
    const v = loops[0];
    return [
      [v[0], v[1], v[2]],
      [v[0], v[2], v[3]]
    ];
  }
  let nx = normal[0];
  let ny = normal[1];
  let nz = normal[2];
  const normVal = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (normVal > 1e-6) {
    nx /= normVal;
    ny /= normVal;
    nz /= normVal;
  } else {
    nx = 0;
    ny = 0;
    nz = 1;
  }
  let u_axis;
  if (Math.abs(nx) < 0.9) {
    u_axis = [1, 0, 0];
  } else {
    u_axis = [0, 1, 0];
  }
  let ux = ny * u_axis[2] - nz * u_axis[1];
  let uy = nz * u_axis[0] - nx * u_axis[2];
  let uz = nx * u_axis[1] - ny * u_axis[0];
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
  if (uLen < 1e-12) {
    ux = 1;
    uy = 0;
    uz = 0;
  } else {
    ux /= uLen;
    uy /= uLen;
    uz /= uLen;
  }
  let vx = ny * uz - nz * uy;
  let vy = nz * ux - nx * uz;
  let vz = nx * uy - ny * ux;
  const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (vLen > 1e-12) {
    vx /= vLen;
    vy /= vLen;
    vz /= vLen;
  }
  const getVertex = (id) => {
    let pt;
    if (typeof vertices3D.get === "function") {
      pt = vertices3D.get(id);
    } else {
      pt = vertices3D[id];
    }
    if (!pt) return null;
    if (Array.isArray(pt)) {
      return { x: pt[0], y: pt[1], z: pt[2] };
    }
    return pt;
  };
  const loops2d = [];
  for (const loop of loops) {
    const pts2 = [];
    for (const vId of loop) {
      const pt = getVertex(vId);
      if (!pt) {
        return [];
      }
      pts2.push({ u: pt.x * ux + pt.y * uy + pt.z * uz, v: pt.x * vx + pt.y * vy + pt.z * vz });
    }
    loops2d.push(pts2);
  }
  if (loops.length > 2 && holesOverlap(loops2d)) {
    return triangulateByFilteringHoles(loops, loops2d);
  }
  const allVIds = [];
  const holeIndices = [];
  let currentOffset = 0;
  for (let l = 0; l < loops.length; l++) {
    if (l > 0) {
      holeIndices.push(currentOffset);
    }
    const loop = loops[l];
    for (const vId of loop) {
      allVIds.push(vId);
    }
    currentOffset += loop.length;
  }
  const flatCoords = [];
  for (const pts2 of loops2d) {
    for (const { u, v } of pts2) {
      flatCoords.push(u, v);
    }
  }
  let triIndices;
  try {
    triIndices = earcut(flatCoords, holeIndices, 2);
  } catch {
    const outerLoop = loops[0];
    const fallback = [];
    for (let i2 = 1; i2 < outerLoop.length - 1; i2++) {
      fallback.push([outerLoop[0], outerLoop[i2], outerLoop[i2 + 1]]);
    }
    return fallback;
  }
  const result = [];
  for (let i2 = 0; i2 < triIndices.length; i2 += 3) {
    const idx0 = triIndices[i2];
    const idx1 = triIndices[i2 + 1];
    const idx2 = triIndices[i2 + 2];
    result.push([
      allVIds[idx0],
      allVIds[idx1],
      allVIds[idx2]
    ]);
  }
  return result;
}
function holesOverlap(loops2d) {
  for (let i2 = 1; i2 < loops2d.length; i2++) {
    for (let j = i2 + 1; j < loops2d.length; j++) {
      if (anyVertexInside(loops2d[i2], loops2d[j]) || anyVertexInside(loops2d[j], loops2d[i2])) {
        return true;
      }
    }
  }
  return false;
}
function anyVertexInside(points, polygon) {
  for (const p of points) {
    if (pointInPolygon(p.u, p.v, polygon)) return true;
  }
  return false;
}
function pointInPolygon(u, v, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i2 = 0, j = n - 1; i2 < n; j = i2++) {
    const ui = polygon[i2].u, vi = polygon[i2].v;
    const uj = polygon[j].u, vj = polygon[j].v;
    const intersects2 = vi > v !== vj > v && u < (uj - ui) * (v - vi) / (vj - vi) + ui;
    if (intersects2) inside = !inside;
  }
  return inside;
}
function triangulateByFilteringHoles(loops, loops2d) {
  const outerLoop = loops[0];
  const outer2d = loops2d[0];
  const flatOuter = [];
  for (const { u, v } of outer2d) {
    flatOuter.push(u, v);
  }
  let triIndices;
  try {
    triIndices = earcut(flatOuter, [], 2);
  } catch {
    const fallback = [];
    for (let i2 = 1; i2 < outerLoop.length - 1; i2++) {
      fallback.push([outerLoop[0], outerLoop[i2], outerLoop[i2 + 1]]);
    }
    return fallback;
  }
  const result = [];
  for (let i2 = 0; i2 < triIndices.length; i2 += 3) {
    const ia = triIndices[i2], ib = triIndices[i2 + 1], ic = triIndices[i2 + 2];
    const cu = (outer2d[ia].u + outer2d[ib].u + outer2d[ic].u) / 3;
    const cv = (outer2d[ia].v + outer2d[ib].v + outer2d[ic].v) / 3;
    let insideAnyHole = false;
    for (let h = 1; h < loops2d.length; h++) {
      if (pointInPolygon(cu, cv, loops2d[h])) {
        insideAnyHole = true;
        break;
      }
    }
    if (insideAnyHole) continue;
    result.push([outerLoop[ia], outerLoop[ib], outerLoop[ic]]);
  }
  return result;
}
var SMOOTH_EDGE = 16;
function smoothCornerNormals(builder, ctx) {
  const edgeFaces = /* @__PURE__ */ new Map();
  for (const [fId, face] of builder.faces.entries()) {
    if (ctx.respectVisibility && face.hidden) continue;
    for (const loop of face.loops) {
      for (const { edgeId } of loop) {
        if (((builder.edgeFlags.get(edgeId) ?? 0) & SMOOTH_EDGE) === 0) continue;
        let faces = edgeFaces.get(edgeId);
        if (!faces) edgeFaces.set(edgeId, faces = []);
        if (!faces.includes(fId)) faces.push(fId);
      }
    }
  }
  if (edgeFaces.size === 0) return null;
  const parent = /* @__PURE__ */ new Map();
  const touch = (key) => {
    if (!parent.has(key)) parent.set(key, key);
    return key;
  };
  const find = (key) => {
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(key) !== root) {
      const next = parent.get(key);
      parent.set(key, root);
      key = next;
    }
    return root;
  };
  for (const [edgeId, faces] of edgeFaces) {
    if (faces.length !== 2) continue;
    const ends = builder.edges.get(edgeId);
    if (!ends) continue;
    const a = builder.faces.get(faces[0]).normal;
    const b = builder.faces.get(faces[1]).normal;
    if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] <= 0) continue;
    for (const vId of ends) {
      if (vId === null) continue;
      const left = find(touch(`${vId}:${faces[0]}`));
      const right = find(touch(`${vId}:${faces[1]}`));
      if (left !== right) parent.set(left, right);
    }
  }
  const sums = /* @__PURE__ */ new Map();
  for (const key of parent.keys()) {
    const normal = builder.faces.get(Number(key.slice(key.indexOf(":") + 1))).normal;
    const root = find(key);
    const sum = sums.get(root);
    if (sum) {
      sum[0] += normal[0];
      sum[1] += normal[1];
      sum[2] += normal[2];
    } else {
      sums.set(root, [normal[0], normal[1], normal[2]]);
    }
  }
  return (vId, fId) => {
    const key = `${vId}:${fId}`;
    if (!parent.has(key)) return null;
    const root = find(key);
    const sum = sums.get(root);
    const length = Math.hypot(sum[0], sum[1], sum[2]) || 1;
    return { root, n: [sum[0] / length, sum[1] / length, sum[2] / length] };
  };
}
function buildLocalFaceGroups(builder, ctx) {
  const faceGroups = /* @__PURE__ */ new Map();
  const smoothCorner = smoothCornerNormals(builder, ctx);
  const addSide = (triangles, fn, color, doubleSided, reverse, mat, uvTransform, xr, yr, fId) => {
    const texIndex = ctx.textureIndexFor(mat?.texture);
    const colorAlpha = color.a !== void 0 ? color.a / 255 : 1;
    const transparency = colorAlpha * (mat?.transparency ?? 1);
    const colorKey = `${color.r},${color.g},${color.b},${doubleSided},${texIndex ?? -1},${transparency}`;
    let group = faceGroups.get(colorKey);
    if (!group) {
      group = {
        color,
        transparency,
        doubleSided,
        textureIndex: texIndex,
        localVerts: [],
        localUvs: [],
        normalsAccum: [],
        localFaces: [],
        localVMap: /* @__PURE__ */ new Map()
      };
      faceGroups.set(colorKey, group);
    }
    const tex = mat?.texture;
    const tileW = tex && tex.width > 1e-9 ? tex.width : 1;
    const tileH = tex && tex.height > 1e-9 ? tex.height : 1;
    const sideNormal = reverse ? [-fn[0], -fn[1], -fn[2]] : fn;
    const faceLocalMap = /* @__PURE__ */ new Map();
    for (const tri of triangles) {
      const triIds = reverse ? [tri[0], tri[2], tri[1]] : tri;
      const faceIndices = [];
      for (const vId of triIds) {
        if (!builder.vertices.has(vId)) continue;
        let idx = faceLocalMap.get(vId);
        if (idx === void 0) {
          const p = builder.vertices.get(vId);
          const [u, v] = computeFaceUv(p, xr, yr, uvTransform, tileW, tileH);
          const smooth = smoothCorner?.(vId, fId) ?? null;
          const normal = smooth ? reverse ? [-smooth.n[0], -smooth.n[1], -smooth.n[2]] : smooth.n : sideNormal;
          const key = smooth ? `${vId},${u},${v},${smooth.root}` : `${vId},${u},${v}`;
          idx = group.localVMap.get(key);
          if (idx === void 0) {
            group.localVerts.push(p);
            group.localUvs.push([u, v]);
            group.normalsAccum.push([normal[0], normal[1], normal[2]]);
            idx = group.localVerts.length - 1;
            group.localVMap.set(key, idx);
          } else {
            const accum = group.normalsAccum[idx];
            accum[0] += normal[0];
            accum[1] += normal[1];
            accum[2] += normal[2];
          }
          faceLocalMap.set(vId, idx);
        }
        faceIndices.push(idx);
      }
      if (faceIndices.length === 3) {
        group.localFaces.push(faceIndices);
      }
    }
  };
  for (const [fId, fData] of builder.faces.entries()) {
    if (ctx.respectVisibility && fData.hidden) continue;
    const fallbackColor = ctx.inheritedMaterial?.color ?? ctx.fallbackLayerColor;
    const frontMat = ctx.resolveMaterial(fData.materialId) ?? ctx.inheritedMaterial;
    const backMat = ctx.resolveMaterial(fData.backMaterialId) ?? ctx.inheritedMaterial;
    const frontColor = frontMat?.color ?? fallbackColor;
    const backColor = backMat?.color ?? fallbackColor;
    const loops = [];
    for (const loop of fData.loops) {
      const loopVerts = reconstructLoopVertices(loop, builder.edges);
      if (loopVerts.length > 0) {
        loops.push(loopVerts);
      }
    }
    if (loops.length === 0) continue;
    let triangles;
    try {
      triangles = triangulateFace3D(builder.vertices, loops, fData.normal);
    } catch (e) {
      throw new SkpParseError(`Failed to triangulate face: ${e.message}`, {
        stage: "build_scene",
        definitionId: ctx.definitionId,
        cause: e
      });
    }
    const fn = fData.normal;
    const { xr, yr } = faceUvBasis(fn);
    const uvTransform = fData.uvTransform;
    const uvTransformBack = fData.uvTransformBack;
    const sameColor = frontColor.r === backColor.r && frontColor.g === backColor.g && frontColor.b === backColor.b;
    if (sameColor || ctx.frontSideOnly) {
      addSide(triangles, fn, frontColor, true, false, frontMat, uvTransform, xr, yr, fId);
    } else {
      addSide(triangles, fn, frontColor, false, false, frontMat, uvTransform, xr, yr, fId);
      addSide(triangles, fn, backColor, false, true, backMat, uvTransformBack, xr, yr, fId);
    }
  }
  return faceGroups;
}
function sniffImageMime(data) {
  if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) {
    return "image/jpeg";
  }
  if (data.length >= 8 && data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71 && data[4] === 13 && data[5] === 10 && data[6] === 26 && data[7] === 10) {
    return "image/png";
  }
  return null;
}
function buildModelFromParsed(parsed) {
  const {
    version,
    units,
    layerColors,
    layerHidden,
    layerIdToName,
    pages,
    dimensions,
    materialIdToName,
    materialsMap,
    materialsByFolder,
    styles,
    defsDict
  } = parsed;
  const materialsById = /* @__PURE__ */ new Map();
  for (const [mId, mName] of materialIdToName.entries()) {
    const mat = materialsMap.get(mName) || materialsByFolder.get(mName);
    if (!mat) continue;
    if (mat.id === null) {
      mat.id = mId;
    }
    materialsById.set(mId, mat);
  }
  const finalLayersList = Array.from(layerColors.entries()).map(([name, c]) => ({
    name,
    color: { r: c[0], g: c[1], b: c[2] },
    hidden: layerHidden.get(name) ?? false
  }));
  const finalMaterialsList = Array.from(materialsMap.values());
  const finalPagesList = pages.map((pg) => ({
    name: pg.name,
    eye: pg.eye,
    target: pg.target,
    up: pg.up,
    fov: pg.fov,
    parallel: pg.parallel,
    orthoHeight: pg.orthoHeight,
    hiddenLayers: pg.hiddenLayerIds.map((id) => layerIdToName.get(id)).filter((name) => name !== void 0)
  }));
  const finalDimensionsList = dimensions.map((dm) => ({
    a: dm.a,
    b: dm.b,
    offset: dm.offset,
    planeX: dm.planeX,
    normal: dm.normal,
    text: dm.text,
    hidden: false
  }));
  const finalDefinitions = /* @__PURE__ */ new Map();
  let rootDefinition = null;
  for (const [id, d] of defsDict.entries()) {
    const defn = buildDefinition(typeof id === "number" ? id : 0, d, layerIdToName);
    if (typeof id === "number") {
      finalDefinitions.set(id, defn);
    } else {
      rootDefinition = defn;
    }
  }
  return {
    version,
    definitions: finalDefinitions,
    // The implicit top-level model definition: its instances are the
    // entities placed directly in the model (not inside any component/
    // group). Kept out of `definitions` (which is numeric-ID-only, one
    // entry per real component/group definition) and exposed here instead,
    // matching the .NET and Dart ports' `Root`/`root` field.
    root: rootDefinition ?? { id: 0, guid: "ROOT", name: "ROOT_MODEL", vertices: [], edges: [], faces: [], instances: [], sectionPlanes: [], texts: [], dimensions: [], constructionLines: [], constructionPoints: [], arcs: /* @__PURE__ */ new Map(), isImage: false, isGroup: false, alwaysFacesCamera: false, shadowsFaceSun: false },
    layers: finalLayersList,
    pages: finalPagesList,
    dimensions: finalDimensionsList,
    materials: finalMaterialsList,
    materialsById,
    styles,
    units
  };
}
function buildDefinition(id, d, layerIdToName) {
  const vertices = Array.from(d.builder.vertices.entries()).map(([vId, [x2, y, z]]) => ({
    id: vId,
    x: x2,
    y,
    z
  }));
  const edges = Array.from(d.builder.edges.entries()).map(([eId, [v1, v2]]) => {
    const flags = d.builder.edgeFlags.get(eId) ?? 0;
    return {
      id: eId,
      v1Id: v1 ?? 0,
      v2Id: v2 ?? 0,
      soft: (flags & 8) !== 0,
      smooth: (flags & 16) !== 0,
      hidden: (flags & 1) !== 0,
      curveId: d.builder.edgeCurves?.get(eId) ?? null
    };
  });
  const arcs = /* @__PURE__ */ new Map();
  for (const [curveId, f2] of d.builder.arcCurves ?? []) {
    const radius = Math.hypot(f2.xAxis[0], f2.xAxis[1], f2.xAxis[2]);
    const sweep = ((f2.endAngle - f2.startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    arcs.set(curveId, {
      center: [...f2.center],
      normal: [...f2.normal],
      xAxis: [...f2.xAxis],
      yAxis: [...f2.yAxis],
      startAngle: f2.startAngle,
      endAngle: f2.endAngle,
      radius,
      isFullCircle: Math.min(sweep, 2 * Math.PI - sweep) < 1e-9
    });
  }
  const faces = Array.from(d.builder.faces.entries()).map(([fId, fData]) => ({
    id: fId,
    loops: fData.loops,
    normal: fData.normal,
    materialId: fData.materialId ?? null,
    backMaterialId: fData.backMaterialId ?? null,
    uvTransform: fData.uvTransform ?? null,
    uvTransformBack: fData.uvTransformBack ?? null,
    uvProjected: fData.uvProjected ?? false,
    uvProjectedBack: fData.uvProjectedBack ?? false,
    hidden: fData.hidden ?? false
  }));
  const instances = d.builder.instances.map((inst) => ({
    name: inst.name,
    refIdx: inst.refIdx,
    guid: inst.refGuid,
    matrix: inst.matrix,
    materialId: inst.materialId,
    hidden: inst.hidden ?? false,
    layer: (inst.layerId != null ? layerIdToName?.get(inst.layerId) : void 0) ?? "",
    properties: inst.properties ?? {}
  }));
  const sectionPlanes = (d.builder.sectionPlanes || []).map((sp) => ({
    plane: sp.plane || [0, 0, 1, 0],
    name: sp.name || "",
    label: sp.label || "",
    hidden: sp.hidden || false
  }));
  const texts = (d.builder.texts || []).map((txt) => ({
    text: txt.text || "",
    hidden: txt.hidden || false
  }));
  const dimensions = (d.builder.dimensions || []).map((dim) => ({
    text: dim.text || "",
    hidden: dim.hidden || false,
    a: null,
    b: null,
    offset: 0,
    planeX: null,
    normal: null
  }));
  const constructionLines = (d.builder.constructionLines || []).map((cl) => ({
    point: cl.point,
    direction: cl.direction,
    start: cl.start,
    end: cl.end
  }));
  const constructionPoints = (d.builder.constructionPoints || []).map((cp) => ({
    position: cp.position
  }));
  return {
    id,
    guid: d.guid,
    name: d.name,
    vertices,
    edges,
    faces,
    instances,
    sectionPlanes,
    texts,
    dimensions,
    constructionLines,
    constructionPoints,
    arcs,
    isImage: d.isImage,
    isGroup: d.isGroup || false,
    alwaysFacesCamera: d.alwaysFacesCamera,
    shadowsFaceSun: d.shadowsFaceSun || false
  };
}
function invertMatrix3x3(m) {
  const [a, b, c, d, e, f2, g, h, i2] = m;
  const det = a * (e * i2 - f2 * h) - b * (d * i2 - f2 * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  const invDet = 1 / det;
  return [
    (e * i2 - f2 * h) * invDet,
    (c * h - b * i2) * invDet,
    (b * f2 - c * e) * invDet,
    (f2 * g - d * i2) * invDet,
    (a * i2 - c * g) * invDet,
    (c * d - a * f2) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet
  ];
}
function faceUvBasis(n) {
  const [nx, ny, nz] = n;
  const cx = -ny;
  const cy = nx;
  const clen = Math.sqrt(cx * cx + cy * cy);
  let xr;
  let yr;
  if (clen < 1e-9) {
    xr = [1, 0, 0];
    yr = [0, nz >= 0 ? 1 : -1, 0];
  } else {
    xr = [cx / clen, cy / clen, 0];
    yr = [ny * xr[2] - nz * xr[1], nz * xr[0] - nx * xr[2], nx * xr[1] - ny * xr[0]];
  }
  return { xr, yr };
}
function computeFaceUv(p, xr, yr, uvTransform, tileW, tileH) {
  const px = p[0] * xr[0] + p[1] * xr[1] + p[2] * xr[2];
  const py = p[0] * yr[0] + p[1] * yr[1] + p[2] * yr[2];
  if (!uvTransform) {
    return [px / tileW, py / tileH];
  }
  const inv = invertMatrix3x3(uvTransform);
  const u = px * inv[0] + py * inv[3] + inv[6];
  const v = px * inv[1] + py * inv[4] + inv[7];
  let q = px * inv[2] + py * inv[5] + inv[8];
  if (Math.abs(q) < 1e-12) q = 1;
  return [u / q / tileW, v / q / tileH];
}
function buildSceneFromParsed(parsed, options) {
  const t02 = Date.now();
  const { layerColors, layerIdToName, materialIdToName, materialsMap, materialsByFolder, defsDict } = parsed;
  emitLog(options, "info", `Building scene: ${defsDict.size} definitions available`);
  const instanceCounter = { count: 0 };
  const meshCounter = { count: 0 };
  const meshIndex = {};
  const glbPrimitives = [];
  const pathUpdates = /* @__PURE__ */ new Map();
  const getLayerColor = (name) => {
    const c = layerColors.get(name) || [136, 136, 136];
    return { r: c[0], g: c[1], b: c[2] };
  };
  const textures = [];
  const textureIndexByKey = /* @__PURE__ */ new Map();
  function textureIndexFor(tex) {
    if (!tex || !tex.data || tex.data.length === 0) return null;
    const mimeType = sniffImageMime(tex.data);
    if (mimeType === null) return null;
    const head = Array.from(tex.data.subarray(0, 16)).join(",");
    const key = `${tex.data.length}:${head}`;
    const hit = textureIndexByKey.get(key);
    if (hit !== void 0) return hit;
    const idx = textures.length;
    textures.push({ data: tex.data, mimeType, filename: tex.filename });
    textureIndexByKey.set(key, idx);
    return idx;
  }
  const colorToMaterialIndex = /* @__PURE__ */ new Map();
  const gltfMaterials = [];
  const boundsMin = [Infinity, Infinity, Infinity];
  const boundsMax = [-Infinity, -Infinity, -Infinity];
  const activeDefinitions = /* @__PURE__ */ new Set();
  function getMaterialIndex(color, doubleSided, textureIndex, transparency = 1) {
    const key = `${color.r},${color.g},${color.b},${doubleSided},${textureIndex ?? -1},${transparency}`;
    if (colorToMaterialIndex.has(key)) {
      return colorToMaterialIndex.get(key);
    }
    const idx = gltfMaterials.length;
    const pbr = {
      baseColorFactor: [color.r / 255, color.g / 255, color.b / 255, transparency],
      metallicFactor: 0,
      roughnessFactor: 0.8
    };
    if (textureIndex !== null) {
      pbr.baseColorTexture = { index: textureIndex };
    }
    const material = { pbrMetallicRoughness: pbr };
    if (doubleSided) material.doubleSided = true;
    if (transparency < 1) {
      material.alphaMode = "BLEND";
    } else if (textureIndex !== null) {
      material.alphaMode = "MASK";
    }
    gltfMaterials.push(material);
    colorToMaterialIndex.set(key, idx);
    return idx;
  }
  function instantiate(defId, currentMatrix, parentLayer = "Layer0", pathName = "ROOT", inheritedMaterial) {
    const d = defsDict.get(defId);
    if (!d) return [];
    const builder = d.builder;
    if (builder.faces.size > 0) {
      const faceGroups = buildLocalFaceGroups(builder, {
        resolveMaterial: (matId) => resolveMaterialFromMaps(matId, materialIdToName, materialsMap, materialsByFolder),
        textureIndexFor,
        inheritedMaterial,
        fallbackLayerColor: getLayerColor(parentLayer),
        definitionId: defId,
        respectVisibility: options?.respectEdgeVisibility,
        frontSideOnly: options?.frontSideOnly
      });
      for (const group of faceGroups.values()) {
        if (group.localFaces.length === 0) continue;
        const isRoot = pathName === "ROOT";
        const tx = isRoot ? 0 : (currentMatrix[9] ?? 0) * 25.4;
        const ty = isRoot ? 0 : (currentMatrix[10] ?? 0) * 25.4;
        const tz = isRoot ? 0 : (currentMatrix[11] ?? 0) * 25.4;
        let safePath = pathName.replace(/ \/ /g, "__").replace(/ /g, "_");
        if (safePath.length > 80) safePath = safePath.slice(0, 80);
        const colorSuffix = faceGroups.size > 1 ? `_${group.color.r}_${group.color.g}_${group.color.b}_${group.doubleSided ? "ds" : "ss"}` : "";
        const geomName = `mesh_${meshCounter.count}_${safePath}_${parentLayer}${colorSuffix}`;
        meshCounter.count++;
        meshIndex[geomName] = {
          name: isRoot ? "ROOT" : pathName.split(" / ").pop() || "",
          definitionName: d.name || "",
          layer: parentLayer,
          positionMm: [Math.round(tx * 100) / 100, Math.round(ty * 100) / 100, Math.round(tz * 100) / 100],
          properties: {},
          attributeDictionaries: {},
          path: pathName
        };
        const scale2 = 0.0254;
        const positions = new Float32Array(group.localVerts.length * 3);
        const normals = new Float32Array(group.localVerts.length * 3);
        const uvs = new Float32Array(group.localVerts.length * 2);
        const vertexNormalsAccum = group.normalsAccum;
        for (let i2 = 0; i2 < group.localVerts.length; i2++) {
          const v = group.localVerts[i2];
          const pt = transformPoint(currentMatrix, v);
          positions[i2 * 3] = pt[0] * scale2;
          positions[i2 * 3 + 1] = pt[2] * scale2;
          positions[i2 * 3 + 2] = -pt[1] * scale2;
          const wx = positions[i2 * 3];
          const wy = positions[i2 * 3 + 1];
          const wz = positions[i2 * 3 + 2];
          if (wx < boundsMin[0]) boundsMin[0] = wx;
          if (wy < boundsMin[1]) boundsMin[1] = wy;
          if (wz < boundsMin[2]) boundsMin[2] = wz;
          if (wx > boundsMax[0]) boundsMax[0] = wx;
          if (wy > boundsMax[1]) boundsMax[1] = wy;
          if (wz > boundsMax[2]) boundsMax[2] = wz;
          uvs[i2 * 2] = group.localUvs[i2][0];
          uvs[i2 * 2 + 1] = group.localUvs[i2][1];
          const rawNorm = vertexNormalsAccum[i2];
          const normLen = Math.sqrt(rawNorm[0] ** 2 + rawNorm[1] ** 2 + rawNorm[2] ** 2);
          const n = normLen > 1e-6 ? [rawNorm[0] / normLen, rawNorm[1] / normLen, rawNorm[2] / normLen] : [0, 0, 1];
          const nx = currentMatrix[0] * n[0] + currentMatrix[1] * n[1] + currentMatrix[2] * n[2];
          const ny = currentMatrix[3] * n[0] + currentMatrix[4] * n[1] + currentMatrix[5] * n[2];
          const nz = currentMatrix[6] * n[0] + currentMatrix[7] * n[1] + currentMatrix[8] * n[2];
          const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (l > 1e-6) {
            normals[i2 * 3] = nx / l;
            normals[i2 * 3 + 1] = nz / l;
            normals[i2 * 3 + 2] = -ny / l;
          } else {
            normals[i2 * 3] = 0;
            normals[i2 * 3 + 1] = 1;
            normals[i2 * 3 + 2] = 0;
          }
        }
        const indices = new Uint32Array(group.localFaces.length * 3);
        for (let i2 = 0; i2 < group.localFaces.length; i2++) {
          indices[i2 * 3] = group.localFaces[i2][0];
          indices[i2 * 3 + 1] = group.localFaces[i2][1];
          indices[i2 * 3 + 2] = group.localFaces[i2][2];
        }
        const materialIndex = getMaterialIndex(group.color, group.doubleSided, group.textureIndex, group.transparency);
        glbPrimitives.push({
          positions,
          normals,
          uvs,
          indices,
          materialIndex,
          geomName
        });
      }
    }
    const childInstancesInfo = [];
    for (const inst of builder.instances) {
      const refIdx = inst.refIdx;
      const instMatrix = inst.matrix;
      const newMatrix = multiplyMatrices(currentMatrix, instMatrix);
      let lName = parentLayer;
      let instMaterial = inheritedMaterial;
      let properties = { ...inst.properties || {} };
      if (inst.layerId !== null && inst.layerId !== void 0) {
        lName = layerIdToName.get(inst.layerId) || parentLayer;
      }
      if (inst.materialId !== null && inst.materialId !== void 0) {
        const matName = materialIdToName.get(inst.materialId);
        if (matName) {
          const mat = materialsMap.get(matName) || materialsByFolder.get(matName);
          if (mat) {
            instMaterial = mat;
          }
        }
      }
      const d007 = inst.children.find((c) => c.tag === "D007");
      let attributeDicts = null;
      if (d007) {
        try {
          properties = extractDynamicProperties(d007, options);
          attributeDicts = extractAttributeDictionaries(d007, options);
        } catch (e) {
          emitLog(
            options,
            "debug",
            `Failed to extract dynamic properties for instance ${inst.name ?? ""} (refIdx=${refIdx}): ${e.message}`
          );
        }
      }
      const instName = inst.name || `Component_${refIdx}`;
      const fullPathName = `${pathName} / ${instName}`;
      instanceCounter.count++;
      if (instanceCounter.count % PROGRESS_INTERVAL === 0) {
        emitProgress(options, "build_scene", instanceCounter.count, instanceCounter.count);
        emitLog(options, "debug", `Processed ${instanceCounter.count} placed instances`);
      }
      if (activeDefinitions.has(refIdx)) {
        throw new SkpParseError("Recursive component definition", {
          stage: "build_scene",
          definitionId: refIdx
        });
      }
      activeDefinitions.add(refIdx);
      const childNodes = instantiate(refIdx, newMatrix, lName, fullPathName, instMaterial);
      activeDefinitions.delete(refIdx);
      const tx = (newMatrix[9] ?? 0) * 25.4;
      const ty = (newMatrix[10] ?? 0) * 25.4;
      const tz = (newMatrix[11] ?? 0) * 25.4;
      const childDefName = defsDict.get(refIdx)?.name || "";
      const defNameIsReal = !!childDefName && !isGenericDefinitionName(childDefName);
      const nameOverride = findNameOverride(attributeDicts);
      const instNameNonEmpty = !!inst.name;
      const fallbackName = instNameNonEmpty ? inst.name : defNameIsReal ? childDefName : `Component_${refIdx}`;
      const displayName = nameOverride ?? fallbackName;
      const nameIsGenerated = nameOverride === null && !instNameNonEmpty && !defNameIsReal;
      const attributeDictionaries = {};
      if (attributeDicts) {
        for (const dictName of Object.keys(attributeDicts)) {
          if (dictName === "dynamic_attributes" || dictName === "SU_InstanceSet") continue;
          const entries = attributeDicts[dictName];
          const stringified = {};
          for (const key of Object.keys(entries)) stringified[key] = stringifyVffAttrValue(entries[key]);
          attributeDictionaries[dictName] = stringified;
        }
      }
      const instInfo = {
        name: displayName,
        nameIsGenerated,
        definitionName: childDefName,
        layer: lName,
        positionMm: [
          Math.round(tx * 100) / 100,
          Math.round(ty * 100) / 100,
          Math.round(tz * 100) / 100
        ],
        properties,
        attributeDictionaries,
        guid: inst.refGuid || "",
        children: childNodes
      };
      childInstancesInfo.push(instInfo);
      pathUpdates.set(fullPathName, { properties, name: inst.name || "", attributeDictionaries });
    }
    return childInstancesInfo;
  }
  const identityMat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
  const rootChildren = instantiate("ROOT", identityMat);
  for (const geomName of Object.keys(meshIndex)) {
    const existing = meshIndex[geomName];
    const update = existing ? pathUpdates.get(existing.path) : void 0;
    if (existing && update) {
      existing.properties = update.properties;
      existing.name = update.name;
      existing.attributeDictionaries = update.attributeDictionaries;
    }
  }
  for (const geomName of Object.keys(meshIndex)) {
    const existing = meshIndex[geomName];
    if (existing && existing.path === "ROOT") {
      existing.name = "ROOT";
      existing.definitionName = "ROOT_MODEL";
      existing.layer = "Layer0";
      existing.positionMm = [0, 0, 0];
      existing.properties = {};
      existing.attributeDictionaries = {};
    }
  }
  const sceneHierarchy = {
    name: "ROOT",
    nameIsGenerated: false,
    definitionName: "ROOT_MODEL",
    layer: "Layer0",
    positionMm: [0, 0, 0],
    properties: {},
    attributeDictionaries: {},
    guid: "",
    children: rootChildren
  };
  emitLog(
    options,
    "info",
    `Scene build complete: ${instanceCounter.count} instances, ${Object.keys(meshIndex).length} meshes, ${glbPrimitives.length} primitives (${((Date.now() - t02) / 1e3).toFixed(2)}s)`
  );
  const bounds = Number.isFinite(boundsMin[0]) ? {
    min: [boundsMin[0], boundsMin[1], boundsMin[2]],
    max: [boundsMax[0], boundsMax[1], boundsMax[2]],
    size: [
      boundsMax[0] - boundsMin[0],
      boundsMax[1] - boundsMin[1],
      boundsMax[2] - boundsMin[2]
    ],
    center: [
      (boundsMin[0] + boundsMax[0]) / 2,
      (boundsMin[1] + boundsMax[1]) / 2,
      (boundsMin[2] + boundsMax[2]) / 2
    ]
  } : null;
  return { sceneHierarchy, meshIndex, glbPrimitives, gltfMaterials, textures, bounds };
}
function resolveMaterialFromMaps(matId, materialIdToName, materialsMap, materialsByFolder) {
  if (matId === void 0 || matId === null) return void 0;
  const matName = materialIdToName.get(matId);
  if (!matName) return void 0;
  return materialsMap.get(matName) || materialsByFolder.get(matName);
}
var LegacyParseError = class extends Error {
};
var STR_MARKER = new Uint8Array([255, 254, 255]);
var MAX_V20_FILLER_PAD = 29;
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i2 = 0; i2 < a.length; i2++) if (a[i2] !== b[i2]) return false;
  return true;
}
function findCountAfterV20Filler(data, countPos, limit, ar) {
  let markerAt = -1;
  for (let i2 = countPos; i2 < countPos + 12 && i2 + 4 <= data.length; i2++) {
    if (data[i2] === 255 && data[i2 + 1] === 254 && data[i2 + 2] === 255) {
      markerAt = i2;
      break;
    }
  }
  if (markerAt < 0) return null;
  if (data[markerAt + 3] !== 0) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let pad = 1; pad <= MAX_V20_FILLER_PAD; pad += 4) {
    const at = markerAt + 4 + pad;
    if (at + 4 > data.length) break;
    const count2 = view.getUint32(at, true);
    if (count2 > 0 && count2 <= limit && (ar === void 0 || plausibleListTag(ar, data, at + 4))) {
      return { count: count2, next: at + 4 };
    }
  }
  return null;
}
function retryCountAfterV20Filler(r, countPos, limit, ar) {
  const hit = findCountAfterV20Filler(r.data, countPos, limit, ar);
  if (hit === null) return null;
  r.pos = hit.next;
  return hit.count;
}
function plausibleListTag(ar, data, at) {
  if (at + 2 > data.length) return false;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const t = view.getUint16(at, true);
  if (t === 0 || t === 32767 || t === 65535) return true;
  if (t & 32768) {
    const ent = ar.slots.get(t & 32767);
    return ent !== void 0 && ent[0] === "class";
  }
  return t < ar.nextSlot;
}
function findBytes(data, needle, start = 0, end = data.length) {
  const nlen = needle.length;
  const limit = end - nlen;
  outer: for (let i2 = start; i2 <= limit; i2++) {
    for (let j = 0; j < nlen; j++) {
      if (data[i2 + j] !== needle[j]) continue outer;
    }
    return i2;
  }
  return -1;
}
function findPattern(data, pattern, start = 0, end = data.length) {
  const patLen = pattern.length;
  const limit = end - patLen;
  outer: for (let i2 = start; i2 <= limit; i2++) {
    for (let j = 0; j < patLen; j++) {
      const want = pattern[j];
      if (want !== null && data[i2 + j] !== want) continue outer;
    }
    return i2;
  }
  return -1;
}
function asciiBytes(s) {
  return s.split("").map((c) => c.charCodeAt(0));
}
function matchesAscii(data, offset, str2) {
  if (offset + str2.length > data.length) return false;
  for (let i2 = 0; i2 < str2.length; i2++) {
    if (data[offset + i2] !== str2.charCodeAt(i2)) return false;
  }
  return true;
}
function toHex(data) {
  let s = "";
  for (let i2 = 0; i2 < data.length; i2++) {
    const h = data[i2].toString(16).toUpperCase();
    s += h.length === 1 ? "0" + h : h;
  }
  return s;
}
function isClassRef(data, p, slot) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (slot <= 32767) {
    return p + 2 <= data.length && view.getUint16(p, true) === (32768 | slot);
  }
  return p + 6 <= data.length && view.getUint16(p, true) === 32767 && view.getUint32(p + 2, true) === (2147483648 | slot) >>> 0;
}
var R = class {
  constructor(data, pos = 0) {
    this.data = data;
    this.pos = pos;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  u8() {
    const v = this.data[this.pos];
    this.pos += 1;
    return v;
  }
  u16() {
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i32() {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f64() {
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }
  f64s(n) {
    const out = [];
    for (let i2 = 0; i2 < n; i2++) out.push(this.f64());
    return out;
  }
  raw(n) {
    const v = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }
  peek(n) {
    return this.data.subarray(this.pos, this.pos + n);
  }
  peekU16() {
    return this.view.getUint16(this.pos, true);
  }
  utf16() {
    if (!bytesEqual(this.peek(3), STR_MARKER)) {
      throw new LegacyParseError(`expected a string record ${this.ctx()}`);
    }
    this.pos += 3;
    let n = this.u8();
    if (n === 255) {
      n = this.u16();
      if (n === 65535) {
        n = this.u32();
      }
    }
    const bytes = this.raw(2 * n);
    return new TextDecoder("utf-16le").decode(bytes);
  }
  ctx(back = 16, fwd = 32) {
    const p = this.pos;
    const before = toHex(this.data.subarray(Math.max(0, p - back), p));
    const after = toHex(this.data.subarray(p, p + fwd));
    return `@0x${p.toString(16)}: ...${before} | ${after}...`;
  }
};
var Archive = class {
  constructor(data, ver) {
    this.slots = /* @__PURE__ */ new Map();
    this.classSlot = /* @__PURE__ */ new Map();
    this.classSchema = /* @__PURE__ */ new Map();
    this.currentClass = null;
    this.currentObjSlot = null;
    this.nextSlot = 0;
    this.walkBase = 0;
    this.readers = {};
    this.currentLoop = null;
    this.inEntityList = false;
    this.burns = [];
    this.cumDelta = 0;
    this.annotWatermark = null;
    this.burnStack = [];
    this.onDefinitionDone = null;
    this.prebuilt = /* @__PURE__ */ new Map();
    this.releasedSpans = [];
    this.clineTail = null;
    this.data = data;
    this.ver = ver;
    this.hasPid = ver >= 17;
    this.r = new R(data);
  }
  alloc(entry) {
    const s = this.nextSlot;
    this.slots.set(s, entry);
    this.nextSlot += 1;
    return s;
  }
  readObject(r, expect = null) {
    const tag = r.u16();
    if (tag === 0) {
      return [null, null, null];
    }
    if (tag === 32767) {
      const big = r.u32();
      if (big & 2147483648) {
        return this.newOfClass(r, big & 2147483647, expect);
      }
      return this.backref(big, r);
    }
    if (tag === 65535) {
      const schema = r.u16();
      const namelen = r.u16();
      if (namelen > 40) {
        throw new LegacyParseError(`implausible class name length ${r.ctx()}`);
      }
      const nameBytes = r.raw(namelen);
      const name = new TextDecoder("utf-8").decode(nameBytes);
      this.alloc(["class", name, schema]);
      this.classSlot.set(name, this.nextSlot - 1);
      this.classSchema.set(name, schema);
      return this.newObj(r, name);
    }
    if (tag & 32768) {
      return this.newOfClass(r, tag & 32767, expect);
    }
    return this.backref(tag, r);
  }
  newOfClass(r, cslot, expect) {
    let ent = this.slots.get(cslot);
    if (ent === void 0) {
      if (expect === null) {
        throw new LegacyParseError(`class-ref to unknown slot ${cslot} ${r.ctx()}`);
      }
      const newEnt = ["class", expect, null];
      this.slots.set(cslot, newEnt);
      this.classSlot.set(expect, cslot);
      ent = newEnt;
    }
    if (ent[0] !== "class") {
      throw new LegacyParseError(`class-ref to non-class slot ${cslot} (${ent[1]}) ${r.ctx()}`);
    }
    return this.newObj(r, ent[1]);
  }
  newObj(r, name) {
    this.inEntityList = false;
    const slot = this.alloc(["obj", name, null]);
    const reader = this.readers[name];
    if (reader === void 0) {
      throw new LegacyParseError(`no reader for class ${name} ${r.ctx()}`);
    }
    const prevClass = this.currentClass;
    const prevSlot = this.currentObjSlot;
    this.currentClass = name;
    this.currentObjSlot = slot;
    let value;
    try {
      value = reader(this, r);
    } finally {
      this.currentClass = prevClass;
      this.currentObjSlot = prevSlot;
    }
    this.slots.set(slot, ["obj", name, value]);
    if (name === "CComponentDefinition" && value && this.onDefinitionDone) {
      this.onDefinitionDone(slot, value);
    }
    if (name === "CDimensionLinear" || name === "CText") {
      this.annotWatermark = this.nextSlot;
    }
    return [slot, name, value];
  }
  // 0xffff CLayer, a class-ref to a CLayer already in classSlot, or —
  // when `unmatchedClassRef` — any short 0x8000 class-ref. The last form
  // is only for the throwaway slot-base probe, which numbers from 1<<20 so
  // the file's 0x8000|real_slot will not match classSlot.
  clayerRecordAt(at, unmatchedClassRef = false) {
    if (at + 2 > this.data.length) return false;
    const tag = this.data[at] | this.data[at + 1] << 8;
    if (tag === 65535 && at + 12 <= this.data.length && (this.data[at + 4] | this.data[at + 5] << 8) === 6 && matchesAscii(this.data, at + 6, "CLayer")) {
      return true;
    }
    const layCs = this.classSlot.get("CLayer");
    if (layCs !== void 0 && isClassRef(this.data, at, layCs)) return true;
    return unmatchedClassRef && (tag & 32768) !== 0 && tag !== 65535;
  }
  // Colour CLayer ends in a 21-byte tail. Some v18 zero-material files
  // (custom tag listed first, then Layer0) write 12 zero bytes + u32 after
  // that, then another CLayer. Skip those 16 bytes only when they precede
  // a CLayer; leave a definition-list back-ref alone.
  skipClayerColourExt() {
    const pad = 12;
    const ext = 16;
    if (this.r.pos + ext + 2 > this.data.length) return;
    for (let i2 = 0; i2 < pad; i2++) {
      if (this.data[this.r.pos + i2] !== 0) return;
    }
    if (this.clayerRecordAt(this.r.pos + ext, true)) this.r.pos += ext;
  }
  // v18 template Layer0 after a custom tag: <parent u16><active u16><dc u32>.
  // Consume parent only when both u16s are already CLayer objects. A lone
  // back-ref then a definition count (usual layout) stays put.
  skipClayerParentRef(selfSlot) {
    if (this.r.pos + 4 > this.data.length || selfSlot === null) return;
    const a = this.data[this.r.pos] | this.data[this.r.pos + 1] << 8;
    const b = this.data[this.r.pos + 2] | this.data[this.r.pos + 3] << 8;
    if (!a || a & 32768 || a === 32767 || a === selfSlot) return;
    if (!b || b & 32768 || b === 32767) return;
    const ea = this.slots.get(a);
    const eb = this.slots.get(b);
    if (ea === void 0 || eb === void 0) return;
    if (ea[0] === "class" || eb[0] === "class") return;
    if (ea[1] !== "CLayer" || eb[1] !== "CLayer") return;
    this.r.pos += 2;
  }
  // Extra CLayer records past declared layerCount (v18: count=1 custom
  // tag, then Layer0). Skip null separators; stop at the definition-list
  // anchor. `unmatchedClassRef` only on the throwaway probe.
  collectTrailingLayers(slotsOut, layersOut, unmatchedClassRef = false) {
    while (this.r.pos + 2 <= this.data.length) {
      const tag = this.r.peekU16();
      if (tag === 0) {
        this.r.pos += 2;
        continue;
      }
      if (!this.clayerRecordAt(this.r.pos, unmatchedClassRef)) break;
      const [s, , v] = this.readObject(this.r, "CLayer");
      if (v != null) {
        if (slotsOut) slotsOut.push(s);
        if (layersOut) layersOut.push([s, v]);
      }
    }
  }
  /** Map a FILE store-map index to the walker's numbering through the burn
   * bands. Returns the walker slot, or `null` when the reference points
   * INTO a band (a phantom, never-serialized connection point). */
  translateRef(slot) {
    let offset = 0;
    for (const [start, width] of this.burns) {
      if (slot < start) break;
      if (slot < start + width) return null;
      offset += width;
    }
    return slot - offset;
  }
  backref(slot, r) {
    if (this.burns.length > 0 && slot >= this.burns[0][0]) {
      const walker = this.translateRef(slot);
      if (walker === null) {
        return [slot, "reserved", null];
      }
      slot = walker;
    }
    const ent = this.slots.get(slot);
    if (ent === void 0) {
      if (slot < this.walkBase) {
        return [slot, "premodel", null];
      }
      throw new LegacyParseError(`back-ref to unwalked slot ${slot} ${r.ctx()}`);
    }
    if (ent[0] === "class") {
      throw new LegacyParseError(`back-ref to class slot ${slot} ${r.ctx()}`);
    }
    return [slot, ent[1], ent[2]];
  }
};
function preamble(ar, r) {
  const [attrsSlot, , attrs] = ar.readObject(r, "CAttributeContainer");
  let pid = 0;
  if (ar.hasPid) {
    const mask = r.u8();
    for (let bit = 0; bit < 8; bit++) {
      if (mask & 1 << bit) {
        pid |= r.u8() << 8 * bit;
      }
    }
  }
  return { attrs, pid, attrsSlot };
}
var FIRST_V4 = 4;
var FIRST_DIB_OBJECT = 6;
var FIRST_NAMED_INSTANCE = 5;
function earlyPreamble(ar, r) {
  if (ar.ver < FIRST_V4) return { attrs: null, pid: 0, attrsSlot: null };
  return preamble(ar, r);
}
function drawbase(ar, r) {
  const b = r.raw(ar.ver < FIRST_V4 ? 5 : ar.ver < 5 ? 7 : 8);
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const layCls = ar.classSlot.get("CLayer");
  const tag = r.peekU16();
  let layer;
  if (layCls !== void 0 && tag === (32768 | layCls)) {
    ar.readObject(r, "CLayer");
    layer = 0;
  } else if (tag === 32767) {
    r.u16();
    const big = r.u32();
    if (big & 2147483648) {
      throw new LegacyParseError(`drawbase layer: unexpected class ${r.ctx()}`);
    }
    layer = 0;
  } else {
    layer = r.u16();
  }
  if (ar.ver < FIRST_V4) {
    return { mat: 0, hidden: 0, soft: 0, smooth: 0, layer };
  }
  return {
    mat: view.getUint16(0, true),
    hidden: b[2],
    soft: b[5],
    smooth: b[6],
    layer
  };
}
function readVertex(ar, r) {
  earlyPreamble(ar, r);
  return { k: "vertex", xyz: r.f64s(3) };
}
function readEdge(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const [s1] = ar.readObject(r, "CVertex");
  const [s2] = ar.readObject(r, "CVertex");
  const [cs, cn, cv] = ar.readObject(r);
  if (cn !== null && cn !== "CCurve" && cn !== "CArcCurve") {
    throw new LegacyParseError(`edge curve pointer resolved to ${cn} ${r.ctx()}`);
  }
  return { k: "edge", db, curve: cs, curve_value: cv, v1: s1, v2: s2 };
}
function readCurve(ar, r) {
  preamble(ar, r);
  r.u8();
  const n = r.u32();
  return { k: "curve", n };
}
function readArcCurve(ar, r) {
  preamble(ar, r);
  r.raw(5);
  const v = r.f64s(14);
  return {
    k: "arccurve",
    params: {
      center: [v[0], v[1], v[2]],
      normal: [v[3], v[4], v[5]],
      xAxis: [v[6], v[7], v[8]],
      startAngle: v[9],
      endAngle: v[10],
      yAxis: [v[11], v[12], v[13]]
    }
  };
}
function registerBurn(ar, delta) {
  ar.burns.push([ar.annotWatermark + ar.cumDelta, delta]);
  ar.cumDelta += delta;
  ar.annotWatermark = null;
  if (ar.burnStack.length > 0) {
    ar.burnStack[ar.burnStack.length - 1] += 1;
  }
}
function readEdgeUse(ar, r) {
  earlyPreamble(ar, r);
  const [es] = ar.readObject(r, "CEdge");
  const sense = r.u8();
  const p0 = r.pos;
  const tag = r.u16();
  let ps;
  if (tag === 32767) {
    const big = r.u32();
    if (big & 2147483648) {
      throw new LegacyParseError(`edge-use parent is a new object ${r.ctx()}`);
    }
    ps = big;
  } else if (tag === 65535 || tag & 32768) {
    throw new LegacyParseError(`edge-use parent is a new object ${r.ctx()}`);
  } else {
    ps = tag !== 0 ? tag : null;
  }
  const expected = ar.currentLoop !== null ? ar.currentLoop + ar.cumDelta : null;
  if (ps !== expected) {
    const delta = typeof ps === "number" && expected !== null ? ps - expected : 0;
    if (delta > 0 && delta <= 4096 && ar.annotWatermark !== null) {
      registerBurn(ar, delta);
    } else {
      r.pos = p0;
      throw new LegacyParseError(`edge-use parent slot ${ps} != current loop ${expected} ${r.ctx()}`);
    }
  }
  return { k: "edgeuse", edge: es, sense };
}
function readLoop(ar, r) {
  const mySlot = ar.nextSlot - 1;
  const prev = ar.currentLoop;
  ar.currentLoop = mySlot;
  earlyPreamble(ar, r);
  r.raw(2);
  const uses = [];
  while (true) {
    if (r.peekU16() === 0) {
      r.pos += 2;
      break;
    }
    const [, , v] = ar.readObject(r, "CEdgeUse");
    uses.push(v);
  }
  ar.currentLoop = prev;
  return { k: "loop", uses };
}
function readFace(ar, r) {
  const pre = preamble(ar, r);
  const db = drawbase(ar, r);
  let attrs = pre.attrs;
  if (ar.ver < FIRST_V4 && attrs && typeof attrs === "object" && attrs.k === "material") {
    db.mat = pre.attrsSlot;
    attrs = null;
  }
  const plane = r.f64s(4);
  const nloops = r.u32();
  if (nloops > 1e4) {
    throw new LegacyParseError(`implausible loop count ${nloops} ${r.ctx()}`);
  }
  const loops = [];
  for (let i2 = 0; i2 < nloops; i2++) {
    const [, , v] = ar.readObject(r, "CLoop");
    loops.push(v);
  }
  const backMat = r.u16();
  return { k: "face", db, plane, loops, back_mat: backMat, attrs };
}
function readAttrContainer(ar, r) {
  preamble(ar, r);
  const children = [];
  while (true) {
    if (r.peekU16() === 0) {
      r.pos += 2;
      break;
    }
    const [, n, v] = ar.readObject(r, "CAttributeNamed");
    children.push([n, v]);
  }
  return { k: "attrs", children };
}
function readAttrNamed(ar, r) {
  preamble(ar, r);
  r.raw(4);
  const dictname = r.utf16();
  function readTyped(t) {
    if (t === 0) return null;
    if (t === 4) return r.i32();
    if (t === 6) return r.f64();
    if (t === 7) return r.u8();
    if (t === 9) return r.u32();
    if (t === 10) return r.utf16();
    if (t === 12) return r.f64();
    if (t === 11) {
      const n = r.u32();
      if (n > 1e5) {
        throw new LegacyParseError(`implausible attr array count ${r.ctx()}`);
      }
      const arr = [];
      for (let i2 = 0; i2 < n; i2++) arr.push(readTyped(r.u8()));
      return arr;
    }
    if (t === 17) return r.f64s(3);
    if (t === 18) return r.f64s(3);
    throw new LegacyParseError(`unknown attribute value type 0x${t.toString(16)} ${r.ctx()}`);
  }
  const entries = {};
  while (true) {
    const key = r.utf16();
    if (key === "") break;
    entries[key] = readTyped(r.u8());
  }
  if (ar.ver >= 7) r.u32();
  return { k: "dict", name: dictname, entries };
}
var DYNAMIC_ATTRIBUTES_DICT_NAME = "dynamic_attributes";
function stringifyAttrValue(value) {
  if (value === null || value === void 0) return "";
  if (Array.isArray(value)) return value.map(stringifyAttrValue).join(",");
  return String(value);
}
function extractLegacyDynamicProperties(attrs) {
  if (!attrs || typeof attrs !== "object") return {};
  for (const [, value] of attrs.children || []) {
    if (value && typeof value === "object" && value.name === DYNAMIC_ATTRIBUTES_DICT_NAME) {
      const entries = value.entries || {};
      const properties = {};
      for (const key of Object.keys(entries)) {
        properties[key] = stringifyAttrValue(entries[key]);
      }
      return properties;
    }
  }
  return {};
}
function readLayer(ar, r) {
  earlyPreamble(ar, r);
  const name = r.utf16();
  const mid = [];
  while (mid.length < 8 && !bytesEqual(r.peek(3), STR_MARKER)) {
    mid.push(r.raw(1)[0]);
  }
  r.utf16();
  const flags = r.u16();
  if (flags & 255) {
    const tex = textureBlock(ar, r);
    r.raw(4);
    return { k: "layer", name, hidden: mid.length ? mid[0] : 0, rgba: tex.rgba };
  }
  const rgba = r.raw(4);
  r.utf16();
  r.raw(ar.ver < FIRST_V4 ? 17 : 21);
  ar.skipClayerColourExt();
  ar.skipClayerParentRef(ar.currentObjSlot);
  return { k: "layer", name, hidden: mid.length ? mid[0] : 0, rgba: Array.from(rgba) };
}
function textureBlock(ar, r) {
  let s;
  let dib;
  if (ar.ver < FIRST_DIB_OBJECT) {
    s = null;
    dib = readDib(ar, r);
  } else {
    r.pos -= 1;
    preamble(ar, r);
    [s, , dib] = ar.readObject(r, "CDib");
    if (!(dib && typeof dib === "object" && dib.k === "dib")) {
      throw new LegacyParseError(`texture object is not a dib ${r.ctx()}`);
    }
  }
  const marker = findBytes(r.data, STR_MARKER, r.pos, r.pos + 28);
  if (marker - r.pos === 20) {
    r.u32();
  } else if (marker - r.pos !== 16) {
    throw new LegacyParseError(`texture size block misaligned ${r.ctx()}`);
  }
  const w = r.f64();
  const h = r.f64();
  const fname = r.utf16();
  const avg = r.raw(9);
  r.utf16();
  const blob = r.raw(8);
  const opacity = r.f64();
  const useOp = r.u8();
  const colorized = Boolean(blob[4]) || avg[3] === 255;
  return {
    rgba: Array.from(avg.subarray(0, 4)),
    opacity,
    use_opacity: useOp,
    tex_dib: s,
    tex_data: s === null ? dib.data : null,
    tex_w: w,
    tex_h: h,
    tex_file: fname,
    colorized
  };
}
function readMaterial(ar, r) {
  earlyPreamble(ar, r);
  const name = r.utf16();
  const texflag = r.u16();
  const out = { k: "material", name };
  if (texflag === 0) {
    const rgba = r.raw(4);
    r.utf16();
    r.raw(8);
    const opacity = r.f64();
    const useOp = r.u8();
    out.rgba = Array.from(rgba);
    out.opacity = opacity;
    out.use_opacity = useOp;
  } else {
    const tex = textureBlock(ar, r);
    out.rgba = tex.rgba;
    out.opacity = tex.opacity;
    out.use_opacity = tex.use_opacity;
    out.tex_dib = tex.tex_dib;
    out.tex_data = tex.tex_data;
    out.tex_w = tex.tex_w;
    out.tex_h = tex.tex_h;
    out.tex_file = tex.tex_file;
    out.colorized = tex.colorized;
  }
  return out;
}
function readDib(ar, r) {
  const subtype = r.u32();
  const length = r.u32();
  if (length > r.data.length) {
    throw new LegacyParseError(`implausible dib length ${length} ${r.ctx()}`);
  }
  const data = r.raw(length);
  return { k: "dib", subtype, data };
}
function readFtc(ar, r) {
  preamble(ar, r);
  r.u32();
  const ks = r.f64s(24);
  const frontPinsCount = r.u32();
  const frontPins = [];
  for (let i2 = 0; i2 < frontPinsCount; i2++) frontPins.push(r.f64s(4));
  const backPinsCount = r.u32();
  const backPins = [];
  for (let i2 = 0; i2 < backPinsCount; i2++) backPins.push(r.f64s(4));
  const fflags = r.u32();
  const bflags = r.u32();
  return {
    k: "ftc",
    front: ks.slice(0, 9),
    back: ks.slice(12, 21),
    front_pins: frontPins,
    back_pins: backPins,
    front_projected: Boolean(fflags & 2),
    back_projected: Boolean(bflags & 2)
  };
}
function readCamera(ar, r) {
  r.raw(137);
  r.u16();
  r.utf16();
  r.raw(ar.ver >= 6 ? 33 : 10);
  return { k: "camera" };
}
function readThumbnail(ar, r) {
  preamble(ar, r);
  if (ar.ver < FIRST_V4) {
    r.raw(129);
    return { k: "thumbnail", dib: null };
  }
  ar.readObject(r, "CCamera");
  if (ar.ver < 6) {
    return { k: "thumbnail", dib: null };
  }
  const [, , dib] = ar.readObject(r, "CDib");
  return { k: "thumbnail", dib };
}
function readImage(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const [ds] = ar.readObject(r);
  const xform = r.f64s(12);
  r.f64();
  r.utf16();
  const guid = r.raw(16);
  return { k: "image", db, def: ds, xform, guid: toHex(guid) };
}
function entityRef(ar, r) {
  const tag = r.u16();
  if (tag === 0) return null;
  if (tag === 32767) {
    const big = r.u32();
    if (big & 2147483648) {
      throw new LegacyParseError(`entity ref is a new object ${r.ctx()}`);
    }
    return big;
  }
  if (tag === 65535 || tag & 32768) {
    throw new LegacyParseError(`entity ref is a new object ${r.ctx()}`);
  }
  return tag;
}
function connectionPaths(ar, r) {
  const extra = entityRef(ar, r);
  const lists = [];
  for (let k = 0; k < 2; k++) {
    const count2 = r.u32();
    if (count2 > 1e3) {
      throw new LegacyParseError(`implausible dimension path length ${r.ctx()}`);
    }
    const refs = [];
    for (let i2 = 0; i2 < count2; i2++) refs.push(pathRef(ar, r));
    lists.push(refs);
  }
  return [extra, lists[0], lists[1]];
}
function pathRef(ar, r) {
  const tag = r.peekU16();
  let isNew = tag === 65535 || tag !== 32767 && (tag & 32768) !== 0;
  if (tag === 32767) {
    const view = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
    isNew = (view.getUint32(r.pos + 2, true) & 2147483648) !== 0;
  }
  if (isNew) {
    const [slot] = ar.readObject(r);
    return slot;
  }
  return entityRef(ar, r);
}
function readRelationship(ar, r) {
  preamble(ar, r);
  const a = entityRef(ar, r);
  const b = entityRef(ar, r);
  return { k: "relationship", refs: [a, b] };
}
function strictNextTag(ar, data, at, allowNull = true) {
  if (at + 2 > data.length) return false;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const t = view.getUint16(at, true);
  if (t === 0) return allowNull;
  if (t === 32767 || t === 65535) return true;
  if (t & 32768) {
    const ent = ar.slots.get(t & 32767);
    return ent !== void 0 && ent[0] === "class";
  }
  return false;
}
function readConstructionLine(ar, r) {
  preamble(ar, r);
  drawbase(ar, r);
  const point = r.f64s(3);
  const direction = r.f64s(3);
  const [startParam, endParam] = r.f64s(2);
  let k = ar.clineTail;
  if (k === null) {
    const dflt = ar.ver === 17 ? 7 : 4;
    const order = [dflt, ...[0, 4, 7].filter((c) => c !== dflt)];
    outer: for (const allowNull of [false, true]) {
      for (const cand of order) {
        if (strictNextTag(ar, r.data, r.pos + cand, allowNull)) {
          k = cand;
          break outer;
        }
      }
    }
    if (k === null) k = dflt;
    ar.clineTail = k;
  }
  r.raw(k);
  const huge = 1e20;
  const start = Math.abs(startParam) >= huge ? null : [point[0] + direction[0] * startParam, point[1] + direction[1] * startParam, point[2] + direction[2] * startParam];
  const end = Math.abs(endParam) >= huge ? null : [point[0] + direction[0] * endParam, point[1] + direction[1] * endParam, point[2] + direction[2] * endParam];
  return { k: "cline", point: [point[0], point[1], point[2]], direction: [direction[0], direction[1], direction[2]], start, end };
}
function readConstructionPoint(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const pos = r.f64s(3);
  r.f64s(3);
  r.u8();
  return { k: "cpoint", db, pos };
}
function readSectionPlane(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const view = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  const first = view.getFloat64(r.pos, true);
  if (!(Math.abs(first) <= 1.0001)) {
    ar.readObject(r);
  }
  const plane = r.f64s(4);
  let name = "";
  let label = "";
  if (bytesEqual(r.peek(3), STR_MARKER)) {
    name = r.utf16();
    label = r.utf16();
  }
  return { k: "sectionplane", plane, name, label, db };
}
function readSkFont(ar, r) {
  ar.readObject(r, "CAttributeContainer");
  if (ar.hasPid) {
    const mask = r.u8();
    let n = 0;
    for (let bit = 0; bit < 8; bit++) if (mask & 1 << bit) n++;
    r.raw(n);
  }
  r.utf16();
  r.raw(15);
  return { k: "font" };
}
function readDimLinear(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  const text = r.utf16();
  if (ar.ver >= 6) ar.readObject(r, "CSkFont");
  r.raw(ar.ver >= 6 ? 37 : 32);
  const c1 = entityRef(ar, r);
  const path1 = connectionPaths(ar, r);
  r.raw(32);
  const c2 = entityRef(ar, r);
  const path2 = connectionPaths(ar, r);
  r.raw(ar.ver >= 6 ? 72 : 68);
  return { k: "dimension", db, text, connect: [c1, c2], paths: [path1, path2] };
}
function readText(ar, r) {
  preamble(ar, r);
  const db = drawbase(ar, r);
  ar.readObject(r, "CSkFont");
  let p = r.pos;
  let idx;
  while (true) {
    idx = findBytes(r.data, STR_MARKER, p, r.pos + 512);
    if (idx < 0) {
      throw new LegacyParseError(`text delimiter not found ${r.ctx()}`);
    }
    const blk = r.data.subarray(idx - 11, idx);
    if (blk[0] === 1 && blk[1] === 0 && blk[2] === 0 && blk[3] === 0 && blk[6] <= 8 && blk[7] === 0 && blk[8] === 0 && blk[9] === 0 && blk[10] === 1) {
      break;
    }
    p = idx + 3;
  }
  r.raw(idx - r.pos);
  const text = r.utf16();
  r.raw(5);
  const attach = [];
  while (true) {
    const head = r.peek(2);
    if (!(head.length === 2 && head[0] === 255 && head[1] === 127)) break;
    const full = r.peek(6);
    if (full.length < 6) break;
    const dv = new DataView(full.buffer, full.byteOffset, full.byteLength);
    const val = dv.getUint32(2, true);
    if (val & 2147483648) break;
    r.raw(6);
    attach.push(val);
  }
  return { k: "text", text, db, attach };
}
function readEntityList2(ar, r, count2, owner) {
  const ents = [];
  ar.burnStack.push(0);
  try {
    return readEntityListInner(ar, r, count2, owner, ents);
  } finally {
    ar.burnStack.pop();
  }
}
function readEntityListInner(ar, r, count2, owner, ents) {
  const view = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  while (ents.length < count2) {
    const p = r.pos;
    const hasBurnCredit = owner === "def" && ar.burnStack.length > 0 && ar.burnStack[ar.burnStack.length - 1] > 0;
    if (hasBurnCredit && p + 25 <= r.data.length && view.getUint32(p, true) === 0 && bytesEqual(r.data.subarray(p + 22, p + 25), STR_MARKER)) {
      break;
    }
    const prevFlag = ar.inEntityList;
    ar.inEntityList = true;
    try {
      const [s, n, v] = ar.readObject(r);
      ar.inEntityList = prevFlag;
      ents.push([s, n, v]);
    } catch (e) {
      ar.inEntityList = prevFlag;
      if (!(e instanceof LegacyParseError)) {
        throw e;
      }
      if (owner === "root") {
        r.pos = p;
        break;
      }
      if (hasBurnCredit) {
        r.pos = p;
        break;
      }
      throw e;
    }
  }
  return ents;
}
function readDefinition(ar, r) {
  preamble(ar, r);
  r.raw(ar.ver >= 17 ? 22 : ar.ver >= 5 ? 20 : ar.ver >= FIRST_V4 ? 19 : 13);
  const nlayers = r.u32();
  if (nlayers > 1e4) {
    throw new LegacyParseError(`implausible def layer count ${r.ctx()}`);
  }
  let got = 0;
  while (got < nlayers) {
    if (r.peekU16() === 0) {
      r.pos += 2;
      continue;
    }
    ar.readObject(r, "CLayer");
    got += 1;
  }
  if (ar.ver === 19 && nlayers > 0 && r.peekU16() === 0) {
    r.pos += 2;
  }
  const decl = r.u16();
  if (decl === 32767) {
    r.u32();
  }
  let count2 = null;
  if (ar.ver >= 20) {
    count2 = retryCountAfterV20Filler(r, r.pos, 5e6, ar);
  }
  if (count2 === null) {
    r.u32();
    count2 = r.u32();
  }
  if (count2 > 5e6 || count2 === 0) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 5e6, ar);
    if (retry !== null) count2 = retry;
  }
  if (count2 > 5e6) {
    throw new LegacyParseError(`implausible def entity count ${r.ctx()}`);
  }
  const ents = readEntityList2(ar, r, count2, "def");
  let nrel = r.u32();
  if (nrel > 1e5) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 1e5, ar);
    if (retry !== null) nrel = retry;
  }
  if (nrel > 1e5) {
    throw new LegacyParseError(`definition list misaligned ${r.ctx()}`);
  }
  for (let i2 = 0; i2 < nrel; i2++) {
    ar.readObject(r, "CRelationship");
  }
  r.u16();
  if (!bytesEqual(r.peek(19).subarray(16, 19), STR_MARKER)) {
    for (let skip = 1; skip <= 4; skip++) {
      const at = r.pos + skip;
      if (bytesEqual(r.data.subarray(at + 16, at + 19), STR_MARKER)) {
        r.pos = at;
        break;
      }
    }
  }
  const guid = r.raw(16);
  const name = r.utf16();
  r.utf16();
  r.utf16();
  r.u32();
  let tpos = null;
  const thumbSlot = ar.classSlot.get("CThumbnail");
  for (let off = 0; off < 96; off++) {
    const p = r.pos + off;
    if (r.data[p] === 255 && r.data[p + 1] === 255 && r.data[p + 4] === 10 && r.data[p + 5] === 0 && matchesAscii(r.data, p + 6, "CThumbnail")) {
      tpos = p;
      break;
    }
    if (thumbSlot !== void 0 && isClassRef(r.data, p, thumbSlot)) {
      tpos = p;
      break;
    }
  }
  if (tpos === null) {
    throw new LegacyParseError(`definition tail: thumbnail not found ${r.ctx()}`);
  }
  const gap = r.raw(tpos - r.pos);
  const behavior = gap.length >= 9 ? gap[gap.length - 9] : 0;
  const isGroup = gap.length >= 4 && (gap[gap.length - 4] | gap[gap.length - 3] << 8 | gap[gap.length - 2] << 16 | gap[gap.length - 1] << 24) === 1;
  ar.readObject(r, "CThumbnail");
  return {
    k: "definition",
    name,
    guid: toHex(guid),
    ents,
    faces_camera: Boolean(behavior & 1),
    shadows_face_sun: Boolean(behavior & 2),
    is_group: isGroup
  };
}
function readInstance(ar, r) {
  const pre = preamble(ar, r);
  const db = drawbase(ar, r);
  const [ds, dn] = ar.readObject(r, "CComponentDefinition");
  if (dn !== "CComponentDefinition") {
    throw new LegacyParseError(`instance definition ref is ${dn} ${r.ctx()}`);
  }
  const xf = r.f64s(13);
  const name = ar.ver >= FIRST_NAMED_INSTANCE || bytesEqual(r.peek(3), STR_MARKER) ? r.utf16() : "";
  const guid = ar.ver >= 14 ? r.raw(16) : new Uint8Array(0);
  return { k: "instance", db, def: ds, xf, name, guid: toHex(guid), attrs: pre.attrs };
}
var READERS = {
  CVertex: readVertex,
  CEdge: readEdge,
  CCurve: readCurve,
  CArcCurve: readArcCurve,
  CEdgeUse: readEdgeUse,
  CLoop: readLoop,
  CFace: readFace,
  CLayer: readLayer,
  CMaterial: readMaterial,
  CDib: readDib,
  CAttributeContainer: readAttrContainer,
  CAttributeNamed: readAttrNamed,
  CCamera: readCamera,
  CThumbnail: readThumbnail,
  CRelationship: readRelationship,
  CComponentDefinition: readDefinition,
  CImage: readImage,
  CComponentInstance: readInstance,
  CGroup: readInstance,
  CFaceTextureCoords: readFtc,
  CConstructionLine: readConstructionLine,
  CConstructionPoint: readConstructionPoint,
  CSectionPlane: readSectionPlane,
  CSkFont: readSkFont,
  CDimensionLinear: readDimLinear,
  CText: readText
};
function isLegacy(data) {
  if (!(data.length >= 4 && data[0] === 255 && data[1] === 254 && data[2] === 255 && data[3] === 14)) {
    return false;
  }
  const head100 = data.subarray(0, Math.min(256, data.length));
  if (findBytes(head100, new Uint8Array([80, 75, 3, 4])) >= 0) {
    return false;
  }
  const head200 = data.subarray(0, Math.min(512, data.length));
  return findBytes(head200, new Uint8Array(asciiBytes("CVersionMap"))) >= 0;
}
var CMATERIAL_PATTERN = [
  255,
  255,
  null,
  null,
  9,
  0,
  ...asciiBytes("CMaterial")
];
var CLAYER_PATTERN = [
  255,
  255,
  null,
  null,
  6,
  0,
  ...asciiBytes("CLayer")
];
function findVersionMajor(data) {
  const head = data.subarray(0, Math.min(96, data.length));
  const stripped = [];
  for (let i2 = 0; i2 < head.length; i2++) {
    if (head[i2] !== 0) stripped.push(head[i2]);
  }
  const text = new TextDecoder("latin1").decode(new Uint8Array(stripped));
  const m = text.match(/\{(\d+)\./);
  if (!m) return null;
  return parseInt(m[1], 10);
}
function bootstrapTwoMaterials(data, ver, matHdr) {
  const boot = new Archive(data, ver);
  Object.assign(boot.readers, READERS);
  boot.nextSlot = 1 << 20;
  boot.walkBase = 1 << 20;
  boot.r.pos = matHdr;
  boot.readObject(boot.r, "CMaterial");
  const tag = boot.r.peekU16();
  if (tag === 65535 || !(tag & 32768)) {
    throw new LegacyParseError("cannot bootstrap the slot base");
  }
  return tag & 32767;
}
function probeLayerAnchorBases(data, ver, start, matCount) {
  const boot = new Archive(data, ver);
  Object.assign(boot.readers, READERS);
  const b0 = 1 << 20;
  boot.nextSlot = b0;
  boot.walkBase = b0;
  boot.r.pos = start;
  for (let i2 = 0; i2 < matCount; i2++) {
    boot.readObject(boot.r, "CMaterial");
  }
  boot.r.u32();
  if (ver >= 17) {
    boot.r.u8();
  }
  let layerCount = 0;
  if (ver >= FIRST_V4) {
    layerCount = boot.r.u32();
    if (!(layerCount >= 1 && layerCount <= 1e5)) {
      throw new LegacyParseError("implausible layer count in base probe");
    }
  }
  const layerSlots = [];
  for (let i2 = 0; i2 < layerCount; i2++) {
    const [s2] = boot.readObject(boot.r, "CLayer");
    layerSlots.push(s2);
  }
  boot.collectTrailingLayers(layerSlots, null, true);
  const [s, n] = boot.readObject(boot.r);
  if (n !== "premodel") {
    throw new LegacyParseError(`base probe: anchor resolved to ${n}`);
  }
  return layerSlots.map((rel) => s - (rel - b0)).filter((cand) => cand > 0 && cand < b0);
}
function walk(data) {
  const ver = findVersionMajor(data);
  if (ver === null) {
    throw new LegacyParseError("no version string in header");
  }
  const headerView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const matHdr = findPattern(data, CMATERIAL_PATTERN);
  let start;
  let matCount;
  if (matHdr >= 0) {
    start = matHdr;
    matCount = headerView.getUint32(matHdr - 4, true);
    if (matCount > 1e5) {
      throw new LegacyParseError("implausible material count");
    }
  } else {
    const layerHdr = findPattern(data, CLAYER_PATTERN);
    if (layerHdr < 0) {
      throw new LegacyParseError("no CMaterial or CLayer class record found");
    }
    matCount = 0;
    start = layerHdr - (ver >= 17 ? 9 : 8);
  }
  const bases = matCount >= 2 ? [bootstrapTwoMaterials(data, ver, start)] : probeLayerAnchorBases(data, ver, start, matCount);
  let bestExc = null;
  let bestAt = -1;
  for (const base of bases) {
    try {
      return walkModel(data, ver, start, matCount, base);
    } catch (exc) {
      if (!(exc instanceof LegacyParseError)) throw exc;
      const m = /@0x([0-9a-f]+)/.exec(exc.message);
      const at = m ? parseInt(m[1], 16) : -1;
      if (bestExc === null || at > bestAt) {
        bestExc = exc;
        bestAt = at;
      }
    }
  }
  if (bestExc !== null) throw bestExc;
  throw new LegacyParseError("no viable slot base candidate");
}
var RELEASED_ENTITIES = new Map(
  ["CVertex", "CEdge", "CEdgeUse", "CLoop", "CFace"].map((name) => [name, ["obj", name, null]])
);
function buildAndReleaseDefinition(ar, slot, def) {
  const builder = new LegacyBuilder();
  try {
    fillBuilder(builder, def.ents, ar.slots);
  } catch (e) {
    throw new SkpParseError(`Failed while building component definitions: ${e.message}`, {
      stage: "legacy_defs",
      definitionId: slot,
      cause: e
    });
  }
  ar.prebuilt.set(slot, builder);
  def.ents = [];
  ar.releasedSpans.push([slot + 1, ar.nextSlot]);
  for (let k = slot + 1; k < ar.nextSlot; k++) {
    const ent = ar.slots.get(k);
    if (ent === void 0 || ent[0] !== "obj" || ent[2] === null || ent[1] === null) continue;
    const placeholder = RELEASED_ENTITIES.get(ent[1]);
    if (placeholder !== void 0) ar.slots.set(k, placeholder);
  }
}
function definitionStartsAt(ar, data, at) {
  if (data[at] === 255 && data[at + 1] === 255 && matchesAscii(data.subarray(at, at + 26), 6, "CComponentDefinition")) {
    return true;
  }
  const defCls = ar.classSlot.get("CComponentDefinition");
  return defCls !== void 0 && isClassRef(data, at, defCls);
}
function walkModel(data, ver, start, matCount, base) {
  const ar = new Archive(data, ver);
  Object.assign(ar.readers, READERS);
  ar.nextSlot = base;
  ar.walkBase = base;
  ar.onDefinitionDone = (slot, def) => buildAndReleaseDefinition(ar, slot, def);
  const r = ar.r;
  r.pos = start;
  const materials = [];
  for (let i2 = 0; i2 < matCount; i2++) {
    const [s, , v] = ar.readObject(r, "CMaterial");
    materials.push([s, v]);
  }
  r.u32();
  if (ver >= 17) {
    r.u8();
  }
  const layerCount = ver < FIRST_V4 ? 2 ** 30 : r.u32();
  if (layerCount > 1e5 && ver >= FIRST_V4) {
    throw new LegacyParseError("implausible layer count");
  }
  const layers = [];
  while (layers.length < layerCount) {
    const tag = r.peekU16();
    if (tag === 0) {
      r.pos += 2;
      continue;
    }
    if (tag !== 65535 && !(tag & 32768)) {
      break;
    }
    const [s, , v] = ar.readObject(r, "CLayer");
    if (v === null) continue;
    layers.push([s, v]);
  }
  ar.collectTrailingLayers(null, layers);
  const [, dn] = ar.readObject(r);
  if (dn !== "CLayer") {
    throw new LegacyParseError(`definition-list anchor is ${dn}, not a layer`);
  }
  let defCount = r.u32();
  if (defCount > 1e6) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 1e6, ar);
    if (retry !== null) {
      defCount = retry;
      if (!definitionStartsAt(ar, r.data, r.pos)) {
        defCount = 0;
        r.pos -= 4;
      }
    }
  }
  if (defCount > 1e6) {
    throw new LegacyParseError("implausible definition count");
  }
  for (let i2 = 0; i2 < defCount; i2++) {
    ar.readObject(r, "CComponentDefinition");
  }
  const defCls = ar.classSlot.get("CComponentDefinition");
  while (true) {
    const tag = r.peekU16();
    let isDef = defCls !== void 0 && tag === (32768 | defCls);
    if (!isDef && tag === 65535 && matchesAscii(r.peek(26), 6, "CComponentDefinition")) {
      isDef = true;
    }
    if (!isDef) break;
    ar.readObject(r);
  }
  let rootCount = r.u32();
  if (rootCount > 5e6) {
    const retry = retryCountAfterV20Filler(r, r.pos - 4, 5e6, ar);
    if (retry !== null) rootCount = retry;
  }
  if (rootCount > 5e6) {
    throw new LegacyParseError("implausible root entity count");
  }
  const root = readEntityList2(ar, r, rootCount, "root");
  return { ar, root, layers, materials };
}
var PAGE_DECL_RE = [255, 255, null, 0, 9, 0, 67, 86, 105, 101, 119, 80, 97, 103, 101];
var PAGE_KNOWN_FLAGS = 511;
var RENDERING_OPTIONS_LEN = { 14: 206, 15: 206, 16: 206, 17: 206, 18: 211, 19: 212, 20: 213 };
var PAGE_AXES_LEN = 110;
var PAGE_TRAILER_LEN = 22;
var SHADOW_INFO_FIXED_LEN = 60;
var STYLE_VALUE_SIZES = { 1: 1, 3: 2, 4: 4, 5: 4, 6: 4, 7: 8 };
function findPageDecl(data, from) {
  const n = PAGE_DECL_RE.length;
  for (let i2 = from; i2 + n <= data.length; i2++) {
    let ok = true;
    for (let j = 0; j < n; j++) {
      const want = PAGE_DECL_RE[j];
      if (want === null) {
        const v = data[i2 + j];
        if (v !== 12 && v !== 13 && v !== 15) {
          ok = false;
          break;
        }
      } else if (data[i2 + j] !== want) {
        ok = false;
        break;
      }
    }
    if (ok) return i2;
  }
  return -1;
}
function readTag(r) {
  const v = r.u16();
  if (v === 0) return ["null", 0];
  if (v === 65535) return ["decl", 0];
  if (v === 32767) {
    const w = r.u32();
    return (w & 2147483648) !== 0 ? ["class", w & 2147483647] : ["obj", w];
  }
  return (v & 32768) !== 0 ? ["class", v & 32767] : ["obj", v];
}
function popcount8(mask) {
  let n = 0;
  for (let bit = 0; bit < 8; bit++) if (mask & 1 << bit) n++;
  return n;
}
function skipPid(r) {
  r.raw(popcount8(r.u8()));
}
var PageClasses = class {
  constructor() {
    this.schema = /* @__PURE__ */ new Map([
      ["CCamera", 5],
      ["CDib", 3]
    ]);
    this.slot = /* @__PURE__ */ new Map();
  }
  /** After a 'decl' or 'class' tag: the declaration's header (if any); returns the schema the
   * object was written with. */
  object(r, kind, slot, name) {
    if (kind === "decl") {
      const schema2 = r.u16();
      const n = r.u16();
      const got = new TextDecoder("ascii").decode(r.raw(n));
      if (n !== name.length || got !== name) {
        throw new LegacyParseError(`expected a ${name} declaration ${r.ctx()}`);
      }
      this.schema.set(name, schema2);
    } else {
      const have = this.slot.get(name);
      if (have === void 0) this.slot.set(name, slot);
      else if (have !== slot) throw new LegacyParseError(`${name} class-ref to another slot ${r.ctx()}`);
    }
    const schema = this.schema.get(name);
    if (schema === void 0) throw new LegacyParseError(`${name} object of an unknown schema ${r.ctx()}`);
    return schema;
  }
};
function readPageCamera(r) {
  const eye = r.f64s(3);
  const target = r.f64s(3);
  const up = r.f64s(3);
  r.f64s(2);
  const perspective = r.u8();
  const fov = r.f64();
  const orthoHeight = r.f64();
  r.raw(137 - 105);
  r.u16();
  r.utf16();
  r.raw(33);
  return { eye, target, up, fov, parallel: perspective === 0, orthoHeight };
}
function skipPageStyle(r, schema) {
  if (r.u16() !== 0) throw new LegacyParseError(`style with attributes ${r.ctx()}`);
  if (schema >= 2) skipPid(r);
  r.raw(16);
  r.utf16();
  r.u32();
  r.utf16();
  r.utf16();
  const n = r.u32();
  for (let i2 = 0; i2 < n; i2++) {
    r.u32();
    const m = r.u32();
    for (let j = 0; j < m; j++) {
      const size2 = STYLE_VALUE_SIZES[r.u32()];
      if (size2 === void 0) throw new LegacyParseError(`unknown style value type ${r.ctx()}`);
      r.raw(size2);
    }
  }
}
function readPageRefs(r, n) {
  if (n > Math.floor((r.data.length - r.pos) / 2)) {
    throw new LegacyParseError(`implausible ref count ${n} ${r.ctx()}`);
  }
  const refs = [];
  for (let i2 = 0; i2 < n; i2++) {
    const [kind, v] = readTag(r);
    if (kind !== "obj") throw new LegacyParseError(`expected a back-ref ${r.ctx()}`);
    refs.push(v);
  }
  return refs;
}
function readPageRecord(ar, r, classes) {
  let [kind, slot] = readTag(r);
  if (kind !== "decl" && kind !== "class") throw new LegacyParseError(`expected a CViewPage record ${r.ctx()}`);
  const schema = classes.object(r, kind, slot, "CViewPage");
  if (r.u16() !== 0) throw new LegacyParseError(`scene with attributes ${r.ctx()}`);
  if (schema >= 13) skipPid(r);
  const page = {
    name: r.utf16(),
    eye: null,
    target: null,
    up: null,
    fov: 35,
    parallel: false,
    orthoHeight: 0,
    hiddenLayerIds: []
  };
  r.utf16();
  const flags = r.u32();
  if (flags & ~PAGE_KNOWN_FLAGS) throw new LegacyParseError(`scene capture flags 0x${flags.toString(16)} ${r.ctx()}`);
  const takeCamera = () => {
    [kind, slot] = readTag(r);
    if (kind === "decl" || kind === "class") {
      classes.object(r, kind, slot, "CCamera");
      const c = readPageCamera(r);
      page.eye = c.eye;
      page.target = c.target;
      page.up = c.up;
      page.fov = c.fov;
      page.parallel = c.parallel;
      page.orthoHeight = c.orthoHeight;
    }
  };
  if (schema >= 15) {
    if (flags & 1) {
      [kind, slot] = readTag(r);
      if (kind !== "decl" && kind !== "class") throw new LegacyParseError(`expected a camera ${r.ctx()}`);
      classes.object(r, kind, slot, "CCamera");
      const c = readPageCamera(r);
      page.eye = c.eye;
      page.target = c.target;
      page.up = c.up;
      page.fov = c.fov;
      page.parallel = c.parallel;
      page.orthoHeight = c.orthoHeight;
    }
  } else {
    takeCamera();
    [kind, slot] = readTag(r);
    if (kind === "decl" || kind === "class") {
      classes.object(r, kind, slot, "CDib");
      readDib(ar, r);
    }
    if (schema >= 13) r.u8();
  }
  if (flags & 2) {
    const base = RENDERING_OPTIONS_LEN[ar.ver];
    if (base === void 0) throw new LegacyParseError(`rendering options of a v${ar.ver} scene`);
    r.raw(base + (schema >= 15 ? 3 : 0));
    [kind, slot] = readTag(r);
    if (kind === "decl" || kind === "class") skipPageStyle(r, classes.object(r, kind, slot, "CSkpStyle"));
  }
  if (flags & 4) {
    r.raw(schema >= 13 ? 3 : 2);
    r.u32();
    r.u8();
    r.utf16();
    r.utf16();
    r.raw(SHADOW_INFO_FIXED_LEN);
  }
  if (flags & 8) r.raw(PAGE_AXES_LEN + (schema >= 13 ? 1 : 0));
  if (flags & 16) {
    r.u8();
    readPageRefs(r, r.u32());
  }
  if (flags & 32) page.hiddenLayerIds = readPageRefs(r, r.u32());
  if (flags & 64) readPageRefs(r, r.u32());
  if (schema >= 15) {
    r.raw(PAGE_TRAILER_LEN - 1);
    return page;
  }
  r.raw(PAGE_TRAILER_LEN);
  const png = r.u32();
  if (png > r.data.length - r.pos) throw new LegacyParseError(`implausible thumbnail length ${png} ${r.ctx()}`);
  r.raw(png);
  return page;
}
function readPageList(data, ar) {
  const start = findPageDecl(data, ar.r.pos);
  if (start < 0) {
    return findBytes(data, new TextEncoder().encode("CViewPage"), ar.r.pos, data.length) >= 0 ? null : [];
  }
  try {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const count2 = view.getUint32(start - 4, true);
    if (count2 < 1 || count2 > 1e4) throw new LegacyParseError(`implausible scene count ${count2}`);
    const r = new R(data, start);
    const classes = new PageClasses();
    const pages = [];
    for (let i2 = 0; i2 < count2; i2++) pages.push(readPageRecord(ar, r, classes));
    const [kind] = readTag(r);
    if (kind !== "obj" && kind !== "null") {
      throw new LegacyParseError(`no selected-scene ref after the scenes ${r.ctx()}`);
    }
    for (const page of pages) {
      page.hiddenLayerIds = page.hiddenLayerIds.filter((id) => {
        const ent = ar.slots.get(id);
        return ent !== void 0 && ent[0] === "obj" && ent[1] === "CLayer";
      });
    }
    return pages;
  } catch (e) {
    if (e instanceof LegacyParseError || e instanceof RangeError) return null;
    throw e;
  }
}
var LegacyBuilder = class {
  constructor() {
    this.vertices = new DefaultVertexStore();
    this.edges = new DefaultEdgeStore();
    this.edgeFlags = new EdgeFlagStore();
    this.faces = /* @__PURE__ */ new Map();
    this.instances = [];
    this.sectionPlanes = [];
    this.texts = [];
    this.dimensions = [];
    this.constructionLines = [];
    this.constructionPoints = [];
    this.edgeCurves = /* @__PURE__ */ new Map();
    this.arcCurves = /* @__PURE__ */ new Map();
  }
};
function addEdge(builder, slot, e, slots) {
  if (builder.edges.has(slot)) return;
  const v1 = e.v1;
  const v2 = e.v2;
  for (const vs of [v1, v2]) {
    if (vs === null || vs === void 0) continue;
    const ent = slots.get(vs);
    if (ent !== void 0 && ent[2] !== null && !builder.vertices.has(vs)) {
      const xyz = ent[2].xyz;
      builder.vertices.set(vs, [xyz[0], xyz[1], xyz[2]]);
    }
  }
  builder.edges.set(slot, [v1, v2]);
  const db = e.db || {};
  const flags = (db.soft ? 8 : 0) | (db.smooth ? 16 : 0) | (db.hidden ? 1 : 0);
  if (flags) {
    builder.edgeFlags.set(slot, flags);
  }
  if (e.curve !== null && e.curve !== void 0) {
    builder.edgeCurves.set(slot, e.curve);
    const cv = e.curve_value;
    if (cv && typeof cv === "object" && cv.k === "arccurve") {
      builder.arcCurves.set(e.curve, cv.params);
    }
  }
}
function fillBuilder(builder, ents, slots) {
  for (const [s, , v] of ents) {
    if (v === null || typeof v !== "object") continue;
    const k = v.k;
    if (k === "edge") {
      addEdge(builder, s, v, slots);
    } else if (k === "arccurve") {
      builder.arcCurves.set(s, v.params);
    } else if (k === "face") {
      const loops = [];
      for (const lp of v.loops) {
        const loop = [];
        for (const u of lp.uses) {
          const es = u.edge;
          const ent = slots.get(es);
          if (ent === void 0 || ent[2] === null) continue;
          addEdge(builder, es, ent[2], slots);
          loop.push({ edgeId: es, orientation: u.sense ? -1 : 1 });
        }
        loops.push(loop);
      }
      const face = {
        loops,
        normal: [v.plane[0], v.plane[1], v.plane[2]],
        materialId: v.db.mat || null,
        backMaterialId: v.back_mat || null,
        uvTransform: null,
        uvTransformBack: null,
        uvProjected: false,
        uvProjectedBack: false,
        hidden: Boolean(v.db.hidden)
      };
      const attrs = v.attrs;
      if (attrs && typeof attrs === "object") {
        for (const [, cv] of attrs.children || []) {
          if (cv && typeof cv === "object" && cv.k === "ftc") {
            face.uvTransform = [...cv.front];
            face.uvTransformBack = [...cv.back];
            face.uvProjected = cv.front_projected;
            face.uvProjectedBack = cv.back_projected;
          }
        }
      }
      builder.faces.set(s, face);
    } else if (k === "instance") {
      builder.instances.push({
        offset: 0,
        name: v.name,
        refIdx: v.def,
        refGuid: "",
        matrix: [...v.xf],
        materialId: v.db.mat || null,
        layerId: v.db.layer || null,
        hidden: Boolean(v.db.hidden),
        children: [],
        properties: extractLegacyDynamicProperties(v.attrs)
      });
    } else if (k === "image") {
      builder.instances.push({
        offset: 0,
        name: "",
        refIdx: v.def,
        refGuid: v.guid || "",
        matrix: [...v.xform],
        materialId: v.db.mat || null,
        layerId: v.db.layer || null,
        hidden: Boolean(v.db.hidden),
        children: [],
        properties: {}
      });
    } else if (k === "sectionplane") {
      builder.sectionPlanes.push({
        plane: v.plane || [0, 0, 1, 0],
        name: v.name || "",
        label: v.label || "",
        hidden: Boolean(v.db && v.db.hidden)
      });
    } else if (k === "text") {
      builder.texts.push({
        text: v.text || "",
        hidden: Boolean(v.db && v.db.hidden)
      });
    } else if (k === "dimension") {
      builder.dimensions.push({
        text: v.text || "",
        hidden: Boolean(v.db && v.db.hidden)
      });
    } else if (k === "cline") {
      builder.constructionLines.push({
        point: v.point,
        direction: v.direction,
        start: v.start,
        end: v.end
      });
    } else if (k === "cpoint") {
      builder.constructionPoints.push({
        position: [v.pos[0], v.pos[1], v.pos[2]]
      });
    }
  }
}
function parseLegacyToRaw(data, options) {
  const t02 = Date.now();
  emitLog(options, "info", `Parsing legacy buffer (${data.length} bytes)`);
  let version = "unknown";
  const second = findBytes(data, STR_MARKER, 4);
  if (second > 0) {
    const textBytes = data.subarray(second + 4, Math.min(second + 100, data.length));
    const text = new TextDecoder("utf-16le", { fatal: false }).decode(textBytes);
    const braceStart = text.indexOf("{");
    const braceEnd = text.indexOf("}");
    if (braceStart >= 0 && braceEnd >= 0) {
      version = text.slice(braceStart, braceEnd + 1);
    }
  }
  emitLog(options, "debug", `Detected legacy version ${version}`);
  let walkResult;
  try {
    walkResult = walk(data);
  } catch (e) {
    if (e instanceof LegacyParseError || e instanceof RangeError) {
      throw new SkpParseError(`legacy .skp parse failed: ${e.message}`, {
        stage: "legacy_walk",
        cause: e
      });
    }
    throw e;
  }
  const { ar, root, layers, materials } = walkResult;
  const slots = ar.slots;
  emitLog(options, "debug", `Legacy walk complete: ${materials.length} materials, ${layers.length} layers`);
  const imageDefIds = /* @__PURE__ */ new Set();
  for (const ent of slots.values()) {
    if (ent[0] === "obj" && ent[1] === "CImage" && ent[2]) {
      imageDefIds.add(ent[2].def);
    }
  }
  const materialsMap = /* @__PURE__ */ new Map();
  const materialIdToName = /* @__PURE__ */ new Map();
  for (const [s, v] of materials) {
    const rgba = v.rgba || [128, 128, 128, 255];
    let trans;
    if (v.use_opacity) {
      trans = Math.min(Math.max(1 - v.opacity, 0), 1);
    } else {
      trans = 1;
    }
    const colorized = v.colorized || false;
    let texture = null;
    if ("tex_dib" in v) {
      const dib = v.tex_dib !== null ? slots.get(v.tex_dib) : void 0;
      const texData = dib && dib[2] ? dib[2].data : v.tex_data ?? null;
      const isPng = texData && texData.length >= 4 && texData[0] === 137 && texData[1] === 80 && texData[2] === 78 && texData[3] === 71;
      const ext = isPng ? ".png" : ".jpg";
      const fname = v.tex_file || `${v.name}${ext}`;
      texture = { filename: fname, width: v.tex_w, height: v.tex_h, data: texData };
    }
    const matObj = {
      name: v.name,
      color: { r: rgba[0], g: rgba[1], b: rgba[2], a: rgba[3] },
      transparency: trans,
      id: null,
      texture,
      // colourize type is not decoded in the legacy record; tint (1) is
      // the correct rendering for the grey base textures observed.
      colorized,
      colorizeType: colorized ? 1 : 0
    };
    materialsMap.set(v.name, matObj);
    materialIdToName.set(s, v.name);
  }
  const layerColors = /* @__PURE__ */ new Map();
  const layerHidden = /* @__PURE__ */ new Map();
  const layerIdToName = /* @__PURE__ */ new Map();
  for (const [s, v] of layers) {
    const rgba = v.rgba || [136, 136, 136, 255];
    layerColors.set(v.name, [rgba[0], rgba[1], rgba[2]]);
    layerHidden.set(v.name, Boolean(v.hidden));
    layerIdToName.set(s, v.name);
  }
  if (!layerColors.has("Layer0")) {
    layerColors.set("Layer0", [136, 136, 136]);
  }
  if (!layerHidden.has("Layer0")) {
    layerHidden.set("Layer0", false);
  }
  const defsDict = /* @__PURE__ */ new Map();
  let processed = 0;
  let lastSlot;
  try {
    for (const [s, ent] of slots.entries()) {
      lastSlot = s;
      if (ent[0] === "obj" && ent[1] === "CComponentDefinition" && ent[2]) {
        const d = ent[2];
        let b = ar.prebuilt.get(s);
        if (b === void 0) {
          b = new LegacyBuilder();
          fillBuilder(b, d.ents, slots);
        }
        defsDict.set(s, {
          guid: d.guid,
          name: d.name,
          isImage: imageDefIds.has(s),
          isGroup: d.is_group || false,
          alwaysFacesCamera: d.faces_camera || false,
          shadowsFaceSun: d.shadows_face_sun || false,
          builder: b
        });
        processed++;
        if (processed % PROGRESS_INTERVAL === 0) {
          emitProgress(options, "legacy_defs", processed, processed);
          emitLog(options, "debug", `Processed ${processed} component definitions`);
        }
      }
    }
  } catch (e) {
    throw new SkpParseError(`Failed while building component definitions: ${e.message}`, {
      stage: "legacy_defs",
      definitionId: lastSlot,
      cause: e
    });
  }
  const rootBuilder = new LegacyBuilder();
  fillBuilder(rootBuilder, root, slots);
  defsDict.set("ROOT", {
    guid: "ROOT",
    name: "ROOT_MODEL",
    isImage: false,
    isGroup: false,
    alwaysFacesCamera: false,
    shadowsFaceSun: false,
    builder: rootBuilder
  });
  const pages = readPageList(data, ar) ?? [];
  emitLog(
    options,
    "info",
    `Parse complete: ${defsDict.size} defs (${((Date.now() - t02) / 1e3).toFixed(2)}s)`
  );
  return {
    version,
    // Legacy (pre-2021 MFC) files carry no meta/meta.dat container -
    // that's a VFF/ZIP-only construct - so there is no known source for
    // the model's unit-system string here.
    units: null,
    layerColors,
    layerHidden,
    layerIdToName,
    // Scenes come from the scene list in the document tail (see readPageList).
    // Classic files carry no model-level linear dimensions - they surface as
    // text-only dimensions per definition, via each entity list's own
    // CDimensionLinear reads.
    pages,
    dimensions: [],
    materialIdToName,
    materialsMap,
    materialsByFolder: /* @__PURE__ */ new Map(),
    styles: [],
    defsDict
  };
}
function tlvItemsInt(buf) {
  if (buf === null) return null;
  const items = [];
  let off = 0;
  const n = buf.length;
  while (off < n) {
    if (off + 6 > n) return null;
    const tag = buf[off] | buf[off + 1] << 8;
    const ln = readU32(buf, off + 2);
    if (tag === 0 || off + 6 + ln > n) return null;
    items.push({ tag, payload: buf.subarray(off + 6, off + 6 + ln) });
    off += 6 + ln;
  }
  return items;
}
function tlvFindInt(items, tag) {
  if (items === null) return null;
  for (const it of items) {
    if (it.tag === tag) return it.payload;
  }
  return null;
}
function toHex2(data) {
  let s = "";
  for (let i2 = 0; i2 < data.length; i2++) {
    const h = data[i2].toString(16).toUpperCase();
    s += h.length === 1 ? "0" + h : h;
  }
  return s;
}
function stripDe05(p) {
  if (p.length >= 2 && p[0] === 222 && p[1] === 5) {
    const idlen = readU32(p, 2);
    return p.subarray(6, 6 + idlen);
  }
  return p;
}
function findBytes2(data, needle, start = 0) {
  const nlen = needle.length;
  const limit = data.length - nlen;
  outer: for (let i2 = start; i2 <= limit; i2++) {
    for (let j = 0; j < nlen; j++) {
      if (data[i2 + j] !== needle[j]) continue outer;
    }
    return i2;
  }
  return -1;
}
function scanVertexPositions(top, id2pos) {
  function walk2(nodes) {
    for (const el of nodes) {
      if (el.tag === "C409") {
        const dc05 = findChildTag(el.children, "DC05");
        const c509 = findChildTag(el.children, "C509");
        if (dc05 && c509 && c509.payload.length === 24) {
          const idb = stripDe05(dc05.payload);
          id2pos.set(toHex2(idb), [
            readF64(c509.payload, 0),
            readF64(c509.payload, 8),
            readF64(c509.payload, 16)
          ]);
        }
      }
      if (el.children.length > 0) walk2(el.children);
    }
  }
  walk2([top]);
}
function scanInstanceTransforms(top, world) {
  function walk2(nodes, parent) {
    for (const el of nodes) {
      if (el.tag === "6419") {
        const d007 = findChildTag(el.children, "D007");
        const dc05 = d007 ? findChildTag(d007.children, "DC05") : null;
        const iid = dc05 ? toHex2(stripDe05(dc05.payload)) : null;
        const m = findChildTag(el.children, "6619");
        let mat = null;
        if (m && m.payload.length === 104) {
          mat = [];
          for (let i2 = 0; i2 < 13; i2++) mat.push(readF64(m.payload, i2 * 8));
        }
        const here = mat !== null ? multiplyMatrices(parent, mat) : parent;
        if (iid !== null) world.set(iid, here);
        walk2(el.children, here);
      } else if (el.children.length > 0) {
        walk2(el.children, parent);
      }
    }
  }
  walk2([top], null);
}
function parseDimensions(modelData, id2pos, instWorld) {
  const dims = [];
  const needle = new Uint8Array([204, 91]);
  let i2 = 0;
  const n = modelData.length;
  function point(blockPayload) {
    if (blockPayload === null) return null;
    const blk = tlvFindInt(tlvItemsInt(blockPayload), 21e3);
    if (blk === null) return null;
    const sub = tlvItemsInt(blk);
    const typB = tlvFindInt(sub, 21001);
    const typ = typB !== null && typB.length === 4 ? readU32(typB, 0) : null;
    if (typ === 1) {
      const pos = tlvFindInt(sub, 21002);
      if (pos === null || pos.length !== 24) return null;
      return [readF64(pos, 0), readF64(pos, 8), readF64(pos, 16)];
    }
    const refB = tlvFindInt(sub, 21003);
    const f53fc = refB !== null ? tlvFindInt(tlvItemsInt(refB), 21500) : null;
    const fi = f53fc !== null ? tlvItemsInt(f53fc) : null;
    const vid = tlvFindInt(fi, 21501);
    const iid = tlvFindInt(fi, 21502);
    if (vid === null) return null;
    const local = id2pos.get(toHex2(vid));
    if (local === void 0) return null;
    if (iid !== null && iid.length >= 1 && iid[0] > 0 && 1 + iid[0] <= iid.length) {
      const idBytes = iid.subarray(1, 1 + iid[0]);
      const w = instWorld.get(toHex2(idBytes));
      if (w) {
        return transformPoint(w, local);
      }
    }
    return local;
  }
  while (true) {
    const j = findBytes2(modelData, needle, i2);
    if (j < 0) break;
    i2 = j + 1;
    if (j + 6 > n) continue;
    const ln = readU32(modelData, j + 2);
    if (ln < 40 || j + 6 + ln > n) continue;
    const bodyBytes = modelData.subarray(j + 6, j + 6 + ln);
    const body = tlvItemsInt(bodyBytes);
    if (body === null) continue;
    let has5Bcd = false;
    let has5Bce = false;
    for (const it of body) {
      if (it.tag === 23501) has5Bcd = true;
      if (it.tag === 23502) has5Bce = true;
    }
    if (!has5Bcd || !has5Bce) continue;
    const a = point(tlvFindInt(body, 23501));
    const b = point(tlvFindInt(body, 23502));
    if (a === null || b === null) continue;
    const xaxisB = tlvFindInt(body, 23503);
    const normalB = tlvFindInt(body, 23504);
    const offB = tlvFindInt(body, 23506);
    dims.push({
      a,
      b,
      planeX: xaxisB !== null && xaxisB.length === 24 ? [readF64(xaxisB, 0), readF64(xaxisB, 8), readF64(xaxisB, 16)] : null,
      normal: normalB !== null && normalB.length === 24 ? [readF64(normalB, 0), readF64(normalB, 8), readF64(normalB, 16)] : null,
      offset: offB !== null && offB.length === 8 ? readF64(offB, 0) : 0,
      text: ""
    });
  }
  return dims;
}
function findPageNode(top) {
  return findChildTag([top], "0702");
}
function parsePages(node) {
  const pages = [];
  if (node === null) return pages;
  function vec3(p) {
    return p !== null && p.length === 24 ? [readF64(p, 0), readF64(p, 8), readF64(p, 16)] : null;
  }
  const t60Items = tlvItemsInt(node.payload);
  if (t60Items === null) return pages;
  for (const it60 of t60Items) {
    if (it60.tag !== 28e3) continue;
    const t61Items = tlvItemsInt(it60.payload);
    if (t61Items === null) continue;
    for (const it61 of t61Items) {
      if (it61.tag !== 28001) continue;
      const t48Items = tlvItemsInt(it61.payload);
      if (t48Items === null) continue;
      for (const it48 of t48Items) {
        if (it48.tag !== 29e3) continue;
        const items = tlvItemsInt(it48.payload);
        if (items === null) continue;
        const page = {
          name: "",
          eye: null,
          target: null,
          up: null,
          fov: 35,
          parallel: false,
          orthoHeight: 0,
          hiddenLayerIds: []
        };
        const head = tlvItemsInt(tlvFindInt(items, 28500));
        const name = tlvFindInt(head, 28501);
        if (name !== null && name.length > 0) {
          page.name = new TextDecoder("utf-8").decode(name);
        }
        const camWrap = tlvItemsInt(tlvFindInt(items, 29002));
        const cam = camWrap !== null ? tlvItemsInt(tlvFindInt(camWrap, 13500)) : null;
        if (cam !== null) {
          page.eye = vec3(tlvFindInt(cam, 13501));
          page.target = vec3(tlvFindInt(cam, 13502));
          page.up = vec3(tlvFindInt(cam, 13503));
          const fov = tlvFindInt(cam, 13508);
          if (fov !== null && fov.length === 8) page.fov = readF64(fov, 0);
          const flag = tlvFindInt(cam, 13506);
          page.parallel = flag !== null && flag.length > 0 && flag[0] === 0;
          const height = tlvFindInt(cam, 13507);
          if (height !== null && height.length === 8) page.orthoHeight = readF64(height, 0);
        }
        const hidden = tlvFindInt(items, 29008);
        let off = 0;
        while (hidden !== null && off + 1 <= hidden.length) {
          const ln = hidden[off];
          if (ln === 0 || off + 1 + ln > hidden.length) break;
          page.hiddenLayerIds.push(parseVarInt(hidden, off + 1, ln));
          off += 1 + ln;
        }
        pages.push(page);
      }
    }
  }
  return pages;
}
function hexToBytes(hex2) {
  const out = [];
  for (let i2 = 0; i2 < hex2.length; i2 += 2) out.push(parseInt(hex2.slice(i2, i2 + 2), 16));
  return out;
}
var ISO_CAMERA_PREFIX_PATCH = hexToBytes(
  "594000000000000059c000000000000059400000000000000000000000000000000000000000000000003f2c0c70bd20dabf3f2c0c70bd20da3f3f2c0c70bd20ea3f000000000000f03f0000000000408f40000000000000003e402adf272c803457"
);
var ISO_CAMERA_TAIL_PATCHES = [
  [509, hexToBytes("d0a869613c442d4799a4667d1adfa836")],
  [1390, hexToBytes("4e53c84477029246bba95827bba7e2")]
];
var _TEXTURE_H_SENTINEL = hexToBytes("f0ffffffffffff0f");
var DIM_FONT_PAYLOAD = hexToBytes(
  "000000fffeff065400610068006f006d00610000000800000000ecf57abd5eaf2340"
  // height f64
);
var TEXT_DELIM = hexToBytes("0100000001000300000001");
var CAMERA_TEMPLATE = hexToBytes(
  "00000000000000000000000000000000000000000000f03f000000000000000000000000000000000000000000000000004000000000000000000000000000f03f0000000000000000000000000000000000000000000000000100000000003e40000000000000f03f00000000000000000000000000000000000000000000000000000000000000000100fffeff00000000000000000000000000000000f03f00000000000000000000000000000000"
);
function parseToRaw(buffer, options) {
  const t02 = Date.now();
  const data = new Uint8Array(buffer);
  emitLog(options, "info", `Parsing buffer (${data.length} bytes)`);
  if (!(data.length >= 4 && data[0] === 255 && data[1] === 254 && data[2] === 255 && data[3] === 14)) {
    throw new SkpParseError("Not a valid SketchUp file (bad header magic)", { stage: "header" });
  }
  if (isLegacy(data)) {
    emitLog(options, "debug", "Detected legacy MFC container; routing to legacy walker");
    return parseLegacyToRaw(data, options);
  }
  let contents;
  try {
    contents = extractSkpContents(data, options);
  } catch (e) {
    throw new SkpParseError(`Failed to extract SKP contents: ${e.message}`, {
      stage: "zip_extract",
      cause: e
    });
  }
  const version = contents.version;
  const modelData = contents.modelData;
  const materialFiles = contents.materialFiles;
  emitLog(options, "debug", `Detected version ${version} (VFF/ZIP container)`);
  const units = contents.metaData ? readMetaUnits(contents.metaData) : null;
  const layerColors = /* @__PURE__ */ new Map();
  const layerHidden = /* @__PURE__ */ new Map();
  const materialsMap = /* @__PURE__ */ new Map();
  const materialsByFolder = /* @__PURE__ */ new Map();
  for (const [name, xmlBytes] of Object.entries(materialFiles)) {
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith("material.xml") && lowerName.startsWith("materials/")) {
      try {
        const decoder = new TextDecoder("utf-8");
        const xmlText = decoder.decode(xmlBytes);
        const parsedMat = parseMaterialXml(xmlText);
        if (parsedMat) {
          const folderName = name.split("/")[1] || "";
          let texture = null;
          if (parsedMat.hasTexture) {
            const resolved = resolveTextureBytes(
              materialFiles,
              name,
              parsedMat.textureFilename,
              parsedMat.imagePath
            );
            texture = {
              filename: resolved.filename,
              width: parsedMat.xScale,
              height: parsedMat.yScale,
              data: resolved.data
            };
          }
          const matObj = {
            name: parsedMat.name,
            // The VFF material XML record has no alpha attribute - only a
            // separate transparency value (parsedMat.trans, above). Always
            // opaque here; real per-channel alpha only exists in the legacy
            // MFC record (see legacy.ts's own material color assignment).
            color: { r: parsedMat.r, g: parsedMat.g, b: parsedMat.b, a: 255 },
            transparency: parsedMat.trans,
            id: null,
            texture,
            colorized: parsedMat.colorized,
            colorizeType: parsedMat.colorizeType
          };
          materialsMap.set(parsedMat.name, matObj);
          if (folderName) {
            materialsByFolder.set(folderName, matObj);
          }
          if (parsedMat.name.startsWith("Layer_")) {
            layerColors.set(parsedMat.name.slice(6), [parsedMat.r, parsedMat.g, parsedMat.b]);
            layerHidden.set(parsedMat.name.slice(6), false);
          }
        }
      } catch (e) {
        emitLog(options, "debug", `Failed to parse material.xml ${name}: ${e.message}`);
      }
    }
  }
  const styles = [];
  for (const [name, xmlBytes] of Object.entries(materialFiles)) {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith("styles/") && lowerName.endsWith("style.xml")) {
      try {
        const decoder = new TextDecoder("utf-8");
        const xmlText = decoder.decode(xmlBytes);
        const parsedStyle = parseStyleXml(xmlText);
        if (parsedStyle) {
          styles.push({
            name: parsedStyle.name,
            frontColor: parsedStyle.frontColor,
            backColor: parsedStyle.backColor
          });
        }
      } catch (e) {
        emitLog(options, "debug", `Failed to parse style.xml ${name}: ${e.message}`);
      }
    }
  }
  const layerIdToName = /* @__PURE__ */ new Map();
  const materialIdToName = /* @__PURE__ */ new Map();
  function collectMaterialIds(nodes) {
    for (const el of nodes) {
      if (el.tag === "C832") {
        const dc05 = findChildTag(el.children, "DC05");
        const nameNode = findChildTag(el.children, "CC32");
        if (dc05 && nameNode) {
          const payload = dc05.payload;
          let mId;
          if (payload.length >= 6 && payload[0] === 222 && payload[1] === 5) {
            const de05Len = readU32(payload, 2);
            mId = parseVarInt(payload, 6, de05Len);
          } else {
            mId = parseVarInt(payload, 0, payload.length);
          }
          let mName = "";
          try {
            const decoder = new TextDecoder("utf-8");
            mName = decoder.decode(nameNode.payload);
          } catch (e) {
            emitLog(options, "debug", `Failed to decode material name for id ${mId}: ${e.message}`);
          }
          materialIdToName.set(mId, mName);
        }
      }
      if (el.children && el.children.length > 0) {
        collectMaterialIds(el.children);
      }
    }
  }
  emitLog(options, "debug", `Parsed ${materialsMap.size} materials, ${styles.length} styles`);
  const defsDict = /* @__PURE__ */ new Map();
  const rootBuilder = new GeometryBuilder();
  const vertexPositions = /* @__PURE__ */ new Map();
  const instanceWorld = /* @__PURE__ */ new Map();
  let pageNode = null;
  for (const { index, total, node: el } of iterTopLevelLazy(modelData, 0, modelData.length)) {
    try {
      collectLayers([el], layerIdToName, options, layerHidden);
      collectMaterialIds([el]);
      collectDefs([el], defsDict, options);
      scanVertexPositions(el, vertexPositions);
      scanInstanceTransforms(el, instanceWorld);
      if (pageNode === null) {
        pageNode = findPageNode(el);
      }
      if (el.tag === "F601") {
        extractGeometryFromNodes(el.children, rootBuilder, options);
      }
    } catch (e) {
      throw new SkpParseError(`Failed while processing top-level record: ${e.message}`, {
        stage: "tlv_walk",
        recordIndex: index,
        totalRecords: total,
        tag: el.tag,
        cause: e
      });
    }
    if (index % PROGRESS_INTERVAL === 0 || index === total - 1) {
      emitProgress(options, "tlv_walk", index + 1, total);
      emitLog(options, "debug", `Processed ${index + 1}/${total} top-level records`);
    }
  }
  emitLog(
    options,
    "info",
    `Parse complete: ${defsDict.size} defs (${((Date.now() - t02) / 1e3).toFixed(2)}s)`
  );
  if (!layerIdToName.has(1)) {
    layerIdToName.set(1, "Layer0");
  }
  if (!layerColors.has("Layer0")) {
    layerColors.set("Layer0", [136, 136, 136]);
  }
  if (!layerHidden.has("Layer0")) {
    layerHidden.set("Layer0", false);
  }
  defsDict.set("ROOT", {
    guid: "ROOT",
    name: "ROOT_MODEL",
    isImage: false,
    isGroup: false,
    alwaysFacesCamera: false,
    shadowsFaceSun: false,
    builder: rootBuilder
  });
  return {
    version,
    units,
    layerColors,
    layerHidden,
    layerIdToName,
    pages: parsePages(pageNode),
    dimensions: parseDimensions(modelData, vertexPositions, instanceWorld),
    materialIdToName,
    materialsMap,
    materialsByFolder,
    styles,
    defsDict
  };
}
function parseSkp(buffer, options) {
  return buildModelFromParsed(parseToRaw(buffer, options));
}
function buildScene(buffer, options) {
  return buildSceneFromParsed(parseToRaw(buffer, options), options);
}

// src/core/skp/import.ts
function cleanSkpName(n) {
  const t = n.replace(/^\[(.*)\]$/, "$1").replace(/^\d{3,4}_/, "").trim();
  return /^\*\d*$/.test(t) ? "" : t;
}
function importSkp(bytes, opts = {}) {
  const progress = opts.onProgress ?? (() => {
  });
  progress(0.05, "SketchUp-Datei wird gelesen");
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  let model2, scene2;
  try {
    model2 = parseSkp(ab);
    progress(0.3, "Geometrie wird aufgebaut");
    scene2 = buildScene(ab, { respectEdgeVisibility: true });
  } catch (e) {
    const msg = String(e.message ?? e);
    const legacy = /legacy/i.test(msg);
    throw new Error(legacy ? "Diese SketchUp-Datei stammt aus einer \xE4lteren Version (2013\u20132020) und enth\xE4lt etwas, das ARCHVISTA noch nicht lesen kann. Abhilfe: Datei in SketchUp \xF6ffnen und mit \u201EDatei \u2192 Speichern unter\u201C in einer aktuellen Version (2021 oder neuer) speichern \u2013 dann klappt der Import." : "Die SketchUp-Datei konnte nicht gelesen werden. Bitte in SketchUp mit \u201EDatei \u2192 Speichern unter\u201C neu speichern und erneut versuchen.");
  }
  progress(0.6, "Modell wird optimiert");
  const warnings = [];
  const mats = Array.isArray(model2.materials) ? model2.materials : Object.values(model2.materials ?? {});
  const hiddenLayers = new Set((model2.layers ?? []).filter((l) => l.hidden).map((l) => l.name));
  const textures = scene2.textures;
  const same2 = (a, b) => !!a && !!b && a.length === b.length && a[0] === b[0] && a[a.length >> 1] === b[b.length >> 1] && a[a.length - 1] === b[b.length - 1];
  const used = /* @__PURE__ */ new Map();
  const images = /* @__PURE__ */ new Map();
  const isTagColour = (m) => /^Layer_/.test(m.name);
  const realMats = mats.filter((m) => !isTagColour(m));
  const tagRgb = /* @__PURE__ */ new Set([
    ...mats.filter(isTagColour).map((m) => `${m.color.r},${m.color.g},${m.color.b}`),
    ...(model2.layers ?? []).filter((l) => l.color).map((l) => `${l.color.r},${l.color.g},${l.color.b}`)
  ]);
  const matFor = (g) => {
    const f2 = g.pbrMetallicRoughness.baseColorFactor;
    const [r, gg, b] = f2.map((v) => Math.round(v * 255));
    const ti = g.pbrMetallicRoughness.baseColorTexture?.index;
    const rgb = (m) => m.color.r === r && m.color.g === gg && m.color.b === b;
    let src2;
    if (ti !== void 0) {
      const withTex = realMats.filter((m) => same2(m.texture?.data, textures[ti]?.data));
      src2 = withTex.find(rgb) ?? withTex[0];
    } else if (!tagRgb.has(`${r},${gg},${b}`)) {
      src2 = realMats.find((m) => !m.texture?.data && rgb(m));
    }
    if (!src2) return { color: 14540253, textured: false };
    const name = cleanSkpName(src2.name) || src2.name;
    if (!used.has(name)) {
      const cm = { name, color: r << 16 | gg << 8 | b };
      if (ti !== void 0 && src2.colorized) cm.colorize = true;
      if (ti !== void 0 && textures[ti]) {
        const ext = textures[ti].mimeType === "image/png" ? "png" : "jpg";
        const file = textureKey(`${name}.${ext}`);
        cm.map = file;
        cm.sourceUv = true;
        images.set(file, textures[ti].data);
      }
      const alpha = f2[3] ?? 1;
      if (alpha < 0.98) cm.opacity = alpha;
      else cm.opaque = true;
      used.set(name, cm);
    }
    return { name, color: r << 16 | gg << 8 | b, textured: ti !== void 0 };
  };
  const s = opts.unitsToMeters ?? 1;
  const groups = /* @__PURE__ */ new Map();
  const gm = scene2.gltfMaterials;
  let skippedHidden = 0, removedDup = 0, flippedWinding = 0;
  const seen = /* @__PURE__ */ new Map();
  const q = (v) => Math.round(v * 1e4);
  const duplicate = (P, a, b, c, single) => {
    const v = [a, b, c].map((i2) => `${q(P[i2 * 3])},${q(P[i2 * 3 + 1])},${q(P[i2 * 3 + 2])}`);
    const key = [...v].sort().join("|");
    const order = [v.indexOf([...v].sort()[0]), 0, 0];
    const i0 = order[0], dir = v[(i0 + 1) % 3] < v[(i0 + 2) % 3] ? 1 : -1;
    const list = seen.get(key);
    if (!list) {
      seen.set(key, [{ single, dir }]);
      return false;
    }
    if (list.some((t) => !t.single || !single || t.dir === dir)) return true;
    list.push({ single, dir });
    return false;
  };
  for (const p of scene2.glbPrimitives) {
    const layer = scene2.meshIndex[p.geomName]?.layer || "Untagged";
    if (hiddenLayers.has(layer)) {
      skippedHidden++;
      continue;
    }
    const gmat = gm[p.materialIndex] ?? { pbrMetallicRoughness: { baseColorFactor: [0.87, 0.87, 0.87, 1] }, doubleSided: true };
    const m = matFor(gmat);
    const single = gmat.doubleSided !== true;
    const key = `${layer}\0${m.name ?? ""}\0${m.color}\0${single ? 1 : 2}`;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { layer, material: m.name, color: m.color, textured: m.textured, single, pos: [], nrm: [], uv: [], idx: [] });
    const base = g.pos.length / 3;
    for (let i2 = 0; i2 < p.positions.length; i2++) g.pos.push(p.positions[i2] * s);
    for (let i2 = 0; i2 < p.normals.length; i2++) g.nrm.push(p.normals[i2]);
    for (let i2 = 0; i2 < p.uvs.length; i2++) g.uv.push(p.uvs[i2]);
    const P = p.positions, N = p.normals;
    for (let i2 = 0; i2 < p.indices.length; i2 += 3) {
      const a = p.indices[i2];
      let b = p.indices[i2 + 1], c = p.indices[i2 + 2];
      const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
      const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
      const nx = N[a * 3] + N[b * 3] + N[c * 3], ny = N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1], nz = N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2];
      if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz < 0) {
        const t = b;
        b = c;
        c = t;
        flippedWinding++;
      }
      if (duplicate(P, a, b, c, single)) {
        removedDup++;
        continue;
      }
      g.idx.push(a + base, b + base, c + base);
    }
  }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of groups.values()) for (let i2 = 0; i2 < g.pos.length; i2 += 3) for (let k = 0; k < 3; k++) {
    const v = g.pos[i2 + k];
    if (v < mn[k]) mn[k] = v;
    if (v > mx[k]) mx[k] = v;
  }
  const ok = Number.isFinite(mn[0]);
  const origin = ok ? [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2] : [0, 0, 0];
  const meshes = [];
  const layerMap = /* @__PURE__ */ new Map();
  let gi = 0, triangles = 0, vertices = 0;
  for (const g of groups.values()) {
    if (!g.idx.length) continue;
    const positions = new Float32Array(g.pos.length);
    for (let i2 = 0; i2 < g.pos.length; i2 += 3) {
      positions[i2] = g.pos[i2] - origin[0];
      positions[i2 + 1] = g.pos[i2 + 1] - origin[1];
      positions[i2 + 2] = g.pos[i2 + 2] - origin[2];
    }
    const indices = Uint32Array.from(g.idx);
    meshes.push({
      id: `m${gi++}`,
      layer: g.layer,
      color: g.color,
      ...g.material ? { material: g.material } : {},
      positions,
      normals: Float32Array.from(g.nrm),
      indices,
      triangleCount: indices.length / 3,
      ...g.textured ? { uvs: Float32Array.from(g.uv) } : {},
      ...g.single ? { singleSided: true } : {}
    });
    triangles += indices.length / 3;
    vertices += positions.length / 3;
    const li = layerMap.get(g.layer) ?? { name: g.layer, color: g.color, triangleCount: 0 };
    li.triangleCount += indices.length / 3;
    layerMap.set(g.layer, li);
  }
  const size2 = ok ? [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] : [0, 0, 0];
  const rawExtent = Math.max(...size2) / s;
  const plausible = rawExtent * s >= 2 && rawExtent * s <= 2e3;
  if (!ok) warnings.push({ code: "no-3d", message: "In der SketchUp-Datei wurden keine sichtbaren Fl\xE4chen gefunden." });
  else if (!plausible) warnings.push({ code: "units-implausible", message: `Das Modell ist ${(rawExtent * s).toFixed(1)} m gro\xDF \u2013 ungew\xF6hnlich f\xFCr ein Geb\xE4ude. Bei Bedarf die Einheit korrigieren.` });
  if (removedDup > 50) warnings.push({ code: "duplicates", message: `${removedDup.toLocaleString("de-AT")} doppelt \xFCbereinanderliegende Fl\xE4chen wurden entfernt (sie w\xFCrden flackern).` });
  if (skippedHidden) warnings.push({ code: "hidden-tags", message: `${skippedHidden} Teil(e) auf ausgeblendeten Tags wurden weggelassen \u2013 wie in SketchUp.` });
  progress(1, "Fertig");
  return {
    model: {
      meshes,
      materials: [...used.values()],
      layers: [...layerMap.values()].sort((a, c) => c.triangleCount - a.triangleCount),
      units: { name: s === 1 ? "Meter" : `Faktor ${s}`, toMeters: s, source: opts.unitsToMeters ? "user" : "header", rawExtent, plausible },
      origin,
      bbox: ok ? { min: [mn[0] - origin[0], mn[1] - origin[1], mn[2] - origin[2]], max: [mx[0] - origin[0], mx[1] - origin[1], mx[2] - origin[2]] } : { min: [0, 0, 0], max: [0, 0, 0] },
      stats: { version: `SketchUp ${String(model2.version ?? "").replace(/[{}]/g, "")}`, entityCounts: { "SketchUp-Fl\xE4chen (Dreiecke)": triangles }, triangles, vertices, removedDegenerate: 0, removedDuplicate: removedDup, flippedForConsistency: flippedWinding, closedShellsOutward: 0 },
      warnings,
      ok
    },
    images: [...images].map(([name, data]) => ({ name, data }))
  };
}

// src/core/analysis/classify.ts
var RULES = [
  ["glass", /(glas|glass|glazing|verglas|scheibe|vitre)/i],
  ["window", /(fenster|window|wind\b|fen\b|^a-glaz|oberlicht|skylight)/i],
  ["door", /(t[üu]r|tuer|door|\btor\b|portal)/i],
  ["stair", /(treppe|stufe|stair|step|rampe|ramp)/i],
  ["railing", /(gel[äa]nder|gelaender|railing|handlauf|handrail|balustr|br[üu]stung)/i],
  ["column", /(st[üu]tze|stuetze|column|s[äa]ule|saeule|pfeiler|pillar|\bcol\b)/i],
  ["roof", /(dach|roof|attika|ziegel|traufe|first)/i],
  ["terrain", /(gel[äa]nde|gelaende|terrain|topo|site|landscape|rasen|lawn|grund\b|umgebung)/i],
  ["terrace", /(terrasse|terrace|balkon|balcony|loggia|deck\b|patio)/i],
  ["furniture", /(m[öo]bel|moebel|furn|einrichtung|ausstattung|k[üu]che|kitchen|sanit|bad\b|equip)/i],
  ["ceiling", /(decke|ceiling|slab|geschossdecke|unterzug)/i],
  ["floor", /(boden|floor|estrich|belag|fu[ßs]boden|parkett|fliese|bodenplatte|fundament)/i],
  ["wall", /(wand|w[äa]nde|wall|mauer|fassade|facade|attika|brick|ziegelwand|beton)/i]
];
function categoryFromLayer(layer) {
  for (const [c, re] of RULES) if (re.test(layer)) return c;
  return null;
}
function orientationShares(m) {
  const p = m.positions, I = m.indices;
  let up = 0, down = 0, vertical = 0, sloped = 0, total = 0;
  for (let i2 = 0; i2 < I.length; i2 += 3) {
    const n = triNormalArea(p, I[i2], I[i2 + 1], I[i2 + 2]);
    const ny = n.ny;
    total += n.area;
    if (ny > 0.95) up += n.area;
    else if (ny < -0.95) down += n.area;
    else if (Math.abs(ny) < 0.2) vertical += n.area;
    else sloped += n.area;
  }
  const t = total || 1;
  return { area: total, shares: { up: up / t, down: down / t, vertical: vertical / t, sloped: sloped / t } };
}
function triNormalArea(p, a, b, c) {
  a *= 3;
  b *= 3;
  c *= 3;
  const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
  const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return { nx: nx / l, ny: ny / l, nz: nz / l, area: l / 2 };
}
function classifyMesh(m) {
  const { area: area2, shares } = orientationShares(m);
  const byLayer = categoryFromLayer(m.layer);
  if (byLayer) return { meshId: m.id, category: byLayer, basis: "layer", orientation: shares, area: area2 };
  const horiz = shares.up + shares.down;
  let category = "other";
  if (shares.vertical > 0.6) category = "wall";
  else if (shares.sloped > 0.4) category = "roof";
  else if (horiz > 0.6) category = "floor";
  return { meshId: m.id, category, basis: "geometry", orientation: shares, area: area2 };
}

// src/core/analysis/spatial.ts
var SKIP_FOR_FLOORS = ["roof", "terrain", "furniture", "glass", "window", "railing", "stair", "door"];
function analyse(input) {
  const { meshes, categories, bbox } = input;
  const notes = [];
  const ext = Math.max(bbox.max[0] - bbox.min[0], bbox.max[2] - bbox.min[2]);
  const cell = Math.max(0.1, ext / 1500);
  const margin = 2;
  const grid = {
    x0: bbox.min[0] - margin,
    z0: bbox.min[2] - margin,
    cell,
    nx: Math.ceil((bbox.max[0] - bbox.min[0] + 2 * margin) / cell),
    nz: Math.ceil((bbox.max[2] - bbox.min[2] + 2 * margin) / cell)
  };
  const levels = detectLevels(meshes, categories, bbox);
  if (!levels.length) notes.push("Keine Geschossebene erkannt \u2013 Begehung startet au\xDFen.");
  const plans = levels.map((lv) => planLevel(meshes, categories, grid, lv));
  const kept = plans.filter((p) => count(p.walkable) * cell * cell >= 8);
  kept.forEach((p, i2) => {
    p.level.index = i2;
  });
  nameLevels(kept.map((p) => p.level), bbox.min[1]);
  for (let i2 = 0; i2 < kept.length; i2++)
    kept[i2].level.height = i2 + 1 < kept.length ? kept[i2 + 1].level.elevation - kept[i2].level.elevation : 3;
  const rooms = [];
  for (const p of kept) findRooms(p, grid, rooms);
  const entrance = findEntrance(kept, grid, rooms);
  if (!entrance && kept.length) notes.push("Kein Eingang erkannt \u2013 der Besuch startet vor dem Geb\xE4ude.");
  const hasTerrain = meshes.some((m) => categories.get(m.id) === "terrain");
  return { grid, levels: kept.map((p) => p.level), plans: kept, rooms, entrance, groundY: hasTerrain ? bbox.min[1] - 0.05 : bbox.min[1], notes };
}
function count(a) {
  let n = 0;
  for (let i2 = 0; i2 < a.length; i2++) n += a[i2];
  return n;
}
function detectLevels(meshes, categories, bbox) {
  const bin = 0.05;
  const hist = /* @__PURE__ */ new Map();
  for (const m of meshes) {
    if (SKIP_FOR_FLOORS.includes(categories.get(m.id) ?? "other")) continue;
    const p = m.positions, I = m.indices;
    for (let i2 = 0; i2 < I.length; i2 += 3) {
      const a = I[i2] * 3, b = I[i2 + 1] * 3, c = I[i2 + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz);
      if (!l || ny / l < 0.97) continue;
      const y = (p[a + 1] + p[b + 1] + p[c + 1]) / 3;
      const k = Math.round(y / bin);
      hist.set(k, (hist.get(k) ?? 0) + l / 2);
    }
  }
  const entries = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];
  const maxA = entries[0][1];
  const accepted = [];
  for (const [k, a] of entries) {
    if (a < Math.max(4, 0.12 * maxA)) break;
    const y = k * bin;
    if (accepted.every((u) => Math.abs(u - y) >= 2)) accepted.push(y);
  }
  accepted.sort((a, b) => a - b);
  void bbox;
  return accepted.map((y, i2) => ({ index: i2, elevation: y, height: 3, name: { de: "", en: "" } }));
}
function nameLevels(levels, minY) {
  let g = levels.findIndex((l) => l.elevation >= minY - 0.01 && l.elevation <= minY + 1.5);
  if (g < 0) g = 0;
  levels.forEach((l, i2) => {
    const d = i2 - g;
    if (d === 0) l.name = { de: "Erdgeschoss", en: "Ground floor" };
    else if (d < 0) l.name = { de: d === -1 ? "Untergeschoss" : `${-d}. Untergeschoss`, en: d === -1 ? "Basement" : `Basement ${-d}` };
    else if (i2 === levels.length - 1 && d >= 2) l.name = { de: "Dachgeschoss", en: "Top floor" };
    else l.name = { de: `${d}. Obergeschoss`, en: `Floor ${d}` };
  });
}
function planLevel(meshes, categories, g, level) {
  const N = g.nx * g.nz;
  const floorY = new Float32Array(N).fill(NaN);
  const ceilY = new Float32Array(N).fill(Infinity);
  const blocked = new Uint8Array(N);
  const e = level.elevation;
  const cuts = [e + 0.35, e + 0.75];
  forEachTri(meshes, (ax, ay, az, bx, by, bz, cx, cy, cz, ny, cat) => {
    if (ny < 0.7 || cat === "roof") return;
    const ymin = Math.min(ay, by, cy), ymax = Math.max(ay, by, cy);
    if (ymax < e - 0.45 || ymin > e + 0.45) return;
    rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, (i2, y) => {
      if (y <= e + 0.45 && y >= e - 0.45 && !(floorY[i2] >= y)) floorY[i2] = y;
    });
  }, categories);
  forEachTri(meshes, (ax, ay, az, bx, by, bz, cx, cy, cz, ny, cat) => {
    const ymin = Math.min(ay, by, cy), ymax = Math.max(ay, by, cy);
    if (ymax < e - 0.1 || ymin > e + 4) return;
    for (const h of cuts) if (ymin < h && ymax > h) cutSegment(g, blocked, h, ax, ay, az, bx, by, bz, cx, cy, cz);
    if (Math.abs(ny) > 0.05) {
      rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, (i2, y) => {
        const f2 = floorY[i2];
        if (!Number.isNaN(f2) && (ny < 0 ? y > f2 - 0.03 : y > f2 + 0.05) && y < ceilY[i2]) ceilY[i2] = y;
      });
    }
    void cat;
  }, categories);
  const walkable = new Uint8Array(N);
  for (let i2 = 0; i2 < N; i2++) walkable[i2] = !Number.isNaN(floorY[i2]) && ceilY[i2] - floorY[i2] >= 1.9 && !blocked[i2] ? 1 : 0;
  return { level, floorY, ceilY, walkable, blocked, room: new Int32Array(N).fill(-1) };
}
function forEachTri(meshes, fn, categories) {
  for (const m of meshes) {
    const cat = categories.get(m.id) ?? "other";
    const p = m.positions, I = m.indices;
    for (let i2 = 0; i2 < I.length; i2 += 3) {
      const a = I[i2] * 3, b = I[i2 + 1] * 3, c = I[i2 + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      fn(p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2], ny / l, cat);
    }
  }
}
function rasterTri(g, ax, az, ay, bx, bz, by, cx, cz, cy, cb) {
  const minX = Math.max(0, Math.floor((Math.min(ax, bx, cx) - g.x0) / g.cell));
  const maxX = Math.min(g.nx - 1, Math.floor((Math.max(ax, bx, cx) - g.x0) / g.cell));
  const minZ = Math.max(0, Math.floor((Math.min(az, bz, cz) - g.z0) / g.cell));
  const maxZ = Math.min(g.nz - 1, Math.floor((Math.max(az, bz, cz) - g.z0) / g.cell));
  const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(d) < 1e-12) return;
  for (let j = minZ; j <= maxZ; j++) {
    const pz = g.z0 + (j + 0.5) * g.cell;
    for (let i2 = minX; i2 <= maxX; i2++) {
      const px = g.x0 + (i2 + 0.5) * g.cell;
      const w1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d;
      const w2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
      const w3 = 1 - w1 - w2;
      if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
      cb(j * g.nx + i2, w1 * ay + w2 * by + w3 * cy);
    }
  }
}
function cutSegment(g, out, h, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const pts2 = [];
  const edge = (x12, y1, z12, x22, y2, z22) => {
    if ((y1 - h) * (y2 - h) < 0) {
      const t = (h - y1) / (y2 - y1);
      pts2.push([x12 + t * (x22 - x12), z12 + t * (z22 - z12)]);
    }
  };
  edge(ax, ay, az, bx, by, bz);
  edge(bx, by, bz, cx, cy, cz);
  edge(cx, cy, cz, ax, ay, az);
  if (pts2.length < 2) return;
  const [[x1, z1], [x2, z2]] = pts2;
  const len = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(len / (g.cell * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const x3 = x1 + (x2 - x1) * s / steps, z = z1 + (z2 - z1) * s / steps;
    const i2 = Math.floor((x3 - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
    if (i2 >= 0 && j >= 0 && i2 < g.nx && j < g.nz) out[j * g.nx + i2] = 1;
  }
}
function dilate(src2, g, r) {
  const tmp = new Uint8Array(src2.length), out = new Uint8Array(src2.length);
  for (let j = 0; j < g.nz; j++) {
    let last = -1e9;
    for (let i2 = 0; i2 < g.nx; i2++) {
      if (src2[j * g.nx + i2]) last = i2;
      if (i2 - last <= r) tmp[j * g.nx + i2] = 1;
    }
    last = 1e9;
    for (let i2 = g.nx - 1; i2 >= 0; i2--) {
      if (src2[j * g.nx + i2]) last = i2;
      if (last - i2 <= r) tmp[j * g.nx + i2] = 1;
    }
  }
  for (let i2 = 0; i2 < g.nx; i2++) {
    let last = -1e9;
    for (let j = 0; j < g.nz; j++) {
      if (tmp[j * g.nx + i2]) last = j;
      if (j - last <= r) out[j * g.nx + i2] = 1;
    }
    last = 1e9;
    for (let j = g.nz - 1; j >= 0; j--) {
      if (tmp[j * g.nx + i2]) last = j;
      if (last - j <= r) out[j * g.nx + i2] = 1;
    }
  }
  return out;
}
function findRooms(p, g, rooms) {
  const N = g.nx * g.nz;
  const r = Math.max(2, Math.round(0.65 / g.cell));
  const closed = dilate(p.blocked, g, r);
  const exterior = new Uint8Array(N);
  const q = [];
  for (let i2 = 0; i2 < g.nx; i2++) for (const j of [0, g.nz - 1]) push(j * g.nx + i2);
  for (let j = 0; j < g.nz; j++) for (const i2 of [0, g.nx - 1]) push(j * g.nx + i2);
  function push(c) {
    if (!closed[c] && !exterior[c]) {
      exterior[c] = 1;
      q.push(c);
    }
  }
  while (q.length) {
    const c = q.pop();
    const i2 = c % g.nx, j = c / g.nx | 0;
    if (i2 > 0) push(c - 1);
    if (i2 < g.nx - 1) push(c + 1);
    if (j > 0) push(c - g.nx);
    if (j < g.nz - 1) push(c + g.nx);
  }
  const minCells = Math.ceil(1.5 / (g.cell * g.cell));
  const seedOf = p.room;
  const local = [];
  for (let s = 0; s < N; s++) {
    if (seedOf[s] !== -1 || !p.walkable[s] || closed[s] || exterior[s]) continue;
    const comp = [s];
    const id = rooms.length + local.length;
    seedOf[s] = id;
    for (let k = 0; k < comp.length; k++) {
      const c = comp[k];
      const i2 = c % g.nx, j = c / g.nx | 0;
      for (const n of [i2 > 0 ? c - 1 : -1, i2 < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1]) {
        if (n < 0 || seedOf[n] !== -1 || !p.walkable[n] || closed[n] || exterior[n]) continue;
        seedOf[n] = id;
        comp.push(n);
      }
    }
    if (comp.length < minCells) {
      for (const c of comp) seedOf[c] = -2;
      continue;
    }
    local.push({ id, level: p.level.index, cells: comp.length, area: 0, centroid: [0, 0], outline: [], covered: true });
  }
  for (let i2 = 0; i2 < N; i2++) if (seedOf[i2] === -2) seedOf[i2] = -1;
  let frontier = [];
  for (let c = 0; c < N; c++) if (seedOf[c] >= 0) frontier.push(c);
  for (let step = 0; step < r + 1 && frontier.length; step++) {
    const next = [];
    for (const c of frontier) {
      const i2 = c % g.nx, j = c / g.nx | 0;
      for (const n of [i2 > 0 ? c - 1 : -1, i2 < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1]) {
        if (n < 0 || seedOf[n] !== -1 || !p.walkable[n] || exterior[n]) continue;
        seedOf[n] = seedOf[c];
        next.push(n);
      }
    }
    frontier = next;
  }
  for (const room of local) {
    let n = 0, sx = 0, sz = 0, cov = 0;
    for (let c = 0; c < N; c++) if (seedOf[c] === room.id) {
      n++;
      sx += c % g.nx;
      sz += c / g.nx | 0;
      if (Number.isFinite(p.ceilY[c])) cov++;
    }
    room.covered = cov > n * 0.6;
    room.cells = n;
    room.area = Math.round(n * g.cell * g.cell * 10) / 10;
    room.centroid = [g.x0 + (sx / n + 0.5) * g.cell, g.z0 + (sz / n + 0.5) * g.cell];
    room.outline = traceOutline(seedOf, room.id, g);
    rooms.push(room);
  }
}
function traceOutline(lbl, id, g) {
  const W = g.nx + 1;
  const next = /* @__PURE__ */ new Map();
  const at = (i2, j) => i2 >= 0 && j >= 0 && i2 < g.nx && j < g.nz && lbl[j * g.nx + i2] === id;
  for (let j = 0; j < g.nz; j++)
    for (let i2 = 0; i2 < g.nx; i2++) {
      if (lbl[j * g.nx + i2] !== id) continue;
      if (!at(i2, j - 1)) next.set(j * W + i2, j * W + i2 + 1);
      if (!at(i2 + 1, j)) next.set(j * W + i2 + 1, (j + 1) * W + i2 + 1);
      if (!at(i2, j + 1)) next.set((j + 1) * W + i2 + 1, (j + 1) * W + i2);
      if (!at(i2 - 1, j)) next.set((j + 1) * W + i2, j * W + i2);
    }
  let best = [];
  const used = /* @__PURE__ */ new Set();
  for (const start of next.keys()) {
    if (used.has(start)) continue;
    const loop = [];
    let v = start;
    while (!used.has(v) && next.has(v)) {
      used.add(v);
      loop.push(v);
      v = next.get(v);
    }
    if (loop.length > best.length) best = loop;
  }
  const pts2 = best.map((v) => [v % W, v / W | 0]);
  const simp = [];
  for (let k = 0; k < pts2.length; k++) {
    const a = pts2[(k + pts2.length - 1) % pts2.length], b = pts2[k], c = pts2[(k + 1) % pts2.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) simp.push(b);
  }
  return simp.map(([i2, j]) => [g.x0 + i2 * g.cell, g.z0 + j * g.cell]);
}
function findEntrance(plans, g, rooms) {
  for (const p of plans) {
    const N = g.nx * g.nz;
    const seen = new Uint8Array(N);
    const q = [];
    const nb = (c) => {
      const i2 = c % g.nx, j = c / g.nx | 0;
      return [i2 > 0 ? c - 1 : -1, i2 < g.nx - 1 ? c + 1 : -1, j > 0 ? c - g.nx : -1, j < g.nz - 1 ? c + g.nx : -1];
    };
    for (let c = 0; c < N; c++) {
      if (!p.walkable[c] || p.room[c] >= 0) continue;
      if (nb(c).some((n2) => n2 < 0 || Number.isNaN(p.floorY[n2]) && !p.blocked[n2])) {
        seen[c] = 1;
        q.push(c);
      }
    }
    const thresholds = [];
    for (let k = 0; k < q.length; k++) {
      const c = q[k];
      for (const n2 of nb(c)) {
        if (n2 < 0 || seen[n2] || !p.walkable[n2]) continue;
        if (p.room[n2] >= 0) {
          thresholds.push(n2);
          continue;
        }
        seen[n2] = 1;
        q.push(n2);
      }
    }
    if (!thresholds.length) continue;
    const tset = new Set(thresholds);
    const clusters = [];
    const done = /* @__PURE__ */ new Set();
    for (const t of tset) {
      if (done.has(t)) continue;
      const cl = [t];
      done.add(t);
      for (let k = 0; k < cl.length; k++) {
        const c = cl[k];
        const i2 = c % g.nx, j = c / g.nx | 0;
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
          const n2 = (j + dj) * g.nx + (i2 + di);
          if (tset.has(n2) && !done.has(n2)) {
            done.add(n2);
            cl.push(n2);
          }
        }
      }
      clusters.push(cl);
    }
    let best = null;
    for (const cl of clusters) {
      const width = cl.length * g.cell;
      if (width < 0.6) continue;
      const room2 = rooms.find((r) => r.id === p.room[cl[0]]);
      const score = (room2?.area ?? 0) + Math.min(width, 2.5) * 10;
      if (!best || score > best.score) best = { cl, score };
    }
    if (!best) continue;
    let sx = 0, sz = 0, sy = 0;
    for (const c of best.cl) {
      sx += c % g.nx;
      sz += c / g.nx | 0;
      sy += p.floorY[c];
    }
    const n = best.cl.length;
    const cx = g.x0 + (sx / n + 0.5) * g.cell, cz = g.z0 + (sz / n + 0.5) * g.cell;
    const room = rooms.find((r) => r.id === p.room[best.cl[0]]);
    let ix = room.centroid[0] - cx, iz = room.centroid[1] - cz;
    const xs = best.cl.map((c) => c % g.nx), zs = best.cl.map((c) => c / g.nx | 0);
    const spanX = Math.max(...xs) - Math.min(...xs), spanZ = Math.max(...zs) - Math.min(...zs);
    if (spanX > spanZ) {
      ix = 0;
      iz = Math.sign(iz) || 1;
    } else if (spanZ > spanX) {
      iz = 0;
      ix = Math.sign(ix) || 1;
    }
    const l = Math.hypot(ix, iz) || 1;
    return { level: p.level.index, position: [cx, sy / n, cz], inward: [ix / l, iz / l], width: Math.max(spanX, spanZ) * g.cell + g.cell };
  }
  return null;
}
function cellOf(g, x2, z) {
  const i2 = Math.floor((x2 - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
  if (i2 < 0 || j < 0 || i2 >= g.nx || j >= g.nz) return -1;
  return j * g.nx + i2;
}

// src/core/scene.ts
var SPLIT_ROLES = ["floor", "ceiling", "terrace", "roof"];
function subMesh(m, tris) {
  const map = /* @__PURE__ */ new Map();
  const pos = [], nrm = [], uv = [];
  const idx = new Uint32Array(tris.length);
  tris.forEach((v, j) => {
    let n = map.get(v);
    if (n === void 0) {
      n = pos.length / 3;
      map.set(v, n);
      pos.push(m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]);
      nrm.push(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]);
      if (m.uvs) uv.push(m.uvs[v * 2], m.uvs[v * 2 + 1]);
    }
    idx[j] = n;
  });
  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: idx, triangleCount: idx.length / 3, ...m.uvs ? { uvs: new Float32Array(uv) } : {} };
}
function orientationGroups(m) {
  const g = /* @__PURE__ */ new Map();
  const I = m.indices;
  for (let i2 = 0; i2 < I.length; i2 += 3) {
    const n = triNormalArea(m.positions, I[i2], I[i2 + 1], I[i2 + 2]);
    const k = n.ny > 0.7 ? "top" : n.ny < -0.7 ? "under" : Math.abs(n.ny) < 0.2 ? "side" : "slope";
    let l = g.get(k);
    if (!l) g.set(k, l = []);
    l.push(I[i2], I[i2 + 1], I[i2 + 2]);
  }
  return g;
}
function partition(meshes, cadMaterials = []) {
  const parts = [];
  const cad = new Map(cadMaterials.map((c) => [c.name, c]));
  let n = 0;
  const make = (m, sub, category, basis, role) => {
    const cm = m.material ? cad.get(m.material) ?? { name: m.material } : void 0;
    return {
      id: `p${n++}`,
      // the CAD material is part of the key only when there is one (older projects keep their keys)
      key: `${m.layer}|${category}|${role}|${m.color}${m.material ? `|m:${m.material}` : ""}`,
      layer: m.layer,
      category,
      basis,
      role,
      color: m.color,
      ...m.material ? { cadMaterial: m.material } : {},
      ...m.singleSided ? { singleSided: true } : {},
      positions: sub.positions,
      normals: sub.normals,
      indices: sub.indices,
      uvs: boxUVs(sub.positions, sub.normals),
      ...sub.uvs ? { uvTex: sub.uvs } : {},
      auto: cm && assignFromCad(cm, category) || assignMaterial(m.layer, category, role, m.color)
    };
  };
  for (const m of meshes) {
    const byLayer = categoryFromLayer(m.layer);
    if (byLayer && !SPLIT_ROLES.includes(byLayer)) {
      parts.push(make(m, m, byLayer, "layer", "all"));
      continue;
    }
    const groups = orientationGroups(m);
    if (byLayer) {
      for (const [k, tris] of groups) {
        const role = k === "top" ? "top" : k === "under" ? "under" : byLayer === "roof" && k === "slope" ? "all" : "side";
        parts.push(make(m, subMesh(m, tris), byLayer, "layer", role));
      }
      continue;
    }
    const whole2 = classifyMesh(m);
    if (groups.size === 1 && whole2.category !== "other") {
      const [k] = [...groups.keys()];
      parts.push(make(m, m, whole2.category, "geometry", whole2.category === "floor" ? k === "under" ? "under" : "top" : "all"));
      continue;
    }
    for (const [k, tris] of groups) {
      const cat = k === "side" ? "wall" : k === "slope" ? "roof" : "floor";
      const role = k === "top" ? "top" : k === "under" ? "under" : "all";
      parts.push(make(m, subMesh(m, tris), cat, "geometry", role));
    }
  }
  return parts;
}
function prepareScene(model2, onProgress2) {
  const t02 = performance.now();
  const parts = partition(model2.meshes, model2.materials);
  const t12 = performance.now();
  onProgress2?.(0.4, "R\xE4ume und Geschosse werden erkannt");
  const asMeshes = parts.map((p) => ({ id: p.id, layer: p.layer, color: p.color, positions: p.positions, normals: p.normals, indices: p.indices, triangleCount: p.indices.length / 3 }));
  const analysis = analyse({ meshes: asMeshes, categories: new Map(parts.map((p) => [p.id, p.category])), bbox: model2.bbox });
  const t2 = performance.now();
  onProgress2?.(0.8, "Blickpunkte werden vorgeschlagen");
  const bbox = model2.bbox;
  const start = startPosition(analysis, bbox);
  const viewpoints = suggestViewpoints(analysis, bbox, start);
  const hotspotSuggestions = suggestHotspots(analysis);
  onProgress2?.(1, "Fertig");
  return {
    parts,
    analysis,
    bbox,
    start,
    viewpoints,
    hotspotSuggestions,
    timings: { partition: t12 - t02, analysis: t2 - t12, suggestions: performance.now() - t2 }
  };
}
var EYE = 1.65;
function startPosition(a, bbox) {
  if (a.entrance) {
    const e = a.entrance;
    const x2 = e.position[0] - e.inward[0] * 3.5, z2 = e.position[2] - e.inward[1] * 3.5;
    return { position: [x2, Math.min(e.position[1], a.groundY) + 0.02, z2], yaw: Math.atan2(-e.inward[0], -e.inward[1]), outside: true };
  }
  const cx = (bbox.min[0] + bbox.max[0]) / 2;
  const z = bbox.max[2] + 6;
  return { position: [cx, a.groundY + 0.02, z], yaw: 0, outside: true };
}
function suggestViewpoints(a, bbox, start) {
  const cx = (bbox.min[0] + bbox.max[0]) / 2, cz = (bbox.min[2] + bbox.max[2]) / 2;
  const sx = bbox.max[0] - bbox.min[0], sz = bbox.max[2] - bbox.min[2], sy = bbox.max[1] - bbox.min[1];
  const diag = Math.hypot(sx, sz);
  const ty = bbox.min[1] + sy * 0.4;
  const vps = [];
  const base = Math.atan2(start.position[0] - cx, start.position[2] - cz);
  const names = ["Hauptansicht", "Seitenansicht", "R\xFCckansicht", "Seitenansicht 2"];
  [0.6, -0.6 + Math.PI / 2, Math.PI + 0.6, -Math.PI / 2 - 0.6].forEach((off, i2) => {
    const ang = base + off;
    const d = Math.max(diag * 0.95, 12);
    vps.push({ id: `ext${i2}`, name: names[i2], position: [cx + Math.sin(ang) * d, a.groundY + EYE + sy * 0.15, cz + Math.cos(ang) * d], target: [cx, ty, cz], auto: true });
  });
  vps.push({ id: "aerial", name: "Vogelperspektive", position: [cx + Math.sin(base + 0.7) * diag * 1.1, bbox.max[1] + diag * 0.8, cz + Math.cos(base + 0.7) * diag * 1.1], target: [cx, ty, cz], auto: true });
  if (a.entrance) {
    const e = a.entrance;
    vps.push({ id: "entry", name: "Eingang", position: [start.position[0], start.position[1] + EYE, start.position[2]], target: [e.position[0], e.position[1] + 1.2, e.position[2]], auto: true, walk: true });
  }
  for (const r of a.rooms.filter((r2) => r2.covered && r2.area >= 6).slice(0, 12)) {
    const plan = a.plans[r.level];
    const g = a.grid;
    let best = -1, bd = -1;
    for (let c = 0; c < plan.room.length; c++) {
      if (plan.room[c] !== r.id || !plan.walkable[c]) continue;
      const x2 = g.x0 + (c % g.nx + 0.5) * g.cell, z = g.z0 + ((c / g.nx | 0) + 0.5) * g.cell;
      const d = Math.hypot(x2 - r.centroid[0], z - r.centroid[1]);
      if (d > bd) {
        bd = d;
        best = c;
      }
    }
    if (best < 0) continue;
    const bx = g.x0 + (best % g.nx + 0.5) * g.cell, bz = g.z0 + ((best / g.nx | 0) + 0.5) * g.cell;
    const k = Math.min(0.6, bd * 0.3) / (bd || 1);
    const px = bx + (r.centroid[0] - bx) * k, pz = bz + (r.centroid[1] - bz) * k;
    const fy = plan.floorY[cellOf(g, px, pz)] ?? plan.level.elevation;
    vps.push({ id: `room${r.id}`, name: `${plan.level.name.de} \xB7 Raum ${r.id + 1}`, position: [px, (Number.isFinite(fy) ? fy : plan.level.elevation) + EYE, pz], target: [r.centroid[0], plan.level.elevation + 1.3, r.centroid[1]], auto: true, walk: true, level: r.level });
  }
  return vps;
}
function suggestHotspots(a) {
  const out = [];
  for (const r of a.rooms.filter((r2) => r2.covered && r2.area >= 6).slice(0, 12)) {
    const plan = a.plans[r.level];
    let c = cellOf(a.grid, r.centroid[0], r.centroid[1]);
    let pos = r.centroid;
    if (c < 0 || plan.room[c] !== r.id) {
      let bd = Infinity;
      for (let k = 0; k < plan.room.length; k++) {
        if (plan.room[k] !== r.id) continue;
        const x2 = a.grid.x0 + (k % a.grid.nx + 0.5) * a.grid.cell, z = a.grid.z0 + ((k / a.grid.nx | 0) + 0.5) * a.grid.cell;
        const d = Math.hypot(x2 - r.centroid[0], z - r.centroid[1]);
        if (d < bd) {
          bd = d;
          c = k;
          pos = [x2, z];
        }
      }
    }
    out.push({
      id: `hs-room${r.id}`,
      position: [pos[0], plan.level.elevation + 1.4, pos[1]],
      title: `Raum ${r.id + 1}`,
      text: "",
      facts: [`${plan.level.name.de}`, `Fl\xE4che ca. ${r.area.toLocaleString("de-AT")} m\xB2 (aus dem Modell gemessen)`],
      auto: true,
      level: r.level
    });
  }
  return out;
}

// scripts/dev/big-import.ts
var f = process.argv[2];
var fd2 = openSync(f, "r");
var size = fstatSync(fd2).size;
var src = { size, read: (o, l) => {
  const b = Buffer.alloc(Math.min(l, size - o));
  readSync(fd2, b, 0, b.length, o);
  return new Uint8Array(b.buffer, b.byteOffset, b.length);
} };
var mem = () => {
  const m = process.memoryUsage();
  return `heap ${m.heapUsed / 1e6 | 0} MB, total ${m.rss / 1e6 | 0} MB`;
};
var peak = 0;
var tick = setInterval(() => {
  peak = Math.max(peak, process.memoryUsage().rss);
}, 200);
var t0 = Date.now();
var lastP = "";
var onProgress = (fr, l) => {
  const s = `${l} ${Math.round(fr * 100)}%`;
  if (s !== lastP && Math.round(fr * 100) % 10 === 0) {
    lastP = s;
    console.log(`  ${((Date.now() - t0) / 1e3).toFixed(0)}s ${s} \xB7 ${mem()}`);
  }
};
var whole = () => src.read(0, size);
var model = /\.dxf$/i.test(f) ? importDxf(src, { onProgress }) : /\.3ds$/i.test(f) ? importTds(whole(), { onProgress }) : /\.skp$/i.test(f) ? importSkp(whole(), { onProgress }).model : importGltf(whole(), { onProgress }).model;
var t1 = Date.now();
console.log("import", (t1 - t0) / 1e3, "s \xB7 triangles", model.stats.triangles, "\xB7 ok", model.ok, "\xB7", mem(), "\xB7 warnings", model.warnings.map((w) => w.code).join(","));
console.log("bbox", JSON.stringify(model.bbox), "units", model.units.name);
console.log("layers", model.layers.length, "e.g.", model.layers.slice(0, 12).map((l) => `${l.name}(${l.triangleCount})`).join(", "));
var scene = prepareScene(model);
console.log("scene", (Date.now() - t1) / 1e3, "s \xB7 parts", scene.parts.length, "\xB7 levels", scene.analysis.levels.length, "\xB7", mem(), "\xB7 peak", Math.max(peak, process.memoryUsage().rss) / 1e6 | 0, "MB");
clearInterval(tick);
