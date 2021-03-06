import {
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common/interfaces/hooks/on-destroy.interface';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApiResponseType,
  LogInUserResponse,
  RedisSubject,
  RefreshTokenResponse,
} from '@project/core';
import { CreateUserDto, GoogleUserDto, LogInUserDto } from '@project/dto';
import { UserDocument, UserEntity } from '@project/schemas';
import * as bcrypt from 'bcryptjs';
import { Auth, google } from 'googleapis';
import { Model } from 'mongoose';
import { from, map, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthService implements OnModuleDestroy, OnModuleInit {
  private destroy$ = new Subject<void>();
  private _logger = new Logger('AppService');
  private oAuthClient: Auth.OAuth2Client;
  constructor(
    @InjectModel(UserEntity.name) private userRepo: Model<UserDocument>,
    @Inject('EMAIL_SERVICE') private readonly emailService: ClientProxy,
    private jwtService: JwtService
  ) {}

  onModuleDestroy() {
    this.destroy$.next();
  }
  onModuleInit() {
    this.oAuthClient = new google.auth.OAuth2(
      environment.GOOGLE_OAUTH_CLIENT_ID,
      environment.GOOGLE_OAUTH_CLIENT_SECRET
    );
  }

  getData(): { message: string } {
    return { message: 'Welcome to api-auth!' };
  }

  async loginGoogleUser(googleUser: GoogleUserDto) {
    const tokenInfo = await this.oAuthClient.getTokenInfo(googleUser.authToken);

    const userInDb = await this.userRepo.findOne({
      email: googleUser.email,
    });

    if (!userInDb) {
      const user = new this.userRepo({
        email: googleUser.email,
        name: googleUser.name,
        profilePicture: googleUser.photoUrl,
        provider: googleUser.provider,
        emailVerified: tokenInfo.email_verified,
      });

      const newUser = await user.save();
      if (!newUser)
        throw new InternalServerErrorException('Error registering user');

      const access_token = await this.generateToken(
        newUser._id,
        environment.JWT_ACCESS_EXPIRES_IN
      );
      const refresh_token = await this.generateToken(
        newUser._id,
        environment.JWT_REFRESH_EXPIRES_IN
      );

      return {
        status: HttpStatus.CREATED,
        data: {
          user: newUser,
          access_token,
          refresh_token,
        },
      };
    }

    const access_token = await this.generateToken(
      userInDb._id,
      environment.JWT_ACCESS_EXPIRES_IN
    );
    const refresh_token = await this.generateToken(
      userInDb._id,
      environment.JWT_REFRESH_EXPIRES_IN
    );

    return {
      status: HttpStatus.OK,
      data: {
        user: userInDb,
        access_token,
        refresh_token,
      },
    };
  }

  async registerUser(body: CreateUserDto): Promise<ApiResponseType<void>> {
    const existingUser = await this.userRepo.findOne({
      email: body.email,
    });
    if (existingUser !== null || undefined)
      throw new ConflictException('User already exists');

    const user = new this.userRepo(body);
    await user.save();

    this.emailService.emit(RedisSubject.CONFIRM_EMAIL_SUBJECT, {
      email: user.email,
      userId: user._id,
    });
    return {
      status: HttpStatus.CREATED,
      message:
        'User created successfully, check your email to confirm your account',
    };
  }

  async loginUser(
    body: LogInUserDto
  ): Promise<ApiResponseType<LogInUserResponse>> {
    const user: UserDocument = await this.userRepo
      .findOne({
        $or: [{ email: body.email }, { username: body.username }],
      })
      .lean();

    if (!user) throw new NotFoundException('Invalid Credentials');

    if (!bcrypt.compareSync(body.password, user.password))
      throw new NotFoundException('Invalid Credentials');
    const access_token = await this.generateToken(
      user._id,
      environment.JWT_ACCESS_EXPIRES_IN
    );
    const refresh_token = await this.generateToken(
      user._id,
      environment.JWT_REFRESH_EXPIRES_IN
    );

    if (!access_token || !refresh_token) {
      throw new InternalServerErrorException('Error generating tokens');
    }
    user['password'] = undefined;
    return {
      status: HttpStatus.OK,
      message: 'success',
      data: {
        user,
        access_token,
        refresh_token,
      },
    };
  }

  async emailExist(body: string) {
    const doesExist = await this.userRepo.findOne({ email: body });
    if (doesExist) {
      throw new ConflictException('Email already exists');
    }

    return {
      status: HttpStatus.OK,
    };
  }

  usernameExist(username: string): Observable<ApiResponseType<void>> {
    return from(this.userRepo.findOne({ username: username })).pipe(
      map((user) => {
        if (user)
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Username already exists',
          };

        return {
          status: HttpStatus.OK,
        };
      })
    );
  }

  async verifyEmail(token: string): Promise<ApiResponseType<boolean>> {
    const user = await this.userRepo.findById(token);
    if (!user) throw new NotFoundException('User not found');
    user.emailVerified = true;
    await user.save();
    return {
      status: HttpStatus.OK,
      message: 'Email verified',
      data: true,
    };
  }

  async refreshToken(
    token: string
  ): Promise<ApiResponseType<RefreshTokenResponse>> {
    const { userId } = await this.jwtService.verify(token);
    if (!userId) throw new UnauthorizedException();
    const access_token = await this.generateToken(
      userId,
      environment.JWT_ACCESS_EXPIRES_IN
    );
    const refresh_token = await this.generateToken(
      userId,
      environment.JWT_REFRESH_EXPIRES_IN
    );

    return {
      status: HttpStatus.OK,
      message: 'success',
      data: {
        access_token,
        refresh_token,
        access_token_expires_in: environment.JWT_ACCESS_EXPIRES_IN,
        refresh_token_expires_in: environment.JWT_REFRESH_EXPIRES_IN,
      },
    };
  }

  async generateToken(userId: string, ttl: string) {
    return await this.jwtService.signAsync(
      {
        userId: userId,
      },
      {
        expiresIn: ttl,
      }
    );
  }
}
