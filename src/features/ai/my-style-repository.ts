export type StoredMyStyle = {
  encryptedStyle: string;
  keyVersion: string;
  updatedAt: Date;
};

export type UpsertMyStyleInput = {
  encryptedStyle: string;
  helpdeskConnectionId: string;
  keyVersion: string;
  userId: string;
};

export type MyStyleRepository = {
  deleteMyStyle(userId: string, helpdeskConnectionId: string): Promise<void>;
  getMyStyle(
    userId: string,
    helpdeskConnectionId: string,
  ): Promise<StoredMyStyle | null>;
  upsertMyStyle(input: UpsertMyStyleInput): Promise<void>;
};
