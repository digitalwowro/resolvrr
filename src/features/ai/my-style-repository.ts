export type StoredMyStyle = {
  encryptedStyle: string;
  keyVersion: string;
  updatedAt: Date;
};

export type UpsertMyStyleInput = {
  encryptedStyle: string;
  keyVersion: string;
  userId: string;
};

export type MyStyleRepository = {
  deleteMyStyle(userId: string): Promise<void>;
  getMyStyle(userId: string): Promise<StoredMyStyle | null>;
  upsertMyStyle(input: UpsertMyStyleInput): Promise<void>;
};
