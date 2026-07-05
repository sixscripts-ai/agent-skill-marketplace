export function isVercelDeployment(env = process.env) {
  return env.VERCEL === "1" || env.VERCEL === "true";
}

export function requiresDurableStorage(env = process.env) {
  return isVercelDeployment(env) && env.NODE_ENV === "production";
}

export function isDatabaseConfigured(env = process.env) {
  return Boolean(env.DATABASE_URL);
}

export function assertDurableDatabaseConfigured(env = process.env) {
  if (requiresDurableStorage(env) && !isDatabaseConfigured(env)) {
    throw new Error("DATABASE_URL is required for Vercel production deployments.");
  }
}

export function assertBlobStorageConfigured(env = process.env) {
  if (requiresDurableStorage(env) && !env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for package uploads on Vercel production deployments.");
  }
}

export function allowLocalDemoAuth(env = process.env) {
  return !isVercelDeployment(env);
}
