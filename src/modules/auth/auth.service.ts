import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UserEntity,
  UserAuthProviderEntity,
} from '../persistence/entities/user.entity';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(UserAuthProviderEntity)
    private authProviderRepository: Repository<UserAuthProviderEntity>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const googleClientId = this.configService.get<string>(
      'GOOGLE_CLIENT_ID',
    );
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }
  }

  /**
   * Google OAuth 登录
   */
  async googleLogin(token: string) {
    if (!this.googleClient) {
      throw new UnauthorizedException('Google OAuth 未配置');
    }

    try {
      // 验证 Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('562798909455-l2h178bkfvdo6to0fvtrtqvu36n39maq.apps.googleusercontent.com'),
      });

      const googlePayload = ticket.getPayload();
      if (!googlePayload) {
        throw new UnauthorizedException('无效的 Google token');
      }

      const { sub: googleId, email, name, picture } = googlePayload;

      // 查找或创建用户
      let authProvider = await this.authProviderRepository.findOne({
        where: {
          provider: 'google',
          providerUserId: googleId,
        },
        relations: ['user'],
      });

      let user: UserEntity;

      if (authProvider) {
        // 用户已存在，更新信息
        user = authProvider.user;
        if (email && !user.email) {
          user.email = email;
        }
        if (name && !user.nickname) {
          user.nickname = name;
        }
        if (picture && !user.avatarUrl) {
          user.avatarUrl = picture;
        }
        await this.userRepository.save(user);
      } else {
        // 检查邮箱是否已被其他账号使用
        if (email) {
          const existingUser = await this.userRepository.findOne({
            where: { email },
          });

          if (existingUser) {
            // 邮箱已存在，关联到现有用户
            user = existingUser;
          } else {
            // 创建新用户
            user = this.userRepository.create({
              email,
              nickname: name,
              avatarUrl: picture,
            });
            user = await this.userRepository.save(user);
          }
        } else {
          // 没有邮箱，创建新用户
          user = this.userRepository.create({
            nickname: name,
            avatarUrl: picture,
          });
          user = await this.userRepository.save(user);
        }

        // 创建认证提供者记录
        authProvider = this.authProviderRepository.create({
          userId: user.id,
          provider: 'google',
          providerUserId: googleId,
          authToken: token,
        });
        await this.authProviderRepository.save(authProvider);
      }

      // 生成应用自己的 JWT token
      const payload: { userId: string; email?: string } = {
        userId: user.id,
      };
      if (user.email) {
        payload.email = user.email;
      }
      const appToken = this.jwtService.sign(payload);

      return {
        success: true,
        token: appToken,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (error) {
      console.error('Google 登录错误:', error);
      throw new UnauthorizedException('Google 认证失败');
    }
  }

  /**
   * 验证 JWT token
   */
  async validateUser(payload: { userId: string; email?: string }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return user;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

