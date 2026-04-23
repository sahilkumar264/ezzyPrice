const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");

const env = require("./config/env");
const createHttpError = require("./utils/createHttpError");
const apiRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.clientUrls.includes(origin)) {
        return callback(null, true);
      }

      return callback(createHttpError(403, "CORS blocked this origin."));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
