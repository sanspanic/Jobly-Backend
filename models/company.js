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

module.exports = Company;
