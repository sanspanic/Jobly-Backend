"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if invalid company_handle
   * */

  static async create({ title, salary, equity, companyHandle }) {
    //check if company handle exists
    const handleExists = await db.query(
      `SELECT handle
         FROM companies
         WHERE handle = $1`,
      [companyHandle]
    );

    if (handleExists.rows.length === 0) {
      throw new BadRequestError(`No company with handle: ${companyHandle}`);
    }

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           ORDER BY title`
    );
    return jobsRes.rows;
  }

  /** Find all jobs based on search criteria (title, minSalary, hasEquity)
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async filter(query) {
    const { title, minSalary, hasEquity } = query;

    //initialise vars to capture indexes associated with values, and the valueArr to pass in to query
    const indexes = { title: null, minSalary: null };
    const valueArr = [];

    //eventually below query parts will be combined into final query. middle part with first be combined by .join on ' AND '
    const firstPartOfQuery = `SELECT id, title, salary, equity, company_handle AS "companyHandle" FROM jobs WHERE`;
    const lastPartOfQuery = `ORDER BY title`;
    const middlePartOfQueryArr = [];

    if (title) {
      valueArr.push(`%${title}%`);
      indexes.title = valueArr.length;
      middlePartOfQueryArr.push(`title ILIKE $${indexes.title}`);
    }

    if (minSalary) {
      valueArr.push(minSalary);
      indexes.minSalary = valueArr.length;
      middlePartOfQueryArr.push(`salary > $${indexes.minSalary}`);
    }

    if (hasEquity === true) {
      middlePartOfQueryArr.push(`equity > 0`);
    }

    const middlePartOfQuery = middlePartOfQueryArr.join(" AND ");

    const jobsRes = await db.query(
      `${firstPartOfQuery} ${middlePartOfQuery} ${lastPartOfQuery}`,
      valueArr
    );

    if (jobsRes.rows.length === 0) {
      throw new NotFoundError("No jobs found matching your search criteria");
    }

    return jobsRes.rows;
  }

  /** Given an id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, equity, salary} but id or company_handle won't be updated
   *
   * Returns {id, title, equity, salary, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No job with id: ${id}`);
  }
}

module.exports = Job;
