"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** CREATE */

describe("create", function () {
  const newJob = {
    title: "Administrator",
    salary: 20000,
    equity: "0.1",
    companyHandle: "c1",
  };

  test("works: create new job", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      title: "Administrator",
      salary: 20000,
      equity: "0.1",
      companyHandle: "c1",
      id: expect.any(Number),
    });
  });

  test("error: wrong company handle", async function () {
    try {
      newJob.companyHandle = "nope";
      let job = await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/* ************************ FIND ALL */

describe("findAll", function () {
  test("works: list all jobs", async function () {
    let jobs = await Job.findAll();

    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "j1",
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
      {
        id: testJobIds[1],
        title: "j2",
        salary: 50000,
        equity: "1",
        companyHandle: "c2",
      },
      {
        id: testJobIds[2],
        title: "j3",
        salary: 20000,
        equity: "0.2",
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** FILTER */

describe("filter", function () {
  test("works: filter by title", async function () {
    let jobs = await Job.filter({ title: "j1" });
    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "j1",
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: filter by title case-insensitive", async function () {
    let jobs = await Job.filter({ title: "J1" });
    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "j1",
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: filter by minSalary", async function () {
    let jobs = await Job.filter({ minSalary: 80000 });
    expect(jobs).toEqual([
      {
        id: testJobIds[0],
        title: "j1",
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: filter by equity - has equity", async function () {
    let jobs = await Job.filter({
      hasEquity: true,
    });
    expect(jobs).toEqual([
      {
        id: testJobIds[1],
        title: "j2",
        salary: 50000,
        equity: "1",
        companyHandle: "c2",
      },
      {
        id: testJobIds[2],
        title: "j3",
        salary: 20000,
        equity: "0.2",
        companyHandle: "c3",
      },
    ]);
  });

  test("works: filter by all", async function () {
    let jobs = await Job.filter({
      minSalary: 40000,
      hasEquity: true,
      title: "j",
    });
    expect(jobs).toEqual([
      {
        id: testJobIds[1],
        title: "j2",
        salary: 50000,
        equity: "1",
        companyHandle: "c2",
      },
    ]);
  });

  test("error: search criteria don't match any jobs", async function () {
    try {
      await Job.filter({ title: "name" });
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/* ************************ GET BY ID */

describe("get by ID", function () {
  test("works: gets job by ID", async function () {
    console.log("TEST JOB ID:");
    console.log(testJobIds[0]);
    let job = await Job.get(testJobIds[0]);

    expect(job).toEqual({
      id: testJobIds[0],
      title: "j1",
      salary: 100000,
      equity: "0",
      companyHandle: "c1",
    });
  });
  test("error: not found if no such job id", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/* ************************ UPDATE  */

describe("update", function () {
  const updateData = {
    title: "New",
    salary: 100000,
    equity: 0,
  };

  test("works: all data given", async function () {
    let job = await Job.update(testJobIds[0], updateData);
    expect(job).toEqual({
      id: testJobIds[0],
      title: "New",
      salary: 100000,
      equity: "0",
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE id = '${testJobIds[0]}'`
    );
    expect(result.rows).toEqual([
      {
        id: testJobIds[0],
        title: "New",
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: null fields given", async function () {
    const updateDataSetNulls = {
      title: "New",
      salary: null,
      equity: null,
    };

    let job = await Job.update(testJobIds[0], updateDataSetNulls);
    expect(job).toEqual({
      id: testJobIds[0],
      ...updateDataSetNulls,
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle as "companyHandle"
             FROM jobs
             WHERE id = '${testJobIds[0]}'`
    );
    expect(result.rows).toEqual([
      {
        id: testJobIds[0],
        ...updateDataSetNulls,
        companyHandle: "c1",
      },
    ]);
  });

  test("error: not found if no such job id", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("error: bad request with no data", async function () {
    try {
      await Job.update(testJobIds[0], {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** DELETE */

describe("remove", function () {
  test("works: deletes job", async function () {
    await Job.remove(testJobIds[0]);
    const res = await db.query(
      `SELECT id FROM jobs WHERE id='${testJobIds[0]}'`
    );
    expect(res.rows.length).toEqual(0);
  });

  test("error: not found if no such job id", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
