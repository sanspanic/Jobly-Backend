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

  static async create({ title, salary, equity, company_handle }) {
    //check if company handle exists
    const handleExists = await db.query(
      `SELECT handle
         FROM companies
         WHERE handle = $1`,
      [company_handle]
    );

    if (handleExists.rows.length === 0) {
      throw new BadRequestError(`No company with handle: ${company_handle}`);
    }

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, company_handle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all companies.
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

  /* Find all companies filtered by name, min and max employee count */

  static async filter(query) {
    let { name, minEmployees, maxEmployees } = query;

    //breaks query down into 3 parts: start, middle, end
    //middle further broken down into name query and employee num queries
    //middle put back together using join on ' AND '
    //captures values in array and assigns position based on array length

    if (minEmployees > maxEmployees) {
      throw new BadRequestError(
        `Maximum employees number must be larger than minimum employees number.`
      );
    }

    //put together query
    const queryStringStart = `SELECT handle,
                              name,
                              description,
                              num_employees AS "numEmployees",
                              logo_url AS "logoUrl"
                            FROM companies WHERE `;
    const queryStringEnd = `ORDER BY name`;

    let queryStringMiddle = ``;
    let valueArray = [];
    let valueIndices = {};
    let queryStringEmpFiltering = [];

    if (name) {
      valueArray.push(`%${name}%`);
      valueIndices.name = valueArray.length;
      queryStringMiddle = queryStringMiddle.concat(
        `name ILIKE $${valueIndices.name}`
      );
    }

    if (minEmployees) {
      valueArray.push(minEmployees);
      valueIndices.minEmployees = valueArray.length;
      queryStringEmpFiltering.push(
        `num_employees >= $${valueIndices.minEmployees}`
      );
    }

    if (maxEmployees) {
      valueArray.push(maxEmployees);
      valueIndices.maxEmployees = valueArray.length;
      queryStringEmpFiltering.push(
        `num_employees <= $${valueIndices.maxEmployees}`
      );
    }

    if (name) {
      queryStringMiddle = [queryStringMiddle, ...queryStringEmpFiltering].join(
        " AND "
      );
    } else {
      queryStringMiddle = [...queryStringEmpFiltering].join(" AND ");
    }

    //console.log(`${queryStringStart} ${queryStringMiddle} ${queryStringEnd}`);

    const companiesRes = await db.query(
      `${queryStringStart} ${queryStringMiddle} ${queryStringEnd}`,
      valueArray
    );

    /*     const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE name ILIKE $1
           ORDER BY name`,
      [`%${name}%`]
    ); */

    if (companiesRes.rows.length === 0) {
      throw new NotFoundError(
        `No company matching your search criteria was found.`
      );
    }
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Job;
