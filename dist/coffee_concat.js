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
      return randomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-_");
    };

    OpenFire.possibleQueues = [];

    OpenFire.parentObjects = null;

    OpenFire.prototype.child = function(path) {
      path = this.path + "/" + path;
      log("child path: ", path);
      return new OpenFire(OpenFire.parentObjects.base + path);
    };

    OpenFire.prototype.push = function() {
      var child, po;
      po = OpenFire.parentObjects;
      child = this.child("" + (uniqueID()));
      return child;
    };

    OpenFire.prototype.set = function(obj) {
      var po;
      po = OpenFire.parentObjects;
      po.queue.push(new QueueEntry('set', this.path, obj));
      return po.queue.flush();
    };

    OpenFire.prototype._set = function(obj, cb) {
      OpenFire.parentObjects.realtimeEngine.write({
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
      log("Path: ", this.path);
      po = OpenFire.parentObjects;
      if (po === null) {
        po = {};
        po.queue = new OpenFire.possibleQueues[0](this);
        po.base = parts.slice(0, 3).join("/");
        log("base url: " + po.base);
        po.realtimeEngine = OFRealtimeEngine.connect(po.base, {});
        po.realtimeEngine.on("connection", function(con) {
          return log("Connected to realtime server");
        });
        OpenFire.parentObjects = po;
      }
    }

    return OpenFire;

  })();

  window.OpenFire = OpenFire;

  BaseQueue = (function() {
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
      var entry, _i, _len, _ref;
      _ref = this.queue;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entry = _ref[_i];
        this.parent._set(entry, function() {});
      }
      return this.queue.length = [];
    };

    return MemoryQueue;

  })(OpenFire.BaseQueue);

  OpenFire.possibleQueues.push(MemoryQueue);

}).call(this);
