'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const should = chai.should();
const expect = chai.expect;
chai.use(sinonChai);

const oracledb = require('oracledb');
const OracleHelper = require('../lib/oracle-helper');

describe('OracleHelper Integration Tests', () => {

  let testObject;

  let configOptions = {
    user: 'system',
    password: 'oracle',
    connectString: 'db:1521/xe.oracle.docker'
  };

  beforeEach(() => {
    testObject = new OracleHelper(configOptions);
  });

  afterEach(() => {
    return testObject.destroyPool();
  });

  describe('createPool', () => {
    it('it creates successfully', () => {
      return testObject.createPool()
        .then(() => {
          testObject.pool.should.not.be.undefined;
        });
    });
  });

  describe('destroyPool', () => {
    it('it resolves successfully when pool does not exist', () => {
      return testObject.destroyPool()
        .then(() => expect(testObject.pool).to.be.undefined);
    });

    it('it resolves successfully', () => {
      return testObject.createPool()
        .then(() => testObject.destroyPool())
        .then(() => expect(testObject.pool).to.be.null);
    });
  });

  describe('simpleExecute', () => {
    describe('success path', () => {
      it('returns the results of the sql operation when successful', function () {
        this.timeout(1000 * 20);
        let sql = `select 'foo' as foo from dual`;
        let params = [];

        return testObject.simpleExecute(sql, params)
          .then((results) => {
            results.rows[0].FOO.should.eql('foo');
            testObject.pool.connectionsInUse.should.eql(0);
          });
      });

      it('returns the results all the sql operations when successful', function () {
        this.timeout(1000 * 20);
        let sql = `select 'foo' as foo from dual`;
        let params = [];
        return Promise.all([
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
        ]).then((resultsArray) => {
          resultsArray.length.should.eql(5);
          resultsArray[0].rows[0].FOO.should.eql('foo');
          resultsArray[1].rows[0].FOO.should.eql('foo');
          resultsArray[2].rows[0].FOO.should.eql('foo');
          resultsArray[3].rows[0].FOO.should.eql('foo');
          resultsArray[4].rows[0].FOO.should.eql('foo');
          testObject.pool.connectionsInUse.should.eql(0);
        });
      });

      it('returns the results all the sql operations when successful', function () {
        this.timeout(1000 * 20);
        let sql = `select 'foo' as foo from dual`;
        let params = [];
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

      it('returns an error when the one sql operation failed', function () {
        this.timeout(1000 * 20);
        let sql = `select foo as foo from dual`;
        let params = [];

        return testObject.simpleExecute(sql, params)
          .then((any) => { 
            sinon.assert.fail('unexpected promise resolve');
          }).catch((error) => {
            error.should.match(/^Error: ORA-00904: "FOO": invalid identifier/);
          });
      });

      it('returns the first error when any of the one sql operations fails', function () {
        this.timeout(1000 * 20);
        let sqlBad = `select foo as foo from dual`;
        let params = [];

        return Promise.all([
          testObject.simpleExecute(sqlBad, params),
          testObject.simpleExecute(sqlBad, params),
          testObject.simpleExecute(sqlBad, params),
          testObject.simpleExecute(sqlBad, params),
          testObject.simpleExecute(sqlBad, params),
        ]).then((any) => { 
          sinon.assert.fail('unexpected promise resolve');
        }).catch((firstError) => {
          firstError.should.match(/^Error: ORA-00904: "FOO": invalid identifier/);
          testObject.pool.connectionsInUse.should.eql(0);
        });
      });

      it('returns the first error when any of the one sql operations fails', function () {
        this.timeout(1000 * 20);
        let sqlGood = `select 'foo' as foo from dual`;
        let sqlBad = `select foo as foo from dual`;
        let params = [];

        return Promise.all([
          testObject.simpleExecute(sqlGood, params),
          testObject.simpleExecute(sqlGood, params),
          testObject.simpleExecute(sqlGood, params),
          testObject.simpleExecute(sqlBad, params),
          testObject.simpleExecute(sqlGood, params)
        ]).then((any) => { 
          sinon.assert.fail('unexpected promise resolve');
        }).catch((firstError) => {
          firstError.should.match(/^Error: ORA-00904: "FOO": invalid identifier/);
          testObject.pool.connectionsInUse.should.eql(0);
        });
      });
    });
  });
});
