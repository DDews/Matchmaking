const express = require('express')
const app = express()
const cors = require('cors')
const port = 8080
const TIMEOUT = 60 * 1000; // 60 seconds
var jsonFile = require('jsonFile')
var bodyParser = require('body-parser');
var file = "./rooms.json"

var rooms = jsonFile.readFile(file, function(err, obj) {
  console.dir(obj)
});
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

function cleanRooms() {
  if (!rooms) rooms = {};
  var time = +new Date()
  for (var room in rooms) {
    if (time - rooms[room].heartbeat > TIMEOUT) {
      delete rooms[room]
    }
  }
  jsonFile.writeFile(file,rooms, function (err) {
    console.log(err)
  })
}
app.post('/', (request, response) => {
  cleanRooms();
  response.send(JSON.stringify(rooms));
})
app.post('/api/createMatch', function(req, res) {
    cleanRooms();
    var externalIP = req.body.externalIP;
    var internalIP = req.body.ipAddress;
    var guid = req.body.guid;
    var roomName = req.body.roomName;
    var username = req.body.username;
    var password = req.body.password;
    if (roomName in rooms) {
      res.send(JSON.stringify({error: "Room name taken"}));
      return;
    }
    rooms[roomName] = {
      externalIP: externalIP,
      internalIP: internalIP,
      guid: guid,
      roomName: roomName,
      username: username,
      heartbeat: +new Date()
    }
    jsonFile.writeFile(file, rooms, function(err) {
      console.log(err);
    });
    res.send(JSON.stringify({success: "room created"}));
});
app.post('/api/heartbeat', function(req, res) {
  var roomName = req.body.roomName;
  if (roomName in rooms) {
    rooms[roomName].heartbeat = +new Date();
  }
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
