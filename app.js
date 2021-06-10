const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
const bcrypt = require("bcrypt");
app.use(express.json());
const jwt = require("jsonwebtoken");
let db;
const initalizing = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("server started");
    });
  } catch (e) {
    console.log(e);
  }
};

initalizing();
const converting = (i) => {
  return {
    username: i.username,
    tweet: i.tweet,
    dateTime: i.date_time,
  };
};

const authenticatingToken = (request, response, next) => {
  const header = request.headers["authorization"];
  let token;
  if (header !== undefined) {
    token = header.split(" ")[1];
  }
  if (token === undefined) {
    response.status(400);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(token, "lucky", (error, payload) => {
      if (error) {
        response.status(400);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hasedPassword = await bcrypt.hash(password, 10);

  const query = `SELECT * FROM user WHERE username="${username}"`;
  const userChecking = await db.get(query);
  if (userChecking !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const insertQuery = `INSERT INTO user(username,password,name,gender)
        VALUES("${username}","${hasedPassword}","${name}","${gender}")`;
      await db.run(insertQuery);
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const query = `SELECT * FROM user WHERE username="${username}"`;
  const checking = await db.get(query);
  if (checking === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, checking.password);
    if (isPasswordMatched === true) {
      const payLoad = { username: username };
      const jwtToken = jwt.sign(payLoad, "lucky");

      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get(
  "/user/tweets/feed/",
  authenticatingToken,
  async (request, response) => {
    const query = `SELECT username,tweet,date_time
    FROM user NATURAL JOIN tweet WHERE user.user_id=5 ORDER BY date_time DESC LIMIT 4`;
    const result = await db.all(query);
    response.send(result.map((item) => converting(item)));
  }
);

app.get("/user/following/", authenticatingToken, async (request, response) => {
  const query = `SELECT following_user_id FROM follower WHERE follower_user_id=2`;
  const result = await db.all(query);
  const a = result.map(async (item) => {
    const { following_user_id } = item;
    const q = `SELECT name FROM user WHERE user_id=${following_user_id}`;
    const r = await db.get(q);
    console.log(r);
    return r;
  });
  response.send(a);
});
module.exports = app;
