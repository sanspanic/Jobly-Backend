"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`
    );
    return companiesRes.rows;
  }

  /* Find all companies filtered by name, min and max employee count */

  static async filter(query) {
    const { name, minEmployees, maxEmployees } = query;

    //breaks query down into 3 parts: start, middle, end
    //middle eventually put back together using join on ' AND '
    //captures values in array and assigns position based on array length, array then passed to final query

    if (minEmployees > maxEmployees) {
      throw new BadRequestError(
        `Maximum employees number must be larger than minimum employees number.`
      );
    }

    //initialise vars to capture indexes associated with values, and the valueArr to pass in to query
    const indexes = { name: null, minEmployees: null, maxEmployees };
    const valueArr = [];

    //eventually below query parts will be combined into final query. middle part with first be combined by .join on ' AND '
    const firstPartOfQuery = `SELECT handle,
                              name,
                              description,
                              num_employees AS "numEmployees",
                              logo_url AS "logoUrl"
                            FROM companies WHERE`;
    const lastPartOfQuery = `ORDER BY name`;
    const middlePartOfQueryArr = [];

    if (name) {
      valueArr.push(`%${name}%`);
      indexes.name = valueArr.length;
      middlePartOfQueryArr.push(`name ILIKE $${indexes.name}`);
    }

    if (minEmployees) {
      valueArr.push(minEmployees);
      indexes.minEmployees = valueArr.length;
      middlePartOfQueryArr.push(`num_employees >= $${indexes.minEmployees}`);
    }

    if (maxEmployees) {
      valueArr.push(maxEmployees);
      indexes.maxEmployees = valueArr.length;
      middlePartOfQueryArr.push(`num_employees <= $${indexes.maxEmployees}`);
    }

    const middlePartOfQuery = middlePartOfQueryArr.join(" AND ");

    const companyRes = await db.query(
      `${firstPartOfQuery} ${middlePartOfQuery} ${lastPartOfQuery}`,
      valueArr
    );

    if (companyRes.rows.length === 0) {
      throw new NotFoundError("No company found matching your search criteria");
    }

    return companyRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    //tradeoff: more JS but only one db query, or less JS but 2 separate db queries. opted for one query only
    const companyRes = await db.query(
      `SELECT c.handle,
              c.name,
              c.description,
              c.num_employees AS "numEmployees",
              c.logo_url AS "logoUrl", 
              j.id,
              j.company_handle
        FROM companies AS c
        LEFT JOIN jobs AS j
        ON c.handle = j.company_handle
        WHERE c.handle = $1`,
      [handle]
    );

    if (!companyRes.rows[0])
      throw new NotFoundError(`No company with handle: ${handle}`);

    let jobIds = [];
    //only push in id of job if company has any jobs associated with it, otherwise arr will have "null" inside instead of being empty
    if (companyRes.rows[0].id) {
      jobIds = companyRes.rows.map((row) => row.id);
    }

    const companyFinal = {
      ...companyRes.rows[0],
      jobs: jobIds,
    };
    //delete unnecessary query results relating to job
    delete companyFinal.id;
    delete companyFinal.company_handle;

    return companyFinal;
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

module.exports = Company;
