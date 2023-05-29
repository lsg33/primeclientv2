export { };

const express = require("express");
const app = express.Router();

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const error = require("../structs/error.js");

app.get("/eulatracking/api/shared/agreements/fn", async (req, res) => {

    console.log("Requested EULA")

    res.send("Hello eula lol")

});

module.exports = app;