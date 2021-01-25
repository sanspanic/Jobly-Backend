# Jobly Backend :blossom:

This is an Express backend for a fake job application website. 

## Technologies :woman_scientist:
1. JavaScript, SQL 
2. NodeJS
3. Express
4. NodePG
5. Jest
6. additional libraries: handling JSON schema validation, JWT generation, random password generation

## Approach :woman_student:
1. Express, NodeJS
2. NodePG as database
3. For learning purposes, instead of using ORM like Sequelize, created models using OOP. Each db table is represented by Class with custom class methods. Protected from SQL injection.
4. Testing using Jest with extensive coverage for both models and routes
5. Authentication using JWT tokens. For learning purposes, auth middleware implemented from scratch. 


## For developers:

To run:

    node server.js

   
To seed DB: 

	psql < jobly.sql
	
To run all tests:

    npm test 
Or to run individual file tests

    jest filepath