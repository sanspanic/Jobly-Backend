const { BadRequestError } = require("../expressError");

/* returns object that can later be destructured and used inside sql query, for example:

{firstName: 'Aliya', age: 32} => {
                    setCols: `"first_name"=$1, "age"=$2`
                    values:  ['Aliya', 32]
                    }

const {setCols } = "first_name=$1, age=$2" (col names are transformed into the SQL-appropriate version and linked to index number)
const { values } = ['Aliya', 32] (array with values that match indices)

if no data is provided, will throw bad request error
*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
