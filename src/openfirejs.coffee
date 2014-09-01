class QueueEntry

  constructor: (@type, @path, @obj) ->


class OpenFire
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
    return randomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-_")

  @possibleQueues = []
  @parentObjects = null

  child: (path) ->
    # Child path parameter wont have a starting slash
    path = @path + "/" + path
    log "child path: ", path

    return new OpenFire(OpenFire.parentObjects.base + path)

  push: ->
    po = OpenFire.parentObjects
    child = @child("#{uniqueID()}")

    return child

  update: (obj) ->
    po = OpenFire.parentObjects

    po.queue.push(new QueueEntry('update', @path, obj))
    po.queue.flush()

  set: (obj) ->
    # The server will figure out what to do with the path
    po = OpenFire.parentObjects

    po.queue.push(new QueueEntry('set', @path, obj))
    po.queue.flush()

  _set: (obj, cb) ->
    OpenFire.parentObjects.realtimeEngine.write({
      type: obj.type
      obj: obj.obj
      path: obj.path
    })

    cb(null)

  constructor: (@url) ->
    parts = @url.split("/")
    @path = "/" + parts.slice(3, parts.length).join("/")
    log "Path: ", @path

    # We reuse our socket and memory for different paths
    po = OpenFire.parentObjects
    if po == null

      po = {}

      # For now, a basic in-memory queue
      po.queue = new OpenFire.possibleQueues[0](@)
      po.base = parts.slice(0, 3).join("/")

      log "base url: #{po.base}"

      po.realtimeEngine = OFRealtimeEngine.connect(po.base, {

      })

      po.realtimeEngine.on("connection", (con) ->
        log "Connected to realtime server"
      )

      OpenFire.parentObjects = po

window.OpenFire = OpenFire
