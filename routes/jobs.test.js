"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new job",
    salary: 30000,
    equity: "0",
    companyHandle: "c1",
  };

  test("works: for admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: { ...newJob, id: expect.any(Number) },
    });
  });

  test("error: unauth for non-admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("error: unauth for anon", async function () {
    const resp = await request(app).post("/jobs").send(newJob);
    expect(resp.statusCode).toEqual(401);
  });

  test("error: bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        salary: 10000,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("error: bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        nope: "nope",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("works: ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });

  test("works: filtering by TITLE", async function () {
    const resp = await request(app).get("/jobs").query({ title: "j1" });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: testJobIds[0],
          title: "j1",
          salary: 100000,
          equity: "0",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("works: filtering by ALL", async function () {
    const resp = await request(app)
      .get("/jobs")
      .query({ title: "j", minSalary: 40000, hasEquity: true });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: testJobIds[1],
          title: "j2",
          salary: 50000,
          equity: "1",
          companyHandle: "c2",
        },
      ],
    });
  });

  test("works: equity set to false", async function () {
    const resp = await request(app)
      .get("/jobs")
      .query({ title: "j", minSalary: 10000, hasEquity: false });
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });

  test("works: converts strings to correct formats", async function () {
    const resp = await request(app)
      .get("/jobs")
      .query({ title: "j", minSalary: "40000", hasEquity: "true" });
    expect(resp.body).toEqual({
      jobs: [
        {
          id: testJobIds[1],
          title: "j2",
          salary: 50000,
          equity: "1",
          companyHandle: "c2",
        },
      ],
    });
  });

  test("error: wrong query passed in - schema validation", async function () {
    const resp = await request(app).get("/jobs").query({ bla: "blabla" });
    expect(resp.statusCode).toEqual(400);
  });

  test("error: test next() handler", async function () {
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works: for anon", async function () {
    const resp = await request(app).get(`/jobs/${testJobIds[0]}`);
    expect(resp.body).toEqual({
      job: {
        id: testJobIds[0],
        title: "j1",
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
    });
  });

  test("error: not found for invalid job id", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works: for admin users, partial data given", async function () {
    const resp = await request(app)
      .patch(`/jobs/${testJobIds[0]}`)
      .send({
        title: "New title",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: testJobIds[0],
        title: "New title",
        salary: 100000,
        equity: "0",
        companyHandle: "c1",
      },
    });
  });

  test("works: for admin users, full data given", async function () {
    const resp = await request(app)
      .patch(`/jobs/${testJobIds[0]}`)
      .send({
        title: "New title",
        salary: 50000,
        equity: "0.9",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: testJobIds[0],
        title: "New title",
        salary: 50000,
        equity: "0.9",
        companyHandle: "c1",
      },
    });
  });

  test("error: unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/${testJobIds[0]}`).send({
      title: "New title",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("error: unauth for non-admin users", async function () {
    const resp = await request(app)
      .patch(`/jobs/${testJobIds[0]}`)
      .send({
        title: "New title",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("error: not found if invalid id", async function () {
    const resp = await request(app)
      .patch(`/jobs/0`)
      .send({
        title: "new title",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("error: bad request on id change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/${testJobIds[0]}`)
      .send({
        id: 2,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("error: bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/${testJobIds[0]}`)
      .send({
        title: 123,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works: for admin users", async function () {
    const resp = await request(app)
      .delete(`/jobs/${testJobIds[0]}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: testJobIds[0] });
  });

  test("error: unath for non-admin users", async function () {
    const resp = await request(app)
      .delete(`/jobs/${testJobIds[0]}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("error: unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/${testJobIds[0]}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("error: not found if invalid job id", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
