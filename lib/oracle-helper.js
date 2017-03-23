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

  simpleExecute(sql, bindParams = {}, options = {outFormat: oracledb.OBJECT, autoCommit: true}) {
    return this.createPool()
      .then((pool) => pool.getConnection())
      .then((connection) => this.autoReleasingExecuteSql(connection, sql, bindParams, options));
  }

  // - private methods essentially

  autoReleasingExecuteSql(connection, sql, params, options) {
    return new Promise((resolve, reject) => {
      connection.execute(sql, params, options)
        .then((results) => {
          connection.release()
            .then(() => resolve(results))
            .catch((release_error) => resolve(results));
        }).catch((execute_error) => {
          connection.release()
            .then(() => reject(execute_error))
            .catch((release_error) => reject(execute_error));
        });
    });
  }

}

module.exports = OracleHelper;
