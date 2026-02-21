export type CssLength = `${number}px` | `${number}%`;

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export type NewUser = Omit<User, 'id'>;

export type UserPublicProfile = Pick<User, 'name' | 'avatarUrl'>;

