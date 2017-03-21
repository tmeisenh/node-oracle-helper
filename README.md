oracle-helper
============

The official Oracle node driver is pretty good but it requires a lot of boilerplate to use and boilerplate can be errorprone.
This project aims to make life a little easier by proving a promise-based api wrapper around the Oracle node driver API.

Example usage
```javascript
const connectionParams = {
    user: 'system',
    password: 'oracle',
    connectString: 'db:1521/xe.oracle.docker'
}

// Create a new instance - each instance gets its own pool.
const OracleHelper oracleHelper = new OracleHelper(connectionParams);

// run some sql
const sql = 'select * from some_table where id = :in_id';
const params = {in_id: 'myid'}; // full oracle bind params support
oracleHelper.executeSql(sql, params); // returns native JS promise

// optionally manually create/destroy the pool
oracleHelper.createPool(); // returns native JS promise
oracleHelper.destroyPool(); // returns native JS promise
```
