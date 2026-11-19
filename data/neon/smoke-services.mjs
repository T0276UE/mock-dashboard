import { Client } from "pg";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { functionBaseUrl } from "@neon/env";
import WebSocket from "ws";

function assertEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function testFunction() {
  const baseUrl = functionBaseUrl("hello");
  const response = await fetch(`${baseUrl}/`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Function call failed with ${response.status}: ${text}`);
  }
  if (!text.includes("Hello from Neon Functions")) {
    throw new Error(`Unexpected function response body: ${text}`);
  }
  return { url: baseUrl, body: text };
}

async function testPostgres() {
  const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or DATABASE_URL_UNPOOLED");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query("select current_database() as db, current_user as user_name, now() as now_utc");
    return result.rows[0];
  } finally {
    await client.end();
  }
}

async function testObjectStorage() {
  const bucket = process.env.NEON_STORAGE_BUCKET ?? "assets";
  assertEnv("AWS_ACCESS_KEY_ID");
  assertEnv("AWS_SECRET_ACCESS_KEY");
  assertEnv("AWS_ENDPOINT_URL_S3");
  assertEnv("AWS_REGION");

  const s3 = new S3Client({ forcePathStyle: true });
  await s3.send(new HeadBucketCommand({ Bucket: bucket }));

  const key = `smoke/${Date.now()}-neon.txt`;
  const payload = `neon-smoke-${Date.now()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: payload,
      ContentType: "text/plain",
    }),
  );

  const getResult = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  const content = await getResult.Body?.transformToString("utf-8");
  if (content !== payload) {
    throw new Error("Object Storage readback content mismatch");
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  return { bucket, key };
}

async function testRealtime() {
  const realtimeUrl = assertEnv("NEON_REALTIME_URL");
  const secret = assertEnv("NEON_REALTIME_SECRET");

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(realtimeUrl, {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error("Timed out connecting to Neon Realtime"));
    }, 10000);

    ws.once("open", () => {
      clearTimeout(timeout);
      ws.close(1000, "smoke-test-complete");
      resolve(true);
    });

    ws.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  return { url: realtimeUrl };
}

async function run() {
  const checks = [
    ["functions", testFunction],
    ["postgres", testPostgres],
    ["object-storage", testObjectStorage],
    ["realtime", testRealtime],
  ];

  const failures = [];

  for (const [name, check] of checks) {
    try {
      const details = await check();
      console.log(`[PASS] ${name}`, details);
    } catch (error) {
      failures.push({ name, error: String(error?.message ?? error) });
      console.error(`[FAIL] ${name}:`, error?.message ?? error);
    }
  }

  if (failures.length) {
    console.error("\nNeon smoke checks failed:");
    failures.forEach((failure) => {
      console.error(`- ${failure.name}: ${failure.error}`);
    });
    process.exit(1);
  }

  console.log("\nAll Neon smoke checks passed.");
}

run();
