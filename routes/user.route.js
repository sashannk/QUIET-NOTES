const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { userModel } = require("../model/user.model");
const userRouter = express.Router();

userRouter.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).send({ msg: "Name, email, and password are required" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).send({ msg: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.create({ name, email, password: hashedPassword });
    res.status(201).send({ msg: "User registered successfully" });
  } catch (error) {
    console.error("Registration failed:", error.message);
    res.status(500).send({ msg: "Registration failed" });
  }
});

userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).send({ msg: "Email and password are required" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).send({ msg: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).send({ msg: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.send({ msg: "User login successfully", token, name: user.name });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).send({ msg: "Login failed" });
  }
});

module.exports = { userRouter };
