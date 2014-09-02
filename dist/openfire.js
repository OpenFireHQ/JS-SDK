(function() {
    var BaseQueue, MemoryQueue, OpenFire, QueueEntry, __hasProp = {}.hasOwnProperty, __extends = function(child, parent) {
        for (var key in parent) {
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    };
    QueueEntry = function() {
        function QueueEntry(type, path, obj) {
            this.type = type;
            this.path = path;
            this.obj = obj;
        }
        return QueueEntry;
    }();
    OpenFire = function() {
        var log, randomString, uniqueID;
        log = function(msg) {
            var arg, arguments_, _i, _len;
            arguments_ = [ "OpenFire [SDK] -> " ];
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
            timestampBase64 = OpenFire.Base64.fromNumber(Math.round(new Date().getTime() / 1e3) - 1409682796);
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
            child = this.child("" + uniqueID());
            return child;
        };
        OpenFire.prototype.update = function(obj) {
            var po;
            po = OpenFire.parentObjects[this.baseUrl];
            return po.queue.push(new QueueEntry("update", this.path, obj));
        };
        OpenFire.prototype.set = function(obj) {
            var po;
            po = OpenFire.parentObjects[this.baseUrl];
            return po.queue.push(new QueueEntry("set", this.path, obj));
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
    }();
    window.OpenFire = OpenFire;
    BaseQueue = function() {
        BaseQueue.prototype.flushing = false;
        function BaseQueue(parent) {
            this.parent = parent;
        }
        BaseQueue.prototype.push = function() {
            throw new Error("Dont call BaseQueue directly!");
        };
        return BaseQueue;
    }();
    OpenFire.BaseQueue = BaseQueue;
    MemoryQueue = function(_super) {
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
            _flush = function(_this) {
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
            }(this);
            if (this.queue.length > 0) {
                this.flushing = true;
                return _flush();
            }
        };
        return MemoryQueue;
    }(OpenFire.BaseQueue);
    OpenFire.possibleQueues.push(MemoryQueue);
}).call(this);

OpenFire.Base64 = {
    _Rixits: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/",
    fromNumber: function(number) {
        if (isNaN(Number(number)) || number === null || number === Number.POSITIVE_INFINITY) throw "The input is not valid";
        if (number < 0) throw "Can't represent negative numbers now";
        var rixit;
        var residual = Math.floor(number);
        var result = "";
        while (true) {
            rixit = residual % 64;
            result = this._Rixits.charAt(rixit) + result;
            residual = Math.floor(residual / 64);
            if (residual == 0) break;
        }
        return result;
    },
    toNumber: function(rixits) {
        var result = 0;
        rixits = rixits.split("");
        for (e in rixits) {
            result = result * 64 + this._Rixits.indexOf(rixits[e]);
        }
        return result;
    }
};

(function(name, context, definition) {
    context[name] = definition.call(context);
    if (typeof module !== "undefined" && module.exports) {
        module.exports = context[name];
    } else if (typeof define == "function" && define.amd) {
        define(function reference() {
            return context[name];
        });
    }
})("OFRealtimeEngine", this, function OFRealtimeEngine() {
    "use strict";
    function EE(fn, context, once) {
        this.fn = fn;
        this.context = context;
        this.once = once || false;
    }
    function EventEmitter() {}
    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype.listeners = function listeners(event) {
        if (!this._events || !this._events[event]) return [];
        for (var i = 0, l = this._events[event].length, ee = []; i < l; i++) {
            ee.push(this._events[event][i].fn);
        }
        return ee;
    };
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
        if (!this._events || !this._events[event]) return false;
        var listeners = this._events[event], length = listeners.length, len = arguments.length, ee = listeners[0], args, i, j;
        if (1 === length) {
            if (ee.once) this.removeListener(event, ee.fn, true);
            switch (len) {
              case 1:
                return ee.fn.call(ee.context), true;

              case 2:
                return ee.fn.call(ee.context, a1), true;

              case 3:
                return ee.fn.call(ee.context, a1, a2), true;

              case 4:
                return ee.fn.call(ee.context, a1, a2, a3), true;

              case 5:
                return ee.fn.call(ee.context, a1, a2, a3, a4), true;

              case 6:
                return ee.fn.call(ee.context, a1, a2, a3, a4, a5), true;
            }
            for (i = 1, args = new Array(len - 1); i < len; i++) {
                args[i - 1] = arguments[i];
            }
            ee.fn.apply(ee.context, args);
        } else {
            for (i = 0; i < length; i++) {
                if (listeners[i].once) this.removeListener(event, listeners[i].fn, true);
                switch (len) {
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
                    if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                        args[j - 1] = arguments[j];
                    }
                    listeners[i].fn.apply(listeners[i].context, args);
                }
            }
        }
        return true;
    };
    EventEmitter.prototype.on = function on(event, fn, context) {
        if (!this._events) this._events = {};
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(new EE(fn, context || this));
        return this;
    };
    EventEmitter.prototype.once = function once(event, fn, context) {
        if (!this._events) this._events = {};
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(new EE(fn, context || this, true));
        return this;
    };
    EventEmitter.prototype.removeListener = function removeListener(event, fn, once) {
        if (!this._events || !this._events[event]) return this;
        var listeners = this._events[event], events = [];
        if (fn) for (var i = 0, length = listeners.length; i < length; i++) {
            if (listeners[i].fn !== fn && listeners[i].once !== once) {
                events.push(listeners[i]);
            }
        }
        if (events.length) this._events[event] = events; else this._events[event] = null;
        return this;
    };
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
        if (!this._events) return this;
        if (event) this._events[event] = null; else this._events = {};
        return this;
    };
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
        return this;
    };
    function context(self, method) {
        if (self instanceof OFRealtimeEngine) return;
        var failure = new Error("OFRealtimeEngine#" + method + "'s context should called with a Primus instance");
        if ("function" !== typeof self.listeners || !self.listeners("error").length) {
            throw failure;
        }
        self.emit("error", failure);
    }
    var defaultUrl;
    try {
        if (location.origin) {
            defaultUrl = location.origin;
        } else {
            defaultUrl = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "");
        }
    } catch (e) {
        defaultUrl = "http://127.0.0.1";
    }
    function OFRealtimeEngine(url, options) {
        if (!(this instanceof OFRealtimeEngine)) return new OFRealtimeEngine(url, options);
        if ("function" !== typeof this.client) {
            var message = "The client library has not been compiled correctly, " + "see https://github.com/primus/primus#client-library for more details";
            return this.critical(new Error(message));
        }
        if ("object" === typeof url) {
            options = url;
            url = options.url || options.uri || defaultUrl;
        } else {
            options = options || {};
        }
        var primus = this;
        options.queueSize = "queueSize" in options ? options.queueSize : Infinity;
        options.timeout = "timeout" in options ? options.timeout : 1e4;
        options.reconnect = "reconnect" in options ? options.reconnect : {};
        options.ping = "ping" in options ? options.ping : 25e3;
        options.pong = "pong" in options ? options.pong : 1e4;
        options.strategy = "strategy" in options ? options.strategy : [];
        options.transport = "transport" in options ? options.transport : {};
        primus.buffer = [];
        primus.writable = true;
        primus.readable = true;
        primus.url = primus.parse(url || defaultUrl);
        primus.readyState = OFRealtimeEngine.CLOSED;
        primus.options = options;
        primus.timers = {};
        primus.attempt = null;
        primus.socket = null;
        primus.latency = 0;
        primus.stamps = 0;
        primus.disconnect = false;
        primus.transport = options.transport;
        primus.transformers = {
            outgoing: [],
            incoming: []
        };
        if ("string" === typeof options.strategy) {
            options.strategy = options.strategy.split(/\s?\,\s?/g);
        }
        if (false === options.strategy) {
            options.strategy = [];
        } else if (!options.strategy.length) {
            options.strategy.push("disconnect", "online");
            if (!this.authorization) options.strategy.push("timeout");
        }
        options.strategy = options.strategy.join(",").toLowerCase();
        if (!Stream) EventEmitter.call(primus);
        if ("websockets" in options) {
            primus.AVOID_WEBSOCKETS = !options.websockets;
        }
        if ("network" in options) {
            primus.NETWORK_EVENTS = options.network;
        }
        if (!options.manual) primus.timers.open = setTimeout(function open() {
            primus.clearTimeout("open").open();
        }, 0);
        primus.initialise(options);
    }
    OFRealtimeEngine.require = function requires(name) {
        if ("function" !== typeof require) return undefined;
        return !("function" === typeof define && define.amd) ? require(name) : undefined;
    };
    var Stream, parse;
    try {
        OFRealtimeEngine.Stream = Stream = OFRealtimeEngine.require("stream");
        parse = OFRealtimeEngine.require("url").parse;
        OFRealtimeEngine.require("util").inherits(OFRealtimeEngine, Stream);
    } catch (e) {
        OFRealtimeEngine.Stream = EventEmitter;
        OFRealtimeEngine.prototype = new EventEmitter();
        parse = function parse(url) {
            var a = document.createElement("a"), data = {}, key;
            a.href = url;
            for (key in a) {
                if ("string" === typeof a[key] || "number" === typeof a[key]) {
                    data[key] = a[key];
                }
            }
            if (!data.port) {
                var splits = (data.href || "").split("/");
                if (splits.length > 2) {
                    var host = splits[2], atSignIndex = host.lastIndexOf("@");
                    if (~atSignIndex) host = host.slice(atSignIndex + 1);
                    splits = host.split(":");
                    if (splits.length === 2) data.port = splits[1];
                }
            }
            if (":" === data.protocol) {
                data.protocol = data.href.substr(0, data.href.indexOf(":") + 1);
            }
            if ("0" === data.port) data.port = "";
            if (~data.href.indexOf("@") && !data.auth) {
                var start = data.protocol.length + 2;
                data.auth = data.href.slice(start, data.href.indexOf(data.pathname, start)).split("@")[0];
            }
            return data;
        };
    }
    OFRealtimeEngine.OPENING = 1;
    OFRealtimeEngine.CLOSED = 2;
    OFRealtimeEngine.OPEN = 3;
    OFRealtimeEngine.prototype.AVOID_WEBSOCKETS = false;
    OFRealtimeEngine.prototype.NETWORK_EVENTS = false;
    OFRealtimeEngine.prototype.online = true;
    try {
        if (OFRealtimeEngine.prototype.NETWORK_EVENTS = "onLine" in navigator && (window.addEventListener || document.body.attachEvent)) {
            if (!navigator.onLine) {
                OFRealtimeEngine.prototype.online = false;
            }
        }
    } catch (e) {}
    OFRealtimeEngine.prototype.ark = {};
    OFRealtimeEngine.prototype.plugin = function plugin(name) {
        context(this, "plugin");
        if (name) return this.ark[name];
        var plugins = {};
        for (name in this.ark) {
            plugins[name] = this.ark[name];
        }
        return plugins;
    };
    OFRealtimeEngine.prototype.reserved = function reserved(evt) {
        return /^(incoming|outgoing)::/.test(evt) || evt in this.reserved.events;
    };
    OFRealtimeEngine.prototype.reserved.events = {
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
    };
    OFRealtimeEngine.prototype.initialise = function initialise(options) {
        var primus = this, start;
        primus.on("outgoing::open", function opening() {
            var readyState = primus.readyState;
            primus.readyState = OFRealtimeEngine.OPENING;
            if (readyState !== primus.readyState) {
                primus.emit("readyStateChange", "opening");
            }
            start = +new Date();
        });
        primus.on("incoming::open", function opened() {
            var readyState = primus.readyState, reconnect = primus.attempt;
            if (primus.attempt) primus.attempt = null;
            primus.writable = true;
            primus.readable = true;
            if (!primus.online) {
                primus.online = true;
                primus.emit("online");
            }
            primus.readyState = OFRealtimeEngine.OPEN;
            if (readyState !== primus.readyState) {
                primus.emit("readyStateChange", "open");
            }
            primus.latency = +new Date() - start;
            primus.emit("open");
            if (reconnect) primus.emit("reconnected");
            primus.clearTimeout("ping", "pong").heartbeat();
            if (primus.buffer.length) {
                for (var i = 0, length = primus.buffer.length; i < length; i++) {
                    primus._write(primus.buffer[i]);
                }
                primus.buffer = [];
            }
        });
        primus.on("incoming::pong", function pong(time) {
            primus.online = true;
            primus.clearTimeout("pong").heartbeat();
            primus.latency = +new Date() - time;
        });
        primus.on("incoming::error", function error(e) {
            var connect = primus.timers.connect, err = e;
            if (primus.attempt) return primus.reconnect();
            if ("string" === typeof e) {
                err = new Error(e);
            } else if (!(e instanceof Error) && "object" === typeof e) {
                err = new Error(e.message || e.reason);
                for (var key in e) {
                    if (e.hasOwnProperty(key)) err[key] = e[key];
                }
            }
            if (primus.listeners("error").length) primus.emit("error", err);
            if (connect) {
                if (~primus.options.strategy.indexOf("timeout")) primus.reconnect(); else primus.end();
            }
        });
        primus.on("incoming::data", function message(raw) {
            primus.decoder(raw, function decoding(err, data) {
                if (err) return primus.listeners("error").length && primus.emit("error", err);
                if (primus.protocol(data)) return;
                primus.transforms(primus, primus, "incoming", data, raw);
            });
        });
        primus.on("incoming::end", function end() {
            var readyState = primus.readyState;
            if (primus.disconnect) {
                primus.disconnect = false;
                return primus.end();
            }
            primus.readyState = OFRealtimeEngine.CLOSED;
            if (readyState !== primus.readyState) {
                primus.emit("readyStateChange", "end");
            }
            if (primus.timers.connect) primus.end();
            if (readyState !== OFRealtimeEngine.OPEN) return;
            this.writable = false;
            this.readable = false;
            for (var timeout in this.timers) {
                this.clearTimeout(timeout);
            }
            primus.emit("close");
            if (~primus.options.strategy.indexOf("disconnect")) {
                return primus.reconnect();
            }
            primus.emit("outgoing::end");
            primus.emit("end");
        });
        primus.client();
        for (var plugin in primus.ark) {
            primus.ark[plugin].call(primus, primus, options);
        }
        if (!primus.NETWORK_EVENTS) return primus;
        function offline() {
            if (!primus.online) return;
            primus.online = false;
            primus.emit("offline");
            primus.end();
        }
        function online() {
            if (primus.online) return;
            primus.online = true;
            primus.emit("online");
            if (~primus.options.strategy.indexOf("online")) primus.reconnect();
        }
        if (window.addEventListener) {
            window.addEventListener("offline", offline, false);
            window.addEventListener("online", online, false);
        } else if (document.body.attachEvent) {
            document.body.attachEvent("onoffline", offline);
            document.body.attachEvent("ononline", online);
        }
        return primus;
    };
    OFRealtimeEngine.prototype.protocol = function protocol(msg) {
        if ("string" !== typeof msg || msg.indexOf("primus::") !== 0) return false;
        var last = msg.indexOf(":", 8), value = msg.slice(last + 2);
        switch (msg.slice(8, last)) {
          case "pong":
            this.emit("incoming::pong", value);
            break;

          case "server":
            if ("close" === value) {
                this.disconnect = true;
            }
            break;

          case "id":
            this.emit("incoming::id", value);
            break;

          default:
            return false;
        }
        return true;
    };
    OFRealtimeEngine.prototype.transforms = function transforms(primus, connection, type, data, raw) {
        var packet = {
            data: data
        }, fns = primus.transformers[type];
        (function transform(index, done) {
            var transformer = fns[index++];
            if (!transformer) return done();
            if (1 === transformer.length) {
                if (false === transformer.call(connection, packet)) {
                    return;
                }
                return transform(index, done);
            }
            transformer.call(connection, packet, function finished(err, arg) {
                if (err) return connection.emit("error", err);
                if (false === arg) return;
                transform(index, done);
            });
        })(0, function done() {
            if ("incoming" === type) return connection.emit("data", packet.data, raw);
            connection._write(packet.data);
        });
        return this;
    };
    OFRealtimeEngine.prototype.id = function id(fn) {
        if (this.socket && this.socket.id) return fn(this.socket.id);
        this.write("primus::id::");
        return this.once("incoming::id", fn);
    };
    OFRealtimeEngine.prototype.open = function open() {
        context(this, "open");
        if (!this.attempt && this.options.timeout) this.timeout();
        this.emit("outgoing::open");
        return this;
    };
    OFRealtimeEngine.prototype.write = function write(data) {
        context(this, "write");
        this.transforms(this, this, "outgoing", data);
        return true;
    };
    OFRealtimeEngine.prototype._write = function write(data) {
        var primus = this;
        if (OFRealtimeEngine.OPEN !== primus.readyState) {
            if (this.buffer.length === this.options.queueSize) {
                this.buffer.splice(0, 1);
            }
            this.buffer.push(data);
            return false;
        }
        primus.encoder(data, function encoded(err, packet) {
            if (err) return primus.listeners("error").length && primus.emit("error", err);
            primus.emit("outgoing::data", packet);
        });
        return true;
    };
    OFRealtimeEngine.prototype.heartbeat = function heartbeat() {
        var primus = this;
        if (!primus.options.ping) return primus;
        function pong() {
            primus.clearTimeout("pong");
            if (!primus.online) return;
            primus.online = false;
            primus.emit("offline");
            primus.emit("incoming::end");
        }
        function ping() {
            var value = +new Date();
            primus.clearTimeout("ping").write("primus::ping::" + value);
            primus.emit("outgoing::ping", value);
            primus.timers.pong = setTimeout(pong, primus.options.pong);
        }
        primus.timers.ping = setTimeout(ping, primus.options.ping);
        return this;
    };
    OFRealtimeEngine.prototype.timeout = function timeout() {
        var primus = this;
        function remove() {
            primus.removeListener("error", remove).removeListener("open", remove).removeListener("end", remove).clearTimeout("connect");
        }
        primus.timers.connect = setTimeout(function expired() {
            remove();
            if (primus.readyState === OFRealtimeEngine.OPEN || primus.attempt) return;
            primus.emit("timeout");
            if (~primus.options.strategy.indexOf("timeout")) primus.reconnect(); else primus.end();
        }, primus.options.timeout);
        return primus.on("error", remove).on("open", remove).on("end", remove);
    };
    OFRealtimeEngine.prototype.clearTimeout = function clear() {
        for (var args = arguments, i = 0, l = args.length; i < l; i++) {
            if (this.timers[args[i]]) clearTimeout(this.timers[args[i]]);
            delete this.timers[args[i]];
        }
        return this;
    };
    OFRealtimeEngine.prototype.backoff = function backoff(callback, opts) {
        opts = opts || {};
        var primus = this;
        if (opts.backoff) return primus;
        opts.maxDelay = "maxDelay" in opts ? opts.maxDelay : Infinity;
        opts.minDelay = "minDelay" in opts ? opts.minDelay : 500;
        opts.retries = "retries" in opts ? opts.retries : 10;
        opts.attempt = (+opts.attempt || 0) + 1;
        opts.factor = "factor" in opts ? opts.factor : 2;
        if (opts.attempt > opts.retries) {
            callback(new Error("Unable to retry"), opts);
            return primus;
        }
        opts.backoff = true;
        opts.timeout = opts.attempt !== 1 ? Math.min(Math.round((Math.random() + 1) * opts.minDelay * Math.pow(opts.factor, opts.attempt)), opts.maxDelay) : opts.minDelay;
        primus.timers.reconnect = setTimeout(function delay() {
            opts.backoff = false;
            primus.clearTimeout("reconnect");
            callback(undefined, opts);
        }, opts.timeout);
        primus.emit("reconnecting", opts);
        return primus;
    };
    OFRealtimeEngine.prototype.reconnect = function reconnect() {
        var primus = this;
        primus.attempt = primus.attempt || primus.clone(primus.options.reconnect);
        primus.backoff(function attempt(fail, backoff) {
            if (fail) {
                primus.attempt = null;
                return primus.emit("end");
            }
            primus.emit("reconnect", backoff);
            primus.emit("outgoing::reconnect");
        }, primus.attempt);
        return primus;
    };
    OFRealtimeEngine.prototype.end = function end(data) {
        context(this, "end");
        if (this.readyState === OFRealtimeEngine.CLOSED && !this.timers.connect) {
            if (this.timers.reconnect) {
                this.clearTimeout("reconnect");
                this.attempt = null;
                this.emit("end");
            }
            return this;
        }
        if (data !== undefined) this.write(data);
        this.writable = false;
        this.readable = false;
        var readyState = this.readyState;
        this.readyState = OFRealtimeEngine.CLOSED;
        if (readyState !== this.readyState) {
            this.emit("readyStateChange", "end");
        }
        for (var timeout in this.timers) {
            this.clearTimeout(timeout);
        }
        this.emit("outgoing::end");
        this.emit("close");
        this.emit("end");
        return this;
    };
    OFRealtimeEngine.prototype.clone = function clone(obj) {
        return this.merge({}, obj);
    };
    OFRealtimeEngine.prototype.merge = function merge(target) {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0, l = args.length, key, obj; i < l; i++) {
            obj = args[i];
            for (key in obj) {
                if (obj.hasOwnProperty(key)) target[key] = obj[key];
            }
        }
        return target;
    };
    OFRealtimeEngine.prototype.parse = parse;
    OFRealtimeEngine.prototype.querystring = function querystring(query) {
        var parser = /([^=?&]+)=([^&]*)/g, result = {}, part;
        for (;part = parser.exec(query); result[decodeURIComponent(part[1])] = decodeURIComponent(part[2])) ;
        return result;
    };
    OFRealtimeEngine.prototype.querystringify = function querystringify(obj) {
        var pairs = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
            }
        }
        return pairs.join("&");
    };
    OFRealtimeEngine.prototype.uri = function uri(options) {
        var url = this.url, server = [], qsa = false;
        if (options.query) qsa = true;
        options = options || {};
        options.protocol = "protocol" in options ? options.protocol : "http";
        options.query = url.search && "query" in options ? url.search.charAt(0) === "?" ? url.search.slice(1) : url.search : false;
        options.secure = "secure" in options ? options.secure : url.protocol === "https:" || url.protocol === "wss:";
        options.auth = "auth" in options ? options.auth : url.auth;
        options.pathname = "pathname" in options ? options.pathname : this.pathname.slice(1);
        options.port = "port" in options ? +options.port : +url.port || (options.secure ? 443 : 80);
        options.host = "host" in options ? options.host : url.hostname || url.host.replace(":" + url.port, "");
        this.emit("outgoing::url", options);
        var host = 443 !== options.port && 80 !== options.port ? options.host + ":" + options.port : options.host;
        var querystring = this.querystring(options.query || "");
        querystring._primuscb = +new Date() + "-" + this.stamps++;
        options.query = this.querystringify(querystring);
        server.push(options.secure ? options.protocol + "s:" : options.protocol + ":", "");
        if (options.auth) server.push(options.auth + "@" + host); else server.push(host);
        if (options.pathname) server.push(options.pathname);
        if (qsa) server.push("?" + options.query); else delete options.query;
        if (options.object) return options;
        return server.join("/");
    };
    OFRealtimeEngine.prototype.emits = function emits(event, parser) {
        var primus = this;
        return function emit(arg) {
            var data = parser ? parser.apply(primus, arguments) : arg;
            setTimeout(function timeout() {
                primus.emit("incoming::" + event, data);
            }, 0);
        };
    };
    OFRealtimeEngine.prototype.transform = function transform(type, fn) {
        context(this, "transform");
        if (!(type in this.transformers)) {
            return this.critical(new Error("Invalid transformer type"));
        }
        this.transformers[type].push(fn);
        return this;
    };
    OFRealtimeEngine.prototype.critical = function critical(err) {
        if (this.listeners("error").length) {
            this.emit("error", err);
            return this;
        }
        throw err;
    };
    OFRealtimeEngine.connect = function connect(url, options) {
        return new OFRealtimeEngine(url, options);
    };
    OFRealtimeEngine.EventEmitter = EventEmitter;
    OFRealtimeEngine.prototype.client = function client() {
        var primus = this, socket;
        var Factory = function factory() {
            if ("undefined" !== typeof WebSocket) return WebSocket;
            if ("undefined" !== typeof MozWebSocket) return MozWebSocket;
            try {
                return Primus.require("faye-websocket").Client;
            } catch (e) {}
            return undefined;
        }();
        if (!Factory) return primus.critical(new Error("Missing required `faye-websocket` module. Please run `npm install --save faye-websocket`"));
        primus.on("outgoing::open", function opening() {
            if (socket) socket.close();
            try {
                if (Factory.length === 3) {
                    primus.socket = socket = new Factory(primus.uri({
                        protocol: "ws",
                        query: true
                    }), [], primus.transport);
                } else {
                    primus.socket = socket = new Factory(primus.uri({
                        protocol: "ws",
                        query: true
                    }));
                }
            } catch (e) {
                return primus.emit("error", e);
            }
            socket.binaryType = "arraybuffer";
            socket.onopen = primus.emits("open");
            socket.onerror = primus.emits("error");
            socket.onclose = primus.emits("end");
            socket.onmessage = primus.emits("data", function parse(evt) {
                return evt.data;
            });
        });
        primus.on("outgoing::data", function write(message) {
            if (!socket || socket.readyState !== 1) return;
            try {
                socket.send(message);
            } catch (e) {
                primus.emit("incoming::error", e);
            }
        });
        primus.on("outgoing::reconnect", function reconnect() {
            if (socket) primus.emit("outgoing::end");
            primus.emit("outgoing::open");
        });
        primus.on("outgoing::end", function close() {
            if (socket) {
                socket.onerror = socket.onopen = socket.onclose = socket.onmessage = null;
                socket.close();
                socket = null;
            }
        });
    };
    OFRealtimeEngine.prototype.authorization = false;
    OFRealtimeEngine.prototype.pathname = "/realtime";
    OFRealtimeEngine.prototype.encoder = function encoder(data, fn) {
        var err;
        try {
            data = JSON.stringify(data);
        } catch (e) {
            err = e;
        }
        fn(err, data);
    };
    OFRealtimeEngine.prototype.decoder = function decoder(data, fn) {
        var err;
        if ("string" !== typeof data) return fn(err, data);
        try {
            data = JSON.parse(data);
        } catch (e) {
            err = e;
        }
        fn(err, data);
    };
    OFRealtimeEngine.prototype.version = "2.4.4";
    if ("object" === typeof JSON && "function" === typeof JSON.stringify && JSON.stringify([ "\u2028\u2029" ]) === '["\u2028\u2029"]') {
        JSON.stringify = function replace(stringify) {
            var u2028 = /\u2028/g, u2029 = /\u2029/g;
            return function patched(value, replacer, spaces) {
                var result = stringify.call(this, value, replacer, spaces);
                if (result) {
                    if (~result.indexOf("\u2028")) result = result.replace(u2028, "\\u2028");
                    if (~result.indexOf("\u2029")) result = result.replace(u2029, "\\u2029");
                }
                return result;
            };
        }(JSON.stringify);
    }
    if ("undefined" !== typeof document && "undefined" !== typeof navigator) {
        if (document.addEventListener) {
            document.addEventListener("keydown", function keydown(e) {
                if (e.keyCode !== 27 || !e.preventDefault) return;
                e.preventDefault();
            }, false);
        }
        var ua = (navigator.userAgent || "").toLowerCase(), parsed = ua.match(/.+(?:rv|it|ra|ie)[\/: ](\d+)\.(\d+)(?:\.(\d+))?/) || [], version = +[ parsed[1], parsed[2] ].join(".");
        if (!~ua.indexOf("chrome") && ~ua.indexOf("safari") && version < 534.54) {
            OFRealtimeEngine.prototype.AVOID_WEBSOCKETS = true;
        }
    }
    return OFRealtimeEngine;
});