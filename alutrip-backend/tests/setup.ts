import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env['NODE_ENV'] = 'test';

// Mock console.log in test environment to reduce noise
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  // Keep console.error for debugging test failures
});

afterAll(() => {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
});

// Global test utilities
global.mockRequest = (overrides = {}) => ({
  ip: '127.0.0.1',
  headers: {},
  method: 'GET',
  path: '/test',
  ...overrides
});

global.mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.get = jest.fn();
  return res;
};

// Mock Date for consistent test results
const mockDate = new Date('2024-01-15T10:00:00.000Z');
global.mockCurrentDate = mockDate;

// Extend global types
declare global {
  var mockRequest: (overrides?: any) => any;
  var mockResponse: () => any;
  var mockCurrentDate: Date;
}
