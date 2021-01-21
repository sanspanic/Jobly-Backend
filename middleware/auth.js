//TODO understand: what does use strict do?
"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    //TODO understand: why is authHeader not a Boolean?
    //  if (req.headers) {
    //  authHeader = req.headers.authorization
    // }  else {
    //  authHeader = false
    //    }
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      //TODO understand: what does below do?
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
      //console.log(res.locals);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when user must be admin.
 *
 * If not, raises Unauthorized.
 */

function ensureIsAdmin(req, res, next) {
  try {
    if (!res.locals.user.isAdmin)
      throw new UnauthorizedError("Only authorized for admins");
    return next();
  } catch (err) {
    return next(err);
  }
}

function ensureIsAdminOrSelf(req, res, next) {
  try {
    const user = res.locals.user;
    if (user.username === req.params.username || user.isAdmin) {
      return next();
    } else {
      throw new UnauthorizedError("Not authorized");
    }
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureIsAdmin,
  ensureIsAdminOrSelf,
};
