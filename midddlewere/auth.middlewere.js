const jwt = require("jsonwebtoken");
const auth = (req, res, next) => {
  // Logic

  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : authorization;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).send({ msg: "Please log in to access your notes" });
  }
};

module.exports = { auth };
