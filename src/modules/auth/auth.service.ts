import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Agent as HttpsAgent } from 'https';
import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import {
  UserEntity,
  UserAuthProviderEntity,
} from '../persistence/entities/user.entity';

interface OAuthCookiePayload {
  state: string;
  codeVerifier: string;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;
  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly googleRedirectUri: string;
  private readonly googleTokenEndpoint: string;
  private readonly frontendOrigin: string;
  private readonly appSessionSecret: string;
  private readonly stateCookieName = 'oauth_state';
  private readonly sessionCookieName = 'app_session';
  private readonly oauthStateTtlMs = 5 * 60 * 1000;
  private readonly sessionTtlMs = 7 * 24 * 60 * 60 * 1000;
  private readonly googleTokenExchangeTimeout = 60000; // 60秒超时（增加超时时间以应对网络延迟）
  private readonly googleTokenExchangeMaxRetries = 3; // 最多重试3次

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(UserAuthProviderEntity)
    private authProviderRepository: Repository<UserAuthProviderEntity>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClientId =
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.googleClientSecret = this.configService.getOrThrow<string>(
      'GOOGLE_CLIENT_SECRET',
    );
    this.googleRedirectUri = this.configService.getOrThrow<string>(
      'GOOGLE_REDIRECT_URI',
    );
    const tokenEndpoint =
      this.configService.get<string>('GOOGLE_TOKEN_ENDPOINT') ??
      'https://oauth2.googleapis.com/token';
    if (!tokenEndpoint.startsWith('https://')) {
      throw new Error(
        `GOOGLE_TOKEN_ENDPOINT must start with https://, got: ${tokenEndpoint}`,
      );
    }
    this.googleTokenEndpoint = tokenEndpoint;
    this.frontendOrigin =
      this.configService.getOrThrow<string>('FRONTEND_ORIGIN');
    this.appSessionSecret = this.configService.getOrThrow<string>(
      'APP_SESSION_SECRET',
    );

