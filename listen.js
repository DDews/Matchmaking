"use strict";

const TIMEOUT = 60 * 1000; // 60 seconds
var http = require("http");
var jsonFile = require("jsonfile");
var rooms = jsonFile.readFile(file,function (err) {
  if (err) console.log(err);
});

class Server
{
    cleanRooms() {
      var time = +new Date();
      for (var room in rooms) {
        if (time - room.heartbeaet > TIMEOUT) delete rooms[room];
      }
    }
    constructor()
    {
        this.port = 8080;
        this.ip = "localhost";
        cleanRooms();
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
        // Process the request from the client
        // We are only supporting POST
        if (req.method === "POST")
        {
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
                cleanRooms();
                // Now that we have all data from the client, we process it
                console.log("Received data: " + body);
                // Split the key / pair values and print them out
                var obj = {};
                var vars = body.split("&");
                for (var t = 0; t < vars.length; t++)
                {
                    var pair = vars[t].split("=");
                    var key = decodeURIComponent(pair[0]);
                    var val = decodeURIComponent(pair[1]);
                    obj[key] = val;
                    console.log(key + ":" + val);
                }

                // Tell Unity that we received the data OK
                res.writeHead(200, {"Content-Type": "text/plain"});
                res.end("OK");
            });
        }
        else
        {
            cleanRooms();
            // Tell Unity that the HTTP method was not allowed
            res.writeHead(405, "Method Not Allowed", {"Content-Type": "text/html"});
            var out = [];
            for (var room in rooms) {
              out.push(rooms[room]);
            }
            res.end(JSON.stringify(out));
        }
    }

}
module.exports.Server = Server;
