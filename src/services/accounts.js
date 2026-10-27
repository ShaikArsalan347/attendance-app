import { supabase } from "../../config/supabase";

export async function createUserAccount(account) {
  if (!supabase) {
    throw new Error("Configure the Supabase URL and public key before creating accounts.");
  }

  const { data, error } = await supabase.functions.invoke("create-user", {
    body: account,
  });

  if (error) {
    let message = error.message;
    try {
      const details = await error.context?.json();
      message = details?.error || message;
    } catch {
      // Keep the Functions client message when the response has no JSON body.
    }
    throw new Error(message);
  }

  if (!data?.profile?.id) {
    throw new Error("Account creation returned no profile.");
  }

  return data.profile;
}