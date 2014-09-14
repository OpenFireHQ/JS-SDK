(function() {
    var BaseQueue, MemoryQueue, OpenFire, QueueEntry, Snapshot, __hasProp = {}.hasOwnProperty, __extends = function(child, parent) {
        function ctor() {
            this.constructor = child;
        }
        for (var key in parent) __hasProp.call(parent, key) && (child[key] = parent[key]);
        return ctor.prototype = parent.prototype, child.prototype = new ctor(), child.__super__ = parent.prototype, 
        child;
    };
    QueueEntry = function() {
        function QueueEntry(action, path, obj) {
            this.action = action, this.path = path, this.obj = obj;
        }
        return QueueEntry;
    }(), Snapshot = function() {
        function Snapshot(val, path, name) {
            this.val = val, this.path = path, this.name = name;
        }
        return Snapshot.prototype.childCount = function() {
            return null === this.val ? 0 : Object.keys(this.val).length;
        }, Snapshot;
    }(), OpenFire = function() {
        function OpenFire(url) {
            var parts, realtimeEngine;
            this.url = url, parts = this.url.split("/"), this.path = "/" + parts.slice(3, parts.length).join("/"), 
            this.baseUrl = parts.slice(0, 3).join("/"), this.connected = !1, !0 && log("Path: ", this.path), 
            po = OpenFire.parentObjects[this.baseUrl], null == po && (!0 && log("Starting OpenFire Connection..."), 
            po = {}, po.queue = new OpenFire.possibleQueues[0](this), po.events = {}, po.queue.intFlush = setInterval(function() {
                return po.queue.flushing ? void 0 : po.queue.flush();
            }, 1e3), !0 && log("base url: " + this.baseUrl), po.realtimeEngine = realtimeEngine = OFRealtimeEngine.connect(this.baseUrl, {}), 
            realtimeEngine.on("end", function(_this) {
                return function() {
                    return !0 && log("Disconnected from realtime server"), _this.connected = !1, _this.emitLocalEvent("disconnect", _this.path, null, null);
                };
            }(this)), realtimeEngine.on("open", function(_this) {
                return function() {
                    return !0 && log("Connected to realtime server"), _this.connected = !0, _this.emitLocalEvent("connect", _this.path, null, null), 
                    realtimeEngine.on("data", function(data) {
                        var action, name, obj, path, type;
                        return !0 && log("Got data ", JSON.stringify(data)), action = data.action, "data" === action ? (name = data.name, 
                        path = data.path, type = data.type, obj = data.obj, _this.emitLocalEvent(type, path, obj, name)) : void 0;
                    });
                };
            }(this)), OpenFire.parentObjects[this.baseUrl] = po), this.po = po;
        }
        var log, po, randomString, uniqueID;
        return po = null, OpenFire.possibleQueues = [], OpenFire.parentObjects = {}, 0 || !0 && (log = function() {
            var arg, arguments_, _i, _len;
            for (arguments_ = [ "OpenFire [SDK] -> " ], _i = 0, _len = arguments.length; _len > _i; _i++) arg = arguments[_i], 
            arguments_.push(arg);
            return console.log.apply(console, arguments_);
        }), randomString = function(length, chars) {
            var i, result;
            for (result = "", i = length; i > 0; ) result += chars[Math.round(Math.random() * (chars.length - 1))], 
            --i;
            return result;
        }, uniqueID = function() {
            var timestampBase36;
            return timestampBase36 = (Math.round(new Date().getTime() / 1e3) - 1409682796).toString(36), 
            timestampBase36 + randomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-_");
        }, OpenFire.prototype.child = function(path) {
            return path = this.path + "/" + path, !0 && log("child path: ", path), new OpenFire(this.baseUrl + path);
        }, OpenFire.prototype.name = function() {
            var lastPath, parts;
            return parts = this.path.split("/"), lastPath = parts.slice(parts.length - 1, parts.length).join("/");
        }, OpenFire.prototype.once = function(type, callback) {
            var cb;
            return cb = function(_this) {
                return function(snapshot) {
                    return _this.off(type, cb), callback(snapshot);
                };
            }(this), this.on(type, cb);
        }, OpenFire.prototype.off = function(type, callback) {
            var event, events, i, _i, _len;
            if (events = this.po.events["" + type + ":" + this.path], null != events) for (i = 0, 
            _i = 0, _len = events.length; _len > _i; _i++) {
                if (event = events[_i], event === callback) {
                    events.splice(i, 1);
                    break;
                }
                i++;
            }
            return null;
        }, OpenFire.prototype.on = function(type, callback) {
            var attrs, events;
            return attrs = {
                action: "sub",
                type: type,
                path: this.path
            }, events = this.po.events["" + type + ":" + this.path] || [], events.push(callback), 
            this.po.events["" + type + ":" + this.path] = events, "connect" === type ? void (this.connected && this.emitLocalEvent("connect", this.path, null, null)) : (this.po.realtimeEngine.write(attrs), 
            !0 && log("Created event for " + type + ":" + this.path));
        }, OpenFire.prototype.push = function() {
            var child;
            return child = this.child(uniqueID());
        }, OpenFire.prototype.update = function(obj) {
            return this.po.queue.push(new QueueEntry("update", this.path, obj));
        }, OpenFire.prototype.setAfterDisconnect = function(obj) {
            return this.set(obj, "afterDisconnect:");
        }, OpenFire.prototype.set = function(obj, prefix) {
            var lastPath, parts, previous, _obj;
            return null == prefix && (prefix = ""), null !== obj && "object" == typeof obj ? this.po.queue.push(new QueueEntry("set", this.path, obj)) : (parts = this.path.split("/"), 
            previous = parts.slice(0, parts.length - 1).join("/"), lastPath = parts.slice(parts.length - 1, parts.length).join("/"), 
            _obj = {}, _obj[lastPath] = obj, this.po.queue.push(new QueueEntry(prefix + "update", previous, _obj)), 
            this.po.queue.flush());
        }, OpenFire.prototype._set = function(obj, cb) {
            var action, path, _ref;
            return _ref = obj, action = _ref.action, obj = _ref.obj, path = _ref.path, this.po.realtimeEngine.write({
                action: action,
                obj: obj,
                path: path
            }), "set" === action && this.emitLocalEvent("value", path, obj), cb(null);
        }, OpenFire.prototype.emitLocalEvent = function(type, path, obj, name) {
            var event, events, snapshot, _i, _len;
            if (null == name && (name = null), events = this.po.events["" + type + ":" + path]) for (snapshot = new Snapshot(obj, path, name), 
            _i = 0, _len = events.length; _len > _i; _i++) (event = events[_i])(snapshot);
        }, OpenFire;
    }(), window.OpenFire = OpenFire, BaseQueue = function() {
        function BaseQueue(parent) {
            this.parent = parent;
        }
        return BaseQueue.prototype.flushing = !1, BaseQueue.prototype.push = function() {
            throw new Error("Dont call BaseQueue directly!");
        }, BaseQueue;
    }(), OpenFire.BaseQueue = BaseQueue, MemoryQueue = function(_super) {
        function MemoryQueue() {
            return MemoryQueue.__super__.constructor.apply(this, arguments);
        }
        return __extends(MemoryQueue, _super), MemoryQueue.prototype.queue = [], MemoryQueue.prototype.push = function(o) {
            return this.queue.push(o);
        }, MemoryQueue.prototype.flush = function() {
            var _flush;
            return _flush = function(_this) {
                return function() {
                    var entry;
                    return entry = _this.queue[0], _this.parent._set(entry, function() {
                        return _this.queue.splice(0, 1), _this.queue.length > 0 ? _flush() : _this.flushing = !1;
                    });
                };
            }(this), this.queue.length > 0 ? (this.flushing = !0, _flush()) : void 0;
        }, MemoryQueue;
    }(OpenFire.BaseQueue), OpenFire.possibleQueues.push(MemoryQueue);
}).call(this), function(name, context, definition) {
    context[name] = definition.call(context), "undefined" != typeof module && module.exports ? module.exports = context[name] : "function" == typeof define && define.amd && define(function() {
        return context[name];
    });
}("OFRealtimeEngine", this, function OFRealtimeEngine() {
    "use strict";
    function EE(fn, context, once) {
        this.fn = fn, this.context = context, this.once = once || !1;
    }
    function EventEmitter() {}
    function context(self, method) {
        if (!(self instanceof OFRealtimeEngine)) {
            var failure = new Error("OFRealtimeEngine#" + method + "'s context should called with a Primus instance");
            if ("function" != typeof self.listeners || !self.listeners("error").length) throw failure;
            self.emit("error", failure);
        }
    }
    function OFRealtimeEngine(url, options) {
        if (!(this instanceof OFRealtimeEngine)) return new OFRealtimeEngine(url, options);
        if ("function" != typeof this.client) {
            var message = "The client library has not been compiled correctly, see https://github.com/primus/primus#client-library for more details";
            return this.critical(new Error(message));
        }
        "object" == typeof url ? (options = url, url = options.url || options.uri || defaultUrl) : options = options || {};
        var primus = this;
        options.queueSize = "queueSize" in options ? options.queueSize : 1/0, options.timeout = "timeout" in options ? options.timeout : 1e4, 
        options.reconnect = "reconnect" in options ? options.reconnect : {}, options.ping = "ping" in options ? options.ping : 25e3, 
        options.pong = "pong" in options ? options.pong : 1e4, options.strategy = "strategy" in options ? options.strategy : [], 
        options.transport = "transport" in options ? options.transport : {}, primus.buffer = [], 
        primus.writable = !0, primus.readable = !0, primus.url = primus.parse(url || defaultUrl), 
        primus.readyState = OFRealtimeEngine.CLOSED, primus.options = options, primus.timers = {}, 
        primus.attempt = null, primus.socket = null, primus.latency = 0, primus.stamps = 0, 
        primus.disconnect = !1, primus.transport = options.transport, primus.transformers = {
            outgoing: [],
            incoming: []
        }, "string" == typeof options.strategy && (options.strategy = options.strategy.split(/\s?\,\s?/g)), 
        !1 === options.strategy ? options.strategy = [] : options.strategy.length || (options.strategy.push("disconnect", "online"), 
        this.authorization || options.strategy.push("timeout")), options.strategy = options.strategy.join(",").toLowerCase(), 
        Stream || EventEmitter.call(primus), "websockets" in options && (primus.AVOID_WEBSOCKETS = !options.websockets), 
        "network" in options && (primus.NETWORK_EVENTS = options.network), options.manual || (primus.timers.open = setTimeout(function() {
            primus.clearTimeout("open").open();
        }, 0)), primus.initialise(options);
    }
    EventEmitter.prototype._events = void 0, EventEmitter.prototype.listeners = function(event) {
        if (!this._events || !this._events[event]) return [];
        for (var i = 0, l = this._events[event].length, ee = []; l > i; i++) ee.push(this._events[event][i].fn);
        return ee;
    }, EventEmitter.prototype.emit = function(event, a1, a2, a3, a4, a5) {
        if (!this._events || !this._events[event]) return !1;
        var args, i, j, listeners = this._events[event], length = listeners.length, len = arguments.length, ee = listeners[0];
        if (1 === length) {
            switch (ee.once && this.removeListener(event, ee.fn, !0), len) {
              case 1:
                return ee.fn.call(ee.context), !0;

              case 2:
                return ee.fn.call(ee.context, a1), !0;

              case 3:
                return ee.fn.call(ee.context, a1, a2), !0;

              case 4:
                return ee.fn.call(ee.context, a1, a2, a3), !0;

              case 5:
                return ee.fn.call(ee.context, a1, a2, a3, a4), !0;

              case 6:
                return ee.fn.call(ee.context, a1, a2, a3, a4, a5), !0;
            }
            for (i = 1, args = new Array(len - 1); len > i; i++) args[i - 1] = arguments[i];
            ee.fn.apply(ee.context, args);
        } else for (i = 0; length > i; i++) switch (listeners[i].once && this.removeListener(event, listeners[i].fn, !0), 
        len) {
          case 1:
            listeners[i].fn.call(listeners[i].context);
            break;

          case 2:
            listeners[i].fn.call(listeners[i].context, a1);
            break;

          case 3:
            listeners[i].fn.call(listeners[i].context, a1, a2);
            break;

          default:
            if (!args) for (j = 1, args = new Array(len - 1); len > j; j++) args[j - 1] = arguments[j];
            listeners[i].fn.apply(listeners[i].context, args);
        }
        return !0;
    }, EventEmitter.prototype.on = function(event, fn, context) {
        return this._events || (this._events = {}), this._events[event] || (this._events[event] = []), 
        this._events[event].push(new EE(fn, context || this)), this;
    }, EventEmitter.prototype.once = function(event, fn, context) {
        return this._events || (this._events = {}), this._events[event] || (this._events[event] = []), 
        this._events[event].push(new EE(fn, context || this, !0)), this;
    }, EventEmitter.prototype.removeListener = function(event, fn, once) {
        if (!this._events || !this._events[event]) return this;
        var listeners = this._events[event], events = [];
        if (fn) for (var i = 0, length = listeners.length; length > i; i++) listeners[i].fn !== fn && listeners[i].once !== once && events.push(listeners[i]);
        return this._events[event] = events.length ? events : null, this;
    }, EventEmitter.prototype.removeAllListeners = function(event) {
        return this._events ? (event ? this._events[event] = null : this._events = {}, this) : this;
    }, EventEmitter.prototype.off = EventEmitter.prototype.removeListener, EventEmitter.prototype.addListener = EventEmitter.prototype.on, 
    EventEmitter.prototype.setMaxListeners = function() {
        return this;
    };
    var defaultUrl;
    try {
        defaultUrl = location.origin ? location.origin : location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "");
    } catch (e) {
        defaultUrl = "http://127.0.0.1";
    }
    OFRealtimeEngine.require = function(name) {
        return "function" != typeof require ? void 0 : "function" == typeof define && define.amd ? void 0 : require(name);
    };
    var Stream, parse;
    try {
        OFRealtimeEngine.Stream = Stream = OFRealtimeEngine.require("stream"), parse = OFRealtimeEngine.require("url").parse, 
        OFRealtimeEngine.require("util").inherits(OFRealtimeEngine, Stream);
    } catch (e) {
        OFRealtimeEngine.Stream = EventEmitter, OFRealtimeEngine.prototype = new EventEmitter(), 
        parse = function(url) {
            var key, a = document.createElement("a"), data = {};
            a.href = url;
            for (key in a) ("string" == typeof a[key] || "number" == typeof a[key]) && (data[key] = a[key]);
            if (!data.port) {
                var splits = (data.href || "").split("/");
                if (splits.length > 2) {
                    var host = splits[2], atSignIndex = host.lastIndexOf("@");
                    ~atSignIndex && (host = host.slice(atSignIndex + 1)), splits = host.split(":"), 
                    2 === splits.length && (data.port = splits[1]);
                }
            }
            if (":" === data.protocol && (data.protocol = data.href.substr(0, data.href.indexOf(":") + 1)), 
            "0" === data.port && (data.port = ""), ~data.href.indexOf("@") && !data.auth) {
                var start = data.protocol.length + 2;
                data.auth = data.href.slice(start, data.href.indexOf(data.pathname, start)).split("@")[0];
            }
            return data;
        };
    }
    OFRealtimeEngine.OPENING = 1, OFRealtimeEngine.CLOSED = 2, OFRealtimeEngine.OPEN = 3, 
    OFRealtimeEngine.prototype.AVOID_WEBSOCKETS = !1, OFRealtimeEngine.prototype.NETWORK_EVENTS = !1, 
    OFRealtimeEngine.prototype.online = !0;
    try {
        (OFRealtimeEngine.prototype.NETWORK_EVENTS = "onLine" in navigator && (window.addEventListener || document.body.attachEvent)) && (navigator.onLine || (OFRealtimeEngine.prototype.online = !1));
    } catch (e) {}
    if (OFRealtimeEngine.prototype.ark = {}, OFRealtimeEngine.prototype.plugin = function(name) {
        if (context(this, "plugin"), name) return this.ark[name];
        var plugins = {};
        for (name in this.ark) plugins[name] = this.ark[name];
        return plugins;
    }, OFRealtimeEngine.prototype.reserved = function(evt) {
        return /^(incoming|outgoing)::/.test(evt) || evt in this.reserved.events;
    }, OFRealtimeEngine.prototype.reserved.events = {
        readyStateChange: 1,
        reconnecting: 1,
        reconnected: 1,
        reconnect: 1,
        offline: 1,
        timeout: 1,
        online: 1,
        error: 1,
        close: 1,
        open: 1,
        data: 1,
        end: 1
    }, OFRealtimeEngine.prototype.initialise = function(options) {
        function offline() {
            primus.online && (primus.online = !1, primus.emit("offline"), primus.end());
        }
        function online() {
            primus.online || (primus.online = !0, primus.emit("online"), ~primus.options.strategy.indexOf("online") && primus.reconnect());
        }
        var start, primus = this;
        primus.on("outgoing::open", function() {
            var readyState = primus.readyState;
            primus.readyState = OFRealtimeEngine.OPENING, readyState !== primus.readyState && primus.emit("readyStateChange", "opening"), 
            start = +new Date();
        }), primus.on("incoming::open", function() {
            var readyState = primus.readyState, reconnect = primus.attempt;
            if (primus.attempt && (primus.attempt = null), primus.writable = !0, primus.readable = !0, 
            primus.online || (primus.online = !0, primus.emit("online")), primus.readyState = OFRealtimeEngine.OPEN, 
            readyState !== primus.readyState && primus.emit("readyStateChange", "open"), primus.latency = +new Date() - start, 
            primus.emit("open"), reconnect && primus.emit("reconnected"), primus.clearTimeout("ping", "pong").heartbeat(), 
            primus.buffer.length) {
                for (var i = 0, length = primus.buffer.length; length > i; i++) primus._write(primus.buffer[i]);
                primus.buffer = [];
            }
        }), primus.on("incoming::pong", function(time) {
            primus.online = !0, primus.clearTimeout("pong").heartbeat(), primus.latency = +new Date() - time;
        }), primus.on("incoming::error", function(e) {
            var connect = primus.timers.connect, err = e;
            if (primus.attempt) return primus.reconnect();
            if ("string" == typeof e) err = new Error(e); else if (!(e instanceof Error) && "object" == typeof e) {
                err = new Error(e.message || e.reason);
                for (var key in e) e.hasOwnProperty(key) && (err[key] = e[key]);
            }
            primus.listeners("error").length && primus.emit("error", err), connect && (~primus.options.strategy.indexOf("timeout") ? primus.reconnect() : primus.end());
        }), primus.on("incoming::data", function(raw) {
            primus.decoder(raw, function(err, data) {
                return err ? primus.listeners("error").length && primus.emit("error", err) : void (primus.protocol(data) || primus.transforms(primus, primus, "incoming", data, raw));
            });
        }), primus.on("incoming::end", function() {
            var readyState = primus.readyState;
            if (primus.disconnect) return primus.disconnect = !1, primus.end();
            if (primus.readyState = OFRealtimeEngine.CLOSED, readyState !== primus.readyState && primus.emit("readyStateChange", "end"), 
            primus.timers.connect && primus.end(), readyState === OFRealtimeEngine.OPEN) {
                this.writable = !1, this.readable = !1;
                for (var timeout in this.timers) this.clearTimeout(timeout);
                if (primus.emit("close"), ~primus.options.strategy.indexOf("disconnect")) return primus.reconnect();
                primus.emit("outgoing::end"), primus.emit("end");
            }
        }), primus.client();
        for (var plugin in primus.ark) primus.ark[plugin].call(primus, primus, options);
        return primus.NETWORK_EVENTS ? (window.addEventListener ? (window.addEventListener("offline", offline, !1), 
        window.addEventListener("online", online, !1)) : document.body.attachEvent && (document.body.attachEvent("onoffline", offline), 
        document.body.attachEvent("ononline", online)), primus) : primus;
    }, OFRealtimeEngine.prototype.protocol = function(msg) {
        if ("string" != typeof msg || 0 !== msg.indexOf("primus::")) return !1;
        var last = msg.indexOf(":", 8), value = msg.slice(last + 2);
        switch (msg.slice(8, last)) {
          case "pong":
            this.emit("incoming::pong", value);
            break;

          case "server":
            "close" === value && (this.disconnect = !0);
            break;

          case "id":
            this.emit("incoming::id", value);
            break;

          default:
            return !1;
        }
        return !0;
    }, OFRealtimeEngine.prototype.transforms = function(primus, connection, type, data, raw) {
        var packet = {
            data: data
        }, fns = primus.transformers[type];
        return function transform(index, done) {
            var transformer = fns[index++];
            if (!transformer) return done();
            if (1 === transformer.length) {
                if (!1 === transformer.call(connection, packet)) return;
                return transform(index, done);
            }
            transformer.call(connection, packet, function(err, arg) {
                return err ? connection.emit("error", err) : void (!1 !== arg && transform(index, done));
            });
        }(0, function() {
            return "incoming" === type ? connection.emit("data", packet.data, raw) : void connection._write(packet.data);
        }), this;
    }, OFRealtimeEngine.prototype.id = function(fn) {
        return this.socket && this.socket.id ? fn(this.socket.id) : (this.write("primus::id::"), 
        this.once("incoming::id", fn));
    }, OFRealtimeEngine.prototype.open = function() {
        return context(this, "open"), !this.attempt && this.options.timeout && this.timeout(), 
        this.emit("outgoing::open"), this;
    }, OFRealtimeEngine.prototype.write = function(data) {
        return context(this, "write"), this.transforms(this, this, "outgoing", data), !0;
    }, OFRealtimeEngine.prototype._write = function(data) {
        var primus = this;
        return OFRealtimeEngine.OPEN !== primus.readyState ? (this.buffer.length === this.options.queueSize && this.buffer.splice(0, 1), 
        this.buffer.push(data), !1) : (primus.encoder(data, function(err, packet) {
            return err ? primus.listeners("error").length && primus.emit("error", err) : void primus.emit("outgoing::data", packet);
        }), !0);
    }, OFRealtimeEngine.prototype.heartbeat = function() {
        function pong() {
            primus.clearTimeout("pong"), primus.online && (primus.online = !1, primus.emit("offline"), 
            primus.emit("incoming::end"));
        }
        function ping() {
            var value = +new Date();
            primus.clearTimeout("ping").write("primus::ping::" + value), primus.emit("outgoing::ping", value), 
            primus.timers.pong = setTimeout(pong, primus.options.pong);
        }
        var primus = this;
        return primus.options.ping ? (primus.timers.ping = setTimeout(ping, primus.options.ping), 
        this) : primus;
    }, OFRealtimeEngine.prototype.timeout = function() {
        function remove() {
            primus.removeListener("error", remove).removeListener("open", remove).removeListener("end", remove).clearTimeout("connect");
        }
        var primus = this;
        return primus.timers.connect = setTimeout(function() {
            remove(), primus.readyState === OFRealtimeEngine.OPEN || primus.attempt || (primus.emit("timeout"), 
            ~primus.options.strategy.indexOf("timeout") ? primus.reconnect() : primus.end());
        }, primus.options.timeout), primus.on("error", remove).on("open", remove).on("end", remove);
    }, OFRealtimeEngine.prototype.clearTimeout = function() {
        for (var args = arguments, i = 0, l = args.length; l > i; i++) this.timers[args[i]] && clearTimeout(this.timers[args[i]]), 
        delete this.timers[args[i]];
        return this;
    }, OFRealtimeEngine.prototype.backoff = function(callback, opts) {
        opts = opts || {};
        var primus = this;
        return opts.backoff ? primus : (opts.maxDelay = "maxDelay" in opts ? opts.maxDelay : 1/0, 
        opts.minDelay = "minDelay" in opts ? opts.minDelay : 500, opts.retries = "retries" in opts ? opts.retries : 10, 
        opts.attempt = (+opts.attempt || 0) + 1, opts.factor = "factor" in opts ? opts.factor : 2, 
        opts.attempt > opts.retries ? (callback(new Error("Unable to retry"), opts), primus) : (opts.backoff = !0, 
        opts.timeout = 1 !== opts.attempt ? Math.min(Math.round((Math.random() + 1) * opts.minDelay * Math.pow(opts.factor, opts.attempt)), opts.maxDelay) : opts.minDelay, 
        primus.timers.reconnect = setTimeout(function() {
            opts.backoff = !1, primus.clearTimeout("reconnect"), callback(void 0, opts);
        }, opts.timeout), primus.emit("reconnecting", opts), primus));
    }, OFRealtimeEngine.prototype.reconnect = function() {
        var primus = this;
        return primus.attempt = primus.attempt || primus.clone(primus.options.reconnect), 
        primus.backoff(function(fail, backoff) {
            return fail ? (primus.attempt = null, primus.emit("end")) : (primus.emit("reconnect", backoff), 
            void primus.emit("outgoing::reconnect"));
        }, primus.attempt), primus;
    }, OFRealtimeEngine.prototype.end = function(data) {
        if (context(this, "end"), this.readyState === OFRealtimeEngine.CLOSED && !this.timers.connect) return this.timers.reconnect && (this.clearTimeout("reconnect"), 
        this.attempt = null, this.emit("end")), this;
        void 0 !== data && this.write(data), this.writable = !1, this.readable = !1;
        var readyState = this.readyState;
        this.readyState = OFRealtimeEngine.CLOSED, readyState !== this.readyState && this.emit("readyStateChange", "end");
        for (var timeout in this.timers) this.clearTimeout(timeout);
        return this.emit("outgoing::end"), this.emit("close"), this.emit("end"), this;
    }, OFRealtimeEngine.prototype.clone = function(obj) {
        return this.merge({}, obj);
    }, OFRealtimeEngine.prototype.merge = function(target) {
        for (var key, obj, args = Array.prototype.slice.call(arguments, 1), i = 0, l = args.length; l > i; i++) {
            obj = args[i];
            for (key in obj) obj.hasOwnProperty(key) && (target[key] = obj[key]);
        }
        return target;
    }, OFRealtimeEngine.prototype.parse = parse, OFRealtimeEngine.prototype.querystring = function(query) {
        for (var part, parser = /([^=?&]+)=([^&]*)/g, result = {}; part = parser.exec(query); result[decodeURIComponent(part[1])] = decodeURIComponent(part[2])) ;
        return result;
    }, OFRealtimeEngine.prototype.querystringify = function(obj) {
        var pairs = [];
        for (var key in obj) obj.hasOwnProperty(key) && pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
        return pairs.join("&");
    }, OFRealtimeEngine.prototype.uri = function(options) {
        var url = this.url, server = [], qsa = !1;
        options.query && (qsa = !0), options = options || {}, options.protocol = "protocol" in options ? options.protocol : "http", 
        options.query = url.search && "query" in options ? "?" === url.search.charAt(0) ? url.search.slice(1) : url.search : !1, 
        options.secure = "secure" in options ? options.secure : "https:" === url.protocol || "wss:" === url.protocol, 
        options.auth = "auth" in options ? options.auth : url.auth, options.pathname = "pathname" in options ? options.pathname : this.pathname.slice(1), 
        options.port = "port" in options ? +options.port : +url.port || (options.secure ? 443 : 80), 
        options.host = "host" in options ? options.host : url.hostname || url.host.replace(":" + url.port, ""), 
        this.emit("outgoing::url", options);
        var host = 443 !== options.port && 80 !== options.port ? options.host + ":" + options.port : options.host, querystring = this.querystring(options.query || "");
        return querystring._primuscb = +new Date() + "-" + this.stamps++, options.query = this.querystringify(querystring), 
        server.push(options.secure ? options.protocol + "s:" : options.protocol + ":", ""), 
        server.push(options.auth ? options.auth + "@" + host : host), options.pathname && server.push(options.pathname), 
        qsa ? server.push("?" + options.query) : delete options.query, options.object ? options : server.join("/");
    }, OFRealtimeEngine.prototype.emits = function(event, parser) {
        var primus = this;
        return function(arg) {
            var data = parser ? parser.apply(primus, arguments) : arg;
            setTimeout(function() {
                primus.emit("incoming::" + event, data);
            }, 0);
        };
    }, OFRealtimeEngine.prototype.transform = function(type, fn) {
        return context(this, "transform"), type in this.transformers ? (this.transformers[type].push(fn), 
        this) : this.critical(new Error("Invalid transformer type"));
    }, OFRealtimeEngine.prototype.critical = function(err) {
        if (this.listeners("error").length) return this.emit("error", err), this;
        throw err;
    }, OFRealtimeEngine.connect = function(url, options) {
        return new OFRealtimeEngine(url, options);
    }, OFRealtimeEngine.EventEmitter = EventEmitter, OFRealtimeEngine.prototype.client = function() {
        var socket, primus = this, Factory = function() {
            if ("undefined" != typeof SockJS) return SockJS;
            try {
                return Primus.require("sockjs-client-node");
            } catch (e) {}
            return void 0;
        }();
        return Factory ? (primus.on("outgoing::open", function() {
            primus.emit("outgoing::end"), primus.socket = socket = new Factory(primus.uri({
                protocol: "http"
            }), null, primus.merge(primus.transport, {
                info: {
                    websocket: !primus.AVOID_WEBSOCKETS,
                    cookie_needed: !0
                }
            })), socket.onopen = primus.emits("open"), socket.onerror = primus.emits("error"), 
            socket.onclose = function(e) {
                var event = e && e.code > 1e3 ? "error" : "end";
                setTimeout(function() {
                    primus.emit("incoming::" + event, e);
                }, 0);
            }, socket.onmessage = primus.emits("data", function(evt) {
                return evt.data;
            });
        }), primus.on("outgoing::data", function(message) {
            socket && socket.send(message);
        }), primus.on("outgoing::reconnect", function() {
            primus.emit("outgoing::end"), primus.emit("outgoing::open");
        }), void primus.on("outgoing::end", function() {
            socket && (socket.onerror = socket.onopen = socket.onclose = socket.onmessage = function() {}, 
            socket.close(), socket = null);
        })) : primus.critical(new Error("Missing required `sockjs-client-node` module. Please run `npm install --save sockjs-client-node`"));
    }, OFRealtimeEngine.prototype.authorization = !1, OFRealtimeEngine.prototype.pathname = "/realtime", 
    OFRealtimeEngine.prototype.encoder = function(data, fn) {
        var err;
        try {
            data = JSON.stringify(data);
        } catch (e) {
            err = e;
        }
        fn(err, data);
    }, OFRealtimeEngine.prototype.decoder = function(data, fn) {
        var err;
        if ("string" != typeof data) return fn(err, data);
        try {
            data = JSON.parse(data);
        } catch (e) {
            err = e;
        }
        fn(err, data);
    }, OFRealtimeEngine.prototype.version = "2.4.4", "object" == typeof JSON && "function" == typeof JSON.stringify && '["\u2028\u2029"]' === JSON.stringify([ "\u2028\u2029" ]) && (JSON.stringify = function(stringify) {
        var u2028 = /\u2028/g, u2029 = /\u2029/g;
        return function(value, replacer, spaces) {
            var result = stringify.call(this, value, replacer, spaces);
            return result && (~result.indexOf("\u2028") && (result = result.replace(u2028, "\\u2028")), 
            ~result.indexOf("\u2029") && (result = result.replace(u2029, "\\u2029"))), result;
        };
    }(JSON.stringify)), "undefined" != typeof document && "undefined" != typeof navigator) {
        document.addEventListener && document.addEventListener("keydown", function(e) {
            27 === e.keyCode && e.preventDefault && e.preventDefault();
        }, !1);
        var ua = (navigator.userAgent || "").toLowerCase(), parsed = ua.match(/.+(?:rv|it|ra|ie)[\/: ](\d+)\.(\d+)(?:\.(\d+))?/) || [], version = +[ parsed[1], parsed[2] ].join(".");
        !~ua.indexOf("chrome") && ~ua.indexOf("safari") && 534.54 > version && (OFRealtimeEngine.prototype.AVOID_WEBSOCKETS = !0);
    }
    return OFRealtimeEngine;
});

