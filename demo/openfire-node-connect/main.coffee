require "../../dist/openfire-node"

#Intialize our DB
#getting-started is our namespace for this example project
db = new OpenFire("http://localhost:5454/getting-started")

console.log db
