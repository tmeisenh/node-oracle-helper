oracle-helper
============

The official Oracle node driver is pretty good but it requires a lot of boilerplate to use and boilerplate can be errorprone.
This project aims to make life a little easier by proving a promise-based api wrapper around the Oracle node driver API.

Example usage
Create a new instance - each instance gets its own pool.
```javascript
const connectionParams = {
    user: 'system',
    password: 'oracle',
    connectString: 'db:1521/xe.oracle.docker'
}

const OracleHelper oracleHelper = new OracleHelper(connectionParams);
```

Manually create/destroyPool
> Returns normal native JS promise
```javascript
// optionally manually create/destroy the pool
oracleHelper.createPool(); // returns native JS promise
oracleHelper.destroyPool(); // returns native JS promise
```

Run some sql
> Returns normal native JS Promise
```javascript
const sql = 'select * from some_table where id = :in_id';
const params = {in_id: 'myid'}; // full oracle bind params support
oracleHelper.executeSql(sql, params)
  .then((results) => {
    // do stuff with results
  }).catch((error) => {
    // handle error
  });
```

This was originally inspired by this [article](https://jsao.io/2015/03/making-a-wrapper-module-for-the-node-js-driver-for-oracle-database).
