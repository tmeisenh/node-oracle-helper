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
    user: 'system',
    password: 'oracle',
    connectString: 'db:1521/xe.oracle.docker'
  };

  beforeEach(() => {
    testObject = new OracleHelper(configOptions);
  });


  describe('simpleExecute', () => {

    describe('success path', () => {

      it('returns the results of the sql operation when successful', function() {
        this.timeout(1000 * 20);
        let sql = `select 'foo' as foo from dual`
        let sql1 = `select foo from bar`
        let params = [];

        return Promise.all([
          testObject.simpleExecute(sql1, params),
          testObject.simpleExecute(sql1, params),
          testObject.simpleExecute(sql1, params),
          testObject.simpleExecute(sql1, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
          testObject.simpleExecute(sql, params),
        ]).then((resultsArray) => {
          resultsArray.length.should.eql(10);
          resultsArray[0].should.match(/^Error: ORA-00942: table or view does not exist/);
          resultsArray[1].should.match(/^Error: ORA-00942: table or view does not exist/);
          resultsArray[2].should.match(/^Error: ORA-00942: table or view does not exist/);
          resultsArray[3].should.match(/^Error: ORA-00942: table or view does not exist/);
          testObject.pool.connectionsInUse.should.eql(0);
        });
      });
    });
  });
});
