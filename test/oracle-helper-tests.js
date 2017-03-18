'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const should = chai.should();
chai.use(sinonChai);

const oracledb = require('oracledb');
const OracleHelper = require('../lib/oracle-helper');

describe('OracleHelper', () => {

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
    testObject = new OracleHelper(configOptions);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('simpleExecute', () => {
    let pool;
    let connection;
    beforeEach(() => {
      pool = { getConnection: sinon.stub() }; 
      connection = {
        execute: sinon.stub(),
        release: sinon.stub()
      };
    });

    describe('success path', () => {

      beforeEach(() => {
        pool = { getConnection: sinon.stub() }; 
        connection = {
          execute: sinon.stub(),
          release: sinon.stub()
        };

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.release.returns(Promise.resolve('whatever'));
      });


      it('returns the results of the sql operation when successful', () => {
        let expectedResults = [{}];
        connection.execute.withArgs(sql, args, options).returns(Promise.resolve(expectedResults));

        return testObject.simpleExecute(sql, args, options)
          .then((results) => {
            expectedResults.should.eql(results);
          });
      });

      it('only creates one connection pool', () => {
        let expectedResults = [{}];
        connection.execute.withArgs(sql, args, options).returns(Promise.resolve(expectedResults));

        return testObject.simpleExecute(sql, args, options)
          .then(() => testObject.simpleExecute(sql, args, options))
          .then(() => testObject.simpleExecute(sql, args, options))
          .then((result) => {
            oracledb.createPool.callCount.should.eql(1);
          });
      });

    });

    describe('error path', () => {
      it('returns error when creating the pool fails', ()=> {
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
          .catch((error) => error.should.eql(expectedError) );
      });
    });
  });
});
