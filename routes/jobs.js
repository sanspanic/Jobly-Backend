"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureIsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: login, admin
 */

router.post(
  "/",
  ensureLoggedIn,
  ensureIsAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobNewSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const job = await Job.create(req.body);
      return res.status(201).json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (case-insensitive, matches any part of string)
 * - minSalary
 * - hasEquity (will find jobs that provide non-zero amount of equity.
 *              if false or not included in filtering, lists jobs regardless of equity)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    //convert strings into correct format first, then validate
    if (req.query.minSalary) req.query.minSalary = Number(req.query.minSalary);

    if (req.query.hasEquity) {
      req.query.hasEquity === "true"
        ? (req.query.hasEquity = true)
        : (req.query.hasEquity = false);
    }

    const validator = jsonschema.validate(req.query, jobSearchSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const { title, minSalary, hasEquity } = req.query;

    //if query with filter terms passed in, filtering will occur
    if (title || minSalary || hasEquity) {
      const jobs = await Job.filter(req.query);
      return res.json({ jobs });
    }

    //no filtering
    const jobs = await Job.findAll();
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, companyHandle }
 *
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity } but NOT id or companyHandle
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: login, admin
 */

router.patch(
  "/:id",
  ensureLoggedIn,
  ensureIsAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new BadRequestError(errs);
      }

      const job = await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: login, admin
 */

router.delete(
  "/:id",
  ensureLoggedIn,
  ensureIsAdmin,
  async function (req, res, next) {
    try {
      await Job.remove(req.params.id);
      return res.json({ deleted: Number(req.params.id) });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
