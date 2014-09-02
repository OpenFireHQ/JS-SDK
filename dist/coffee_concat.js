(function() {
  var BaseQueue, MemoryQueue, OpenFire, QueueEntry,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  QueueEntry = (function() {
    function QueueEntry(type, path, obj) {
      this.type = type;
      this.path = path;
      this.obj = obj;
    }

    return QueueEntry;

  })();

  OpenFire = (function() {
    var log, randomString, uniqueID;

    log = function(msg) {
      var arg, arguments_, _i, _len;
      arguments_ = ['OpenFire [SDK] -> '];
      for (_i = 0, _len = arguments.length; _i < _len; _i++) {
        arg = arguments[_i];
        arguments_.push(arg);
      }
      return console.log.apply(console, arguments_);
    };

    randomString = function(length, chars) {
      var i, result;
      result = "";
      i = length;
      while (i > 0) {
        result += chars[Math.round(Math.random() * (chars.length - 1))];
        --i;
      }
      return result;
    };

    uniqueID = function() {
      var timestampBase64;
      timestampBase64 = OpenFire.Base64.fromNumber(Math.round(new Date().getTime() / 1000) - 1409682796);
      return timestampBase64 + randomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-_");
    };

    OpenFire.possibleQueues = [];

    OpenFire.parentObjects = {};

    OpenFire.prototype.child = function(path) {
      path = this.path + "/" + path;
      log("child path: ", path);
      return new OpenFire(this.baseUrl + path);
    };

    OpenFire.prototype.push = function() {
      var child, po;
      po = OpenFire.parentObjects[this.baseUrl];
      child = this.child("" + (uniqueID()));
      return child;
    };

    OpenFire.prototype.update = function(obj) {
      var po;
      po = OpenFire.parentObjects[this.baseUrl];
      return po.queue.push(new QueueEntry('update', this.path, obj));
    };

    OpenFire.prototype.set = function(obj) {
      var po;
      po = OpenFire.parentObjects[this.baseUrl];
      return po.queue.push(new QueueEntry('set', this.path, obj));
    };

    OpenFire.prototype._set = function(obj, cb) {
      OpenFire.parentObjects[this.baseUrl].realtimeEngine.write({
        type: obj.type,
        obj: obj.obj,
        path: obj.path
      });
      return cb(null);
    };

    function OpenFire(url) {
      var parts, po;
      this.url = url;
      parts = this.url.split("/");
      this.path = "/" + parts.slice(3, parts.length).join("/");
      this.baseUrl = parts.slice(0, 3).join("/");
      log("Starting OpenFire Connection...");
      log("Path: ", this.path);
      po = OpenFire.parentObjects[this.baseUrl];
      if (po == null) {
        po = {};
        po.queue = new OpenFire.possibleQueues[0](this);
        po.queue.intFlush = setInterval(function() {
          if (!po.queue.flushing) {
            return po.queue.flush();
          }
        }, 500);
        log("base url: " + this.baseUrl);
        po.realtimeEngine = OFRealtimeEngine.connect(this.baseUrl, {});
        po.realtimeEngine.on("connection", function(con) {
          return log("Connected to realtime server");
        });
        OpenFire.parentObjects[this.baseUrl] = po;
      }
    }

    return OpenFire;

  })();

  window.OpenFire = OpenFire;

  BaseQueue = (function() {
    BaseQueue.prototype.flushing = false;

    function BaseQueue(parent) {
      this.parent = parent;
    }

    BaseQueue.prototype.push = function() {
      throw new Error("Dont call BaseQueue directly!");
    };

    return BaseQueue;

  })();

  OpenFire.BaseQueue = BaseQueue;

  MemoryQueue = (function(_super) {
    __extends(MemoryQueue, _super);

    function MemoryQueue() {
      return MemoryQueue.__super__.constructor.apply(this, arguments);
    }

    MemoryQueue.prototype.queue = [];

    MemoryQueue.prototype.push = function(o) {
      return this.queue.push(o);
    };

    MemoryQueue.prototype.flush = function() {
      var _flush;
      _flush = (function(_this) {
        return function() {
          var entry;
          entry = _this.queue[0];
          return _this.parent._set(entry, function() {
            _this.queue.splice(0, 1);
            if (_this.queue.length > 0) {
              return setTimeout(function() {
                return _flush();
              }, 10);
            } else {
              return _this.flushing = false;
            }
          });
        };
      })(this);
      if (this.queue.length > 0) {
        this.flushing = true;
        return _flush();
      }
    };

    return MemoryQueue;

  })(OpenFire.BaseQueue);

  OpenFire.possibleQueues.push(MemoryQueue);

}).call(this);
