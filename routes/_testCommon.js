"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const { createToken } = require("../helpers/tokens");
const Job = require("../models/job.js");

const testJobIds = [];

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM jobs");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM applications");

  await Company.create({
    handle: "c1",
    name: "C1",
    numEmployees: 1,
    description: "Desc1",
    logoUrl: "http://c1.img",
  });
  await Company.create({
    handle: "c2",
    name: "C2",
    numEmployees: 2,
    description: "Desc2",
    logoUrl: "http://c2.img",
  });
  await Company.create({
    handle: "c3",
    name: "C3",
    numEmployees: 3,
    description: "Desc3",
    logoUrl: "http://c3.img",
  });
  await Company.create({
    handle: "c4",
    name: "C4",
    numEmployees: 4,
    description: "Desc4",
    logoUrl: "http://c4.img",
  });

  //must use registerSelf method to pass in custom password, otherwise pw will be random.
  //password necessary to know for one of the auth tests (POST auth/token) so registerSelf method used here
  await User.registerSelf({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    password: "password1",
    email: "user1@user.com",
    isAdmin: false,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    isAdmin: false,
  });
  await User.register({
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    isAdmin: false,
  });
  await User.register({
    username: "admin",
    firstName: "admin",
    lastName: "admin",
    email: "admin@user.com",
    isAdmin: true,
  });
  await Job.create({
    title: "j1",
    salary: 100000,
    equity: 0,
    companyHandle: "c1",
  });
  await Job.create({
    title: "j2",
    salary: 50000,
    equity: 1,
    companyHandle: "c2",
  });
  await Job.create({
    title: "j3",
    salary: 20000,
    equity: 0.2,
    companyHandle: "c3",
  });

  //get IDs of jobs
  const res = await Job.findAll();
  res.forEach((job) => {
    testJobIds.push(job.id);
  });

  await User.apply("u3", testJobIds[0]);
  await User.apply("u3", testJobIds[1]);
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

const u1Token = createToken({ username: "u1", isAdmin: false });
const u3Token = createToken({ username: "u3", isAdmin: false });
const adminToken = createToken({ username: "admin", isAdmin: true });

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u3Token,
  adminToken,
  testJobIds,
};
