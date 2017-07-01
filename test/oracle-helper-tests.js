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

describe('OracleHelper', () => {

  let pool;
  let connection;
  let testObject;

  const configOptions = {
    user: 'user',
    password: 'password',
    connectString: 'connect string'
  };

  const sql = 'select foo from dual';
  const args = {'foo': 'bar'};
  const options = {options: 'some'};
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
        pool.release.returns(Promise.resolve());

        return testObject.destroyPool().should.eventually.be.fulfilled
          .then(() => expect(testObject.pool).to.be.null);
      });
    });
  });

  describe('createPool', () => {
    beforeEach(() => {
      sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
    });

    describe('when pool does not exists', () => {
      it('it creates successfully', () => {
        return testObject.createPool().should.eventually.be.fulfilled
          .then(() => {
            testObject.pool.should.eql(pool);
            oracledb.createPool.calledWithExactly(configOptions);
          });
      });
    });

    describe('when pool exists', () => {
      beforeEach(() => {
        return testObject.createPool();
      });

      it('only creates one connection pool', () => {
        return testObject.createPool()
          .then((result) => {
            oracledb.createPool.callCount.should.eql(1);
          });
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

        return testObject.simpleExecute(sql).should.eventually.be.fulfilled
          .then((results) => {
            const expectedArgs = {};
            connection.execute.calledWith(sql, expectedArgs).should.be.true;
          });
      });

      it('uses sane defaults for options to oracledb.execute', () => {
        connection.execute.returns(Promise.resolve([{}]));

        return testObject.simpleExecute(sql, args).should.eventually.be.fulfilled
          .then((results) => {
            const expectedOptions = {outFormat: oracledb.OBJECT, autoCommit: true};
            connection.execute.calledWithExactly(sql, args, expectedOptions).should.be.true;
          });
      });

      it('returns the results of the sql operation when successful', () => {
        const expectedResults = [{}];
        connection.execute.withArgs(sql, args, options).returns(Promise.resolve(expectedResults));

        return testObject.simpleExecute(sql, args, options).should.eventually.be.fulfilled
          .then((results) => {
            expectedResults.should.eql(results);
            connection.execute.calledWithExactly(sql, args, options).should.be.true;
          });
      });
    });

    describe('error path', () => {
      it('returns error when creating the pool fails', () => {
        const expectedError = 'some error';
        sandbox.stub(oracledb, 'createPool').returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options).should.eventually.be.rejected
          .then((error) => expectedError.should.eql(error));
      });

      it('returns error when creating the connection fails', () => {
        const expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options).should.eventually.be.rejected
          .then((error) => expectedError.should.eql(error));
      });

      it('returns error when executing the sql fails', () => {
        const expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.release.returns(Promise.resolve('whatever'));
        connection.execute.returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options).should.eventually.be.rejected
          .then((error) => expectedError.should.eql(error));
      });

      it('releases connection when executing the sql fails', () => {
        const expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.release.returns(Promise.resolve('whatever'));
        connection.execute.returns(Promise.reject(expectedError));

        return testObject.simpleExecute(sql, args, options).should.eventually.be.rejected
          .then((error) => connection.release.callCount.should.eql(1));
      });

      it('returns results of sql when releasing connection fails', () => {
        const expectedResults = [{}];

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.execute.withArgs(sql, args, options).returns(Promise.resolve(expectedResults));
        connection.release.returns(Promise.reject('dropped error'));

        return testObject.simpleExecute(sql, args, options).should.eventually.be.fulfilled
          .then((results) => results.should.eql(expectedResults));
      });

      it('returns sql execution error when releasing the connection fails', () => {
        const expectedError = 'some error';

        sandbox.stub(oracledb, 'createPool').returns(Promise.resolve(pool));
        pool.getConnection.returns(Promise.resolve(connection));
        connection.execute.withArgs(sql, args, options).returns(Promise.reject(expectedError));
        connection.release.returns(Promise.reject('dropped error'));

        return testObject.simpleExecute(sql, args, options).should.eventually.be.rejected
          .then((error) => error.should.eql(expectedError));
      });
    });
  });
});
