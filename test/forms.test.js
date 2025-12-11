
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user');
const Form = require('../src/models/form');

let authToken;
let testFormId;

// Connect to test database before tests
beforeAll(async () => {
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/verisage_test';
  await mongoose.connect(testDbUri);
  
  // Create test admin user
  const testUser = new User({
    username: 'testadmin',
    email: 'test@admin.com',
    password: 'testpass123',
    name: 'Test Admin',
    role: 'admin'
  });
  await testUser.save();
  
  // Login to get token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'testadmin', password: 'testpass123' });
  
  authToken = loginRes.body.token;
});

// Clean up after tests
afterAll(async () => {
  await User.deleteMany({});
  await Form.deleteMany({});
  await mongoose.connection.close();
});

describe('Form Submission Tests', () => {
  
  test('POST /api/forms - should submit new form', async () => {
    const formData = {
      branch: 'AJAH',
      month: 'DECEMBER',
      offering: 45400,
      tithe: 213700,
      officialEmail: 'test@trem.com'
    };
    
    const res = await request(app)
      .post('/api/forms')
      .send(formData);
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.branch).toBe('AJAH');
    expect(res.body.data.status).toBe('unreviewed');
    
    testFormId = res.body.data._id;
  });
  
  test('POST /api/forms - should fail without required fields', async () => {
    const formData = {
      offering: 45400
      // Missing required 'branch' and 'month'
    };
    
    const res = await request(app)
      .post('/api/forms')
      .send(formData);
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
  
});

describe('Form Retrieval Tests', () => {
  
  test('GET /api/forms - should require authentication', async () => {
    const res = await request(app)
      .get('/api/forms');
    
    expect(res.status).toBe(401);
  });
  
  test('GET /api/forms - should list forms with auth', async () => {
    const res = await request(app)
      .get('/api/forms')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  
  test('GET /api/forms/:id - should get single form', async () => {
    const res = await request(app)
      .get(`/api/forms/${testFormId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(testFormId);
  });
  
  test('GET /api/forms - should filter by status', async () => {
    const res = await request(app)
      .get('/api/forms?status=unreviewed')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.every(f => f.status === 'unreviewed')).toBe(true);
  });
  
});

describe('Form Update Tests', () => {
  
  test('PATCH /api/forms/:id - should update form and mark as reviewed', async () => {
    const updates = {
      offering: 50000,
      residentPastor: 'Pastor John'
    };
    
    const res = await request(app)
      .patch(`/api/forms/${testFormId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updates);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('reviewed');
    expect(res.body.data.offering).toBe(50000);
  });
  
});

describe('Form Posting Tests', () => {
  
  test('POST /api/forms/:id/post - should generate batch file and mark as posted', async () => {
    const res = await request(app)
      .post(`/api/forms/${testFormId}/post`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.form.status).toBe('posted');
    expect(res.body.data.batchFile).toBeDefined();
    expect(res.body.data.batchFile.filename).toContain('.xlsx');
  });
  
  test('POST /api/forms/:id/post - should not post already posted form without force', async () => {
    const res = await request(app)
      .post(`/api/forms/${testFormId}/post`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already posted');
  });
  
});

describe('Authentication Tests', () => {
  
  test('POST /api/auth/login - should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'testpass123' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });
  
  test('POST /api/auth/login - should fail with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'wrongpass' });
    
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
  
  test('GET /api/auth/me - should return current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('testadmin');
  });
  
});