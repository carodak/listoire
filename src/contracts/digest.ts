export async function sha256(bytes: ArrayBuffer | Uint8Array<ArrayBuffer>) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function textDigest(text: string) {
  return sha256(new TextEncoder().encode(text.normalize("NFC")));
}
