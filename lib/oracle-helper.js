const oracledb = require('oracledb');
oracledb.poolIncrement = 10;
oracledb.poolMax = 100;
oracledb.poolMin = 5;

'use strict';

class OracleHelper {

  constructor(configOptions) {
    this.configOptions = configOptions;
  }

  createPool() {
    if (this.pool) {
      return Promise.resolve(this.pool);
    } else {
      return oracledb.createPool(this.configOptions)
        .then((newPool) => {
          this.pool = newPool;
          return this.pool;
        });
    }
  }

  destroyPool() {
    if (!this.pool) {
      return Promise.resolve();
    }
    return this.pool.terminate();
  }

  autoReleasingExecuteSql(connection, sql, params, options) {
    return connection.execute(sql, params, options)
      .then((results) => {
        return connection.release()
          .then(() => results)
          .catch((error) => results);
      }).catch((execute_error) => {
        return connection.release()
          .then(() => Promise.reject(execute_error))
          .catch((error) => execute_error);
      });
  }

  simpleExecute(sql, bindParams = {}, options = {outFormat: oracledb.OBJECT, autoCommit: true}) {
    return this.createPool()
      .then((pool) => pool.getConnection())
      .then((connection) => this.autoReleasingExecuteSql(connection, sql, bindParams, options));
  }
}

module.exports = OracleHelper;
