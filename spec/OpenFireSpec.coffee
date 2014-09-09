db = null
simpleObject = lol: true

describe "Initializing OpenFire", ->
  it "Should be available trough SDK class", ->
    expect(OpenFire).toBeDefined()

  it "Should connect to the server (it will try localhost:5454 using db /test)", ->
    db = new OpenFire("http://127.0.0.1:5454/test")
    expect(db).toBeDefined()

describe "Creation simple object", ->
  it "Should write a object with contents { lol: true }", ->
    db.set(simpleObject)

describe "Callback test", ->
  it "Should give me back the contents of the simple object we created", (cb) ->
    callback = (snapshot) ->
      value = snapshot.val
      if value is null
        console.log "Value is null, that's ok, it could not have been added to the server yet, keep waiting"
      else
        if value.lol is true
          db.off('value', callback)
          cb()

    db.on("value", callback)

  it "Should callback when adding a child", (cb) ->
    users = db.child("users")
    users.once("child_added", (user) ->
      console.log "User 1: ", JSON.stringify(user.val)
      cb()
    )
    users.push().set(username: "PeterPower!")

  it "Should callback when replacing the users list with a child of a different name", (cb) ->
    users = db.child("users")
    users.once("child_added", (user) ->
      console.log "User 2: ", JSON.stringify(user.val)
      cb()
    )

    users.set({ lol: { username: "KuroiRoy" }})

  it "Should callback when setting user using alternative syntax", (cb) ->
    users = db.child("users")
    users.once("child_added", (user) ->
      console.log "User 3: ", JSON.stringify(user.val)
      cb()
    )

    users.child("megusta").child("username").set("Mr None Of your Bussines")

  it "Should callback when replacing the users list with a child that is a primitive type", (cb) ->
    users = db.child("users")
    users.once("child_changed", (user) ->
      val = user.val
      console.log "User 4: ", val
      cb()
    )

    users.set({ lol: 3})

  it "Should callback with child_removed when I try to delete something", (cb) ->
    users = db.child("users")
    users.once("child_removed", (oldUser) ->
      expect(oldUser.val).toBe(3)
      cb()
    )
    users.set(lol: null)
