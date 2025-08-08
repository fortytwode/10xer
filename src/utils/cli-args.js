export function getFacebookTokenFromCLI() {
  const tokenIndex = process.argv.indexOf('--fb-token');
  const expiresInIndex = process.argv.indexOf('--expires-in');

  let token = null;
  let expiresIn = null;

  if (tokenIndex !== -1 && tokenIndex + 1 < process.argv.length) {
    token = process.argv[tokenIndex + 1];
  }

  if (expiresInIndex !== -1 && expiresInIndex + 1 < process.argv.length) {
    expiresIn = parseInt(process.argv[expiresInIndex + 1], 10);
  }

  return { token, expiresIn };
}