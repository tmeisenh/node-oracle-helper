
The official Oracle node driver is pretty good but it requires a lot of boilerplate to use and boilerplate can be errorprone.
This project aims to make life a little easier by proving a promise-based api wrapper around the Oracle node driver API.

Example usage
Create a new instance - each instance gets its own pool.
```javascript
const connectionParams = {
    user: 'system',
    password: 'oracle',
    connectString: 'db:1521/xe.oracle.docker',
    poolMin: 4,
    poolMax: 4
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
> One auto-releasing connection is used per method invocation.
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

A few pitfalls when using Oracle on Node (these aren't due to oracle-helper)
1. The Oracle connection pool likes to keep as few connections around as possible and it uses poolMin to determine how many connections to keep open.
This can cause Oracle to see a lot of connection connect and connection close events unless you tune your poolMin and poolMax values correctly.
Be warned though: Oracle delegates threading to libuv for threading and too high values for poolMin and poolMax can easily gobble up all of the available threads for node.
1. Oracle's node driver does not allow you to bind JS Arrays as in parameters to regular sql statements.  You can bind JS Arrays as in parameters to PL/SQL stored procedures
and functions if you jump through enough hoops and create a custom type, etc.
1. No pre-compiled binary.

This was originally inspired by this [article](https://jsao.io/2015/03/making-a-wrapper-module-for-the-node-js-driver-for-oracle-database).
