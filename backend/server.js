const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Campus Cart Backend Running ");
});

app.listen(5000, () => {
  console.log("Server started on port 5000");
});

