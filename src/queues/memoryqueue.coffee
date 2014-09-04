class MemoryQueue extends OpenFire.BaseQueue

  queue: []

  push: (o) ->
    @queue.push o

  flush: ->

    _flush = =>
      entry = @queue[0]
      @parent._set(entry, =>
        @queue.splice(0, 1)
        if @queue.length > 0
          setTimeout(->
            _flush()
          , 10)
        else
          @flushing = no
      )

    if @queue.length > 0
      @flushing = yes
      _flush()

OpenFire.possibleQueues.push MemoryQueue
