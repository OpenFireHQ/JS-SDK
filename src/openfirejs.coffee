class QueueEntry

  constructor: (@action, @path, @obj) ->

class Snapshot

  constructor: (@obj) ->

  val: ->
    return @obj

class OpenFire

  # Hidden vars
  po = null

  # Static vars
  @possibleQueues = []
  @parentObjects = {}

  log = (msg) ->
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
    timestampBase64 = OpenFire.Base64.fromNumber(Math.round(new Date().getTime() / 1000) - 1409682796)
    return timestampBase64 + randomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-_")

  child: (path) ->
    # Child path parameter wont have a starting slash
    path = @path + "/" + path
    log "child path: ", path

    return new OpenFire(@baseUrl + path)

  name: ->
    parts = @path.split("/")
    lastPath = parts.slice(parts.length - 1, parts.length).join("/")

    return lastPath

  on: (type, callback) ->
    attrs =
      action: 'sub'
      type: type
      path: @path

    events = @po.events["#{type}:#{@path}"] or []
    events.push(callback)
    @po.events["#{type}:#{@path}"] = events

    @po.realtimeEngine.write(attrs)
    log "Created event for #{type}:#{@path}"

  push: ->
    child = @child("#{uniqueID()}")

    return child

  update: (obj) ->
    @po.queue.push(new QueueEntry('update', @path, obj))

  set: (obj) ->
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

    if typeof obj is 'object'
      @po.queue.push(new QueueEntry('set', @path, obj))
    else
      parts = @path.split("/")
      previous = parts.slice(0, parts.length -  1).join("/")
      lastPath = parts.slice(parts.length -  1, parts.length).join("/")

      _obj = {}
      _obj[lastPath] = obj

      @po.queue.push(new QueueEntry('update', previous, _obj))

  _set: (obj, cb) ->
    { action, obj, path } = ob

    @po.realtimeEngine.write(
      action: action
      obj: obj
      path: path
    )

    if action is 'set'
      # Just emit a local event to ourselves
      # No changes could have been made to the server because we are setting a new object
      # The server will take care of other clients (it wont send a notification to us)
      @emitLocalEvent('value', path, obj)

    cb(null)

  emitLocalEvent: (type, path, obj) ->
    events = @po.events["#{type}:#{path}"]
    if events?
      snapshot = new Snapshot(obj)
      for event in events
        event(snapshot)

    return

  constructor: (@url) ->
    parts = @url.split("/")
    @path = "/" + parts.slice(3, parts.length).join("/")
    @baseUrl = parts.slice(0, 3).join("/")

    log "Path: ", @path

    # We reuse our connection and memory for different paths
    po = OpenFire.parentObjects[@baseUrl]
    if !po?
      log "Starting OpenFire Connection..."
      po = {}

      # For now, a basic in-memory queue
      po.queue = new OpenFire.possibleQueues[0](@)
      po.events = {}
      po.queue.intFlush = setInterval(->
        if not po.queue.flushing
          po.queue.flush()
      , 500)

      log "base url: #{@baseUrl}"

      po.realtimeEngine = realtimeEngine = OFRealtimeEngine.connect(@baseUrl, {

      })

      realtimeEngine.on("open", =>
        log "Connected to realtime server"
        realtimeEngine.on('data', (data) =>
          log "Got data ", data
          { action } = data

          if action is 'data'
            { path, type, obj } = data
            @emitLocalEvent(type, path, obj)
        )
      )

      OpenFire.parentObjects[@baseUrl] = po

    @po = po

window.OpenFire = OpenFire
