const http = require("http");

function makeRequest(path, method = "GET", body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) options.headers["Authorization"] = `Bearer ${token}`;
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    console.log("Logging in...");
    const login = await makeRequest("/api/v1/auth/login", "POST", {
      email: "admin@test.com",
      password: "123456",
    });
    console.log("Login status", login.status);
    const token = login.body?.accessToken;
    if (!token) {
      console.error("No token");
      return;
    }
    console.log("Token ok. Listing projects...");
    const projects = await makeRequest("/api/v1/projects", "GET", null, token);
    console.log("Projects status", projects.status);
    if (projects.body?.projects) {
      console.log("Projects count", projects.body.projects.length);
      if (projects.body.projects.length > 0)
        console.log("First project id", projects.body.projects[0]._id);
    } else {
      console.log("Projects response:", projects.body || projects.text);
    }

    // try tasks for first project
    const pid = projects.body?.projects?.[0]?._id;
    if (pid) {
      const tasks = await makeRequest(
        `/api/v1/tasks/${pid}`,
        "GET",
        null,
        token,
      );
      console.log("Tasks status", tasks.status);
      console.log(
        "Tasks body sample:",
        tasks.body?.tasks?.slice(0, 2) || tasks.body || tasks.text,
      );
    }
  } catch (e) {
    console.error("Error", e.message);
  }
})();
