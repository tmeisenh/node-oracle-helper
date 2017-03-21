'use strict';

const oracledb = require('oracledb');
oracledb.maxRows = 5000;

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
    return (!this.pool) ? Promise.resolve() : this.pool.close().then(() => this.pool = null);
  }

  autoReleasingExecuteSql(connection, sql, params, options) {
    return connection.execute(sql, params, options)
      .then((results) => {
        return connection.release()
          .then(() => results)
          .catch((release_error) => Promise.resolve(results));
      }).catch((execute_error) => {
        return connection.release()
          .then(() => Promise.reject(execute_error))
          .catch((release_error) => execute_error);
      });
  }

  simpleExecute(sql, bindParams = [], options = {outFormat: oracledb.OBJECT, autoCommit: true}) {
    return this.createPool()
      .then((pool) => pool.getConnection())
      .then((connection) => this.autoReleasingExecuteSql(connection, sql, bindParams, options));
  }
}

module.exports = OracleHelper;
