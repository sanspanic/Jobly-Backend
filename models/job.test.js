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

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "Administrator",
    salary: 20000,
    equity: "0.1",
    company_handle: "c1",
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
      newJob.company_handle = "nope";
      let job = await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

describe("findAll", function () {
  test("works: list all jobs", async function () {
    let jobs = await Job.findAll();
    console.log("in test ids:", testJobIds);
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
