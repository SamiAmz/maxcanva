import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  UserEmailAlreadyExistsError,
  type UserRecord,
  type UserRepository,
} from '../application/authPorts';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
}

export class SupabaseUserRepository implements UserRepository {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await this.client
      .from('users')
      .select('id,email,password_hash')
      .eq('email', email)
      .maybeSingle<UserRow>();

    if (error) throw new Error(`Supabase user lookup failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async create(input: { email: string; passwordHash: string }): Promise<UserRecord> {
    const { data, error } = await this.client
      .from('users')
      .insert({ email: input.email, password_hash: input.passwordHash })
      .select('id,email,password_hash')
      .single<UserRow>();

    if (error?.code === '23505') throw new UserEmailAlreadyExistsError();
    if (error) throw new Error(`Supabase user creation failed: ${error.message}`);
    return toRecord(data);
  }
}

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
  };
}
