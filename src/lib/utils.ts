import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple XOR-based encryption for demonstration purposes ONLY.
// DO NOT use in production. This is not secure.
const ENCRYPTION_KEY = "supersecretkey"; // In a real app, this would be securely managed

const xorEncryptDecrypt = (str: string, key: string): string => {
  let output = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    output += String.fromCharCode(charCode);
  }
  return output;
};

export const generateAndDownloadProofFile = (email: string) => {
  const proofData = {
    email: email,
    timestamp: new Date().toISOString(),
    message: "This file proves ownership of your StarMar account."
  };
  const jsonString = JSON.stringify(proofData);

  // "Encrypt" the data
  const encryptedContent = xorEncryptDecrypt(jsonString, ENCRYPTION_KEY);
  
  // Encode to Base64 to make it safe for file content and slightly obscure
  const base64Encoded = btoa(encryptedContent);

  const blob = new Blob([base64Encoded], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `starmar_proof_${email.split('@')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
