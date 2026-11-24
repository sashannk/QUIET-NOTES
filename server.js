const express = require("express");

const connectDB = require("./db");
const { userRouter } = require("./routes/user.route");
const { noteRouter } = require("./routes/note.route");
const { communityRouter } = require("./routes/community.route");
const { auth } = require("./midddlewere/auth.middlewere");

const app = express();

app.use(express.json());
app.use("/user", userRouter);
app.use("/notes", auth, noteRouter);
app.use("/community", auth, communityRouter);

app.get("/home", (req, res) => {
  res.send({ msg: "Welcome to Note Application" });
});

app.get("/dashboard", auth, (req, res) => {
  res.send({ msg: "Welcome to Note Application" });
});

async function startServer() {
  try {
    await connectDB();
    app.listen(8080, () => {
      console.log("Server started on port 8080");
    });
  } catch (error) {
    process.exit(1);
  }
}

startServer();
