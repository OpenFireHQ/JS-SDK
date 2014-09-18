if not window?
  window = global

class QueueEntry

  constructor: (@action, @path, @obj) ->

class Snapshot

  constructor: (@val, @path, @name) ->
  childCount: ->
    return 0 if @val is null
    return Object.keys(@val).length

class OpenFire

  # Hidden vars
  po = null

  # Static vars
  @possibleQueues = []
  @parentObjects = {}

  if DEBUG
    DEBUG and log = (msg) ->
      arguments_ = ['OpenFire [SDK] -> ']
      for arg in arguments
        arguments_.push arg

      console.log.apply console, arguments_

  randomString = (length, chars) ->
    result = ""
    i = length

    while i > 0
      result += chars[Math.round(Math.random() * (chars.length - 1))]
      --i
    result

  uniqueID = ->
    timestampBase36 = (Math.round(new Date().getTime() / 1000) - 1409682796).toString 36
    return timestampBase36 + randomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-_")

  child: (path) ->
    # Child path parameter wont have a starting slash
    path = @path + "/" + path
    DEBUG and log "child path: ", path

    return new OpenFire(@baseUrl + path)

  name: ->
    parts = @path.split("/")
    lastPath = parts.slice(parts.length - 1, parts.length).join("/")

    return lastPath

  once: (type, callback) ->
    cb = (snapshot) =>
      @off(type, cb)
      callback snapshot

    @on(type, cb)

  off: (type, callback) ->
    events = @po.events["#{type}:#{@path}"]
    if events?
      i = 0
      for event in events
        if event is callback
          events.splice(i, 1)
          break

        i++

    return null

  on: (type, callback) ->
    attrs =
      action: 'sub'
      type: type
      path: @path

    events = @po.events["#{type}:#{@path}"] or []
    events.push(callback)
    @po.events["#{type}:#{@path}"] = events

    if type is 'connect'
      if @po.connected
        @emitLocalEvent('connect', @path, null, null)
      return

    @po.realtimeEngine.write(attrs)
    DEBUG and log "Created event for #{type}:#{@path}"

  push: ->
    child = @child(uniqueID())

    return child

  update: (obj) ->
    @po.queue.push(new QueueEntry('update', @path, obj))

  setAfterDisconnect: (obj) ->
    @set(obj, "afterDisconnect:")

  set: (obj, prefix = "") ->
    # The server will figure out what to do with the path
    ###
        The client will handle distinction of primitive types (int, string..)
        And turns sets with primitive types into something like this:

        db.child("users").child("lol").set("test")
        {
          action: 'update'
          path: '/db/users'
          obj: { 'lol': 'test' }
        }

        It removes a ton of logic at the serverside which is better for perfomance ;)
    ###

    if obj isnt null and typeof obj is 'object'
      @po.queue.push(new QueueEntry('set', @path, obj))
    else
      parts = @path.split("/")
      previous = parts.slice(0, parts.length -  1).join("/")
      lastPath = parts.slice(parts.length -  1, parts.length).join("/")

      _obj = {}
      _obj[lastPath] = obj

      @po.queue.push(new QueueEntry(prefix + 'update', previous, _obj))
      @po.queue.flush()

  _set: (obj, cb) ->
    { action, obj, path } = obj

    @po.realtimeEngine.write(
      action: action
      obj: obj
      path: path
    )

    if action is 'set'
      # Just emit a local event to ourselves
      # No changes could have been made to the server because we are setting a new object
      # The server will take care of other clients (it wont send a notification to us)
      DEBUG and log 'Emitting "value" event locally'
      @emitLocalEvent('value', path, obj)

    cb(null)

  emitLocalEvent: (type, path, obj, name = null) ->

    runEventsList = (events) ->
      snapshot = new Snapshot(obj, path, name)
      for event in events
        event(snapshot)

    if path is null
      for k of @po.events
        if k.indexOf("#{type}:") is 0
          events = @po.events[k]
          if events
            runEventsList events
    else
      events = @po.events["#{type}:#{path}"]
      if events
        runEventsList events

    return

  constructor: (@url) ->
    parts = @url.split("/")
    # Instance vars
    @path = "/" + parts.slice(3, parts.length).join("/")
    @baseUrl = parts.slice(0, 3).join("/")

    DEBUG and log "Path: ", @path

    # We reuse our connection and memory for different paths
    po = OpenFire.parentObjects[@baseUrl]
    if !po?
      DEBUG and log "Starting OpenFire Connection..."
      po = {}
      po.connected = no

      # For now, a basic in-memory queue
      po.queue = new OpenFire.possibleQueues[0](@)
      po.events = {}
      po.queue.intFlush = setInterval(->
        if not po.queue.flushing
          po.queue.flush()
      , 1000)

      DEBUG and log "base url: #{@baseUrl}"

      po.realtimeEngine = realtimeEngine = OFRealtimeEngine.connect(@baseUrl, {

      })

      realtimeEngine.on("end", =>
        DEBUG and log "Disconnected from realtime server"
        po.connected = no
        @emitLocalEvent('disconnect', null, null, null)
      )

      realtimeEngine.on("open", =>
        DEBUG and log "Connected to realtime server"
        po.connected = yes
        @emitLocalEvent('connect', null, null, null)
        realtimeEngine.on('data', (data) =>
          DEBUG and log "Got data ", JSON.stringify(data)
          { action } = data

          if action is 'data'
            { name, path, type, obj } = data
            @emitLocalEvent(type, path, obj, name)
        )
      )

      OpenFire.parentObjects[@baseUrl] = po

    @po = po

window.OpenFire = OpenFire
