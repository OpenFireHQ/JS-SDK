class MemoryQueue extends OpenFire.BaseQueue

  queue: []

  push: (o) ->
    @queue.push o

  flush: ->

    for entry in @queue
      @parent._set(entry, ->
        
      )

    @queue.length = []

OpenFire.possibleQueues.push MemoryQueue
