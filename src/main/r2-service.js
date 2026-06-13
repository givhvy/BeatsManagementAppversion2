// ============================
// CLOUDFLARE R2 SERVICE
// S3-compatible client wrapper for storing/serving beat files on R2.
// Config is kept in a local JSON file (userData) — never hardcoded.
// ============================

const fs = require('fs');
const path = require('path');
const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const CONFIG_FILE_NAME = 'r2-config.json';

const DEFAULT_CONFIG = {
  accountId: '',
  bucketName: '',
  accessKeyId: '',
  secretAccessKey: '',
  publicUrl: '',
  prefix: 'beats/'
};

function getConfigPath(userDataPath) {
  return path.join(userDataPath, CONFIG_FILE_NAME);
}

// Loads saved config (userData JSON), falling back to env vars for any unset fields.
function loadConfig(userDataPath) {
  const envDefaults = {
    accountId: process.env.R2_ACCOUNT_ID || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
    prefix: process.env.R2_PREFIX || ''
  };

  let config = { ...DEFAULT_CONFIG, ...envDefaults };

  const configPath = getConfigPath(userDataPath);
  if (fs.existsSync(configPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = { ...config, ...saved };
    } catch (error) {
      console.error('[R2] Error reading config file:', error);
    }
  }

  if (!config.prefix) config.prefix = 'beats/';

  return config;
}

function saveConfig(userDataPath, config) {
  const configPath = getConfigPath(userDataPath);
  const toSave = { ...DEFAULT_CONFIG, ...config };
  fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2));
  return toSave;
}

function getEndpoint(config) {
  if (!config.accountId) return null;
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

function isConfigured(config) {
  return !!(config.accountId && config.bucketName && config.accessKeyId && config.secretAccessKey);
}

function createClient(config) {
  const endpoint = getEndpoint(config);
  if (!endpoint || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('R2 is not configured. Fill in Account ID, Access Key ID and Secret Access Key.');
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

async function testConnection(config) {
  if (!config.bucketName) {
    throw new Error('Bucket name is required.');
  }
  const client = createClient(config);
  await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
  return true;
}

async function listObjects(config, prefix = '') {
  const client = createClient(config);
  const objects = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix || undefined,
      ContinuationToken: continuationToken
    });
    const response = await client.send(command);

    (response.Contents || []).forEach(item => {
      if (item.Key.endsWith('/')) return; // skip folder placeholder objects
      objects.push({
        key: item.Key,
        name: item.Key.split('/').pop(),
        size: item.Size,
        lastModified: item.LastModified
      });
    });

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

async function uploadFile(config, filePath, key) {
  const client = createClient(config);
  const fileStream = fs.createReadStream(filePath);
  const stats = fs.statSync(filePath);

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: fileStream,
    ContentLength: stats.size
  }));

  return true;
}

async function deleteObject(config, key) {
  const client = createClient(config);
  await client.send(new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key
  }));
  return true;
}

// Returns a public URL (if a public base URL is configured) or a presigned URL.
async function getObjectUrl(config, key, expiresIn = 3600) {
  if (config.publicUrl) {
    const base = config.publicUrl.replace(/\/+$/, '');
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return { url: `${base}/${encodedKey}`, type: 'public' };
  }

  const client = createClient(config);
  const command = new GetObjectCommand({ Bucket: config.bucketName, Key: key });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, type: 'signed', expiresIn };
}

module.exports = {
  loadConfig,
  saveConfig,
  getEndpoint,
  isConfigured,
  testConnection,
  listObjects,
  uploadFile,
  deleteObject,
  getObjectUrl
};
