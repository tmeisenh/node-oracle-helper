'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const should = chai.should();
const expect = chai.expect;
chai.use(sinonChai);

const oracledb = require('oracledb');
const OracleHelper = require('../lib/oracle-helper');

describe('OracleHelper', () => {

  let pool;
  let connection;
  let testObject;

  let configOptions = {
    user: 'user',
    password: 'password',
    connectString: 'connect string'
  };

  let sql = 'select foo from dual';
  let args = ['foo', 'bar'];
  let options = {options: 'some'};
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    pool = {
      getConnection: sandbox.stub(),
      release: sandbox.stub()
    };

    connection = {
      execute: sandbox.stub(),
      release: sandbox.stub()
    };

    testObject = new OracleHelper(configOptions);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('destroyPool', () => {
    it('it resolves successfully when pool does not exist', () => {
      return testObject.destroyPool()
        .then(() => expect(testObject.pool).to.be.undefined);
    });

    it('it destroys the pool and resolves successfully when pool exists', () => {
      pool.release.returns(Promise.resolve());

      return testObject.createPool()
        .then(() => testObject.destroyPool())
        .then(() => expect(testObject.pool).to.be.null);
    });
  });

  describe('createPool', () => {
    beforeEach(() => {
        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
    });

    it('it creates successfully when pool does not exist', () => {
      return testObject.createPool()
        .then(() => testObject.pool.should.eql(pool));
    });

    it('only creates one connection pool', () => {
      return testObject.createPool()
        .then(() => testObject.createPool())
        .then((result) => {
          oracledb.createPool.callCount.should.eql(1);
        });
    });
  });

  describe('simpleExecute', () => {
    describe('success path', () => {

      beforeEach(() => {
        pool = {getConnection: sinon.stub()};
        connection = {
          execute: sinon.stub(),
          release: sinon.stub()
        };

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.release.returns(Promise.resolve('whatever'));
      });

      it('uses sane defaults for bindParams to oracledb.execute', () => {
        connection.execute.returns(Promise.resolve([{}]));

        return testObject.simpleExecute(sql)
          .then((results) => {
            const expectedParams = {};
            connection.execute.calledWith(sql, expectedParams).should.be.true;
          });
      });

      it('uses sane defaults for options to oracledb.execute', () => {
        connection.execute.returns(Promise.resolve([{}]));

        return testObject.simpleExecute(sql, args)
          .then((results) => {
            const expectedOptions = {outFormat: oracledb.OBJECT, autoCommit: true};
            connection.execute.calledWith(sql, args, expectedOptions).should.be.true;
          });
      });

      it('returns the results of the sql operation when successful', () => {
        let expectedResults = [{}];
        connection.execute.withArgs(sql, args, options).returns(Promise.resolve(expectedResults));

        return testObject.simpleExecute(sql, args, options)
          .then((results) => {
            expectedResults.should.eql(results);
          });
      });
    });

    describe('error path', () => {
      it('returns error when creating the pool fails', () => {
        let expectedError = 'some error';
        sandbox.stub(oracledb, 'createPool').returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options)
          .catch((error) => {
            expectedError.should.eql(error)
          });
      });

      it('returns error when creating the connection fails', () => {
        let expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options)
          .catch((error) => {
            expectedError.should.eql(error)
          });
      });

      it('returns error when executing the sql fails', () => {
        let expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.release.returns(Promise.resolve('whatever'));
        connection.execute.returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options)
          .catch((error) => {
            expectedError.should.eql(error)
          });
      });

      it('releases connection when executing the sql fails', () => {
        let expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.release.returns(Promise.resolve('whatever'));
        connection.execute.returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options)
          .catch((error) => {
            connection.release.callCount.should.eql(1);
          });
      });

      it('returns results of sql when releasing connection fails', () => {
        let expectedResults = [{}];

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.execute.withArgs(sql, args, options).returns(Promise.resolve(expectedResults));
        connection.release.returns(Promise.reject('dropped error'));

        return testObject.simpleExecute(sql, args, options)
          .then((results) => results.should.eql(expectedResults));
      });

      it('returns sql execution error when releasing the connection fails', () => {
        let expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.execute.withArgs(sql, args, options).returns(Promise.reject(expectedError));
        connection.release.returns(Promise.reject('dropped error'));

        return testObject.simpleExecute(sql, args, options)
          .catch((error) => error.should.eql(expectedError));
      });
    });
  });
});
