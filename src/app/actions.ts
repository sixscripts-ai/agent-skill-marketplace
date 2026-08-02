"use server";
import { getOptionalUser } from "@/lib/auth";

export async function getUserAction() {
  return (await getOptionalUser()) ?? null;
}
