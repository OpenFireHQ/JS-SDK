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
    timestampBase64 = OpenFire.Base64.fromNumber(Math.round(new Date().getTime() / 1000) - 1409682796)
    return timestampBase64 + randomString(32, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-_")

  @possibleQueues = []
  @parentObjects = {}

  child: (path) ->
    # Child path parameter wont have a starting slash
    path = @path + "/" + path
    log "child path: ", path

    return new OpenFire(@baseUrl + path)

  push: ->
    po = OpenFire.parentObjects[@baseUrl]
    child = @child("#{uniqueID()}")

    return child

  update: (obj) ->
    po = OpenFire.parentObjects[@baseUrl]

    po.queue.push(new QueueEntry('update', @path, obj))

  set: (obj) ->
    # The server will figure out what to do with the path
    po = OpenFire.parentObjects[@baseUrl]

    po.queue.push(new QueueEntry('set', @path, obj))

  _set: (obj, cb) ->
    OpenFire.parentObjects[@baseUrl].realtimeEngine.write({
      type: obj.type
      obj: obj.obj
      path: obj.path
    })

    cb(null)

  constructor: (@url) ->
    parts = @url.split("/")
    @path = "/" + parts.slice(3, parts.length).join("/")
    @baseUrl = parts.slice(0, 3).join("/")

    log "Starting OpenFire Connection..."
    log "Path: ", @path

    # We reuse our socket and memory for different paths
    po = OpenFire.parentObjects[@baseUrl]
    if !po?

      po = {}

      # For now, a basic in-memory queue
      po.queue = new OpenFire.possibleQueues[0](@)
      po.queue.intFlush = setInterval(->
        if not po.queue.flushing
          po.queue.flush()
      , 500)

      log "base url: #{@baseUrl}"

      po.realtimeEngine = OFRealtimeEngine.connect(@baseUrl, {

      })

      po.realtimeEngine.on("connection", (con) ->
        log "Connected to realtime server"
      )

      OpenFire.parentObjects[@baseUrl] = po

window.OpenFire = OpenFire
