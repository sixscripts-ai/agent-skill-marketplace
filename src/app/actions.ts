"use server";
import { getCurrentUser } from "@/lib/auth";

export async function getUserAction() {
  return getCurrentUser();
}