var JSON;

JSON || (JSON = {}), function() {
    function str(a, b) {
        var c, d, e, f, h, g = gap, i = b[a];
        switch (i && "object" == typeof i && "function" == typeof i.toJSON && (i = i.toJSON(a)), 
        "function" == typeof rep && (i = rep.call(b, a, i)), typeof i) {
          case "string":
            return quote(i);

          case "number":
            return isFinite(i) ? String(i) : "null";

          case "boolean":
          case "null":
            return String(i);

          case "object":
            if (!i) return "null";
            if (gap += indent, h = [], "[object Array]" === Object.prototype.toString.apply(i)) {
                for (f = i.length, c = 0; f > c; c += 1) h[c] = str(c, i) || "null";
                return e = 0 === h.length ? "[]" : gap ? "[\n" + gap + h.join(",\n" + gap) + "\n" + g + "]" : "[" + h.join(",") + "]", 
                gap = g, e;
            }
            if (rep && "object" == typeof rep) for (f = rep.length, c = 0; f > c; c += 1) "string" == typeof rep[c] && (d = rep[c], 
            e = str(d, i), e && h.push(quote(d) + (gap ? ": " : ":") + e)); else for (d in i) Object.prototype.hasOwnProperty.call(i, d) && (e = str(d, i), 
            e && h.push(quote(d) + (gap ? ": " : ":") + e));
            return e = 0 === h.length ? "{}" : gap ? "{\n" + gap + h.join(",\n" + gap) + "\n" + g + "}" : "{" + h.join(",") + "}", 
            gap = g, e;
        }
    }
    function quote(a) {
        return escapable.lastIndex = 0, escapable.test(a) ? '"' + a.replace(escapable, function(a) {
            var b = meta[a];
            return "string" == typeof b ? b : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + a + '"';
    }
    function f(a) {
        return 10 > a ? "0" + a : a;
    }
    "function" != typeof Date.prototype.toJSON && (Date.prototype.toJSON = function() {
        return isFinite(this.valueOf()) ? this.getUTCFullYear() + "-" + f(this.getUTCMonth() + 1) + "-" + f(this.getUTCDate()) + "T" + f(this.getUTCHours()) + ":" + f(this.getUTCMinutes()) + ":" + f(this.getUTCSeconds()) + "Z" : null;
    }, String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function() {
        return this.valueOf();
    });
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta = {
        "\b": "\\b",
        "	": "\\t",
        "\n": "\\n",
        "\f": "\\f",
        "\r": "\\r",
        '"': '\\"',
        "\\": "\\\\"
    }, rep;
    "function" != typeof JSON.stringify && (JSON.stringify = function(a, b, c) {
        var d;
        if (gap = "", indent = "", "number" == typeof c) for (d = 0; c > d; d += 1) indent += " "; else "string" == typeof c && (indent = c);
        if (rep = b, !b || "function" == typeof b || "object" == typeof b && "number" == typeof b.length) return str("", {
            "": a
        });
        throw new Error("JSON.stringify");
    }), "function" != typeof JSON.parse && (JSON.parse = function(text, reviver) {
        function walk(a, b) {
            var c, d, e = a[b];
            if (e && "object" == typeof e) for (c in e) Object.prototype.hasOwnProperty.call(e, c) && (d = walk(e, c), 
            void 0 !== d ? e[c] = d : delete e[c]);
            return reviver.call(a, b, e);
        }
        var j;
        if (text = String(text), cx.lastIndex = 0, cx.test(text) && (text = text.replace(cx, function(a) {
            return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        })), /^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) return j = eval("(" + text + ")"), 
        "function" == typeof reviver ? walk({
            "": j
        }, "") : j;
        throw new SyntaxError("JSON.parse");
    });
}(), SockJS = function() {
    var _document = document, _window = window, utils = {}, REventTarget = function() {};
    REventTarget.prototype.addEventListener = function(eventType, listener) {
        this._listeners || (this._listeners = {}), eventType in this._listeners || (this._listeners[eventType] = []);
        var arr = this._listeners[eventType];
        -1 === utils.arrIndexOf(arr, listener) && arr.push(listener);
    }, REventTarget.prototype.removeEventListener = function(eventType, listener) {
        if (this._listeners && eventType in this._listeners) {
            var arr = this._listeners[eventType], idx = utils.arrIndexOf(arr, listener);
            return -1 !== idx ? void (arr.length > 1 ? this._listeners[eventType] = arr.slice(0, idx).concat(arr.slice(idx + 1)) : delete this._listeners[eventType]) : void 0;
        }
    }, REventTarget.prototype.dispatchEvent = function(event) {
        var t = event.type, args = Array.prototype.slice.call(arguments, 0);
        if (this["on" + t] && this["on" + t].apply(this, args), this._listeners && t in this._listeners) for (var i = 0; i < this._listeners[t].length; i++) this._listeners[t][i].apply(this, args);
    };
    var SimpleEvent = function(type, obj) {
        if (this.type = type, "undefined" != typeof obj) for (var k in obj) obj.hasOwnProperty(k) && (this[k] = obj[k]);
    };
    SimpleEvent.prototype.toString = function() {
        var r = [];
        for (var k in this) if (this.hasOwnProperty(k)) {
            var v = this[k];
            "function" == typeof v && (v = "[function]"), r.push(k + "=" + v);
        }
        return "SimpleEvent(" + r.join(", ") + ")";
    };
    var EventEmitter = function(events) {
        var that = this;
        that._events = events || [], that._listeners = {};
    };
    EventEmitter.prototype.emit = function(type) {
        var that = this;
        if (that._verifyType(type), !that._nuked) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (that["on" + type] && that["on" + type].apply(that, args), type in that._listeners) for (var i = 0; i < that._listeners[type].length; i++) that._listeners[type][i].apply(that, args);
        }
    }, EventEmitter.prototype.on = function(type, callback) {
        var that = this;
        that._verifyType(type), that._nuked || (type in that._listeners || (that._listeners[type] = []), 
        that._listeners[type].push(callback));
    }, EventEmitter.prototype._verifyType = function(type) {
        var that = this;
        -1 === utils.arrIndexOf(that._events, type) && utils.log("Event " + JSON.stringify(type) + " not listed " + JSON.stringify(that._events) + " in " + that);
    }, EventEmitter.prototype.nuke = function() {
        var that = this;
        that._nuked = !0;
        for (var i = 0; i < that._events.length; i++) delete that[that._events[i]];
        that._listeners = {};
    };
    var random_string_chars = "abcdefghijklmnopqrstuvwxyz0123456789_";
    utils.random_string = function(length, max) {
        max = max || random_string_chars.length;
        var i, ret = [];
        for (i = 0; length > i; i++) ret.push(random_string_chars.substr(Math.floor(Math.random() * max), 1));
        return ret.join("");
    }, utils.random_number = function(max) {
        return Math.floor(Math.random() * max);
    }, utils.random_number_string = function(max) {
        var t = ("" + (max - 1)).length, p = Array(t + 1).join("0");
        return (p + utils.random_number(max)).slice(-t);
    }, utils.getOrigin = function(url) {
        if (url.match(/^file:\/\//)) return null;
        var hostname, port, parts = url.split("/"), protocol = parts[0], host = parts[2], atSignIndex = host.lastIndexOf("@");
        return ~atSignIndex && (host = host.slice(atSignIndex + 1)), parts = host.split(":"), 
        hostname = parts[0], port = parts[1], port || (port = "https:" === protocol ? 443 : 80), 
        protocol + "//" + hostname + ":" + port;
    }, utils.isSameOriginUrl = function(url_a, url_b) {
        return url_b || (url_b = _window.location.href), utils.getOrigin(url_a) === utils.getOrigin(url_b);
    }, utils.getParentDomain = function(url) {
        if (/^[0-9.]*$/.test(url)) return url;
        if (/^\[/.test(url)) return url;
        if (!/[.]/.test(url)) return url;
        var parts = url.split(".").slice(1);
        return parts.join(".");
    }, utils.objectExtend = function(dst, src) {
        for (var k in src) src.hasOwnProperty(k) && (dst[k] = src[k]);
        return dst;
    };
    var WPrefix = "_jp";
    utils.polluteGlobalNamespace = function() {
        WPrefix in _window || (_window[WPrefix] = {});
    }, utils.closeFrame = function(code, reason) {
        return "c" + JSON.stringify([ code, reason ]);
    }, utils.userSetCode = function(code) {
        return 1e3 === code || code >= 3e3 && 4999 >= code;
    }, utils.countRTO = function(rtt) {
        return rtt > 100 ? 4 * rtt : 300 + rtt;
    }, utils.log = function() {
        _window.console && console.log && console.log.apply && console.log.apply(console, arguments);
    }, utils.bind = function(fun, that) {
        return fun.bind ? fun.bind(that) : function() {
            return fun.apply(that, arguments);
        };
    }, utils.flatUrl = function(url) {
        return -1 === url.indexOf("?") && -1 === url.indexOf("#");
    }, utils.amendUrl = function(url) {
        var dl = _document.location;
        if (!url) throw new Error("Wrong url for SockJS");
        if (!utils.flatUrl(url)) throw new Error("Only basic urls are supported in SockJS");
        return 0 === url.indexOf("//") && (url = dl.protocol + url), 0 === url.indexOf("/") && (url = dl.protocol + "//" + dl.host + url), 
        url = url.replace(/[/]+$/, "");
    }, utils.arrIndexOf = function(arr, obj) {
        for (var i = 0; i < arr.length; i++) if (arr[i] === obj) return i;
        return -1;
    }, utils.arrSkip = function(arr, obj) {
        var idx = utils.arrIndexOf(arr, obj);
        if (-1 === idx) return arr.slice();
        var dst = arr.slice(0, idx);
        return dst.concat(arr.slice(idx + 1));
    }, utils.isArray = Array.isArray || function(value) {
        return {}.toString.call(value).indexOf("Array") >= 0;
    }, utils.delay = function(t, fun) {
        return "function" == typeof t && (fun = t, t = 0), setTimeout(fun, t);
    };
    var extra_lookup, json_escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, json_lookup = {
        "\x00": "\\u0000",
        "": "\\u0001",
        "": "\\u0002",
        "": "\\u0003",
        "": "\\u0004",
        "": "\\u0005",
        "": "\\u0006",
        "": "\\u0007",
        "\b": "\\b",
        "	": "\\t",
        "\n": "\\n",
        "": "\\u000b",
        "\f": "\\f",
        "\r": "\\r",
        "": "\\u000e",
        "": "\\u000f",
        "": "\\u0010",
        "": "\\u0011",
        "": "\\u0012",
        "": "\\u0013",
        "": "\\u0014",
        "": "\\u0015",
        "": "\\u0016",
        "": "\\u0017",
        "": "\\u0018",
        "": "\\u0019",
        "": "\\u001a",
        "": "\\u001b",
        "": "\\u001c",
        "": "\\u001d",
        "": "\\u001e",
        "": "\\u001f",
        '"': '\\"',
        "\\": "\\\\",
        "": "\\u007f",
        "": "\\u0080",
        "": "\\u0081",
        "": "\\u0082",
        "": "\\u0083",
        "": "\\u0084",
        "": "\\u0085",
        "": "\\u0086",
        "": "\\u0087",
        "": "\\u0088",
        "": "\\u0089",
        "": "\\u008a",
        "": "\\u008b",
        "": "\\u008c",
        "": "\\u008d",
        "": "\\u008e",
        "": "\\u008f",
        "": "\\u0090",
        "": "\\u0091",
        "": "\\u0092",
        "": "\\u0093",
        "": "\\u0094",
        "": "\\u0095",
        "": "\\u0096",
        "": "\\u0097",
        "": "\\u0098",
        "": "\\u0099",
        "": "\\u009a",
        "": "\\u009b",
        "": "\\u009c",
        "": "\\u009d",
        "": "\\u009e",
        "": "\\u009f",
        "­": "\\u00ad",
        "؀": "\\u0600",
        "؁": "\\u0601",
        "؂": "\\u0602",
        "؃": "\\u0603",
        "؄": "\\u0604",
        "܏": "\\u070f",
        "឴": "\\u17b4",
        "឵": "\\u17b5",
        "‌": "\\u200c",
        "‍": "\\u200d",
        "‎": "\\u200e",
        "‏": "\\u200f",
        "\u2028": "\\u2028",
        "\u2029": "\\u2029",
        "‪": "\\u202a",
        "‫": "\\u202b",
        "‬": "\\u202c",
        "‭": "\\u202d",
        "‮": "\\u202e",
        " ": "\\u202f",
        "⁠": "\\u2060",
        "⁡": "\\u2061",
        "⁢": "\\u2062",
        "⁣": "\\u2063",
        "⁤": "\\u2064",
        "⁥": "\\u2065",
        "⁦": "\\u2066",
        "⁧": "\\u2067",
        "⁨": "\\u2068",
        "⁩": "\\u2069",
        "⁪": "\\u206a",
        "⁫": "\\u206b",
        "⁬": "\\u206c",
        "⁭": "\\u206d",
        "⁮": "\\u206e",
        "⁯": "\\u206f",
        "﻿": "\\ufeff",
        "￰": "\\ufff0",
        "￱": "\\ufff1",
        "￲": "\\ufff2",
        "￳": "\\ufff3",
        "￴": "\\ufff4",
        "￵": "\\ufff5",
        "￶": "\\ufff6",
        "￷": "\\ufff7",
        "￸": "\\ufff8",
        "￹": "\\ufff9",
        "￺": "\\ufffa",
        "￻": "\\ufffb",
        "￼": "\\ufffc",
        "�": "\\ufffd",
        "￾": "\\ufffe",
        "￿": "\\uffff"
    }, extra_escapable = /[\x00-\x1f\ud800-\udfff\ufffe\uffff\u0300-\u0333\u033d-\u0346\u034a-\u034c\u0350-\u0352\u0357-\u0358\u035c-\u0362\u0374\u037e\u0387\u0591-\u05af\u05c4\u0610-\u0617\u0653-\u0654\u0657-\u065b\u065d-\u065e\u06df-\u06e2\u06eb-\u06ec\u0730\u0732-\u0733\u0735-\u0736\u073a\u073d\u073f-\u0741\u0743\u0745\u0747\u07eb-\u07f1\u0951\u0958-\u095f\u09dc-\u09dd\u09df\u0a33\u0a36\u0a59-\u0a5b\u0a5e\u0b5c-\u0b5d\u0e38-\u0e39\u0f43\u0f4d\u0f52\u0f57\u0f5c\u0f69\u0f72-\u0f76\u0f78\u0f80-\u0f83\u0f93\u0f9d\u0fa2\u0fa7\u0fac\u0fb9\u1939-\u193a\u1a17\u1b6b\u1cda-\u1cdb\u1dc0-\u1dcf\u1dfc\u1dfe\u1f71\u1f73\u1f75\u1f77\u1f79\u1f7b\u1f7d\u1fbb\u1fbe\u1fc9\u1fcb\u1fd3\u1fdb\u1fe3\u1feb\u1fee-\u1fef\u1ff9\u1ffb\u1ffd\u2000-\u2001\u20d0-\u20d1\u20d4-\u20d7\u20e7-\u20e9\u2126\u212a-\u212b\u2329-\u232a\u2adc\u302b-\u302c\uaab2-\uaab3\uf900-\ufa0d\ufa10\ufa12\ufa15-\ufa1e\ufa20\ufa22\ufa25-\ufa26\ufa2a-\ufa2d\ufa30-\ufa6d\ufa70-\ufad9\ufb1d\ufb1f\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufb4e\ufff0-\uffff]/g, JSONQuote = JSON && JSON.stringify || function(string) {
        return json_escapable.lastIndex = 0, json_escapable.test(string) && (string = string.replace(json_escapable, function(a) {
            return json_lookup[a];
        })), '"' + string + '"';
    }, unroll_lookup = function(escapable) {
        var i, unrolled = {}, c = [];
        for (i = 0; 65536 > i; i++) c.push(String.fromCharCode(i));
        return escapable.lastIndex = 0, c.join("").replace(escapable, function(a) {
            return unrolled[a] = "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4), 
            "";
        }), escapable.lastIndex = 0, unrolled;
    };
    utils.quote = function(string) {
        var quoted = JSONQuote(string);
        return extra_escapable.lastIndex = 0, extra_escapable.test(quoted) ? (extra_lookup || (extra_lookup = unroll_lookup(extra_escapable)), 
        quoted.replace(extra_escapable, function(a) {
            return extra_lookup[a];
        })) : quoted;
    };
    var _all_protocols = [ "websocket", "xdr-streaming", "xhr-streaming", "iframe-eventsource", "iframe-htmlfile", "xdr-polling", "xhr-polling", "iframe-xhr-polling", "jsonp-polling" ];
    utils.probeProtocols = function() {
        for (var probed = {}, i = 0; i < _all_protocols.length; i++) {
            var protocol = _all_protocols[i];
            probed[protocol] = SockJS[protocol] && SockJS[protocol].enabled();
        }
        return probed;
    }, utils.detectProtocols = function(probed, protocols_whitelist, info) {
        var pe = {}, protocols = [];
        protocols_whitelist || (protocols_whitelist = _all_protocols);
        for (var i = 0; i < protocols_whitelist.length; i++) {
            var protocol = protocols_whitelist[i];
            pe[protocol] = probed[protocol];
        }
        var maybe_push = function(protos) {
            var proto = protos.shift();
            pe[proto] ? protocols.push(proto) : protos.length > 0 && maybe_push(protos);
        };
        return info.websocket !== !1 && maybe_push([ "websocket" ]), pe["xhr-streaming"] && !info.null_origin ? protocols.push("xhr-streaming") : !pe["xdr-streaming"] || info.cookie_needed || info.null_origin ? maybe_push([ "iframe-eventsource", "iframe-htmlfile" ]) : protocols.push("xdr-streaming"), 
        pe["xhr-polling"] && !info.null_origin ? protocols.push("xhr-polling") : !pe["xdr-polling"] || info.cookie_needed || info.null_origin ? maybe_push([ "iframe-xhr-polling", "jsonp-polling" ]) : protocols.push("xdr-polling"), 
        protocols;
    };
    var MPrefix = "_sockjs_global";
    utils.createHook = function() {
        var window_id = "a" + utils.random_string(8);
        if (!(MPrefix in _window)) {
            var map = {};
            _window[MPrefix] = function(window_id) {
                return window_id in map || (map[window_id] = {
                    id: window_id,
                    del: function() {
                        delete map[window_id];
                    }
                }), map[window_id];
            };
        }
        return _window[MPrefix](window_id);
    }, utils.attachMessage = function(listener) {
        utils.attachEvent("message", listener);
    }, utils.attachEvent = function(event, listener) {
        "undefined" != typeof _window.addEventListener ? _window.addEventListener(event, listener, !1) : (_document.attachEvent("on" + event, listener), 
        _window.attachEvent("on" + event, listener));
    }, utils.detachMessage = function(listener) {
        utils.detachEvent("message", listener);
    }, utils.detachEvent = function(event, listener) {
        "undefined" != typeof _window.addEventListener ? _window.removeEventListener(event, listener, !1) : (_document.detachEvent("on" + event, listener), 
        _window.detachEvent("on" + event, listener));
    };
    var on_unload = {}, after_unload = !1, trigger_unload_callbacks = function() {
        for (var ref in on_unload) on_unload[ref](), delete on_unload[ref];
    }, unload_triggered = function() {
        after_unload || (after_unload = !0, trigger_unload_callbacks());
    };
    utils.attachEvent("unload", unload_triggered), utils.unload_add = function(listener) {
        var ref = utils.random_string(8);
        return on_unload[ref] = listener, after_unload && utils.delay(trigger_unload_callbacks), 
        ref;
    }, utils.unload_del = function(ref) {
        ref in on_unload && delete on_unload[ref];
    }, utils.createIframe = function(iframe_url, error_callback) {
        var tref, unload_ref, iframe = _document.createElement("iframe"), unattach = function() {
            clearTimeout(tref);
            try {
                iframe.onload = null;
            } catch (x) {}
            iframe.onerror = null;
        }, cleanup = function() {
            iframe && (unattach(), setTimeout(function() {
                iframe && iframe.parentNode.removeChild(iframe), iframe = null;
            }, 0), utils.unload_del(unload_ref));
        }, onerror = function(r) {
            iframe && (cleanup(), error_callback(r));
        }, post = function(msg, origin) {
            try {
                iframe && iframe.contentWindow && iframe.contentWindow.postMessage(msg, origin);
            } catch (x) {}
        };
        return iframe.src = iframe_url, iframe.style.display = "none", iframe.style.position = "absolute", 
        iframe.onerror = function() {
            onerror("onerror");
        }, iframe.onload = function() {
            clearTimeout(tref), tref = setTimeout(function() {
                onerror("onload timeout");
            }, 2e3);
        }, _document.body.appendChild(iframe), tref = setTimeout(function() {
            onerror("timeout");
        }, 15e3), unload_ref = utils.unload_add(cleanup), {
            post: post,
            cleanup: cleanup,
            loaded: unattach
        };
    }, utils.createHtmlfile = function(iframe_url, error_callback) {
        var tref, unload_ref, iframe, doc = new ActiveXObject("htmlfile"), unattach = function() {
            clearTimeout(tref);
        }, cleanup = function() {
            doc && (unattach(), utils.unload_del(unload_ref), iframe.parentNode.removeChild(iframe), 
            iframe = doc = null, CollectGarbage());
        }, onerror = function(r) {
            doc && (cleanup(), error_callback(r));
        }, post = function(msg, origin) {
            try {
                iframe && iframe.contentWindow && iframe.contentWindow.postMessage(msg, origin);
            } catch (x) {}
        };
        doc.open(), doc.write('<html><script>document.domain="' + document.domain + '";</script></html>'), 
        doc.close(), doc.parentWindow[WPrefix] = _window[WPrefix];
        var c = doc.createElement("div");
        return doc.body.appendChild(c), iframe = doc.createElement("iframe"), c.appendChild(iframe), 
        iframe.src = iframe_url, tref = setTimeout(function() {
            onerror("timeout");
        }, 15e3), unload_ref = utils.unload_add(cleanup), {
            post: post,
            cleanup: cleanup,
            loaded: unattach
        };
    };
    var AbstractXHRObject = function() {};
    AbstractXHRObject.prototype = new EventEmitter([ "chunk", "finish" ]), AbstractXHRObject.prototype._start = function(method, url, payload, opts) {
        var that = this;
        try {
            that.xhr = new XMLHttpRequest();
        } catch (x) {}
        if (!that.xhr) try {
            that.xhr = new _window.ActiveXObject("Microsoft.XMLHTTP");
        } catch (x) {}
        (_window.ActiveXObject || _window.XDomainRequest) && (url += (-1 === url.indexOf("?") ? "?" : "&") + "t=" + +new Date()), 
        that.unload_ref = utils.unload_add(function() {
            that._cleanup(!0);
        });
        try {
            that.xhr.open(method, url, !0);
        } catch (e) {
            return that.emit("finish", 0, ""), void that._cleanup();
        }
        if (opts && opts.no_credentials || (that.xhr.withCredentials = "true"), opts && opts.headers) for (var key in opts.headers) that.xhr.setRequestHeader(key, opts.headers[key]);
        that.xhr.onreadystatechange = function() {
            if (that.xhr) {
                var x = that.xhr;
                switch (x.readyState) {
                  case 3:
                    try {
                        var status = x.status, text = x.responseText;
                    } catch (x) {}
                    1223 === status && (status = 204), text && text.length > 0 && that.emit("chunk", status, text);
                    break;

                  case 4:
                    var status = x.status;
                    1223 === status && (status = 204), that.emit("finish", status, x.responseText), 
                    that._cleanup(!1);
                }
            }
        }, that.xhr.send(payload);
    }, AbstractXHRObject.prototype._cleanup = function(abort) {
        var that = this;
        if (that.xhr) {
            if (utils.unload_del(that.unload_ref), that.xhr.onreadystatechange = function() {}, 
            abort) try {
                that.xhr.abort();
            } catch (x) {}
            that.unload_ref = that.xhr = null;
        }
    }, AbstractXHRObject.prototype.close = function() {
        var that = this;
        that.nuke(), that._cleanup(!0);
    };
    var XHRCorsObject = utils.XHRCorsObject = function() {
        var that = this, args = arguments;
        utils.delay(function() {
            that._start.apply(that, args);
        });
    };
    XHRCorsObject.prototype = new AbstractXHRObject();
    var XHRLocalObject = utils.XHRLocalObject = function(method, url, payload) {
        var that = this;
        utils.delay(function() {
            that._start(method, url, payload);
        });
    };
    XHRLocalObject.prototype = new AbstractXHRObject();
    var XDRObject = utils.XDRObject = function(method, url, payload) {
        var that = this;
        utils.delay(function() {
            that._start(method, url, payload);
        });
    };
    XDRObject.prototype = new EventEmitter([ "chunk", "finish" ]), XDRObject.prototype._start = function(method, url, payload) {
        var that = this, xdr = new XDomainRequest();
        url += (-1 === url.indexOf("?") ? "?" : "&") + "t=" + +new Date();
        var onerror = xdr.ontimeout = xdr.onerror = function() {
            that.emit("finish", 0, ""), that._cleanup(!1);
        };
        xdr.onprogress = function() {
            that.emit("chunk", 200, xdr.responseText);
        }, xdr.onload = function() {
            that.emit("finish", 200, xdr.responseText), that._cleanup(!1);
        }, that.xdr = xdr, that.unload_ref = utils.unload_add(function() {
            that._cleanup(!0);
        });
        try {
            that.xdr.open(method, url), that.xdr.send(payload);
        } catch (x) {
            onerror();
        }
    }, XDRObject.prototype._cleanup = function(abort) {
        var that = this;
        if (that.xdr) {
            if (utils.unload_del(that.unload_ref), that.xdr.ontimeout = that.xdr.onerror = that.xdr.onprogress = that.xdr.onload = null, 
            abort) try {
                that.xdr.abort();
            } catch (x) {}
            that.unload_ref = that.xdr = null;
        }
    }, XDRObject.prototype.close = function() {
        var that = this;
        that.nuke(), that._cleanup(!0);
    }, utils.isXHRCorsCapable = function() {
        if (_document.domain) {
            if (_window.XMLHttpRequest && "withCredentials" in new XMLHttpRequest()) return 1;
            if (_window.XDomainRequest) return 2;
        }
        return IframeTransport.enabled() ? 3 : 4;
    };
    var SockJS = function(url, dep_protocols_whitelist, options) {
        if (this === _window) return new SockJS(url, dep_protocols_whitelist, options);
        var protocols_whitelist, that = this;
        that._options = {
            devel: !1,
            debug: !1,
            protocols_whitelist: [],
            info: void 0,
            rtt: void 0
        }, options && utils.objectExtend(that._options, options), that._base_url = utils.amendUrl(url), 
        that._server = that._options.server || utils.random_number_string(1e3), that._options.protocols_whitelist && that._options.protocols_whitelist.length ? protocols_whitelist = that._options.protocols_whitelist : (protocols_whitelist = "string" == typeof dep_protocols_whitelist && dep_protocols_whitelist.length > 0 ? [ dep_protocols_whitelist ] : utils.isArray(dep_protocols_whitelist) ? dep_protocols_whitelist : null, 
        protocols_whitelist && that._debug('Deprecated API: Use "protocols_whitelist" option instead of supplying protocol list as a second parameter to SockJS constructor.')), 
        that._protocols = [], that.protocol = null, that.readyState = SockJS.CONNECTING, 
        that._ir = createInfoReceiver(that._base_url), that._ir.onfinish = function(info, rtt) {
            that._ir = null, info ? (that._options.info && (info = utils.objectExtend(info, that._options.info)), 
            that._options.rtt && (rtt = that._options.rtt), that._applyInfo(info, rtt, protocols_whitelist), 
            that._didClose()) : that._didClose(1002, "Can't connect to server", !0);
        };
    };
    SockJS.prototype = new REventTarget(), SockJS.version = "0.3.4", SockJS.CONNECTING = 0, 
    SockJS.OPEN = 1, SockJS.CLOSING = 2, SockJS.CLOSED = 3, SockJS.prototype._debug = function() {
        this._options.debug && utils.log.apply(utils, arguments);
    }, SockJS.prototype._dispatchOpen = function() {
        var that = this;
        that.readyState === SockJS.CONNECTING ? (that._transport_tref && (clearTimeout(that._transport_tref), 
        that._transport_tref = null), that.readyState = SockJS.OPEN, that.dispatchEvent(new SimpleEvent("open"))) : that._didClose(1006, "Server lost session");
    }, SockJS.prototype._dispatchMessage = function(data) {
        var that = this;
        that.readyState === SockJS.OPEN && that.dispatchEvent(new SimpleEvent("message", {
            data: data
        }));
    }, SockJS.prototype._dispatchHeartbeat = function() {
        var that = this;
        that.readyState === SockJS.OPEN && that.dispatchEvent(new SimpleEvent("heartbeat", {}));
    }, SockJS.prototype._didClose = function(code, reason, force) {
        var that = this;
        if (that.readyState !== SockJS.CONNECTING && that.readyState !== SockJS.OPEN && that.readyState !== SockJS.CLOSING) throw new Error("INVALID_STATE_ERR");
        that._ir && (that._ir.nuke(), that._ir = null), that._transport && (that._transport.doCleanup(), 
        that._transport = null);
        var close_event = new SimpleEvent("close", {
            code: code,
            reason: reason,
            wasClean: utils.userSetCode(code)
        });
        if (!utils.userSetCode(code) && that.readyState === SockJS.CONNECTING && !force) {
            if (that._try_next_protocol(close_event)) return;
            close_event = new SimpleEvent("close", {
                code: 2e3,
                reason: "All transports failed",
                wasClean: !1,
                last_event: close_event
            });
        }
        that.readyState = SockJS.CLOSED, utils.delay(function() {
            that.dispatchEvent(close_event);
        });
    }, SockJS.prototype._didMessage = function(data) {
        var that = this, type = data.slice(0, 1);
        switch (type) {
          case "o":
            that._dispatchOpen();
            break;

          case "a":
            for (var payload = JSON.parse(data.slice(1) || "[]"), i = 0; i < payload.length; i++) that._dispatchMessage(payload[i]);
            break;

          case "m":
            var payload = JSON.parse(data.slice(1) || "null");
            that._dispatchMessage(payload);
            break;

          case "c":
            var payload = JSON.parse(data.slice(1) || "[]");
            that._didClose(payload[0], payload[1]);
            break;

          case "h":
            that._dispatchHeartbeat();
        }
    }, SockJS.prototype._try_next_protocol = function(close_event) {
        var that = this;
        for (that.protocol && (that._debug("Closed transport:", that.protocol, "" + close_event), 
        that.protocol = null), that._transport_tref && (clearTimeout(that._transport_tref), 
        that._transport_tref = null); ;) {
            var protocol = that.protocol = that._protocols.shift();
            if (!protocol) return !1;
            if (SockJS[protocol] && SockJS[protocol].need_body === !0 && (!_document.body || "undefined" != typeof _document.readyState && "complete" !== _document.readyState)) return that._protocols.unshift(protocol), 
            that.protocol = "waiting-for-load", utils.attachEvent("load", function() {
                that._try_next_protocol();
            }), !0;
            if (SockJS[protocol] && SockJS[protocol].enabled(that._options)) {
                var roundTrips = SockJS[protocol].roundTrips || 1, to = (that._options.rto || 0) * roundTrips || 5e3;
                that._transport_tref = utils.delay(to, function() {
                    that.readyState === SockJS.CONNECTING && that._didClose(2007, "Transport timeouted");
                });
                var connid = utils.random_string(8), trans_url = that._base_url + "/" + that._server + "/" + connid;
                return that._debug("Opening transport:", protocol, " url:" + trans_url, " RTO:" + that._options.rto), 
                that._transport = new SockJS[protocol](that, trans_url, that._base_url), !0;
            }
            that._debug("Skipping transport:", protocol);
        }
    }, SockJS.prototype.close = function(code, reason) {
        var that = this;
        if (code && !utils.userSetCode(code)) throw new Error("INVALID_ACCESS_ERR");
        return that.readyState !== SockJS.CONNECTING && that.readyState !== SockJS.OPEN ? !1 : (that.readyState = SockJS.CLOSING, 
        that._didClose(code || 1e3, reason || "Normal closure"), !0);
    }, SockJS.prototype.send = function(data) {
        var that = this;
        if (that.readyState === SockJS.CONNECTING) throw new Error("INVALID_STATE_ERR");
        return that.readyState === SockJS.OPEN && that._transport.doSend(utils.quote("" + data)), 
        !0;
    }, SockJS.prototype._applyInfo = function(info, rtt, protocols_whitelist) {
        var that = this;
        that._options.info = info, that._options.rtt = rtt, that._options.rto = utils.countRTO(rtt), 
        that._options.info.null_origin = !_document.domain;
        var probed = utils.probeProtocols();
        that._protocols = utils.detectProtocols(probed, protocols_whitelist, info);
    };
    var WebSocketTransport = SockJS.websocket = function(ri, trans_url) {
        var that = this, url = trans_url + "/websocket";
        url = "https" === url.slice(0, 5) ? "wss" + url.slice(5) : "ws" + url.slice(4), 
        that.ri = ri, that.url = url;
        var Constructor = _window.WebSocket || _window.MozWebSocket;
        that.ws = new Constructor(that.url), that.ws.onmessage = function(e) {
            that.ri._didMessage(e.data);
        }, that.ws.onerror = function() {
            ri._didMessage(utils.closeFrame(1006, "WebSocket connection broken"));
        }, that.unload_ref = utils.unload_add(function() {
            that.ws.close();
        }), that.ws.onclose = function() {
            that.ri._didMessage(utils.closeFrame(1006, "WebSocket connection broken"));
        };
    };
    WebSocketTransport.prototype.doSend = function(data) {
        this.ws.send("[" + data + "]");
    }, WebSocketTransport.prototype.doCleanup = function() {
        var that = this, ws = that.ws;
        ws && (ws.onmessage = ws.onclose = ws.onerror = null, ws.close(), utils.unload_del(that.unload_ref), 
        that.unload_ref = that.ri = that.ws = null);
    }, WebSocketTransport.enabled = function() {
        return !(!_window.WebSocket && !_window.MozWebSocket);
    }, WebSocketTransport.roundTrips = 2;
    var BufferedSender = function() {};
    BufferedSender.prototype.send_constructor = function(sender) {
        var that = this;
        that.send_buffer = [], that.sender = sender;
    }, BufferedSender.prototype.doSend = function(message) {
        var that = this;
        that.send_buffer.push(message), that.send_stop || that.send_schedule();
    }, BufferedSender.prototype.send_schedule_wait = function() {
        var tref, that = this;
        that.send_stop = function() {
            that.send_stop = null, clearTimeout(tref);
        }, tref = utils.delay(25, function() {
            that.send_stop = null, that.send_schedule();
        });
    }, BufferedSender.prototype.send_schedule = function() {
        var that = this;
        if (that.send_buffer.length > 0) {
            var payload = "[" + that.send_buffer.join(",") + "]";
            that.send_stop = that.sender(that.trans_url, payload, function(success, abort_reason) {
                that.send_stop = null, success === !1 ? that.ri._didClose(1006, "Sending error " + abort_reason) : that.send_schedule_wait();
            }), that.send_buffer = [];
        }
    }, BufferedSender.prototype.send_destructor = function() {
        var that = this;
        that._send_stop && that._send_stop(), that._send_stop = null;
    };
    var jsonPGenericSender = function(url, payload, callback) {
        var that = this;
        if (!("_send_form" in that)) {
            var form = that._send_form = _document.createElement("form"), area = that._send_area = _document.createElement("textarea");
            area.name = "d", form.style.display = "none", form.style.position = "absolute", 
            form.method = "POST", form.enctype = "application/x-www-form-urlencoded", form.acceptCharset = "UTF-8", 
            form.appendChild(area), _document.body.appendChild(form);
        }
        var form = that._send_form, area = that._send_area, id = "a" + utils.random_string(8);
        form.target = id, form.action = url + "/jsonp_send?i=" + id;
        var iframe;
        try {
            iframe = _document.createElement('<iframe name="' + id + '">');
        } catch (x) {
            iframe = _document.createElement("iframe"), iframe.name = id;
        }
        iframe.id = id, form.appendChild(iframe), iframe.style.display = "none";
        try {
            area.value = payload;
        } catch (e) {
            utils.log("Your browser is seriously broken. Go home! " + e.message);
        }
        form.submit();
        var completed = function() {
            iframe.onerror && (iframe.onreadystatechange = iframe.onerror = iframe.onload = null, 
            utils.delay(500, function() {
                iframe.parentNode.removeChild(iframe), iframe = null;
            }), area.value = "", callback(!0));
        };
        return iframe.onerror = iframe.onload = completed, iframe.onreadystatechange = function() {
            "complete" == iframe.readyState && completed();
        }, completed;
    }, createAjaxSender = function(AjaxObject) {
        return function(url, payload, callback) {
            var xo = new AjaxObject("POST", url + "/xhr_send", payload);
            return xo.onfinish = function(status) {
                callback(200 === status || 204 === status, "http status " + status);
            }, function(abort_reason) {
                callback(!1, abort_reason);
            };
        };
    }, jsonPGenericReceiver = function(url, callback) {
        var tref, script2, script = _document.createElement("script"), close_script = function(frame) {
            script2 && (script2.parentNode.removeChild(script2), script2 = null), script && (clearTimeout(tref), 
            script.parentNode.removeChild(script), script.onreadystatechange = script.onerror = script.onload = script.onclick = null, 
            script = null, callback(frame), callback = null);
        }, loaded_okay = !1, error_timer = null;
        if (script.id = "a" + utils.random_string(8), script.src = url, script.type = "text/javascript", 
        script.charset = "UTF-8", script.onerror = function() {
            error_timer || (error_timer = setTimeout(function() {
                loaded_okay || close_script(utils.closeFrame(1006, "JSONP script loaded abnormally (onerror)"));
            }, 1e3));
        }, script.onload = function() {
            close_script(utils.closeFrame(1006, "JSONP script loaded abnormally (onload)"));
        }, script.onreadystatechange = function() {
            if (/loaded|closed/.test(script.readyState)) {
                if (script && script.htmlFor && script.onclick) {
                    loaded_okay = !0;
                    try {
                        script.onclick();
                    } catch (x) {}
                }
                script && close_script(utils.closeFrame(1006, "JSONP script loaded abnormally (onreadystatechange)"));
            }
        }, "undefined" == typeof script.async && _document.attachEvent) if (/opera/i.test(navigator.userAgent)) script2 = _document.createElement("script"), 
        script2.text = "try{var a = document.getElementById('" + script.id + "'); if(a)a.onerror();}catch(x){};", 
        script.async = script2.async = !1; else {
            try {
                script.htmlFor = script.id, script.event = "onclick";
            } catch (x) {}
            script.async = !0;
        }
        "undefined" != typeof script.async && (script.async = !0), tref = setTimeout(function() {
            close_script(utils.closeFrame(1006, "JSONP script loaded abnormally (timeout)"));
        }, 35e3);
        var head = _document.getElementsByTagName("head")[0];
        return head.insertBefore(script, head.firstChild), script2 && head.insertBefore(script2, head.firstChild), 
        close_script;
    }, JsonPTransport = SockJS["jsonp-polling"] = function(ri, trans_url) {
        utils.polluteGlobalNamespace();
        var that = this;
        that.ri = ri, that.trans_url = trans_url, that.send_constructor(jsonPGenericSender), 
        that._schedule_recv();
    };
    JsonPTransport.prototype = new BufferedSender(), JsonPTransport.prototype._schedule_recv = function() {
        var that = this, callback = function(data) {
            that._recv_stop = null, data && (that._is_closing || that.ri._didMessage(data)), 
            that._is_closing || that._schedule_recv();
        };
        that._recv_stop = jsonPReceiverWrapper(that.trans_url + "/jsonp", jsonPGenericReceiver, callback);
    }, JsonPTransport.enabled = function() {
        return !0;
    }, JsonPTransport.need_body = !0, JsonPTransport.prototype.doCleanup = function() {
        var that = this;
        that._is_closing = !0, that._recv_stop && that._recv_stop(), that.ri = that._recv_stop = null, 
        that.send_destructor();
    };
    var jsonPReceiverWrapper = function(url, constructReceiver, user_callback) {
        var id = "a" + utils.random_string(6), url_id = url + "?c=" + escape(WPrefix + "." + id), aborting = 0, callback = function(frame) {
            switch (aborting) {
              case 0:
                delete _window[WPrefix][id], user_callback(frame);
                break;

              case 1:
                user_callback(frame), aborting = 2;
                break;

              case 2:
                delete _window[WPrefix][id];
            }
        }, close_script = constructReceiver(url_id, callback);
        _window[WPrefix][id] = close_script;
        var stop = function() {
            _window[WPrefix][id] && (aborting = 1, _window[WPrefix][id](utils.closeFrame(1e3, "JSONP user aborted read")));
        };
        return stop;
    }, AjaxBasedTransport = function() {};
    AjaxBasedTransport.prototype = new BufferedSender(), AjaxBasedTransport.prototype.run = function(ri, trans_url, url_suffix, Receiver, AjaxObject) {
        var that = this;
        that.ri = ri, that.trans_url = trans_url, that.send_constructor(createAjaxSender(AjaxObject)), 
        that.poll = new Polling(ri, Receiver, trans_url + url_suffix, AjaxObject);
    }, AjaxBasedTransport.prototype.doCleanup = function() {
        var that = this;
        that.poll && (that.poll.abort(), that.poll = null);
    };
    var XhrStreamingTransport = SockJS["xhr-streaming"] = function(ri, trans_url) {
        this.run(ri, trans_url, "/xhr_streaming", XhrReceiver, utils.XHRCorsObject);
    };
    XhrStreamingTransport.prototype = new AjaxBasedTransport(), XhrStreamingTransport.enabled = function() {
        return _window.XMLHttpRequest && "withCredentials" in new XMLHttpRequest() && !/opera/i.test(navigator.userAgent);
    }, XhrStreamingTransport.roundTrips = 2, XhrStreamingTransport.need_body = !0;
    var XdrStreamingTransport = SockJS["xdr-streaming"] = function(ri, trans_url) {
        this.run(ri, trans_url, "/xhr_streaming", XhrReceiver, utils.XDRObject);
    };
    XdrStreamingTransport.prototype = new AjaxBasedTransport(), XdrStreamingTransport.enabled = function() {
        return !!_window.XDomainRequest;
    }, XdrStreamingTransport.roundTrips = 2;
    var XhrPollingTransport = SockJS["xhr-polling"] = function(ri, trans_url) {
        this.run(ri, trans_url, "/xhr", XhrReceiver, utils.XHRCorsObject);
    };
    XhrPollingTransport.prototype = new AjaxBasedTransport(), XhrPollingTransport.enabled = XhrStreamingTransport.enabled, 
    XhrPollingTransport.roundTrips = 2;
    var XdrPollingTransport = SockJS["xdr-polling"] = function(ri, trans_url) {
        this.run(ri, trans_url, "/xhr", XhrReceiver, utils.XDRObject);
    };
    XdrPollingTransport.prototype = new AjaxBasedTransport(), XdrPollingTransport.enabled = XdrStreamingTransport.enabled, 
    XdrPollingTransport.roundTrips = 2;
    var IframeTransport = function() {};
    IframeTransport.prototype.i_constructor = function(ri, trans_url, base_url) {
        var that = this;
        that.ri = ri, that.origin = utils.getOrigin(base_url), that.base_url = base_url, 
        that.trans_url = trans_url;
        var iframe_url = base_url + "/iframe.html";
        that.ri._options.devel && (iframe_url += "?t=" + +new Date()), that.window_id = utils.random_string(8), 
        iframe_url += "#" + that.window_id, that.iframeObj = utils.createIframe(iframe_url, function(r) {
            that.ri._didClose(1006, "Unable to load an iframe (" + r + ")");
        }), that.onmessage_cb = utils.bind(that.onmessage, that), utils.attachMessage(that.onmessage_cb);
    }, IframeTransport.prototype.doCleanup = function() {
        var that = this;
        if (that.iframeObj) {
            utils.detachMessage(that.onmessage_cb);
            try {
                that.iframeObj.iframe.contentWindow && that.postMessage("c");
            } catch (x) {}
            that.iframeObj.cleanup(), that.iframeObj = null, that.onmessage_cb = that.iframeObj = null;
        }
    }, IframeTransport.prototype.onmessage = function(e) {
        var that = this;
        if (utils.isSameOriginUrl(e.origin, that.origin)) {
            var window_id = e.data.slice(0, 8), type = e.data.slice(8, 9), data = e.data.slice(9);
            if (window_id === that.window_id) switch (type) {
              case "s":
                that.iframeObj.loaded(), that.postMessage("s", JSON.stringify([ SockJS.version, that.protocol, that.trans_url, that.base_url ]));
                break;

              case "t":
                that.ri._didMessage(data);
            }
        }
    }, IframeTransport.prototype.postMessage = function(type, data) {
        var that = this;
        that.iframeObj.post(that.window_id + type + (data || ""), that.origin);
    }, IframeTransport.prototype.doSend = function(message) {
        this.postMessage("m", message);
    }, IframeTransport.enabled = function() {
        var konqueror = navigator && navigator.userAgent && -1 !== navigator.userAgent.indexOf("Konqueror");
        return ("function" == typeof _window.postMessage || "object" == typeof _window.postMessage) && !konqueror;
    };
    var curr_window_id, postMessage = function(type, data) {
        parent !== _window ? parent.postMessage(curr_window_id + type + (data || ""), "*") : utils.log("Can't postMessage, no parent window.", type, data);
    }, FacadeJS = function() {};
    FacadeJS.prototype._didClose = function(code, reason) {
        postMessage("t", utils.closeFrame(code, reason));
    }, FacadeJS.prototype._didMessage = function(frame) {
        postMessage("t", frame);
    }, FacadeJS.prototype._doSend = function(data) {
        this._transport.doSend(data);
    }, FacadeJS.prototype._doCleanup = function() {
        this._transport.doCleanup();
    }, utils.parent_origin = void 0, SockJS.bootstrap_iframe = function() {
        var facade;
        curr_window_id = _document.location.hash.slice(1);
        var onMessage = function(e) {
            if (e.source === parent && ("undefined" == typeof utils.parent_origin && (utils.parent_origin = e.origin), 
            e.origin === utils.parent_origin)) {
                var window_id = e.data.slice(0, 8), type = e.data.slice(8, 9), data = e.data.slice(9);
                if (window_id === curr_window_id) switch (type) {
                  case "s":
                    var p = JSON.parse(data), version = p[0], protocol = p[1], trans_url = p[2], base_url = p[3];
                    if (version !== SockJS.version && utils.log('Incompatibile SockJS! Main site uses: "' + version + '", the iframe: "' + SockJS.version + '".'), 
                    !utils.flatUrl(trans_url) || !utils.flatUrl(base_url)) return void utils.log("Only basic urls are supported in SockJS");
                    if (!utils.isSameOriginUrl(trans_url) || !utils.isSameOriginUrl(base_url)) return void utils.log("Can't connect to different domain from within an iframe. (" + JSON.stringify([ _window.location.href, trans_url, base_url ]) + ")");
                    facade = new FacadeJS(), facade._transport = new FacadeJS[protocol](facade, trans_url, base_url);
                    break;

                  case "m":
                    facade._doSend(data);
                    break;

                  case "c":
                    facade && facade._doCleanup(), facade = null;
                }
            }
        };
        utils.attachMessage(onMessage), postMessage("s");
    };
    var InfoReceiver = function(base_url, AjaxObject) {
        var that = this;
        utils.delay(function() {
            that.doXhr(base_url, AjaxObject);
        });
    };
    InfoReceiver.prototype = new EventEmitter([ "finish" ]), InfoReceiver.prototype.doXhr = function(base_url, AjaxObject) {
        var that = this, t0 = new Date().getTime(), xo = new AjaxObject("GET", base_url + "/info"), tref = utils.delay(8e3, function() {
            xo.ontimeout();
        });
        xo.onfinish = function(status, text) {
            if (clearTimeout(tref), tref = null, 200 === status) {
                var rtt = new Date().getTime() - t0, info = JSON.parse(text);
                "object" != typeof info && (info = {}), that.emit("finish", info, rtt);
            } else that.emit("finish");
        }, xo.ontimeout = function() {
            xo.close(), that.emit("finish");
        };
    };
    var InfoReceiverIframe = function(base_url) {
        var that = this, go = function() {
            var ifr = new IframeTransport();
            ifr.protocol = "w-iframe-info-receiver";
            var fun = function(r) {
                if ("string" == typeof r && "m" === r.substr(0, 1)) {
                    var d = JSON.parse(r.substr(1)), info = d[0], rtt = d[1];
                    that.emit("finish", info, rtt);
                } else that.emit("finish");
                ifr.doCleanup(), ifr = null;
            }, mock_ri = {
                _options: {},
                _didClose: fun,
                _didMessage: fun
            };
            ifr.i_constructor(mock_ri, base_url, base_url);
        };
        _document.body ? go() : utils.attachEvent("load", go);
    };
    InfoReceiverIframe.prototype = new EventEmitter([ "finish" ]);
    var InfoReceiverFake = function() {
        var that = this;
        utils.delay(function() {
            that.emit("finish", {}, 2e3);
        });
    };
    InfoReceiverFake.prototype = new EventEmitter([ "finish" ]);
    var createInfoReceiver = function(base_url) {
        if (utils.isSameOriginUrl(base_url)) return new InfoReceiver(base_url, utils.XHRLocalObject);
        switch (utils.isXHRCorsCapable()) {
          case 1:
            return new InfoReceiver(base_url, utils.XHRLocalObject);

          case 2:
            return new InfoReceiver(base_url, utils.XDRObject);

          case 3:
            return new InfoReceiverIframe(base_url);

          default:
            return new InfoReceiverFake();
        }
    }, WInfoReceiverIframe = FacadeJS["w-iframe-info-receiver"] = function(ri, _trans_url, base_url) {
        var ir = new InfoReceiver(base_url, utils.XHRLocalObject);
        ir.onfinish = function(info, rtt) {
            ri._didMessage("m" + JSON.stringify([ info, rtt ])), ri._didClose();
        };
    };
    WInfoReceiverIframe.prototype.doCleanup = function() {};
    var EventSourceIframeTransport = SockJS["iframe-eventsource"] = function() {
        var that = this;
        that.protocol = "w-iframe-eventsource", that.i_constructor.apply(that, arguments);
    };
    EventSourceIframeTransport.prototype = new IframeTransport(), EventSourceIframeTransport.enabled = function() {
        return "EventSource" in _window && IframeTransport.enabled();
    }, EventSourceIframeTransport.need_body = !0, EventSourceIframeTransport.roundTrips = 3;
    var EventSourceTransport = FacadeJS["w-iframe-eventsource"] = function(ri, trans_url) {
        this.run(ri, trans_url, "/eventsource", EventSourceReceiver, utils.XHRLocalObject);
    };
    EventSourceTransport.prototype = new AjaxBasedTransport();
    var XhrPollingIframeTransport = SockJS["iframe-xhr-polling"] = function() {
        var that = this;
        that.protocol = "w-iframe-xhr-polling", that.i_constructor.apply(that, arguments);
    };
    XhrPollingIframeTransport.prototype = new IframeTransport(), XhrPollingIframeTransport.enabled = function() {
        return _window.XMLHttpRequest && IframeTransport.enabled();
    }, XhrPollingIframeTransport.need_body = !0, XhrPollingIframeTransport.roundTrips = 3;
    var XhrPollingITransport = FacadeJS["w-iframe-xhr-polling"] = function(ri, trans_url) {
        this.run(ri, trans_url, "/xhr", XhrReceiver, utils.XHRLocalObject);
    };
    XhrPollingITransport.prototype = new AjaxBasedTransport();
    var HtmlFileIframeTransport = SockJS["iframe-htmlfile"] = function() {
        var that = this;
        that.protocol = "w-iframe-htmlfile", that.i_constructor.apply(that, arguments);
    };
    HtmlFileIframeTransport.prototype = new IframeTransport(), HtmlFileIframeTransport.enabled = function() {
        return IframeTransport.enabled();
    }, HtmlFileIframeTransport.need_body = !0, HtmlFileIframeTransport.roundTrips = 3;
    var HtmlFileTransport = FacadeJS["w-iframe-htmlfile"] = function(ri, trans_url) {
        this.run(ri, trans_url, "/htmlfile", HtmlfileReceiver, utils.XHRLocalObject);
    };
    HtmlFileTransport.prototype = new AjaxBasedTransport();
    var Polling = function(ri, Receiver, recv_url, AjaxObject) {
        var that = this;
        that.ri = ri, that.Receiver = Receiver, that.recv_url = recv_url, that.AjaxObject = AjaxObject, 
        that._scheduleRecv();
    };
    Polling.prototype._scheduleRecv = function() {
        var that = this, poll = that.poll = new that.Receiver(that.recv_url, that.AjaxObject), msg_counter = 0;
        poll.onmessage = function(e) {
            msg_counter += 1, that.ri._didMessage(e.data);
        }, poll.onclose = function(e) {
            that.poll = poll = poll.onmessage = poll.onclose = null, that.poll_is_closing || ("permanent" === e.reason ? that.ri._didClose(1006, "Polling error (" + e.reason + ")") : that._scheduleRecv());
        };
    }, Polling.prototype.abort = function() {
        var that = this;
        that.poll_is_closing = !0, that.poll && that.poll.abort();
    };
    var EventSourceReceiver = function(url) {
        var that = this, es = new EventSource(url);
        es.onmessage = function(e) {
            that.dispatchEvent(new SimpleEvent("message", {
                data: unescape(e.data)
            }));
        }, that.es_close = es.onerror = function(e, abort_reason) {
            var reason = abort_reason ? "user" : 2 !== es.readyState ? "network" : "permanent";
            that.es_close = es.onmessage = es.onerror = null, es.close(), es = null, utils.delay(200, function() {
                that.dispatchEvent(new SimpleEvent("close", {
                    reason: reason
                }));
            });
        };
    };
    EventSourceReceiver.prototype = new REventTarget(), EventSourceReceiver.prototype.abort = function() {
        var that = this;
        that.es_close && that.es_close({}, !0);
    };
    var _is_ie_htmlfile_capable, isIeHtmlfileCapable = function() {
        if (void 0 === _is_ie_htmlfile_capable) if ("ActiveXObject" in _window) try {
            _is_ie_htmlfile_capable = !!new ActiveXObject("htmlfile");
        } catch (x) {} else _is_ie_htmlfile_capable = !1;
        return _is_ie_htmlfile_capable;
    }, HtmlfileReceiver = function(url) {
        var that = this;
        utils.polluteGlobalNamespace(), that.id = "a" + utils.random_string(6, 26), url += (-1 === url.indexOf("?") ? "?" : "&") + "c=" + escape(WPrefix + "." + that.id);
        var iframeObj, constructor = isIeHtmlfileCapable() ? utils.createHtmlfile : utils.createIframe;
        _window[WPrefix][that.id] = {
            start: function() {
                iframeObj.loaded();
            },
            message: function(data) {
                that.dispatchEvent(new SimpleEvent("message", {
                    data: data
                }));
            },
            stop: function() {
                that.iframe_close({}, "network");
            }
        }, that.iframe_close = function(e, abort_reason) {
            iframeObj.cleanup(), that.iframe_close = iframeObj = null, delete _window[WPrefix][that.id], 
            that.dispatchEvent(new SimpleEvent("close", {
                reason: abort_reason
            }));
        }, iframeObj = constructor(url, function() {
            that.iframe_close({}, "permanent");
        });
    };
    HtmlfileReceiver.prototype = new REventTarget(), HtmlfileReceiver.prototype.abort = function() {
        var that = this;
        that.iframe_close && that.iframe_close({}, "user");
    };
    var XhrReceiver = function(url, AjaxObject) {
        var that = this, buf_pos = 0;
        that.xo = new AjaxObject("POST", url, null), that.xo.onchunk = function(status, text) {
            if (200 === status) for (;;) {
                var buf = text.slice(buf_pos), p = buf.indexOf("\n");
                if (-1 === p) break;
                buf_pos += p + 1;
                var msg = buf.slice(0, p);
                that.dispatchEvent(new SimpleEvent("message", {
                    data: msg
                }));
            }
        }, that.xo.onfinish = function(status, text) {
            that.xo.onchunk(status, text), that.xo = null;
            var reason = 200 === status ? "network" : "permanent";
            that.dispatchEvent(new SimpleEvent("close", {
                reason: reason
            }));
        };
    };
    return XhrReceiver.prototype = new REventTarget(), XhrReceiver.prototype.abort = function() {
        var that = this;
        that.xo && (that.xo.close(), that.dispatchEvent(new SimpleEvent("close", {
            reason: "user"
        })), that.xo = null);
    }, SockJS.getUtils = function() {
        return utils;
    }, SockJS.getIframeTransport = function() {
        return IframeTransport;
    }, SockJS;
}(), "_sockjs_onload" in window && setTimeout(_sockjs_onload, 1), "function" == typeof define && define.amd && define("sockjs", [], function() {
    return SockJS;
});