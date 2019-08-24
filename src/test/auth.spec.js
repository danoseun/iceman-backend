import chai from 'chai';
import chaiHttp from 'chai-http';
import sgMail from '@sendgrid/mail';
import sinon from 'sinon';
import app from '../index';
import TestHelper from '../utils/testHelper';
import Helper from '../utils/helpers';

chai.use(chaiHttp);
chai.should();
const { expect } = chai;

let send;
let userId;
let userToken;

const URL_PREFIX = '/api/v1/auth';

const apiEndpoint = '/api/v1/auth/login';

const user = {
  first_name: 'Samuel',
  last_name: 'koroh',
  email: 'user1@gmail.com',
  password: 'Ice5m5am0a843r03'
};

const user2 = {
  first_name: 'Test',
  last_name: 'Tester',
  email: 'test@test.com',
  password: 'PasswordTest123'
};

describe('/api/v1/auth', () => {
  let verifiedUser, notVerifiedUser;

  before((done) => {
    TestHelper.destroyModel('User');
    done();
  });

  describe('POST /login', () => {
    before(async () => {
      verifiedUser = await TestHelper.createUser({
        ...user, is_verified: true
      });

      notVerifiedUser = await TestHelper.createUser({
        ...user,
        email: 'user2@gmail.com',
      });
    });

    it('should return 400 if the user is not found', async () => {
      const res = await chai.request(app)
        .post(apiEndpoint)
        .set('Content-Type', 'application/json')
        .send({ email: 'email@email.com', password: 'password' });

      res.should.have.status(400);
    });

    it('should return 400 if the user account is not yet verified', async () => {
      const res = await chai.request(app)
        .post(apiEndpoint)
        .set('Content-Type', 'application/json')
        .send({ email: notVerifiedUser.email, password: user.password });

      res.should.have.status(400);
    });

    it('should return 400 if the user account is verified but password not valid', async () => {
      const res = await chai.request(app)
        .post(apiEndpoint)
        .set('Content-Type', 'application/json')
        .send({ email: verifiedUser.email, password: 'password' });

      res.should.have.status(400);
    });

    it('should return 200 if the user account is verified', async () => {
      const res = await chai.request(app)
        .post(apiEndpoint)
        .set('Content-Type', 'application/json')
        .send(Helper.pickFields(user, ['email', 'password']));

      res.should.have.status(200);
      res.body.data.should.have.property('token');
      res.body.data.should.have.property('id');
      res.body.data.should.have.property('email');
      res.body.data.should.have.property('is_admin');
      res.body.data.should.have.property('is_verified');
    });
  });

  describe('POST /signup', () => {
    beforeEach(async () => {
      send = sinon.stub(sgMail, 'send').resolves({});
    });

    afterEach(async () => {
      send.restore();
    });
    it('should return error if user email already exist', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .set('Content-Type', 'application/json')
        .send(user);

      res.should.have.status(409);
      res.body.should.have.property('status').eql('error');
    });

    it('should return 201 if user account was created', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .set('Content-Type', 'application/json')
        .send(user2);

      res.should.have.status(201);
      res.body.should.have.property('status').eql('success');
      res.body.data.should.have.property('token');
      res.body.data.should.have.property('id');
      res.body.data.should.have.property('email');
      res.body.data.should.have.property('is_admin');
      res.body.data.should.have.property('is_verified');
    });
  });

  describe('SIGNUP INPUT VALIDATION', () => {
    it('should not register a user when all required fields are empty', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .send({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
        });

      res.should.have.status(400);
      res.body.should.be.an('object');
      res.body.error.should.equal('First Name is required');
    });

    it('should not register a user when last name are provided', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .send({
          first_name: 'john',
          last_name: '',
          email: 'doe@mail.com',
          password: 'john12345',
        });

      res.should.have.status(400);
      res.body.should.be.an('object');
      res.body.error.should.equal('Last Name is required');
    });

    it('should not register a user when email is not provided', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .send({
          first_name: 'john',
          last_name: 'doe',
          email: '',
          password: '',
        });

      res.should.have.status(400);
      res.body.should.be.an('object');
      res.body.error.should.equal('Email must be a valid email address e.g example@mail.com or example@mail.co.uk');
    });

    it('should not register a user when password is not provided', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .send({
          first_name: 'john',
          last_name: 'doe',
          email: 'doe@mail.com',
          password: '',
        });

      res.should.have.status(400);
      res.body.should.be.an('object');
      res.body.error.should.equal('Password must contain at least one letter, at least one number, and be atleast 8 digits long');
    });

    it('should not register a user when a valid email is not provided', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .send({
          first_name: 'john',
          last_name: 'doe',
          email: 'doemail.com',
          password: '123345678',
        });

      res.should.have.status(400);
      res.body.should.be.an('object');
      res.body.error.should.equal('Email must be a valid email address e.g example@mail.com or example@mail.co.uk');
    });

    it('should not register a user when password is not a mixture of numbers and letters and atleast 8 characters long', async () => {
      const res = await chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .send({
          first_name: 'john',
          last_name: 'doe',
          email: 'doe@mail.com',
          password: '123345678',
        });

      res.should.have.status(400);
      res.body.should.be.an('object');
      res.body.error.should.equal('Password must contain at least one letter, at least one number, and be atleast 8 digits long');
    });
  });

  describe('Verify User email', () => {
    beforeEach(async () => {
      send = sinon.stub(sgMail, 'send').resolves({});
    });

    afterEach(async () => {
      send.restore();
    });

    it('should sign up a new user', (done) => {
      chai.request(app)
        .post(`${URL_PREFIX}/signup`)
        .send({
          first_name: 'qqqq',
          last_name: 'qqqq',
          email: 'tees@trtr.com',
          password: '11111111ghghjh'
        })
        .end((err, res) => {
          expect(res.statusCode).to.equal(201);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.property('token');
          const { token, id } = res.body.data;
          userToken = token;
          userId = id;
          done();
        });
    });

    it('should verify user email', (done) => {
      chai.request(app)
        .get(`${URL_PREFIX}/verify?activate=gfgfgfhgfh&&id=${userId}`)
        .end((err, res) => {
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should verify user email', (done) => {
      chai.request(app)
        .get(`${URL_PREFIX}/verify?activate=${userToken}&&id=${userId}`)
        .end((err, res) => {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('message');
          done();
        });
    });

    it('should not verify user email that has been verified', (done) => {
      chai.request(app)
        .get(`${URL_PREFIX}/verify?activate=${userToken}&&id=${userId}`)
        .end((err, res) => {
          expect(res.statusCode).to.equal(409);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should not verify user email that does not exist', (done) => {
      chai.request(app)
        .get(`${URL_PREFIX}/verify?activate=${userToken}&&id=8`)
        .end((err, res) => {
          expect(res.statusCode).to.equal(404);
          expect(res.body).to.have.property('error');
          done();
        });
    });
  });

  it('should not verify user email with invalid query', (done) => {
    chai.request(app)
      .get(`${URL_PREFIX}/verify`)
      .end((err, res) => {
        expect(res.statusCode).to.equal(400);
        expect(res.body).to.have.property('error');
        done();
      });
  });

  it('should not verify user email with invalid user id', (done) => {
    chai.request(app)
      .get(`${URL_PREFIX}/verify?activate=${userToken}&&id=fffhj`)
      .end((err, res) => {
        expect(res.statusCode).to.equal(400);
        expect(res.body).to.have.property('error');
        done();
      });
  });
});
