const { json, query } = require("express");
var express = require("express");
var router = express.Router();
const url = require("url");
const mongoose = require("mongoose");
const jwt_decode = require("jwt-decode");
const querystring = require("querystring");
var passport = require("passport"),
  OAuth2Strategy = require("passport-oauth").OAuth2Strategy;
const MongoClient = require("mongodb").MongoClient;
const refresh = require("passport-oauth2-refresh");
const { access } = require("fs");
const { info } = require("console");

const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CLIENT_ID = process.env.CLIENT_ID;
const WEB_CLIENT_URL = process.env.WEB_CLIENT_URL;
const BANK_NAME = process.env.BANK_NAME;
const MONGODB_URI = process.env.MONGODB_URI;
const CALLBACK_URL = process.env.CALLBACK_URL;

const strategy = new OAuth2Strategy(
  {
    authorizationURL: "https://hydra.catena.id/client/oauth2/auth",
    tokenURL: "https://hydra.catena.id/client/oauth2/token",
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ["profile", "openid", "offline", "ru_financial_data"],
  },

  function (accessToken, refreshToken, result, profile, done) {
    var idToken = result.id_token;
    var decoded = jwt_decode(idToken);
    console.log(decoded.sub);
    if (accessToken && refreshToken) {
      return done(null, true, {
        accessToken: accessToken,
        refreshToken: refreshToken,
        email: decoded.sub,
      });
    } else {
      return done(null, false);
    }
  }
);

passport.use("provider", strategy);
refresh.use("provider", strategy);

router.get("/", function (req, res, next) {
  res.send("login");
});

router.get(
  "/auth",
  passport.authenticate("provider", {
    state: "stateAdevcatena",
    session: false,
  })
);

MongoClient.connect(
  MONGODB_URI,
  {
    useUnifiedTopology: true,
  },
  async (err, client) => {
    if (err) return console.error(err);
    console.log("Connected to Database");

    const db = client.db("oauth2");
    const collection = db.collection("authorized");

    router.get("/refresh", async (req, res, next) => {
      try {
        var data = await collection.findOne({
          email: req.query.email,
          bankName: BANK_NAME,
        });
        // console.log(data.refreshToken);
        // return res.send(data);

        refresh.requestNewAccessToken(
          "provider",
          data.refreshToken,
          async (err, accessToken, refreshToken) => {
            try {
              if (err) {
                console.log(err);
                res.send(err);
              } else {
                var response = await collection.findOneAndUpdate(
                  {
                    email: req.query.email,
                    bankName: BANK_NAME,
                  },
                  {
                    $set: {
                      email: req.query.email,
                      bankName: BANK_NAME,
                      refreshToken: refreshToken,
                    },
                  }
                );
                return res.json({
                  accessToken: accessToken,
                  refreshToken: refreshToken,
                });
              }
            } catch (error) {
              return res.send(error);
            }
          }
        );
      } catch (error) {
        return res.send(error);
      }
    });

    router.get("/callback", (req, res, next) => {
      passport.authenticate(
        "provider",
        {
          state: "stateAdevcatena",
          session: false,
        },
        (err, user, info) => {
          if (user) {
            collection
              .findOne({
                email: info.email,
                bankName: BANK_NAME,
              })
              .then((data) => {
                if (data) {
                  collection
                    .findOneAndUpdate(
                      {
                        email: info.email,
                        bankName: BANK_NAME,
                      },
                      {
                        $set: {
                          email: info.email,
                          bankName: BANK_NAME,
                          refreshToken: info.refreshToken,
                        },
                      }
                    )
                    .then((result) => {
                      const query = querystring.stringify({
                        email: info.email,
                        accessToken: info.accessToken,
                        refreshToken: info.refreshToken,
                      });
                      return res.redirect(WEB_CLIENT_URL + "?" + query);
                    })
                    .catch((error) => res.send(error));
                } else {
                  collection
                    .insertOne({
                      email: info.email,
                      bankName: BANK_NAME,
                      refreshToken: info.refreshToken,
                    })
                    .then((data) => {
                      const query = querystring.stringify({
                        email: info.email,
                        accessToken: info.accessToken,
                        refreshToken: info.refreshToken,
                      });
                      return res.redirect(WEB_CLIENT_URL + "?" + query);
                    })
                    .catch((error) => res.send(error));
                }
              });
          } else {
            return res.send("Unauthorized").status(401);
          }
        }
      )(req, res, next);
    });
  }
);

module.exports = router;
