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
    db.on("value", (snapshot) ->
      value = snapshot.val()
      if value is null
        console.log "Value is null, that's ok, it could not have been added to the server yet, keep waiting"
      else
        expect(snapshot.val()).toEqual(simpleObject)
        cb()        
    )
