const http = require('http');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const server = http.createServer(async (req, res) => {
    console.log("request");
    // await sleep(40000);
    // console.log("done sleeping");

    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: "failure",
      message: "Ooops"
    }));
    res.end();
});

server.listen(4000);