    if (
      this.googleClientId &&
      this.googleClientSecret &&
      this.googleRedirectUri
    ) {
      this.googleClient = new OAuth2Client({
        clientId: this.googleClientId,
        clientSecret: this.googleClientSecret,
        redirectUri: this.googleRedirectUri,
      });
    } else {
      throw new Error('Google OAuth 环境变量未正确配置');
    }
  }

  /**
   * 生成 Google OAuth 授权地址并设置 state cookie
   */
  async beginGoogleLogin(res: Response) {
    const state = randomBytes(16).toString('hex');
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const payload: OAuthCookiePayload = {
      state,
      codeVerifier,
      exp: Date.now() + this.oauthStateTtlMs,
    };
    const encrypted = this.encryptCookiePayload(payload);

    res.cookie(this.stateCookieName, encrypted, {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      maxAge: this.oauthStateTtlMs,
      path: '/api/auth',
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.googleClientId,
      redirect_uri: this.googleRedirectUri,
      scope: 'openid email profile',
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      access_type: 'offline',
      prompt: 'consent',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  /**
   * 处理 Google OAuth 回调
   */
  async handleGoogleCallback(
    code: string,
    state: string,
    req: Request,
    res: Response,
  ) {
    const encryptedState = req.cookies?.[this.stateCookieName];
    if (!encryptedState) {
      throw new UnauthorizedException('state 已失效，请重新登录');
    }

    let payload: OAuthCookiePayload | null = null;
    try {
      payload = this.decryptCookiePayload(encryptedState);
    } catch (error) {
      throw new UnauthorizedException('state 无效');
    } finally {
      res.clearCookie(this.stateCookieName, {
        httpOnly: true,
        secure: this.isSecureCookie(),
        sameSite: 'lax',
        path: '/api/auth',
      });
    }

    if (!payload || payload.state !== state || payload.exp < Date.now()) {
      throw new UnauthorizedException('state 验证失败');
    }

    const tokenResponse = await this.exchangeCodeForToken(
      code,
      payload.codeVerifier,
    );
    const idToken = tokenResponse.id_token;
    if (!idToken) {
      throw new UnauthorizedException('Google 返回数据缺少 id_token');
    }

    const googlePayload = await this.verifyGoogleIdToken(idToken);
    if (!googlePayload) {
      throw new UnauthorizedException('Google 认证失败');
    }

    const user = await this.upsertUserFromGoogleProfile(googlePayload, idToken);
    const sessionToken = this.issueAppSession(user);

    res.cookie(this.sessionCookieName, sessionToken, {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      maxAge: this.sessionTtlMs,
      path: '/',
    });

    res.redirect(this.frontendOrigin || '/');
  }

  /**
   * 获取当前用户信息（基于 app_session cookie）
   */
  async getProfileFromSession(req: Request) {
    const sessionToken = req.cookies?.[this.sessionCookieName];
    if (!sessionToken) {
      throw new UnauthorizedException('未登录');
    }
    const payload = await this.verifySessionToken(sessionToken);
    return this.getCurrentUser(payload.userId);
  }

  /**
   * 退出登录
   */
  async logout(res: Response) {
    this.logger.log('User logout requested');
    res.clearCookie(this.sessionCookieName, {
      httpOnly: true,
      secure: this.isSecureCookie(),
      sameSite: 'lax',
      path: '/',
    });
    this.logger.log('Session cookie cleared');
    return { success: true };
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
   * 获取当前用户信息（供外部调用）
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

  private async upsertUserFromGoogleProfile(
    googlePayload: Record<string, any>,
    authToken: string,
  ): Promise<UserEntity> {
    const { sub: googleId, email, name, picture } = googlePayload;

    let authProvider = await this.authProviderRepository.findOne({
      where: { provider: 'google', providerUserId: googleId },
      relations: ['user'],
    });

    let user: UserEntity;

    if (authProvider && authProvider.user) {
      user = authProvider.user;
      let shouldUpdate = false;
      if (email && !user.email) {
        user.email = email;
        shouldUpdate = true;
      }
      if (name && !user.nickname) {
        user.nickname = name;
        shouldUpdate = true;
      }
      if (picture && !user.avatarUrl) {
        user.avatarUrl = picture;
        shouldUpdate = true;
      }
      if (shouldUpdate) {
        await this.userRepository.save(user);
      }
    } else {
      if (authProvider && !authProvider.user) {
        await this.authProviderRepository.remove(authProvider);
      }
      if (email) {
        const existingUser = await this.userRepository.findOne({
          where: { email },
        });
        if (existingUser) {
          user = existingUser;
        } else {
          user = this.userRepository.create({
            email,
            nickname: name,
            avatarUrl: picture,
          });
          user = await this.userRepository.save(user);
        }
      } else {
        user = this.userRepository.create({
          nickname: name,
          avatarUrl: picture,
        });
        user = await this.userRepository.save(user);
      }

      authProvider = this.authProviderRepository.create({
        userId: user.id,
        provider: 'google',
        providerUserId: googleId,
        authToken,
      });
      await this.authProviderRepository.save(authProvider);
    }

    return user;
  }

  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    attempt = 1,
  ) {
    const httpsAgent = this.createProxyAgentIfNeeded();
    try {
      this.logger.log(
        `[AuthService] token endpoint = ${this.googleTokenEndpoint} (attempt ${attempt}/${this.googleTokenExchangeMaxRetries})`,
      );
      const payload = new URLSearchParams({
        code,
        code_verifier: codeVerifier,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        redirect_uri: this.googleRedirectUri,
        grant_type: 'authorization_code',
      });
      const axiosConfig: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent,
        proxy: httpsAgent ? false : undefined,
        timeout: this.googleTokenExchangeTimeout,
      };
      this.logger.log(
        `[AuthService] Request config: timeout=${this.googleTokenExchangeTimeout}ms, proxy=${httpsAgent ? 'enabled' : 'disabled'}`,
      );
      const { data } = await axios.post(
        this.googleTokenEndpoint,
        payload.toString(),
        axiosConfig,
      );
      return data as {
        access_token: string;
        id_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
      };
    } catch (error) {
      const status = (error as any)?.response?.status;
      const responseData = (error as any)?.response?.data;
      const requestUrl = (error as any)?.config?.url;
      const errorMessage = (error as any)?.message || '';
      const isTimeout =
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('timeout') ||
        (error as any)?.code === 'ETIMEDOUT';

      // 如果是超时错误且还有重试机会，则重试
      if (isTimeout && attempt < this.googleTokenExchangeMaxRetries) {
        const delayMs = attempt * 1000; // 递增延迟：1秒、2秒
        this.logger.warn(
          `Google token exchange timeout (attempt ${attempt}/${this.googleTokenExchangeMaxRetries}). Retrying in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
        return this.exchangeCodeForToken(code, codeVerifier, attempt + 1);
      }

      // 如果是网络错误（非超时）且还有重试机会，也重试
      if (
        !status &&
        !isTimeout &&
        attempt < this.googleTokenExchangeMaxRetries &&
        (errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ECONNREFUSED'))
      ) {
        const delayMs = attempt * 1000;
        this.logger.warn(
          `Google token exchange network error (attempt ${attempt}/${this.googleTokenExchangeMaxRetries}). Retrying in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
        return this.exchangeCodeForToken(code, codeVerifier, attempt + 1);
      }

      // 记录错误并抛出异常
      const proxyInfo = httpsAgent ? ' (使用代理)' : ' (直连)';
      this.logger.error(
        `Google token exchange failed${
          status ? ` (status ${status})` : ''
        }${isTimeout ? ' (timeout)' : ''}${proxyInfo}: ${JSON.stringify(responseData) || errorMessage}`,
      );
      console.error('[AuthService] axios error url =', requestUrl);
      console.error(
        '[AuthService] Google token exchange failed',
        status,
        responseData,
        errorMessage,
        proxyInfo,
      );

      let errorMsg: string;
      if (isTimeout) {
        errorMsg = `Google 认证服务响应超时（${this.googleTokenExchangeTimeout / 1000}秒）。可能原因：1) 网络连接问题 2) 防火墙阻止 3) 需要配置代理。请检查网络连接或联系管理员。`;
      } else if (!status) {
        errorMsg = `无法连接到 Google 认证服务。可能原因：1) 网络连接问题 2) DNS 解析失败 3) 需要配置代理。错误: ${errorMessage}`;
      } else {
        errorMsg = `无法从 Google 获取 token (状态码: ${status})`;
      }
      throw new UnauthorizedException(errorMsg);
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async verifyGoogleIdToken(idToken: string) {
    if (!this.googleClient) {
      throw new UnauthorizedException('Google OAuth 未配置');
    }
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.googleClientId,
    });
    return ticket.getPayload();
  }

  private issueAppSession(user: UserEntity) {
    const payload: { userId: string; email?: string } = { userId: user.id };
    if (user.email) {
      payload.email = user.email;
    }
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  private async verifySessionToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      throw new UnauthorizedException('登录态已失效，请重新登录');
    }
  }

  private createProxyAgentIfNeeded(): HttpsAgent | undefined {
    const proxyUrl =
      this.configService.get<string>('HTTPS_PROXY') ??
      this.configService.get<string>('HTTP_PROXY') ??
      process.env.HTTPS_PROXY ??
      process.env.https_proxy ??
      process.env.HTTP_PROXY ??
      process.env.http_proxy;
    if (!proxyUrl) {
      return undefined;
    }
    this.logger.log(`[AuthService] using proxy ${proxyUrl}`);
    return new HttpsProxyAgent(proxyUrl);
  }

  private generateCodeVerifier() {
    return randomBytes(64).toString('base64url');
  }

  private generateCodeChallenge(codeVerifier: string) {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  private encryptCookiePayload(payload: OAuthCookiePayload) {
    const iv = randomBytes(12);
    const key = createHash('sha256').update(this.appSessionSecret).digest();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const serialized = JSON.stringify(payload);
    const encrypted = Buffer.concat([
      cipher.update(serialized, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64url');
  }

  private decryptCookiePayload(value: string): OAuthCookiePayload {
    const buffer = Buffer.from(value, 'base64url');
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const key = createHash('sha256').update(this.appSessionSecret).digest();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8')) as OAuthCookiePayload;
  }

  private isSecureCookie() {
    return this.configService.get<string>('NODE_ENV') !== 'development';
  }
}

