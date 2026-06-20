import { hashPassword, verifyPassword } from './worker/auth-utils';

async function verifyHash() {
  const password = 'Room504@#';
  const hash = await hashPassword(password);
  console.log('Generated Hash:', hash);
  console.log('Verify:', await verifyPassword(password, hash));
}

verifyHash();
