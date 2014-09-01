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
        var factory = function factory() {
            if ("undefined" !== typeof eio) return eio;
            try {
                return Primus.require("engine.io-client");
            } catch (e) {}
            return undefined;
        }();
        if (!factory) return primus.critical(new Error("Missing required `engine.io-client` module. Please run `npm install --save engine.io-client`"));
        primus.on("outgoing::open", function opening() {
            primus.emit("outgoing::end");
            primus.socket = socket = factory(primus.merge(primus.transport, primus.url, primus.uri({
                protocol: "http",
                query: true,
                object: true
            }), {
                rememberUpgrade: false,
                forceBase64: true,
                enablesXDR: false,
                timestampRequests: true,
                path: this.pathname,
                transports: !primus.AVOID_WEBSOCKETS ? [ "polling", "websocket" ] : [ "polling" ]
            }));
            if (factory.sockets && factory.sockets.length) {
                factory.sockets.length = 0;
            }
            socket.on("open", primus.emits("open"));
            socket.on("error", primus.emits("error"));
            socket.on("close", primus.emits("end"));
            socket.on("message", primus.emits("data"));
        });
        primus.on("outgoing::data", function write(message) {
            if (socket) socket.send(message);
        });
        primus.on("outgoing::reconnect", function reconnect() {
            if (socket) {
                socket.close();
                socket.open();
            } else {
                primus.emit("outgoing::open");
            }
        });
        primus.on("outgoing::end", function close() {
            if (socket) {
                socket.removeAllListeners();
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

(function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == "function" && require;
                if (!u && a) return a(o, !0);
                if (i) return i(o, !0);
                throw new Error("Cannot find module '" + o + "'");
            }
            var f = n[o] = {
                exports: {}
            };
            t[o][0].call(f.exports, function(e) {
                var n = t[o][1][e];
                return s(n ? n : e);
            }, f, f.exports, e, t, n, r);
        }
        return n[o].exports;
    }
    var i = typeof require == "function" && require;
    for (var o = 0; o < r.length; o++) s(r[o]);
    return s;
})({
    1: [ function(_dereq_, module, exports) {
        self["eio"] = _dereq_("./index.js");
    }, {
        "./index.js": 2
    } ],
    2: [ function(_dereq_, module, exports) {
        module.exports = _dereq_("./lib/");
    }, {
        "./lib/": 3
    } ],
    3: [ function(_dereq_, module, exports) {
        module.exports = _dereq_("./socket");
        module.exports.parser = _dereq_("engine.io-parser");
    }, {
        "./socket": 4,
        "engine.io-parser": 15
    } ],
    4: [ function(_dereq_, module, exports) {
        (function(global) {
            var transports = _dereq_("./transports");
            var Emitter = _dereq_("component-emitter");
            var debug = _dereq_("debug")("engine.io-client:socket");
            var index = _dereq_("indexof");
            var parser = _dereq_("engine.io-parser");
            var parseuri = _dereq_("parseuri");
            var parsejson = _dereq_("parsejson");
            var parseqs = _dereq_("parseqs");
            module.exports = Socket;
            function noop() {}
            function Socket(uri, opts) {
                if (!(this instanceof Socket)) return new Socket(uri, opts);
                opts = opts || {};
                if (uri && "object" == typeof uri) {
                    opts = uri;
                    uri = null;
                }
                if (uri) {
                    uri = parseuri(uri);
                    opts.host = uri.host;
                    opts.secure = uri.protocol == "https" || uri.protocol == "wss";
                    opts.port = uri.port;
                    if (uri.query) opts.query = uri.query;
                }
                this.secure = null != opts.secure ? opts.secure : global.location && "https:" == location.protocol;
                if (opts.host) {
                    var pieces = opts.host.split(":");
                    opts.hostname = pieces.shift();
                    if (pieces.length) opts.port = pieces.pop();
                }
                this.agent = opts.agent || false;
                this.hostname = opts.hostname || (global.location ? location.hostname : "localhost");
                this.port = opts.port || (global.location && location.port ? location.port : this.secure ? 443 : 80);
                this.query = opts.query || {};
                if ("string" == typeof this.query) this.query = parseqs.decode(this.query);
                this.upgrade = false !== opts.upgrade;
                this.path = (opts.path || "/engine.io").replace(/\/$/, "") + "/";
                this.forceJSONP = !!opts.forceJSONP;
                this.forceBase64 = !!opts.forceBase64;
                this.timestampParam = opts.timestampParam || "t";
                this.timestampRequests = opts.timestampRequests;
                this.transports = opts.transports || [ "polling", "websocket" ];
                this.readyState = "";
                this.writeBuffer = [];
                this.callbackBuffer = [];
                this.policyPort = opts.policyPort || 843;
                this.rememberUpgrade = opts.rememberUpgrade || false;
                this.open();
                this.binaryType = null;
                this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
            }
            Socket.priorWebsocketSuccess = false;
            Emitter(Socket.prototype);
            Socket.protocol = parser.protocol;
            Socket.Socket = Socket;
            Socket.Transport = _dereq_("./transport");
            Socket.transports = _dereq_("./transports");
            Socket.parser = _dereq_("engine.io-parser");
            Socket.prototype.createTransport = function(name) {
                debug('creating transport "%s"', name);
                var query = clone(this.query);
                query.EIO = parser.protocol;
                query.transport = name;
                if (this.id) query.sid = this.id;
                var transport = new transports[name]({
                    agent: this.agent,
                    hostname: this.hostname,
                    port: this.port,
                    secure: this.secure,
                    path: this.path,
                    query: query,
                    forceJSONP: this.forceJSONP,
                    forceBase64: this.forceBase64,
                    timestampRequests: this.timestampRequests,
                    timestampParam: this.timestampParam,
                    policyPort: this.policyPort,
                    socket: this
                });
                return transport;
            };
            function clone(obj) {
                var o = {};
                for (var i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        o[i] = obj[i];
                    }
                }
                return o;
            }
            Socket.prototype.open = function() {
                var transport;
                if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf("websocket") != -1) {
                    transport = "websocket";
                } else {
                    transport = this.transports[0];
                }
                this.readyState = "opening";
                var transport = this.createTransport(transport);
                transport.open();
                this.setTransport(transport);
            };
            Socket.prototype.setTransport = function(transport) {
                debug("setting transport %s", transport.name);
                var self = this;
                if (this.transport) {
                    debug("clearing existing transport %s", this.transport.name);
                    this.transport.removeAllListeners();
                }
                this.transport = transport;
                transport.on("drain", function() {
                    self.onDrain();
                }).on("packet", function(packet) {
                    self.onPacket(packet);
                }).on("error", function(e) {
                    self.onError(e);
                }).on("close", function() {
                    self.onClose("transport close");
                });
            };
            Socket.prototype.probe = function(name) {
                debug('probing transport "%s"', name);
                var transport = this.createTransport(name, {
                    probe: 1
                }), failed = false, self = this;
                Socket.priorWebsocketSuccess = false;
                function onTransportOpen() {
                    if (self.onlyBinaryUpgrades) {
                        var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
                        failed = failed || upgradeLosesBinary;
                    }
                    if (failed) return;
                    debug('probe transport "%s" opened', name);
                    transport.send([ {
                        type: "ping",
                        data: "probe"
                    } ]);
                    transport.once("packet", function(msg) {
                        if (failed) return;
                        if ("pong" == msg.type && "probe" == msg.data) {
                            debug('probe transport "%s" pong', name);
                            self.upgrading = true;
                            self.emit("upgrading", transport);
                            Socket.priorWebsocketSuccess = "websocket" == transport.name;
                            debug('pausing current transport "%s"', self.transport.name);
                            self.transport.pause(function() {
                                if (failed) return;
                                if ("closed" == self.readyState || "closing" == self.readyState) {
                                    return;
                                }
                                debug("changing transport and sending upgrade packet");
                                cleanup();
                                self.setTransport(transport);
                                transport.send([ {
                                    type: "upgrade"
                                } ]);
                                self.emit("upgrade", transport);
                                transport = null;
                                self.upgrading = false;
                                self.flush();
                            });
                        } else {
                            debug('probe transport "%s" failed', name);
                            var err = new Error("probe error");
                            err.transport = transport.name;
                            self.emit("upgradeError", err);
                        }
                    });
                }
                function freezeTransport() {
                    if (failed) return;
                    failed = true;
                    cleanup();
                    transport.close();
                    transport = null;
                }
                function onerror(err) {
                    var error = new Error("probe error: " + err);
                    error.transport = transport.name;
                    freezeTransport();
                    debug('probe transport "%s" failed because of error: %s', name, err);
                    self.emit("upgradeError", error);
                }
                function onTransportClose() {
                    onerror("transport closed");
                }
                function onclose() {
                    onerror("socket closed");
                }
                function onupgrade(to) {
                    if (transport && to.name != transport.name) {
                        debug('"%s" works - aborting "%s"', to.name, transport.name);
                        freezeTransport();
                    }
                }
                function cleanup() {
                    transport.removeListener("open", onTransportOpen);
                    transport.removeListener("error", onerror);
                    transport.removeListener("close", onTransportClose);
                    self.removeListener("close", onclose);
                    self.removeListener("upgrading", onupgrade);
                }
                transport.once("open", onTransportOpen);
                transport.once("error", onerror);
                transport.once("close", onTransportClose);
                this.once("close", onclose);
                this.once("upgrading", onupgrade);
                transport.open();
            };
            Socket.prototype.onOpen = function() {
                debug("socket open");
                this.readyState = "open";
                Socket.priorWebsocketSuccess = "websocket" == this.transport.name;
                this.emit("open");
                this.flush();
                if ("open" == this.readyState && this.upgrade && this.transport.pause) {
                    debug("starting upgrade probes");
                    for (var i = 0, l = this.upgrades.length; i < l; i++) {
                        this.probe(this.upgrades[i]);
                    }
                }
            };
            Socket.prototype.onPacket = function(packet) {
                if ("opening" == this.readyState || "open" == this.readyState) {
                    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);
                    this.emit("packet", packet);
                    this.emit("heartbeat");
                    switch (packet.type) {
                      case "open":
                        this.onHandshake(parsejson(packet.data));
                        break;

                      case "pong":
                        this.setPing();
                        break;

                      case "error":
                        var err = new Error("server error");
                        err.code = packet.data;
                        this.emit("error", err);
                        break;

                      case "message":
                        this.emit("data", packet.data);
                        this.emit("message", packet.data);
                        break;
                    }
                } else {
                    debug('packet received with socket readyState "%s"', this.readyState);
                }
            };
            Socket.prototype.onHandshake = function(data) {
                this.emit("handshake", data);
                this.id = data.sid;
                this.transport.query.sid = data.sid;
                this.upgrades = this.filterUpgrades(data.upgrades);
                this.pingInterval = data.pingInterval;
                this.pingTimeout = data.pingTimeout;
                this.onOpen();
                if ("closed" == this.readyState) return;
                this.setPing();
                this.removeListener("heartbeat", this.onHeartbeat);
                this.on("heartbeat", this.onHeartbeat);
            };
            Socket.prototype.onHeartbeat = function(timeout) {
                clearTimeout(this.pingTimeoutTimer);
                var self = this;
                self.pingTimeoutTimer = setTimeout(function() {
                    if ("closed" == self.readyState) return;
                    self.onClose("ping timeout");
                }, timeout || self.pingInterval + self.pingTimeout);
            };
            Socket.prototype.setPing = function() {
                var self = this;
                clearTimeout(self.pingIntervalTimer);
                self.pingIntervalTimer = setTimeout(function() {
                    debug("writing ping packet - expecting pong within %sms", self.pingTimeout);
                    self.ping();
                    self.onHeartbeat(self.pingTimeout);
                }, self.pingInterval);
            };
            Socket.prototype.ping = function() {
                this.sendPacket("ping");
            };
            Socket.prototype.onDrain = function() {
                for (var i = 0; i < this.prevBufferLen; i++) {
                    if (this.callbackBuffer[i]) {
                        this.callbackBuffer[i]();
                    }
                }
                this.writeBuffer.splice(0, this.prevBufferLen);
                this.callbackBuffer.splice(0, this.prevBufferLen);
                this.prevBufferLen = 0;
                if (this.writeBuffer.length == 0) {
                    this.emit("drain");
                } else {
                    this.flush();
                }
            };
            Socket.prototype.flush = function() {
                if ("closed" != this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
                    debug("flushing %d packets in socket", this.writeBuffer.length);
                    this.transport.send(this.writeBuffer);
                    this.prevBufferLen = this.writeBuffer.length;
                    this.emit("flush");
                }
            };
            Socket.prototype.write = Socket.prototype.send = function(msg, fn) {
                this.sendPacket("message", msg, fn);
                return this;
            };
            Socket.prototype.sendPacket = function(type, data, fn) {
                var packet = {
                    type: type,
                    data: data
                };
                this.emit("packetCreate", packet);
                this.writeBuffer.push(packet);
                this.callbackBuffer.push(fn);
                this.flush();
            };
            Socket.prototype.close = function() {
                if ("opening" == this.readyState || "open" == this.readyState) {
                    this.onClose("forced close");
                    debug("socket closing - telling transport to close");
                    this.transport.close();
                }
                return this;
            };
            Socket.prototype.onError = function(err) {
                debug("socket error %j", err);
                Socket.priorWebsocketSuccess = false;
                this.emit("error", err);
                this.onClose("transport error", err);
            };
            Socket.prototype.onClose = function(reason, desc) {
                if ("opening" == this.readyState || "open" == this.readyState) {
                    debug('socket close with reason: "%s"', reason);
                    var self = this;
                    clearTimeout(this.pingIntervalTimer);
                    clearTimeout(this.pingTimeoutTimer);
                    setTimeout(function() {
                        self.writeBuffer = [];
                        self.callbackBuffer = [];
                        self.prevBufferLen = 0;
                    }, 0);
                    this.transport.removeAllListeners("close");
                    this.transport.close();
                    this.transport.removeAllListeners();
                    this.readyState = "closed";
                    this.id = null;
                    this.emit("close", reason, desc);
                }
            };
            Socket.prototype.filterUpgrades = function(upgrades) {
                var filteredUpgrades = [];
                for (var i = 0, j = upgrades.length; i < j; i++) {
                    if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
                }
                return filteredUpgrades;
            };
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
        "./transport": 5,
        "./transports": 6,
        "component-emitter": 12,
        debug: 14,
        "engine.io-parser": 15,
        indexof: 24,
        parsejson: 25,
        parseqs: 26,
        parseuri: 27
    } ],
    5: [ function(_dereq_, module, exports) {
        var parser = _dereq_("engine.io-parser");
        var Emitter = _dereq_("component-emitter");
        module.exports = Transport;
        function Transport(opts) {
            this.path = opts.path;
            this.hostname = opts.hostname;
            this.port = opts.port;
            this.secure = opts.secure;
            this.query = opts.query;
            this.timestampParam = opts.timestampParam;
            this.timestampRequests = opts.timestampRequests;
            this.readyState = "";
            this.agent = opts.agent || false;
            this.socket = opts.socket;
        }
        Emitter(Transport.prototype);
        Transport.timestamps = 0;
        Transport.prototype.onError = function(msg, desc) {
            var err = new Error(msg);
            err.type = "TransportError";
            err.description = desc;
            this.emit("error", err);
            return this;
        };
        Transport.prototype.open = function() {
            if ("closed" == this.readyState || "" == this.readyState) {
                this.readyState = "opening";
                this.doOpen();
            }
            return this;
        };
        Transport.prototype.close = function() {
            if ("opening" == this.readyState || "open" == this.readyState) {
                this.doClose();
                this.onClose();
            }
            return this;
        };
        Transport.prototype.send = function(packets) {
            if ("open" == this.readyState) {
                this.write(packets);
            } else {
                throw new Error("Transport not open");
            }
        };
        Transport.prototype.onOpen = function() {
            this.readyState = "open";
            this.writable = true;
            this.emit("open");
        };
        Transport.prototype.onData = function(data) {
            try {
                var packet = parser.decodePacket(data, this.socket.binaryType);
                this.onPacket(packet);
            } catch (e) {
                e.data = data;
                this.onError("parser decode error", e);
            }
        };
        Transport.prototype.onPacket = function(packet) {
            this.emit("packet", packet);
        };
        Transport.prototype.onClose = function() {
            this.readyState = "closed";
            this.emit("close");
        };
    }, {
        "component-emitter": 12,
        "engine.io-parser": 15
    } ],
    6: [ function(_dereq_, module, exports) {
        (function(global) {
            var XMLHttpRequest = _dereq_("xmlhttprequest");
            var XHR = _dereq_("./polling-xhr");
            var JSONP = _dereq_("./polling-jsonp");
            var websocket = _dereq_("./websocket");
            exports.polling = polling;
            exports.websocket = websocket;
            function polling(opts) {
                var xhr;
                var xd = false;
                if (global.location) {
                    var isSSL = "https:" == location.protocol;
                    var port = location.port;
                    if (!port) {
                        port = isSSL ? 443 : 80;
                    }
                    xd = opts.hostname != location.hostname || port != opts.port;
                }
                opts.xdomain = xd;
                xhr = new XMLHttpRequest(opts);
                if ("open" in xhr && !opts.forceJSONP) {
                    return new XHR(opts);
                } else {
                    return new JSONP(opts);
                }
            }
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
        "./polling-jsonp": 7,
        "./polling-xhr": 8,
        "./websocket": 10,
        xmlhttprequest: 11
    } ],
    7: [ function(_dereq_, module, exports) {
        (function(global) {
            var Polling = _dereq_("./polling");
            var inherit = _dereq_("component-inherit");
            module.exports = JSONPPolling;
            var rNewline = /\n/g;
            var rEscapedNewline = /\\n/g;
            var callbacks;
            var index = 0;
            function empty() {}
            function JSONPPolling(opts) {
                Polling.call(this, opts);
                this.query = this.query || {};
                if (!callbacks) {
                    if (!global.___eio) global.___eio = [];
                    callbacks = global.___eio;
                }
                this.index = callbacks.length;
                var self = this;
                callbacks.push(function(msg) {
                    self.onData(msg);
                });
                this.query.j = this.index;
                if (global.document && global.addEventListener) {
                    global.addEventListener("beforeunload", function() {
                        if (self.script) self.script.onerror = empty;
                    });
                }
            }
            inherit(JSONPPolling, Polling);
            JSONPPolling.prototype.supportsBinary = false;
            JSONPPolling.prototype.doClose = function() {
                if (this.script) {
                    this.script.parentNode.removeChild(this.script);
                    this.script = null;
                }
                if (this.form) {
                    this.form.parentNode.removeChild(this.form);
                    this.form = null;
                }
                Polling.prototype.doClose.call(this);
            };
            JSONPPolling.prototype.doPoll = function() {
                var self = this;
                var script = document.createElement("script");
                if (this.script) {
                    this.script.parentNode.removeChild(this.script);
                    this.script = null;
                }
                script.async = true;
                script.src = this.uri();
                script.onerror = function(e) {
                    self.onError("jsonp poll error", e);
                };
                var insertAt = document.getElementsByTagName("script")[0];
                insertAt.parentNode.insertBefore(script, insertAt);
                this.script = script;
                var isUAgecko = "undefined" != typeof navigator && /gecko/i.test(navigator.userAgent);
                if (isUAgecko) {
                    setTimeout(function() {
                        var iframe = document.createElement("iframe");
                        document.body.appendChild(iframe);
                        document.body.removeChild(iframe);
                    }, 100);
                }
            };
            JSONPPolling.prototype.doWrite = function(data, fn) {
                var self = this;
                if (!this.form) {
                    var form = document.createElement("form");
                    var area = document.createElement("textarea");
                    var id = this.iframeId = "eio_iframe_" + this.index;
                    var iframe;
                    form.className = "socketio";
                    form.style.position = "absolute";
                    form.style.top = "-1000px";
                    form.style.left = "-1000px";
                    form.target = id;
                    form.method = "POST";
                    form.setAttribute("accept-charset", "utf-8");
                    area.name = "d";
                    form.appendChild(area);
                    document.body.appendChild(form);
                    this.form = form;
                    this.area = area;
                }
                this.form.action = this.uri();
                function complete() {
                    initIframe();
                    fn();
                }
                function initIframe() {
                    if (self.iframe) {
                        try {
                            self.form.removeChild(self.iframe);
                        } catch (e) {
                            self.onError("jsonp polling iframe removal error", e);
                        }
                    }
                    try {
                        var html = '<iframe src="javascript:0" name="' + self.iframeId + '">';
                        iframe = document.createElement(html);
                    } catch (e) {
                        iframe = document.createElement("iframe");
                        iframe.name = self.iframeId;
                        iframe.src = "javascript:0";
                    }
                    iframe.id = self.iframeId;
                    self.form.appendChild(iframe);
                    self.iframe = iframe;
                }
                initIframe();
                data = data.replace(rEscapedNewline, "\\\n");
                this.area.value = data.replace(rNewline, "\\n");
                try {
                    this.form.submit();
                } catch (e) {}
                if (this.iframe.attachEvent) {
                    this.iframe.onreadystatechange = function() {
                        if (self.iframe.readyState == "complete") {
                            complete();
                        }
                    };
                } else {
                    this.iframe.onload = complete;
                }
            };
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
        "./polling": 9,
        "component-inherit": 13
    } ],
    8: [ function(_dereq_, module, exports) {
        (function(global) {
            var XMLHttpRequest = _dereq_("xmlhttprequest");
            var Polling = _dereq_("./polling");
            var Emitter = _dereq_("component-emitter");
            var inherit = _dereq_("component-inherit");
            var debug = _dereq_("debug")("engine.io-client:polling-xhr");
            module.exports = XHR;
            module.exports.Request = Request;
            function empty() {}
            function XHR(opts) {
                Polling.call(this, opts);
                if (global.location) {
                    var isSSL = "https:" == location.protocol;
                    var port = location.port;
                    if (!port) {
                        port = isSSL ? 443 : 80;
                    }
                    this.xd = opts.hostname != global.location.hostname || port != opts.port;
                }
            }
            inherit(XHR, Polling);
            XHR.prototype.supportsBinary = true;
            XHR.prototype.request = function(opts) {
                opts = opts || {};
                opts.uri = this.uri();
                opts.xd = this.xd;
                opts.agent = this.agent || false;
                opts.supportsBinary = this.supportsBinary;
                return new Request(opts);
            };
            XHR.prototype.doWrite = function(data, fn) {
                var isBinary = typeof data !== "string" && data !== undefined;
                var req = this.request({
                    method: "POST",
                    data: data,
                    isBinary: isBinary
                });
                var self = this;
                req.on("success", fn);
                req.on("error", function(err) {
                    self.onError("xhr post error", err);
                });
                this.sendXhr = req;
            };
            XHR.prototype.doPoll = function() {
                debug("xhr poll");
                var req = this.request();
                var self = this;
                req.on("data", function(data) {
                    self.onData(data);
                });
                req.on("error", function(err) {
                    self.onError("xhr poll error", err);
                });
                this.pollXhr = req;
            };
            function Request(opts) {
                this.method = opts.method || "GET";
                this.uri = opts.uri;
                this.xd = !!opts.xd;
                this.async = false !== opts.async;
                this.data = undefined != opts.data ? opts.data : null;
                this.agent = opts.agent;
                this.create(opts.isBinary, opts.supportsBinary);
            }
            Emitter(Request.prototype);
            Request.prototype.create = function(isBinary, supportsBinary) {
                var xhr = this.xhr = new XMLHttpRequest({
                    agent: this.agent,
                    xdomain: this.xd
                });
                var self = this;
                try {
                    debug("xhr open %s: %s", this.method, this.uri);
                    xhr.open(this.method, this.uri, this.async);
                    if (supportsBinary) {
                        xhr.responseType = "arraybuffer";
                    }
                    if ("POST" == this.method) {
                        try {
                            if (isBinary) {
                                xhr.setRequestHeader("Content-type", "application/octet-stream");
                            } else {
                                xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
                            }
                        } catch (e) {}
                    }
                    if ("withCredentials" in xhr) {
                        xhr.withCredentials = true;
                    }
                    xhr.onreadystatechange = function() {
                        var data;
                        try {
                            if (4 != xhr.readyState) return;
                            if (200 == xhr.status || 1223 == xhr.status) {
                                var contentType = xhr.getResponseHeader("Content-Type");
                                if (contentType === "application/octet-stream") {
                                    data = xhr.response;
                                } else {
                                    if (!supportsBinary) {
                                        data = xhr.responseText;
                                    } else {
                                        data = "ok";
                                    }
                                }
                            } else {
                                setTimeout(function() {
                                    self.onError(xhr.status);
                                }, 0);
                            }
                        } catch (e) {
                            self.onError(e);
                        }
                        if (null != data) {
                            self.onData(data);
                        }
                    };
                    debug("xhr data %s", this.data);
                    xhr.send(this.data);
                } catch (e) {
                    setTimeout(function() {
                        self.onError(e);
                    }, 0);
                    return;
                }
                if (global.document) {
                    this.index = Request.requestsCount++;
                    Request.requests[this.index] = this;
                }
            };
            Request.prototype.onSuccess = function() {
                this.emit("success");
                this.cleanup();
            };
            Request.prototype.onData = function(data) {
                this.emit("data", data);
                this.onSuccess();
            };
            Request.prototype.onError = function(err) {
                this.emit("error", err);
                this.cleanup();
            };
            Request.prototype.cleanup = function() {
                if ("undefined" == typeof this.xhr || null === this.xhr) {
                    return;
                }
                this.xhr.onreadystatechange = empty;
                try {
                    this.xhr.abort();
                } catch (e) {}
                if (global.document) {
                    delete Request.requests[this.index];
                }
                this.xhr = null;
            };
            Request.prototype.abort = function() {
                this.cleanup();
            };
            if (global.document) {
                Request.requestsCount = 0;
                Request.requests = {};
                if (global.attachEvent) {
                    global.attachEvent("onunload", unloadHandler);
                } else if (global.addEventListener) {
                    global.addEventListener("beforeunload", unloadHandler);
                }
            }
            function unloadHandler() {
                for (var i in Request.requests) {
                    if (Request.requests.hasOwnProperty(i)) {
                        Request.requests[i].abort();
                    }
                }
            }
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
        "./polling": 9,
        "component-emitter": 12,
        "component-inherit": 13,
        debug: 14,
        xmlhttprequest: 11
    } ],
    9: [ function(_dereq_, module, exports) {
        var Transport = _dereq_("../transport");
        var parseqs = _dereq_("parseqs");
        var parser = _dereq_("engine.io-parser");
        var inherit = _dereq_("component-inherit");
        var debug = _dereq_("debug")("engine.io-client:polling");
        module.exports = Polling;
        var hasXHR2 = function() {
            var XMLHttpRequest = _dereq_("xmlhttprequest");
            var xhr = new XMLHttpRequest({
                agent: this.agent,
                xdomain: false
            });
            return null != xhr.responseType;
        }();
        function Polling(opts) {
            var forceBase64 = opts && opts.forceBase64;
            if (!hasXHR2 || forceBase64) {
                this.supportsBinary = false;
            }
            Transport.call(this, opts);
        }
        inherit(Polling, Transport);
        Polling.prototype.name = "polling";
        Polling.prototype.doOpen = function() {
            this.poll();
        };
        Polling.prototype.pause = function(onPause) {
            var pending = 0;
            var self = this;
            this.readyState = "pausing";
            function pause() {
                debug("paused");
                self.readyState = "paused";
                onPause();
            }
            if (this.polling || !this.writable) {
                var total = 0;
                if (this.polling) {
                    debug("we are currently polling - waiting to pause");
                    total++;
                    this.once("pollComplete", function() {
                        debug("pre-pause polling complete");
                        --total || pause();
                    });
                }
                if (!this.writable) {
                    debug("we are currently writing - waiting to pause");
                    total++;
                    this.once("drain", function() {
                        debug("pre-pause writing complete");
                        --total || pause();
                    });
                }
            } else {
                pause();
            }
        };
        Polling.prototype.poll = function() {
            debug("polling");
            this.polling = true;
            this.doPoll();
            this.emit("poll");
        };
        Polling.prototype.onData = function(data) {
            var self = this;
            debug("polling got data %s", data);
            var callback = function(packet, index, total) {
                if ("opening" == self.readyState) {
                    self.onOpen();
                }
                if ("close" == packet.type) {
                    self.onClose();
                    return false;
                }
                self.onPacket(packet);
            };
            parser.decodePayload(data, this.socket.binaryType, callback);
            if ("closed" != this.readyState) {
                this.polling = false;
                this.emit("pollComplete");
                if ("open" == this.readyState) {
                    this.poll();
                } else {
                    debug('ignoring poll - transport state "%s"', this.readyState);
                }
            }
        };
        Polling.prototype.doClose = function() {
            var self = this;
            function close() {
                debug("writing close packet");
                self.write([ {
                    type: "close"
                } ]);
            }
            if ("open" == this.readyState) {
                debug("transport open - closing");
                close();
            } else {
                debug("transport not open - deferring close");
                this.once("open", close);
            }
        };
        Polling.prototype.write = function(packets) {
            var self = this;
            this.writable = false;
            var callbackfn = function() {
                self.writable = true;
                self.emit("drain");
            };
            var self = this;
            parser.encodePayload(packets, this.supportsBinary, function(data) {
                self.doWrite(data, callbackfn);
            });
        };
        Polling.prototype.uri = function() {
            var query = this.query || {};
            var schema = this.secure ? "https" : "http";
            var port = "";
            if (false !== this.timestampRequests) {
                query[this.timestampParam] = +new Date() + "-" + Transport.timestamps++;
            }
            if (!this.supportsBinary && !query.sid) {
                query.b64 = 1;
            }
            query = parseqs.encode(query);
            if (this.port && ("https" == schema && this.port != 443 || "http" == schema && this.port != 80)) {
                port = ":" + this.port;
            }
            if (query.length) {
                query = "?" + query;
            }
            return schema + "://" + this.hostname + port + this.path + query;
        };
    }, {
        "../transport": 5,
        "component-inherit": 13,
        debug: 14,
        "engine.io-parser": 15,
        parseqs: 26,
        xmlhttprequest: 11
    } ],
    10: [ function(_dereq_, module, exports) {
        var Transport = _dereq_("../transport");
        var parser = _dereq_("engine.io-parser");
        var parseqs = _dereq_("parseqs");
        var inherit = _dereq_("component-inherit");
        var debug = _dereq_("debug")("engine.io-client:websocket");
        var WebSocket = _dereq_("ws");
        module.exports = WS;
        function WS(opts) {
            var forceBase64 = opts && opts.forceBase64;
            if (forceBase64) {
                this.supportsBinary = false;
            }
            Transport.call(this, opts);
        }
        inherit(WS, Transport);
        WS.prototype.name = "websocket";
        WS.prototype.supportsBinary = true;
        WS.prototype.doOpen = function() {
            if (!this.check()) {
                return;
            }
            var self = this;
            var uri = this.uri();
            var protocols = void 0;
            var opts = {
                agent: this.agent
            };
            this.ws = new WebSocket(uri, protocols, opts);
            if (this.ws.binaryType === undefined) {
                this.supportsBinary = false;
            }
            this.ws.binaryType = "arraybuffer";
            this.addEventListeners();
        };
        WS.prototype.addEventListeners = function() {
            var self = this;
            this.ws.onopen = function() {
                self.onOpen();
            };
            this.ws.onclose = function() {
                self.onClose();
            };
            this.ws.onmessage = function(ev) {
                self.onData(ev.data);
            };
            this.ws.onerror = function(e) {
                self.onError("websocket error", e);
            };
        };
        if ("undefined" != typeof navigator && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
            WS.prototype.onData = function(data) {
                var self = this;
                setTimeout(function() {
                    Transport.prototype.onData.call(self, data);
                }, 0);
            };
        }
        WS.prototype.write = function(packets) {
            var self = this;
            this.writable = false;
            for (var i = 0, l = packets.length; i < l; i++) {
                parser.encodePacket(packets[i], this.supportsBinary, function(data) {
                    try {
                        self.ws.send(data);
                    } catch (e) {
                        debug("websocket closed before onclose event");
                    }
                });
            }
            function ondrain() {
                self.writable = true;
                self.emit("drain");
            }
            setTimeout(ondrain, 0);
        };
        WS.prototype.onClose = function() {
            Transport.prototype.onClose.call(this);
        };
        WS.prototype.doClose = function() {
            if (typeof this.ws !== "undefined") {
                this.ws.close();
            }
        };
        WS.prototype.uri = function() {
            var query = this.query || {};
            var schema = this.secure ? "wss" : "ws";
            var port = "";
            if (this.port && ("wss" == schema && this.port != 443 || "ws" == schema && this.port != 80)) {
                port = ":" + this.port;
            }
            if (this.timestampRequests) {
                query[this.timestampParam] = +new Date();
            }
            if (!this.supportsBinary) {
                query.b64 = 1;
            }
            query = parseqs.encode(query);
            if (query.length) {
                query = "?" + query;
            }
            return schema + "://" + this.hostname + port + this.path + query;
        };
        WS.prototype.check = function() {
            return !!WebSocket && !("__initialize" in WebSocket && this.name === WS.prototype.name);
        };
    }, {
        "../transport": 5,
        "component-inherit": 13,
        debug: 14,
        "engine.io-parser": 15,
        parseqs: 26,
        ws: 28
    } ],
    11: [ function(_dereq_, module, exports) {
        var hasCORS = _dereq_("has-cors");
        module.exports = function(opts) {
            var xdomain = opts.xdomain;
            try {
                if ("undefined" != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
                    return new XMLHttpRequest();
                }
            } catch (e) {}
            if (!xdomain) {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {}
            }
        };
    }, {
        "has-cors": 22
    } ],
    12: [ function(_dereq_, module, exports) {
        module.exports = Emitter;
        function Emitter(obj) {
            if (obj) return mixin(obj);
        }
        function mixin(obj) {
            for (var key in Emitter.prototype) {
                obj[key] = Emitter.prototype[key];
            }
            return obj;
        }
        Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
            this._callbacks = this._callbacks || {};
            (this._callbacks[event] = this._callbacks[event] || []).push(fn);
            return this;
        };
        Emitter.prototype.once = function(event, fn) {
            var self = this;
            this._callbacks = this._callbacks || {};
            function on() {
                self.off(event, on);
                fn.apply(this, arguments);
            }
            on.fn = fn;
            this.on(event, on);
            return this;
        };
        Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
            this._callbacks = this._callbacks || {};
            if (0 == arguments.length) {
                this._callbacks = {};
                return this;
            }
            var callbacks = this._callbacks[event];
            if (!callbacks) return this;
            if (1 == arguments.length) {
                delete this._callbacks[event];
                return this;
            }
            var cb;
            for (var i = 0; i < callbacks.length; i++) {
                cb = callbacks[i];
                if (cb === fn || cb.fn === fn) {
                    callbacks.splice(i, 1);
                    break;
                }
            }
            return this;
        };
        Emitter.prototype.emit = function(event) {
            this._callbacks = this._callbacks || {};
            var args = [].slice.call(arguments, 1), callbacks = this._callbacks[event];
            if (callbacks) {
                callbacks = callbacks.slice(0);
                for (var i = 0, len = callbacks.length; i < len; ++i) {
                    callbacks[i].apply(this, args);
                }
            }
            return this;
        };
        Emitter.prototype.listeners = function(event) {
            this._callbacks = this._callbacks || {};
            return this._callbacks[event] || [];
        };
        Emitter.prototype.hasListeners = function(event) {
            return !!this.listeners(event).length;
        };
    }, {} ],
    13: [ function(_dereq_, module, exports) {
        module.exports = function(a, b) {
            var fn = function() {};
            fn.prototype = b.prototype;
            a.prototype = new fn();
            a.prototype.constructor = a;
        };
    }, {} ],
    14: [ function(_dereq_, module, exports) {
        module.exports = debug;
        function debug(name) {
            if (!debug.enabled(name)) return function() {};
            return function(fmt) {
                fmt = coerce(fmt);
                var curr = new Date();
                var ms = curr - (debug[name] || curr);
                debug[name] = curr;
                fmt = name + " " + fmt + " +" + debug.humanize(ms);
                window.console && console.log && Function.prototype.apply.call(console.log, console, arguments);
            };
        }
        debug.names = [];
        debug.skips = [];
        debug.enable = function(name) {
            try {
                localStorage.debug = name;
            } catch (e) {}
            var split = (name || "").split(/[\s,]+/), len = split.length;
            for (var i = 0; i < len; i++) {
                name = split[i].replace("*", ".*?");
                if (name[0] === "-") {
                    debug.skips.push(new RegExp("^" + name.substr(1) + "$"));
                } else {
                    debug.names.push(new RegExp("^" + name + "$"));
                }
            }
        };
        debug.disable = function() {
            debug.enable("");
        };
        debug.humanize = function(ms) {
            var sec = 1e3, min = 60 * 1e3, hour = 60 * min;
            if (ms >= hour) return (ms / hour).toFixed(1) + "h";
            if (ms >= min) return (ms / min).toFixed(1) + "m";
            if (ms >= sec) return (ms / sec | 0) + "s";
            return ms + "ms";
        };
        debug.enabled = function(name) {
            for (var i = 0, len = debug.skips.length; i < len; i++) {
                if (debug.skips[i].test(name)) {
                    return false;
                }
            }
            for (var i = 0, len = debug.names.length; i < len; i++) {
                if (debug.names[i].test(name)) {
                    return true;
                }
            }
            return false;
        };
        function coerce(val) {
            if (val instanceof Error) return val.stack || val.message;
            return val;
        }
        try {
            if (window.localStorage) debug.enable(localStorage.debug);
        } catch (e) {}
    }, {} ],
    15: [ function(_dereq_, module, exports) {
        (function(global) {
            var keys = _dereq_("./keys");
            var sliceBuffer = _dereq_("arraybuffer.slice");
            var base64encoder = _dereq_("base64-arraybuffer");
            var after = _dereq_("after");
            var utf8 = _dereq_("utf8");
            var isAndroid = navigator.userAgent.match(/Android/i);
            exports.protocol = 2;
            var packets = exports.packets = {
                open: 0,
                close: 1,
                ping: 2,
                pong: 3,
                message: 4,
                upgrade: 5,
                noop: 6
            };
            var packetslist = keys(packets);
            var err = {
                type: "error",
                data: "parser error"
            };
            var Blob = _dereq_("blob");
            exports.encodePacket = function(packet, supportsBinary, callback) {
                if (typeof supportsBinary == "function") {
                    callback = supportsBinary;
                    supportsBinary = false;
                }
                var data = packet.data === undefined ? undefined : packet.data.buffer || packet.data;
                if (global.ArrayBuffer && data instanceof ArrayBuffer) {
                    return encodeArrayBuffer(packet, supportsBinary, callback);
                } else if (Blob && data instanceof global.Blob) {
                    return encodeBlob(packet, supportsBinary, callback);
                }
                var encoded = packets[packet.type];
                if (undefined !== packet.data) {
                    encoded += utf8.encode(String(packet.data));
                }
                return callback("" + encoded);
            };
            function encodeArrayBuffer(packet, supportsBinary, callback) {
                if (!supportsBinary) {
                    return exports.encodeBase64Packet(packet, callback);
                }
                var data = packet.data;
                var contentArray = new Uint8Array(data);
                var resultBuffer = new Uint8Array(1 + data.byteLength);
                resultBuffer[0] = packets[packet.type];
                for (var i = 0; i < contentArray.length; i++) {
                    resultBuffer[i + 1] = contentArray[i];
                }
                return callback(resultBuffer.buffer);
            }
            function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
                if (!supportsBinary) {
                    return exports.encodeBase64Packet(packet, callback);
                }
                var fr = new FileReader();
                fr.onload = function() {
                    packet.data = fr.result;
                    exports.encodePacket(packet, supportsBinary, callback);
                };
                return fr.readAsArrayBuffer(packet.data);
            }
            function encodeBlob(packet, supportsBinary, callback) {
                if (!supportsBinary) {
                    return exports.encodeBase64Packet(packet, callback);
                }
                if (isAndroid) {
                    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
                }
                var length = new Uint8Array(1);
                length[0] = packets[packet.type];
                var blob = new Blob([ length.buffer, packet.data ]);
                return callback(blob);
            }
            exports.encodeBase64Packet = function(packet, callback) {
                var message = "b" + exports.packets[packet.type];
                if (Blob && packet.data instanceof Blob) {
                    var fr = new FileReader();
                    fr.onload = function() {
                        var b64 = fr.result.split(",")[1];
                        callback(message + b64);
                    };
                    return fr.readAsDataURL(packet.data);
                }
                var b64data;
                try {
                    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
                } catch (e) {
                    var typed = new Uint8Array(packet.data);
                    var basic = new Array(typed.length);
                    for (var i = 0; i < typed.length; i++) {
                        basic[i] = typed[i];
                    }
                    b64data = String.fromCharCode.apply(null, basic);
                }
                message += global.btoa(b64data);
                return callback(message);
            };
            exports.decodePacket = function(data, binaryType) {
                if (typeof data == "string" || data === undefined) {
                    if (data.charAt(0) == "b") {
                        return exports.decodeBase64Packet(data.substr(1), binaryType);
                    }
                    data = utf8.decode(data);
                    var type = data.charAt(0);
                    if (Number(type) != type || !packetslist[type]) {
                        return err;
                    }
                    if (data.length > 1) {
                        return {
                            type: packetslist[type],
                            data: data.substring(1)
                        };
                    } else {
                        return {
                            type: packetslist[type]
                        };
                    }
                }
                var asArray = new Uint8Array(data);
                var type = asArray[0];
                var rest = sliceBuffer(data, 1);
                if (Blob && binaryType === "blob") {
                    rest = new Blob([ rest ]);
                }
                return {
                    type: packetslist[type],
                    data: rest
                };
            };
            exports.decodeBase64Packet = function(msg, binaryType) {
                var type = packetslist[msg.charAt(0)];
                if (!global.ArrayBuffer) {
                    return {
                        type: type,
                        data: {
                            base64: true,
                            data: msg.substr(1)
                        }
                    };
                }
                var data = base64encoder.decode(msg.substr(1));
                if (binaryType === "blob" && Blob) {
                    data = new Blob([ data ]);
                }
                return {
                    type: type,
                    data: data
                };
            };
            exports.encodePayload = function(packets, supportsBinary, callback) {
                if (typeof supportsBinary == "function") {
                    callback = supportsBinary;
                    supportsBinary = null;
                }
                if (supportsBinary) {
                    if (Blob && !isAndroid) {
                        return exports.encodePayloadAsBlob(packets, callback);
                    }
                    return exports.encodePayloadAsArrayBuffer(packets, callback);
                }
                if (!packets.length) {
                    return callback("0:");
                }
                function setLengthHeader(message) {
                    return message.length + ":" + message;
                }
                function encodeOne(packet, doneCallback) {
                    exports.encodePacket(packet, supportsBinary, function(message) {
                        doneCallback(null, setLengthHeader(message));
                    });
                }
                map(packets, encodeOne, function(err, results) {
                    return callback(results.join(""));
                });
            };
            function map(ary, each, done) {
                var result = new Array(ary.length);
                var next = after(ary.length, done);
                var eachWithIndex = function(i, el, cb) {
                    each(el, function(error, msg) {
                        result[i] = msg;
                        cb(error, result);
                    });
                };
                for (var i = 0; i < ary.length; i++) {
                    eachWithIndex(i, ary[i], next);
                }
            }
            exports.decodePayload = function(data, binaryType, callback) {
                if (typeof data != "string") {
                    return exports.decodePayloadAsBinary(data, binaryType, callback);
                }
                if (typeof binaryType === "function") {
                    callback = binaryType;
                    binaryType = null;
                }
                var packet;
                if (data == "") {
                    return callback(err, 0, 1);
                }
                var length = "", n, msg;
                for (var i = 0, l = data.length; i < l; i++) {
                    var chr = data.charAt(i);
                    if (":" != chr) {
                        length += chr;
                    } else {
                        if ("" == length || length != (n = Number(length))) {
                            return callback(err, 0, 1);
                        }
                        msg = data.substr(i + 1, n);
                        if (length != msg.length) {
                            return callback(err, 0, 1);
                        }
                        if (msg.length) {
                            packet = exports.decodePacket(msg, binaryType);
                            if (err.type == packet.type && err.data == packet.data) {
                                return callback(err, 0, 1);
                            }
                            var ret = callback(packet, i + n, l);
                            if (false === ret) return;
                        }
                        i += n;
                        length = "";
                    }
                }
                if (length != "") {
                    return callback(err, 0, 1);
                }
            };
            exports.encodePayloadAsArrayBuffer = function(packets, callback) {
                if (!packets.length) {
                    return callback(new ArrayBuffer(0));
                }
                function encodeOne(packet, doneCallback) {
                    exports.encodePacket(packet, true, function(data) {
                        return doneCallback(null, data);
                    });
                }
                map(packets, encodeOne, function(err, encodedPackets) {
                    var totalLength = encodedPackets.reduce(function(acc, p) {
                        var len;
                        if (typeof p === "string") {
                            len = p.length;
                        } else {
                            len = p.byteLength;
                        }
                        return acc + len.toString().length + len + 2;
                    }, 0);
                    var resultArray = new Uint8Array(totalLength);
                    var bufferIndex = 0;
                    encodedPackets.forEach(function(p) {
                        var isString = typeof p === "string";
                        var ab = p;
                        if (isString) {
                            var view = new Uint8Array(p.length);
                            for (var i = 0; i < p.length; i++) {
                                view[i] = p.charCodeAt(i);
                            }
                            ab = view.buffer;
                        }
                        if (isString) {
                            resultArray[bufferIndex++] = 0;
                        } else {
                            resultArray[bufferIndex++] = 1;
                        }
                        var lenStr = ab.byteLength.toString();
                        for (var i = 0; i < lenStr.length; i++) {
                            resultArray[bufferIndex++] = parseInt(lenStr[i]);
                        }
                        resultArray[bufferIndex++] = 255;
                        var view = new Uint8Array(ab);
                        for (var i = 0; i < view.length; i++) {
                            resultArray[bufferIndex++] = view[i];
                        }
                    });
                    return callback(resultArray.buffer);
                });
            };
            exports.encodePayloadAsBlob = function(packets, callback) {
                function encodeOne(packet, doneCallback) {
                    exports.encodePacket(packet, true, function(encoded) {
                        var binaryIdentifier = new Uint8Array(1);
                        binaryIdentifier[0] = 1;
                        if (typeof encoded === "string") {
                            var view = new Uint8Array(encoded.length);
                            for (var i = 0; i < encoded.length; i++) {
                                view[i] = encoded.charCodeAt(i);
                            }
                            encoded = view.buffer;
                            binaryIdentifier[0] = 0;
                        }
                        var len = encoded instanceof ArrayBuffer ? encoded.byteLength : encoded.size;
                        var lenStr = len.toString();
                        var lengthAry = new Uint8Array(lenStr.length + 1);
                        for (var i = 0; i < lenStr.length; i++) {
                            lengthAry[i] = parseInt(lenStr[i]);
                        }
                        lengthAry[lenStr.length] = 255;
                        if (Blob) {
                            var blob = new Blob([ binaryIdentifier.buffer, lengthAry.buffer, encoded ]);
                            doneCallback(null, blob);
                        }
                    });
                }
                map(packets, encodeOne, function(err, results) {
                    return callback(new Blob(results));
                });
            };
            exports.decodePayloadAsBinary = function(data, binaryType, callback) {
                if (typeof binaryType === "function") {
                    callback = binaryType;
                    binaryType = null;
                }
                var bufferTail = data;
                var buffers = [];
                while (bufferTail.byteLength > 0) {
                    var tailArray = new Uint8Array(bufferTail);
                    var isString = tailArray[0] === 0;
                    var msgLength = "";
                    for (var i = 1; ;i++) {
                        if (tailArray[i] == 255) break;
                        msgLength += tailArray[i];
                    }
                    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
                    msgLength = parseInt(msgLength);
                    var msg = sliceBuffer(bufferTail, 0, msgLength);
                    if (isString) {
                        try {
                            msg = String.fromCharCode.apply(null, new Uint8Array(msg));
                        } catch (e) {
                            var typed = new Uint8Array(msg);
                            msg = "";
                            for (var i = 0; i < typed.length; i++) {
                                msg += String.fromCharCode(typed[i]);
                            }
                        }
                    }
                    buffers.push(msg);
                    bufferTail = sliceBuffer(bufferTail, msgLength);
                }
                var total = buffers.length;
                buffers.forEach(function(buffer, i) {
                    callback(exports.decodePacket(buffer, binaryType), i, total);
                });
            };
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {
        "./keys": 16,
        after: 17,
        "arraybuffer.slice": 18,
        "base64-arraybuffer": 19,
        blob: 20,
        utf8: 21
    } ],
    16: [ function(_dereq_, module, exports) {
        module.exports = Object.keys || function keys(obj) {
            var arr = [];
            var has = Object.prototype.hasOwnProperty;
            for (var i in obj) {
                if (has.call(obj, i)) {
                    arr.push(i);
                }
            }
            return arr;
        };
    }, {} ],
    17: [ function(_dereq_, module, exports) {
        module.exports = after;
        function after(count, callback, err_cb) {
            var bail = false;
            err_cb = err_cb || noop;
            proxy.count = count;
            return count === 0 ? callback() : proxy;
            function proxy(err, result) {
                if (proxy.count <= 0) {
                    throw new Error("after called too many times");
                }
                --proxy.count;
                if (err) {
                    bail = true;
                    callback(err);
                    callback = err_cb;
                } else if (proxy.count === 0 && !bail) {
                    callback(null, result);
                }
            }
        }
        function noop() {}
    }, {} ],
    18: [ function(_dereq_, module, exports) {
        module.exports = function(arraybuffer, start, end) {
            var bytes = arraybuffer.byteLength;
            start = start || 0;
            end = end || bytes;
            if (arraybuffer.slice) {
                return arraybuffer.slice(start, end);
            }
            if (start < 0) {
                start += bytes;
            }
            if (end < 0) {
                end += bytes;
            }
            if (end > bytes) {
                end = bytes;
            }
            if (start >= bytes || start >= end || bytes === 0) {
                return new ArrayBuffer(0);
            }
            var abv = new Uint8Array(arraybuffer);
            var result = new Uint8Array(end - start);
            for (var i = start, ii = 0; i < end; i++, ii++) {
                result[ii] = abv[i];
            }
            return result.buffer;
        };
    }, {} ],
    19: [ function(_dereq_, module, exports) {
        (function(chars) {
            "use strict";
            exports.encode = function(arraybuffer) {
                var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = "";
                for (i = 0; i < len; i += 3) {
                    base64 += chars[bytes[i] >> 2];
                    base64 += chars[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
                    base64 += chars[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
                    base64 += chars[bytes[i + 2] & 63];
                }
                if (len % 3 === 2) {
                    base64 = base64.substring(0, base64.length - 1) + "=";
                } else if (len % 3 === 1) {
                    base64 = base64.substring(0, base64.length - 2) + "==";
                }
                return base64;
            };
            exports.decode = function(base64) {
                var bufferLength = base64.length * .75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
                if (base64[base64.length - 1] === "=") {
                    bufferLength--;
                    if (base64[base64.length - 2] === "=") {
                        bufferLength--;
                    }
                }
                var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
                for (i = 0; i < len; i += 4) {
                    encoded1 = chars.indexOf(base64[i]);
                    encoded2 = chars.indexOf(base64[i + 1]);
                    encoded3 = chars.indexOf(base64[i + 2]);
                    encoded4 = chars.indexOf(base64[i + 3]);
                    bytes[p++] = encoded1 << 2 | encoded2 >> 4;
                    bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
                    bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
                }
                return arraybuffer;
            };
        })("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
    }, {} ],
    20: [ function(_dereq_, module, exports) {
        (function(global) {
            var BlobBuilder = global.BlobBuilder || global.WebKitBlobBuilder || global.MSBlobBuilder || global.MozBlobBuilder;
            var blobSupported = function() {
                try {
                    var b = new Blob([ "hi" ]);
                    return b.size == 2;
                } catch (e) {
                    return false;
                }
            }();
            var blobBuilderSupported = BlobBuilder && BlobBuilder.prototype.append && BlobBuilder.prototype.getBlob;
            function BlobBuilderConstructor(ary, options) {
                options = options || {};
                var bb = new BlobBuilder();
                for (var i = 0; i < ary.length; i++) {
                    bb.append(ary[i]);
                }
                return options.type ? bb.getBlob(options.type) : bb.getBlob();
            }
            module.exports = function() {
                if (blobSupported) {
                    return global.Blob;
                } else if (blobBuilderSupported) {
                    return BlobBuilderConstructor;
                } else {
                    return undefined;
                }
            }();
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {} ],
    21: [ function(_dereq_, module, exports) {
        (function(global) {
            (function(root) {
                var freeExports = typeof exports == "object" && exports;
                var freeModule = typeof module == "object" && module && module.exports == freeExports && module;
                var freeGlobal = typeof global == "object" && global;
                if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
                    root = freeGlobal;
                }
                var stringFromCharCode = String.fromCharCode;
                function ucs2decode(string) {
                    var output = [];
                    var counter = 0;
                    var length = string.length;
                    var value;
                    var extra;
                    while (counter < length) {
                        value = string.charCodeAt(counter++);
                        if (value >= 55296 && value <= 56319 && counter < length) {
                            extra = string.charCodeAt(counter++);
                            if ((extra & 64512) == 56320) {
                                output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
                            } else {
                                output.push(value);
                                counter--;
                            }
                        } else {
                            output.push(value);
                        }
                    }
                    return output;
                }
                function ucs2encode(array) {
                    var length = array.length;
                    var index = -1;
                    var value;
                    var output = "";
                    while (++index < length) {
                        value = array[index];
                        if (value > 65535) {
                            value -= 65536;
                            output += stringFromCharCode(value >>> 10 & 1023 | 55296);
                            value = 56320 | value & 1023;
                        }
                        output += stringFromCharCode(value);
                    }
                    return output;
                }
                function createByte(codePoint, shift) {
                    return stringFromCharCode(codePoint >> shift & 63 | 128);
                }
                function encodeCodePoint(codePoint) {
                    if ((codePoint & 4294967168) == 0) {
                        return stringFromCharCode(codePoint);
                    }
                    var symbol = "";
                    if ((codePoint & 4294965248) == 0) {
                        symbol = stringFromCharCode(codePoint >> 6 & 31 | 192);
                    } else if ((codePoint & 4294901760) == 0) {
                        symbol = stringFromCharCode(codePoint >> 12 & 15 | 224);
                        symbol += createByte(codePoint, 6);
                    } else if ((codePoint & 4292870144) == 0) {
                        symbol = stringFromCharCode(codePoint >> 18 & 7 | 240);
                        symbol += createByte(codePoint, 12);
                        symbol += createByte(codePoint, 6);
                    }
                    symbol += stringFromCharCode(codePoint & 63 | 128);
                    return symbol;
                }
                function utf8encode(string) {
                    var codePoints = ucs2decode(string);
                    var length = codePoints.length;
                    var index = -1;
                    var codePoint;
                    var byteString = "";
                    while (++index < length) {
                        codePoint = codePoints[index];
                        byteString += encodeCodePoint(codePoint);
                    }
                    return byteString;
                }
                function readContinuationByte() {
                    if (byteIndex >= byteCount) {
                        throw Error("Invalid byte index");
                    }
                    var continuationByte = byteArray[byteIndex] & 255;
                    byteIndex++;
                    if ((continuationByte & 192) == 128) {
                        return continuationByte & 63;
                    }
                    throw Error("Invalid continuation byte");
                }
                function decodeSymbol() {
                    var byte1;
                    var byte2;
                    var byte3;
                    var byte4;
                    var codePoint;
                    if (byteIndex > byteCount) {
                        throw Error("Invalid byte index");
                    }
                    if (byteIndex == byteCount) {
                        return false;
                    }
                    byte1 = byteArray[byteIndex] & 255;
                    byteIndex++;
                    if ((byte1 & 128) == 0) {
                        return byte1;
                    }
                    if ((byte1 & 224) == 192) {
                        var byte2 = readContinuationByte();
                        codePoint = (byte1 & 31) << 6 | byte2;
                        if (codePoint >= 128) {
                            return codePoint;
                        } else {
                            throw Error("Invalid continuation byte");
                        }
                    }
                    if ((byte1 & 240) == 224) {
                        byte2 = readContinuationByte();
                        byte3 = readContinuationByte();
                        codePoint = (byte1 & 15) << 12 | byte2 << 6 | byte3;
                        if (codePoint >= 2048) {
                            return codePoint;
                        } else {
                            throw Error("Invalid continuation byte");
                        }
                    }
                    if ((byte1 & 248) == 240) {
                        byte2 = readContinuationByte();
                        byte3 = readContinuationByte();
                        byte4 = readContinuationByte();
                        codePoint = (byte1 & 15) << 18 | byte2 << 12 | byte3 << 6 | byte4;
                        if (codePoint >= 65536 && codePoint <= 1114111) {
                            return codePoint;
                        }
                    }
                    throw Error("Invalid UTF-8 detected");
                }
                var byteArray;
                var byteCount;
                var byteIndex;
                function utf8decode(byteString) {
                    byteArray = ucs2decode(byteString);
                    byteCount = byteArray.length;
                    byteIndex = 0;
                    var codePoints = [];
                    var tmp;
                    while ((tmp = decodeSymbol()) !== false) {
                        codePoints.push(tmp);
                    }
                    return ucs2encode(codePoints);
                }
                var utf8 = {
                    version: "2.0.0",
                    encode: utf8encode,
                    decode: utf8decode
                };
                if (freeExports && !freeExports.nodeType) {
                    if (freeModule) {
                        freeModule.exports = utf8;
                    } else {
                        var object = {};
                        var hasOwnProperty = object.hasOwnProperty;
                        for (var key in utf8) {
                            hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key]);
                        }
                    }
                } else {
                    root.utf8 = utf8;
                }
            })(this);
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {} ],
    22: [ function(_dereq_, module, exports) {
        var global = _dereq_("global");
        try {
            module.exports = "XMLHttpRequest" in global && "withCredentials" in new global.XMLHttpRequest();
        } catch (err) {
            module.exports = false;
        }
    }, {
        global: 23
    } ],
    23: [ function(_dereq_, module, exports) {
        module.exports = function() {
            return this;
        }();
    }, {} ],
    24: [ function(_dereq_, module, exports) {
        var indexOf = [].indexOf;
        module.exports = function(arr, obj) {
            if (indexOf) return arr.indexOf(obj);
            for (var i = 0; i < arr.length; ++i) {
                if (arr[i] === obj) return i;
            }
            return -1;
        };
    }, {} ],
    25: [ function(_dereq_, module, exports) {
        (function(global) {
            var rvalidchars = /^[\],:{}\s]*$/;
            var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
            var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
            var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
            var rtrimLeft = /^\s+/;
            var rtrimRight = /\s+$/;
            module.exports = function parsejson(data) {
                if ("string" != typeof data || !data) {
                    return null;
                }
                data = data.replace(rtrimLeft, "").replace(rtrimRight, "");
                if (global.JSON && JSON.parse) {
                    return JSON.parse(data);
                }
                if (rvalidchars.test(data.replace(rvalidescape, "@").replace(rvalidtokens, "]").replace(rvalidbraces, ""))) {
                    return new Function("return " + data)();
                }
            };
        }).call(this, typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
    }, {} ],
    26: [ function(_dereq_, module, exports) {
        exports.encode = function(obj) {
            var str = "";
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    if (str.length) str += "&";
                    str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
                }
            }
            return str;
        };
        exports.decode = function(qs) {
            var qry = {};
            var pairs = qs.split("&");
            for (var i = 0, l = pairs.length; i < l; i++) {
                var pair = pairs[i].split("=");
                qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return qry;
        };
    }, {} ],
    27: [ function(_dereq_, module, exports) {
        var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
        var parts = [ "source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor" ];
        module.exports = function parseuri(str) {
            var m = re.exec(str || ""), uri = {}, i = 14;
            while (i--) {
                uri[parts[i]] = m[i] || "";
            }
            return uri;
        };
    }, {} ],
    28: [ function(_dereq_, module, exports) {
        var global = function() {
            return this;
        }();
        var WebSocket = global.WebSocket || global.MozWebSocket;
        module.exports = WebSocket ? ws : null;
        function ws(uri, protocols, opts) {
            var instance;
            if (protocols) {
                instance = new WebSocket(uri, protocols);
            } else {
                instance = new WebSocket(uri);
            }
            return instance;
        }
        if (WebSocket) ws.prototype = WebSocket.prototype;
    }, {} ]
}, {}, [ 1 ]);

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
            child = this.child("" + uniqueID());
            return child;
        };
        OpenFire.prototype.set = function(obj) {
            var po;
            po = OpenFire.parentObjects;
            po.queue.push(new QueueEntry("set", this.path, obj));
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
    }();
    window.OpenFire = OpenFire;
    BaseQueue = function() {
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
            var entry, _i, _len, _ref;
            _ref = this.queue;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                entry = _ref[_i];
                this.parent._set(entry, function() {});
            }
            return this.queue.length = [];
        };
        return MemoryQueue;
    }(OpenFire.BaseQueue);
    OpenFire.possibleQueues.push(MemoryQueue);
}).call(this);