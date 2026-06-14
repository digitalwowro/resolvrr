CREATE TABLE "UserMyStyle" (
    "userId" TEXT NOT NULL,
    "encryptedStyle" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMyStyle_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserMyStyle" ADD CONSTRAINT "UserMyStyle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
