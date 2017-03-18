const oracledb = require('oracledb');

class SimpleLogger {

  debug(str) {
    // console.log('Debug: ', str);
  }

  error(str) {
    console.log('Error: ', str);
  }
}

class OracleHelper {
  constructor(configOptions = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTSTRING
  }) {

    this.logger = new SimpleLogger();
    this.configOptions = configOptions;
  }

  createPool() {
    return new Promise((resolve, reject) => {
      if (this.pool) {
        this.logger.debug('Pool already exists');
        return resolve(this.pool);
      } else {
        this.logger.debug('Pool does not exist');
        return oracledb.createPool(this.configOptions)
          .then((newPool) => {
            this.logger.debug('Pool created');
            this.pool = newPool;
            return resolve(this.pool);
          })
          .catch((error) => {
            this.logger.error('Failed to create pool with error: ', error);
            return reject(error);
          });
      }
    });
  }

  destroyPool() {
    return new Promise((resolve, reject) => {
      if(this.pool) {
        this.pool.terminate((error) => {
          if (error) {
            this.logger.error('Failed to destroy pool with error: ', error);
            return reject(error);
          } else {
            return resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getConnection(pool) {
    return new Promise((resolve, reject) => {
      pool.getConnection()
        .then((connection) => resolve(connection))
        .catch((error) => {
          this.logger.error('Failed to get connection with error: ', error);
          reject(error);
        });
    });
  }

  releaseConnection(connection) {
    // fire and forget (but log out)
    return new Promise((resolve, reject) => {
      connection.release()
        .then(() => {
          this.logger.debug('Closed connection');
          resolve();
        }).catch((error) => {
          this.logger.error('Failed to release connection with error: ', error);
          resolve();
        });
    });
  }

  internalExecuteSql(sql, params, options, connection) {
    return new Promise((resolve, reject) => {
      connection.execute(sql, params, options)
        .then((results) => {
          this.logger.debug('Success executing sql');
          return resolve(results);
        }).catch((error) => {
          this.logger.error('Failed to execute sql with error: ', error);
          return reject(error);
        });
    });
  }

  autoReleasingExecuteSql(sql, params, options, connection) {
    return new Promise((resolve, reject) => {
      return this.internalExecuteSql(sql, params, options, connection).
        then((results) => {
          process.nextTick(() => {
            this.releaseConnection(connection);
          });
          resolve(results);
        }).catch((error) => {
          process.nextTick(() => {
            this.releaseConnection(connection);
          });
          reject(error);
        });
    });
  }

  simpleExecute(sql, bindParams = {}, options = {outFormat: oracledb.OBJECT, autoCommit: true}) {
    return this.createPool()
      .then((pool) => this.getConnection(pool))
      .then((connection) => this.autoReleasingExecuteSql(sql, bindParams, options, connection));
  }
}

module.exports = OracleHelper;
