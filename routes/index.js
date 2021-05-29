const { json, query } = require("express");
var express = require("express");
var router = express.Router();
const url = require("url");
var passport = require("passport"),
  OAuth2Strategy = require("passport-oauth").OAuth2Strategy;

const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CLIENT_ID = process.env.CLIENT_ID;
const WEB_CLIENT_URL = process.env.WEB_CLIENT_URL;
const jwt_decode = require("jwt-decode");
const querystring = require("querystring");

passport.use(
  "provider",
  new OAuth2Strategy(
    {
      authorizationURL: "https://hydra.catena.id/client/oauth2/auth",
      tokenURL: "https://hydra.catena.id/client/oauth2/token",
      // clientID: "d676e5d0-93e2-44c1-a9e8-adbb7c40544b",
      clientID: CLIENT_ID,
      // clientSecret: "KHmr_OrR1JStN0UmHXaYJLJLMy",
      clientSecret: CLIENT_SECRET,
      callbackURL: "http://localhost:4000/callback",
      scope: ["profile", "openid", "offline", "ru_financial_data"],
    },
    function (accessToken, refreshToken, result, profile, done) {
      // console.log(req);
      // console.log(accessToken);
      // console.log(refreshToken);
      // // console.log(profile);
      // console.log(result);
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
  )
);

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

router.get("/callback", (req, res, next) => {
  passport.authenticate(
    "provider",
    {
      state: "stateAdevcatena",
      session: false,
    },
    (err, user, info) => {
      if (user) {
        console.log(WEB_CLIENT_URL);
        const query = querystring.stringify({
          email: info.email,
          accessToken: info.accessToken,
          refreshToken: info.refreshToken,
        });
        return res.redirect(WEB_CLIENT_URL + "?" + query);
      } else {
        return res.send("Unauthorized").status(401);
      }
    }
  )(req, res, next);
});

module.exports = router;
