class MemoryQueue extends OpenFire.BaseQueue

  debounce: (func, threshold, execAsap) ->
    timeout = null
    (args...) ->
      obj = this
      delayed = ->
        func.apply(obj, args) unless execAsap
        timeout = null
      if timeout
        clearTimeout(timeout)
      else if (execAsap)
        func.apply(obj, args)
      timeout = setTimeout delayed, threshold || 100

  queue: []

  push: (o) ->
    @queue.push o

  flush: ->

    _flush = =>
      entry = @queue[0]
      @parent._set(entry, =>
        @queue.splice(0, 1)
        if @queue.length > 0
          _flush()
        else
          @flushing = no
      )

    if @queue.length > 0
      @flushing = yes
      _flush()

OpenFire.possibleQueues.push MemoryQueue
