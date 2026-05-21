const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataFile = path.join(root, "data.json");
const port = Number(process.env.PORT || 5200);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  if (req.url === "/api/state" && req.method === "GET") {
    sendJson(res, readState());
    return;
  }

  if (req.url === "/api/state" && req.method === "PUT") {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body || "{}");
      const nextState = {
        records: Array.isArray(data.records) ? data.records : [],
        settings: data.settings && typeof data.settings === "object" ? data.settings : {}
      };
      fs.writeFileSync(dataFile, JSON.stringify(nextState, null, 2), "utf8");
      sendJson(res, nextState);
    } catch {
      sendJson(res, { error: "保存失败" }, 400);
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`520 site: http://localhost:${port}`);
});

function readState() {
  if (!fs.existsSync(dataFile)) {
    return {
      records: [],
      settings: {}
    };
  }

  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return {
      records: [],
      settings: {}
    };
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 60 * 1024 * 1024) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const safePath = path.normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream"
  });
  fs.createReadStream(filePath).pipe(res);
}
