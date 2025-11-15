import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { EventbriteConnectionRepository } from '../persistence/repositories/eventbrite-connection/eventbrite-connection.repository';

interface StatePayload {
  sub: string;
  nonce: string;
}

@Injectable()
export class EventbriteService {
  private readonly logger = new Logger(EventbriteService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly authUrl: string;
  private readonly tokenUrl: string;
  private readonly redirectUri: string;
  private readonly successRedirect: string;
  private readonly failureRedirect: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly connectionRepository: EventbriteConnectionRepository,
  ) {
    this.clientId =
      this.configService.get<string>('EVENTBRITE_CLIENT_ID') ?? '';
    this.clientSecret =
      this.configService.get<string>('EVENTBRITE_CLIENT_SECRET') ?? '';
    this.authUrl = this.configService.get<string>('EVENTBRITE_AUTH_URL')!;
    this.tokenUrl = this.configService.get<string>('EVENTBRITE_TOKEN_URL')!;
    this.redirectUri =
      this.configService.get<string>('EVENTBRITE_REDIRECT_URI') ?? '';
    this.successRedirect =
      this.configService.get<string>('EVENTBRITE_SUCCESS_REDIRECT') ??
      '/settings/integrations?eventbrite=connected';
    this.failureRedirect =
      this.configService.get<string>('EVENTBRITE_FAILURE_REDIRECT') ??
      '/settings/integrations?eventbrite=error';
  }

  ensureConfig() {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new HttpException(
        { message: 'EVENTBRITE_CONFIG_MISSING' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  generateAuthUrl(userId: string): string {
    this.ensureConfig();
    const state = this.jwtService.sign(
      { sub: userId, nonce: randomUUID() } satisfies StatePayload,
      { expiresIn: '10m' },
    );
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<string> {
    this.ensureConfig();
    let payload: StatePayload;
    try {
      payload = this.jwtService.verify<StatePayload>(state);
    } catch (error) {
      this.logger.warn('Eventbrite state verification failed', error as any);
      throw new HttpException(
        { message: 'EVENTBRITE_STATE_INVALID' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      });
      const { data } = await axios.post(this.tokenUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const expiresAt =
        typeof data.expires_in === 'number'
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined;
      await this.connectionRepository.upsertConnection(payload.sub, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        scope: data.scope,
        expiresAt,
        eventbriteUserId: data.user_id,
      });
      return this.successRedirect;
    } catch (error) {
      this.logger.error(
        'Eventbrite token exchange failed',
        (error as any)?.response?.data ?? error,
      );
      throw new HttpException(
        { message: 'EVENTBRITE_TOKEN_EXCHANGE_FAILED' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async disconnect(userId: string): Promise<void> {
    await this.connectionRepository.deleteByUserId(userId);
  }

  async getConnectionStatus(userId: string) {
    const connection = await this.connectionRepository.findByUserId(userId);
    return {
      connected: Boolean(connection),
      expiresAt: connection?.expiresAt ?? null,
      eventbriteUserId: connection?.eventbriteUserId ?? null,
    };
  }

  getFailureRedirectUrl() {
    return this.failureRedirect;
  }
}

