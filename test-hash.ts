import { hashPassword } from './worker/auth-utils';
async function verifyHash() {
  const password = 'Muhammed97@#';
  const hash = await hashPassword(password);
  console.log('Generated Hash:', hash);
}
verifyHash();