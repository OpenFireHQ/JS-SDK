class BaseQueue

  constructor: (@parent) ->

  push: ->
    throw new Error("Dont call BaseQueue directly!")

OpenFire.BaseQueue = BaseQueue
