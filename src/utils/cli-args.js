export function getFacebookTokenFromCLI() {
  const tokenIndex = process.argv.indexOf('--fb-token');
  const expiresInIndex = process.argv.indexOf('--expires-in');
  const userIdIndex = process.argv.indexOf('--user-id');

  let token = null;
  let expiresIn = null;
  let userId = 'cli-user'; // default fallback

  if (tokenIndex !== -1 && tokenIndex + 1 < process.argv.length) {
    token = process.argv[tokenIndex + 1];
  }

  if (expiresInIndex !== -1 && expiresInIndex + 1 < process.argv.length) {
    expiresIn = parseInt(process.argv[expiresInIndex + 1], 10);
  }

  if (userIdIndex !== -1 && userIdIndex + 1 < process.argv.length) {
    userId = process.argv[userIdIndex + 1];
  }

  return { token, expiresIn, userId };
}