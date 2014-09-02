class BaseQueue
  
  flushing: no
  constructor: (@parent) ->

  push: ->
    throw new Error("Dont call BaseQueue directly!")

OpenFire.BaseQueue = BaseQueue
