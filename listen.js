"use strict";

const TIMEOUT = 30 * 1000; // 30 seconds
var http = require("http");
const file = "rooms.json";
var url = require("url");
var myip = require('quick-local-ip');
var jsonFile = require("jsonfile");
var rooms = jsonFile.readFile(file,function (err, obj) {
  console.dir(obj);
});

class Server
{
    cleanRooms() {
      if (typeof rooms == "undefined") rooms = {};
      var time = +new Date();
      for (var room in rooms) {
        if (time - rooms[room].heartbeat > TIMEOUT) delete rooms[room];
      }
      jsonFile.writeFile(file,rooms,function (err) {
        if (err) console.log(err);
      });
    }
    constructor()
    {
        this.port = 8080;
        this.ip = myip.getLocalIP4();
        this.cleanRooms();
        this.start();
    }

    start()
    {
        this.server = http.createServer((req, res) =>
        {
            this.processRequest(req, res);
        });

        this.server.on("clientError", (err, socket) =>
        {
            socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
        });
        console.log("Server created");
    }

    listen()
    {
        this.server.listen(this.port, this.ip);
        console.log("Server listening for connections");
    }

    processRequest(req, res)
    {
        var server = this;
        // Process the request from the client
        // We are only supporting POST
        if (req.method === "POST")
        {
            const parsedUrl = url.parse(req.url);
            let pathName = `.${parsedUrl.pathname}`;
            // Post data may be sent in chunks so need to build it up
            var body = "";
            req.on("data", (data) =>
            {
                body += data;
                // Prevent large files from benig posted
                if (body.length > 1024)
                {
                    // Tell Unity that the data sent was too large
                    res.writeHead(413, "Payload Too Large", {"Content-Type": "text/html"});
                    res.end("Error 413");
                }
            });
            req.on("end", () =>
            {
                console.log("Received data: " + body);
                // Split the key / pair values and print them out
                var obj = {};
                var vars = body.split("&");
                for (var t = 0; t < vars.length; t++)
                {
                    var pair = vars[t].split("=");
                    var key = decodeURIComponent(pair[0]);
                    var val = decodeURIComponent(pair[1]);
                    if (key != "password") {
                      obj[key] = val;
                      console.log(key + ":" + val);
                    }
                }
                if (pathName == "/heartbeat") {
                  console.log("received heartbeat for room " + obj.roomName);
                  if (obj.roomName in rooms) {
                    rooms[obj.roomName].heartbeat = +new Date();
                  }
                }
                else {
                  server.cleanRooms();
                  if (obj.roomName in rooms) {
                    res.writeHead(403,"Room name taken",{"Content-Type": "text/plain"});
                    res.end("ROOM TAKEN");
                  } else {
                    obj.heartbeat = +new Date();
                    rooms[obj.roomName] = obj;
                    jsonFile.writeFile(file,rooms,function (err) {
                      if (err) console.log(err);
                    });
                    // Tell Unity that we received the data OK
                    res.writeHead(200, {"Content-Type": "text/plain"});
                    res.end("OK");
                  }
                }
            });
        }
        else
        {
            server.cleanRooms();
            // Tell Unity that the HTTP method was not allowed
            res.writeHead(200, {"Content-Type": "text/plain"});
            var out = [];
            for (var room in rooms) {
              out.push(rooms[room]);
            }
            res.end(JSON.stringify(out));
        }
    }

}
module.exports.Server = Server;
