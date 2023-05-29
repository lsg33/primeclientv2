export { };

const express = require("express");
const app = express.Router();
import functions from "../utilities/structs/functions";

app.get("/content/api/pages/*", async (req, res) => {
    const contentpages = functions.getContentPages(req);

    res.json(contentpages);
});

module.exports = app;