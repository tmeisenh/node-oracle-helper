'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const should = chai.should();
const expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);

const oracledb = require('oracledb');
const OracleHelper = require('../lib/oracle-helper');

describe('OracleHelper Integration Tests', () => {

  let testObject;

  const configOptions = {
    user: 'system',
    password: 'oracle',
    connectString: 'db:1521/xe.oracle.docker'
  };

  function waitForConnectionsToClear(pool) {
    function waitForPoolToClear(pool, resolve) {
      if (pool.connectionsInUse === 0) {
        resolve();
      } else {
        setTimeout(() => waitForPoolToClear(pool, resolve), 30);
      }
    }

    return new Promise(resolve => waitForPoolToClear(pool, resolve));
  }

  beforeEach(() => {
    testObject = new OracleHelper(configOptions);
  });

  afterEach(() => {
    return testObject.destroyPool();
  });

  describe('createPool', () => {
    it('it creates successfully', () => {
      return testObject.createPool().should.eventually.be.fulfilled
        .then(() => {
          testObject.pool.should.not.be.undefined;
        });
    });
  });

  describe('destroyPool', () => {
    describe('when pool does not exist', () => {
      it('it resolves successfully when pool does not exist', () => {
        return testObject.destroyPool().should.eventually.be.fulfilled
          .then(() => expect(testObject.pool).to.be.undefined);
      });
    });

    describe('when pool exists', () => {
      beforeEach(() => {
        return testObject.createPool();
      });

      it('it destroys the pool and resolves successfully when pool exists', () => {
        return testObject.destroyPool().should.eventually.be.fulfilled
          .then(() => expect(testObject.pool).to.be.null);
      });
    });
  });

  describe('simpleExecute', () => {
    describe('success path', () => {
      it('returns the results of the a single sql operation when successful', () => {
        const sql = `select 'foo' as foo from dual`;
        const params = {};

        return testObject.simpleExecute(sql, params).should.eventually.be.fulfilled
          .then((results) => {
            results.rows[0].FOO.should.eql('foo');
            testObject.pool.connectionsInUse.should.eql(0);
          });
      });

      it('returns successfully when used in Promise.all', () => {
        const sql = `select 'foo' as foo from dual`;
        const params = {};

        return Promise.all([
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
        ]).should.eventually.be.fulfilled
          .then((resultsArray) => {
            resultsArray.length.should.eql(5);
            resultsArray[0].rows[0].FOO.should.eql('foo');
            resultsArray[1].rows[0].FOO.should.eql('foo');
            resultsArray[2].rows[0].FOO.should.eql('foo');
            resultsArray[3].rows[0].FOO.should.eql('foo');
            resultsArray[4].rows[0].FOO.should.eql('foo');
            testObject.pool.connectionsInUse.should.eql(0);
          });
      });

      it('returns successfully when promised are chained', () => {
        const sql = `select 'foo' as foo from dual`;
        const params = {};
        return testObject.simpleExecute(sql, params)
          .then(() => testObject.simpleExecute(sql, params))
          .then(() => testObject.simpleExecute(sql, params))
          .then(() => testObject.simpleExecute(sql, params))
          .then(() => testObject.simpleExecute(sql, params))
          .then(() => testObject.simpleExecute(sql, params))
          .then(() => testObject.simpleExecute(sql, params))
          .then(() => testObject.pool.connectionsInUse.should.eql(0));
      });
    });

    describe('error path', () => {

      it('returns an error when the one sql operation failed', () => {
        const sql = `select foo as foo from dual`;
        const params = {};

        return testObject.simpleExecute(sql, params).should.eventually.be.rejected
          .then((error) => {
            error.should.match(/^Error: ORA-00904: "FOO": invalid identifier/);
            testObject.pool.connectionsInUse.should.eql(0);
          });
      });

      describe('Promise.all error handling', () => {
        // @see https://github.com/oracle/node-oracledb/issues/350#issuecomment-237922805 (Promise.all issue)
        // Promise.all does a fail-fast when the first rejection occurs and does not wait for all promises to resolve or reject.
        // The tests wait a small amount of time to give the connections time to finish and close their connections.
        //
        it('returns the first error when any of the one sql operations fails', function () {
          const sqlBad = `select foo as foo from dual`;
          const params = {};

          return Promise.all([
            testObject.simpleExecute(sqlBad, params),
            testObject.simpleExecute(sqlBad, params),
            testObject.simpleExecute(sqlBad, params),
            testObject.simpleExecute(sqlBad, params),
            testObject.simpleExecute(sqlBad, params),
          ]).should.eventually.be.rejected
            .then((firstError) => firstError.should.match(/^Error: ORA-00904: "FOO": invalid identifier/))
            .then(() => waitForConnectionsToClear(testObject.pool))
            .then(() => testObject.pool.connectionsInUse.should.eql(0));
        });

        it('alternates between good and bad sql returning the first error when any of the one sql operations fails', () => {
          const sqlGood = `select 'foo' as foo from dual`;
          const sqlBad = `select foo as foo from dual`;
          const params = {};

          return Promise.all([
            testObject.simpleExecute(sqlGood, params),
            testObject.simpleExecute(sqlGood, params),
            testObject.simpleExecute(sqlGood, params),
            testObject.simpleExecute(sqlBad, params),
            testObject.simpleExecute(sqlGood, params)
          ]).should.eventually.be.rejected
            .then((firstError) => firstError.should.match(/^Error: ORA-00904: "FOO": invalid identifier/))
            .then(() => waitForConnectionsToClear(testObject.pool))
            .then(() => testObject.pool.connectionsInUse.should.eql(0));
        });
      });
    });
  });
});
