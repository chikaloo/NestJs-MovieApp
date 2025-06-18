import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './user.model';
import * as bcrypt from 'bcrypt';

// Mock dependencies
const mockUserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let userModel: any;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken('User'));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      };

      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(userData);

      const result = await authService.register(userData);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ 
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        username: userData.username,
        email: userData.email,
      }));
    });

    it('should throw an error if user already exists', async () => {
      const userData = {
        username: 'existinguser',
        password: 'password123',
        email: 'existing@example.com',
      };

      mockUserModel.findOne.mockResolvedValue(userData);

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should successfully login with correct credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123',
      };

      const mockUser = {
        username: 'testuser',
        password: await bcrypt.hash('password123', 10),
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('faketoken');

      const result = await authService.login(loginData);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: loginData.username });
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({ token: 'faketoken' });
    });

    it('should throw an error for invalid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockUserModel.findOne.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });
});